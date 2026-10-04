/* Shared formatting and accessible toast messages. */
/* ---------- Formatting ---------- */
function formatCurrency(value) {
  const n = Number(value || 0);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function pill(value) {
  if (!value) return '';
  const slug = String(value).trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
  return `<span class="pill pill-${slug}">${escapeHtml(value)}</span>`;
}
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

/* ---------- Toasts ---------- */
function toast(message, type = 'success') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    wrap.setAttribute('aria-live','polite');
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

/* ---------- User-friendly error messaging ----------
 * Never let a raw JS/TypeError reach the screen. Repository functions
 * throw plain Error objects with friendly messages already; this is the
 * last-resort fallback for anything unexpected. */
function friendlyError(err, fallback) {
  console.error(err);
  if (err instanceof Error && err.message && err.message.length < 200) return err.message;
  return fallback || 'Something went wrong. Please try again.';
}
