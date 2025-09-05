// Preload for <webview>: capture drag & drop events and forward to host
// Runs in the isolated world of the guest page
const { ipcRenderer } = require('electron');

function safeSend(channel, payload) {
  try { ipcRenderer.sendToHost(channel, payload); } catch (_) {}
}

window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  safeSend('wv-dragover');
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  safeSend('wv-dragover');
});

window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  safeSend('wv-dragleave');
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files).map(f => f.path) : [];
  const uriList = e.dataTransfer?.getData ? e.dataTransfer.getData('text/uri-list') : '';
  const text = e.dataTransfer?.getData ? e.dataTransfer.getData('text/plain') : '';
  safeSend('wv-drop', { files, uriList, text });
});

