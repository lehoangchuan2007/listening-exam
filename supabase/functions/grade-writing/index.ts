import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function parse(v: any): any[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') { try { return JSON.parse(v) } catch { return [] } }
  if (v && typeof v === 'object') return Object.values(v)
  return []
}
function normalize(v: any): any {
  if (Array.isArray(v)) return v[0] || null
  if (v?.data && Array.isArray(v.data)) return v.data[0] || null
  if (typeof v === 'string') { try { return normalize(JSON.parse(v)) } catch { return null } }
  return v || null
}
function wordCount(s: string) { return s.trim() ? s.trim().split(/\s+/).length : 0 }

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Student login required' }, 401)

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return json({ error: 'Student login required' }, 401)

    const body = await req.json()
    const examId = String(body.exam_id || '')
    const essay = String(body.essay || '').trim()
    if (!examId) return json({ error: 'Thiếu mã đề Writing.' }, 400)
    if (!essay) return json({ error: 'Bạn chưa nhập bài viết.' }, 400)

    let r = await supabase.rpc('get_writing_exam_for_student_v2', { p_exam_id: examId })
    let exam = !r.error ? normalize(r.data) : null
    if (!exam) { r = await supabase.rpc('get_writing_exam_for_student', { p_exam_id: examId }); exam = !r.error ? normalize(r.data) : null }
    if (!exam) { r = await supabase.rpc('get_exam_for_student', { p_exam_id: examId }); exam = !r.error ? normalize(r.data) : null }
    if (!exam || String(exam.exam_type || '').toLowerCase() !== 'writing') return json({ error: 'Đề Writing không tồn tại hoặc chưa mở.' }, 404)

    const studentName = String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim()
    if (!studentName) return json({ error: 'Tài khoản chưa có Họ tên. Hãy cập nhật tài khoản trước khi nộp.' }, 400)

    const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { count } = await service.from('writing_submissions').select('id', { count: 'exact', head: true }).eq('exam_id', examId).eq('student_user_id', user.id)
    const maxAttempts = Number(exam.max_attempts || 0)
    if (maxAttempts > 0 && (count || 0) >= maxAttempts) return json({ error: 'Bạn đã hết số lần làm bài.' }, 400)

    const rubric = parse(exam.writing_rubric).map((x: any) => ({
      name: String(x?.name || x?.title || '').trim(),
      max_score: Number(x?.max_score ?? x?.max ?? 0),
      description: String(x?.description || '').trim(),
    })).filter((x: any) => x.name && x.max_score > 0)
    if (!rubric.length) return json({ error: 'Đề Writing chưa có tiêu chí chấm điểm.' }, 400)
    const totalMax = rubric.reduce((s: number, x: any) => s + x.max_score, 0)
    if (Math.abs(totalMax - 10) > 0.001) return json({ error: `Tổng điểm rubric của đề phải bằng 10 (hiện tại ${totalMax}).` }, 400)

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) return json({ error: 'Chưa cấu hình OPENAI_API_KEY trên Supabase.' }, 500)

    const properties: Record<string, any> = {}
    for (const x of rubric) properties[x.name] = { type: 'number', minimum: 0, maximum: x.max_score }
    const schema = {
      type: 'object', additionalProperties: false,
      properties: {
        rubric_scores: { type: 'object', additionalProperties: false, properties, required: rubric.map((x: any) => x.name) },
        overall_comment: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' } },
        improvements: { type: 'array', items: { type: 'string' } },
        grammar_errors: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { original: { type: 'string' }, correction: { type: 'string' }, explanation: { type: 'string' } }, required: ['original', 'correction', 'explanation'] } },
        better_phrases: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { original: { type: 'string' }, better: { type: 'string' } }, required: ['original', 'better'] } },
      }, required: ['rubric_scores', 'overall_comment', 'strengths', 'improvements', 'grammar_errors', 'better_phrases']
    }
    const rubricText = rubric.map((x: any) => `- ${x.name}: tối đa ${x.max_score} điểm.${x.description ? ` ${x.description}` : ''}`).join('\n')
    const input = `Đề bài:\n${exam.writing_prompt || exam.description || exam.title}\n\nRubric do giảng viên thiết lập:\n${rubricText}\n\nBài viết sinh viên:\n${essay}`
    const system = `Bạn là giám khảo Writing. Chấm đúng theo rubric được cung cấp. Không tự chia đều điểm, không tạo tiêu chí mới, không vượt điểm tối đa. Tổng điểm là tổng các tiêu chí. Đánh giá nội dung thực tế của bài và không bịa lỗi. Phản hồi bằng tiếng Việt, giữ nguyên các cụm tiếng Anh cần sửa. Chỉ trả JSON theo schema.`

    const ai = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'gpt-5.4-mini', store: false, reasoning: { effort: 'minimal' }, input: [{ role: 'system', content: [{ type: 'input_text', text: system }] }, { role: 'user', content: [{ type: 'input_text', text: input }] }], text: { format: { type: 'json_schema', name: 'writing_grade', strict: true, schema } } })
    })
    const raw = await ai.text()
    if (!ai.ok) return json({ error: 'AI chấm bài thất bại.', detail: raw.slice(0, 500) }, 502)
    const response = JSON.parse(raw)
    const parsed = JSON.parse(response.output_text)
    const scores = parsed.rubric_scores || {}
    const total = Math.round(rubric.reduce((s: number, x: any) => s + Math.max(0, Math.min(x.max_score, Number(scores[x.name] || 0))), 0) * 100) / 100
    const wc = wordCount(essay)

    const row: any = {
      exam_id: examId, student_user_id: user.id, student_name: studentName,
      prompt: String(exam.writing_prompt || exam.description || exam.title), essay, word_count: wc,
      total_score: total, overall_comment: parsed.overall_comment, strengths: parsed.strengths,
      improvements: parsed.improvements, grammar_errors: parsed.grammar_errors, better_phrases: parsed.better_phrases,
      ai_model: 'gpt-5.4-mini', ai_request_id: response.id,
    }
    // Preserve legacy fixed columns when they exist; dynamic rubric remains in rubric_scores.
    row.rubric_scores = scores
    for (const x of rubric) {
      const key = x.name.toLowerCase()
      if (key.includes('task response')) row.task_response = Number(scores[x.name] || 0)
      else if (key.includes('coherence')) row.coherence = Number(scores[x.name] || 0)
      else if (key.includes('vocabulary')) row.vocabulary = Number(scores[x.name] || 0)
      else if (key.includes('grammar')) row.grammar = Number(scores[x.name] || 0)
    }
    const { data: inserted, error: insertError } = await service.from('writing_submissions').insert(row).select('id').single()
    if (insertError) return json({ error: 'Không lưu được kết quả chấm AI.', detail: insertError.message }, 500)
    return json({ ...parsed, total_score: total, word_count: wc, id: inserted.id, ai_model: 'gpt-5.4-mini' })
  } catch (e) { return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500) }
})
