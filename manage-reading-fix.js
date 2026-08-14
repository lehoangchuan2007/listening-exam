// English Studio - keep Reading passage columns synchronized.
// manage.html historically writes reading_text; the Reading student RPC uses
// reading_passage as its canonical field. This bridge keeps both in sync.
(function () {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') return;
  if (window.__englishStudioManageReadingPatchInstalled) return;
  window.__englishStudioManageReadingPatchInstalled = true;

  const originalCreateClient = window.supabase.createClient.bind(window.supabase);

  function normalizePayload(payload) {
    if (Array.isArray(payload)) {
      return payload.map(normalizePayload);
    }
    if (!payload || typeof payload !== 'object') return payload;
    if (Object.prototype.hasOwnProperty.call(payload, 'reading_text')) {
      const text = String(payload.reading_text ?? '');
      return {
        ...payload,
        reading_passage:
          Object.prototype.hasOwnProperty.call(payload, 'reading_passage') &&
          String(payload.reading_passage ?? '').trim() !== ''
            ? payload.reading_passage
            : text
      };
    }
    return payload;
  }

  window.supabase.createClient = function (...args) {
    const client = originalCreateClient(...args);
    if (!client || typeof client.from !== 'function') return client;

    const originalFrom = client.from.bind(client);
    client.from = function (table) {
      const builder = originalFrom(table);
      if (table !== 'exams' || !builder) return builder;

      for (const method of ['insert', 'update']) {
        if (typeof builder[method] !== 'function') continue;
        const original = builder[method].bind(builder);
        builder[method] = function (payload, ...rest) {
          return original(normalizePayload(payload), ...rest);
        };
      }
      return builder;
    };

    return client;
  };
})();
