// English Studio - Reading student compatibility patch
// Purpose: make Reading exams use the existing 2-pane renderer in student.html
// without changing the existing Listening flow.
(function () {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') return;
  if (window.__englishStudioReadingPatchInstalled) return;
  window.__englishStudioReadingPatchInstalled = true;

  const originalCreateClient = window.supabase.createClient.bind(window.supabase);

  function unwrap(value) {
    if (Array.isArray(value)) return value[0] || null;
    if (value && Array.isArray(value.data)) return value.data[0] || null;
    if (typeof value === 'string') {
      try { return unwrap(JSON.parse(value)); } catch (_) { return null; }
    }
    return value && typeof value === 'object' ? value : null;
  }

  function replaceFirst(value, merged) {
    if (Array.isArray(value)) return [merged, ...value.slice(1)];
    if (value && Array.isArray(value.data)) return { ...value, data: [merged, ...value.data.slice(1)] };
    if (typeof value === 'string') return JSON.stringify(merged);
    return merged;
  }

  window.supabase.createClient = function (...args) {
    const client = originalCreateClient(...args);
    if (!client || typeof client.rpc !== 'function') return client;

    const originalRpc = client.rpc.bind(client);

    client.rpc = async function (fn, params, options) {
      const result = await originalRpc(fn, params, options);

      // Only enhance the exam-loading RPC. Listening and all other RPCs remain untouched.
      if (fn !== 'get_exam_for_student' || !params?.p_exam_id || result?.error) {
        return result;
      }

      const base = unwrap(result.data);
      if (!base?.id) return result;

      // Always try the dedicated Reading RPC. Older get_exam_for_student versions may
      // return the exam without exam_type, or may incorrectly expose the default type.
      let reading = null;
      try {
        const readingResult = await originalRpc(
          'get_reading_exam_for_student',
          { p_exam_id: params.p_exam_id }
        );
        if (!readingResult?.error) reading = unwrap(readingResult.data);
      } catch (_) {
        // The dedicated RPC may not exist on an older deployment; keep normal behavior.
      }

      // A Reading RPC result is authoritative only when it explicitly says reading.
      // This prevents any change to existing Listening exams.
      if (reading?.id && reading.exam_type === 'reading') {
        const merged = {
          ...base,
          ...reading,
          exam_type: 'reading',
          reading_passage:
            reading.reading_passage ||
            reading.reading_text ||
            base.reading_passage ||
            base.reading_text ||
            base.passage ||
            base.content ||
            ''
        };
        return { ...result, data: replaceFirst(result.data, merged) };
      }

      // Compatibility with the current create form, which historically stored the
      // passage as reading_text. If that field is present, force Reading mode locally.
      const legacyPassage = base.reading_passage || base.reading_text || base.passage || '';
      if (base.exam_type === 'reading' || legacyPassage) {
        const merged = {
          ...base,
          exam_type: 'reading',
          reading_passage: legacyPassage
        };
        return { ...result, data: replaceFirst(result.data, merged) };
      }

      return result;
    };

    return client;
  };
})();
