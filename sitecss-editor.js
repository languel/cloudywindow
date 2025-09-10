// Simple in-app JSON editor for site-css.json
(() => {
  const editor = document.getElementById('editor');
  const status = document.getElementById('status');
  const btnSave = document.getElementById('btnSave');
  const btnReload = document.getElementById('btnReload');
  const btnFormat = document.getElementById('btnFormat');
  const btnPicker = document.getElementById('btnPicker');

  function setStatus(msg) { if (status) status.textContent = msg; }

  async function loadFile() {
    try {
      const text = await window.electronAPI.siteCssRead();
      editor.value = typeof text === 'string' ? text : '';
      setStatus('Loaded');
    } catch (e) { setStatus('Load error: ' + (e && e.message || e)); }
  }

  async function saveFile() {
    try {
      const raw = editor.value;
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch (err) { setStatus('Invalid JSON: ' + (err && err.message || err)); return; }
      const pretty = JSON.stringify(parsed, null, 2);
      const res = await window.electronAPI.siteCssWrite(pretty);
      if (res && res.ok) {
        setStatus('Saved');
        try { await window.electronAPI.siteCssReload(); } catch (_) {}
      } else {
        setStatus('Save failed: ' + (res && res.error ? res.error : 'unknown error'));
      }
    } catch (e) { setStatus('Error: ' + (e && e.message || e)); }
  }

  function formatJson() {
    try {
      const parsed = JSON.parse(editor.value);
      editor.value = JSON.stringify(parsed, null, 2);
      setStatus('Formatted');
    } catch (e) { setStatus('Format error: ' + (e && e.message || e)); }
  }

  async function startPicker() {
    try {
      const ok = await window.electronAPI.siteCssStartPicker();
      setStatus(ok ? 'Picker started — click an element in the CloudyWindow' : 'No CloudyWindow available');
    } catch (e) {
      setStatus('Picker start error: ' + (e && e.message || e));
    }
  }

  function ensureRuleArray(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (!Array.isArray(obj.rules)) obj.rules = [];
  }

  function highlightRuleById(id) {
    try {
      const text = editor.value;
      const needle = `"id": "${id}`;
      const idx = text.indexOf(needle);
      if (idx >= 0) {
        editor.focus();
        editor.selectionStart = idx;
        editor.selectionEnd = Math.min(text.length, idx + needle.length + 20);
        // Scroll so selection is visible
        const before = text.slice(0, idx);
        const lines = before.split(/\n/).length;
        editor.scrollTop = Math.max(0, (lines - 3) * 16);
        setStatus('Jumped to rule');
      }
    } catch (_) {}
  }

  function addRuleFromPick(payload) {
    try {
      const raw = editor.value;
      let data;
      try { data = JSON.parse(raw); } catch (_) { setStatus('Current JSON invalid; fix it to auto-insert rule'); return; }
      ensureRuleArray(data);
      const host = payload && payload.host ? payload.host : '';
      const selector = payload && payload.selector ? payload.selector : '';
      const css = [];
      if (payload && payload.hints) {
        if (payload.hints.transparent) css.push(payload.hints.transparent);
        if (payload.hints.hide) css.push(payload.hints.hide);
      } else if (selector) {
        css.push(`${selector}{background:transparent!important}`);
      }
      const rule = {
        id: 'pick-' + Date.now(),
        enabled: true,
        match: host ? { host } : {},
        css,
        notes: selector ? `Picked: ${selector}` : 'Picked element'
      };
      data.rules.push(rule);
      editor.value = JSON.stringify(data, null, 2);
      setStatus(`Inserted rule for ${host || 'site'} — review and Save`);
      highlightRuleById(rule.id);
    } catch (e) {
      setStatus('Insert error: ' + (e && e.message || e));
    }
  }

  if (btnReload) btnReload.addEventListener('click', loadFile);
  if (btnSave) btnSave.addEventListener('click', saveFile);
  if (btnFormat) btnFormat.addEventListener('click', formatJson);
  if (btnPicker) btnPicker.addEventListener('click', startPicker);

  loadFile();

  // Receive pick results
  if (window.electronAPI && window.electronAPI.onSiteCssPickerResult) {
    window.electronAPI.onSiteCssPickerResult((_e, payload) => {
      addRuleFromPick(payload || {});
    });
  }

  // Highlight after auto-added rules (T/H/P)
  if (window.electronAPI && window.electronAPI.onSiteCssAutoAdded) {
    window.electronAPI.onSiteCssAutoAdded(async (_e, payload) => {
      try {
        await loadFile();
        if (payload && payload.id) highlightRuleById(payload.id);
      } catch (_) {}
    });
  }
})();
