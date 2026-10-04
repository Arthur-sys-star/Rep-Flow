/* Browser-local persistence. One JSON database makes related record changes atomic. */
'use strict';
const DB_KEY = 'repflow_db_v2';
const COLLECTIONS = ['users','technicians','customers','inventory','tickets','inventory_tx','billing','payments','audit_logs','notifications'];
const Storage = {
  get(key) {
    let raw;
    try { raw = localStorage.getItem(key); }
    catch { throw new Error('Chrome storage is unavailable. Allow site storage, then reload.'); }
    if (raw === null) return null;
    try { return JSON.parse(raw); }
    catch { throw new Error('Saved data is damaged. Restore a backup or contact the person who manages this browser.'); }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { throw new Error('Could not save: browser storage is full or blocked. Export a backup and free space, then try again.'); }
  },
  remove(key) { localStorage.removeItem(key); },
  exists(key) { return localStorage.getItem(key) !== null; },
  empty() {
    const db = { version: 2, seeded: false, counters: {}, payment_settings: {}, photo_data: {} };
    COLLECTIONS.forEach(c => { db[c] = []; });
    return db;
  },
  init() {
    this.set('repflow_storage_probe', true); this.remove('repflow_storage_probe');
    if (this.exists(DB_KEY)) {
      const db = this.database();
      if (db.version !== 2 || COLLECTIONS.some(c => !Array.isArray(db[c]))) throw new Error('Unrecognized Rep-Flow database. Restore a compatible backup.');
      return;
    }
    const db = this.empty();
    COLLECTIONS.forEach(c => { const rows = this.get('repflow_' + c); if (Array.isArray(rows)) db[c] = rows; });
    db.payment_settings = this.get('repflow_payment_settings') || {};
    db.seeded = db.users.length > 0;
    this.write(db);
  },
  database() { return this.get(DB_KEY) || this.empty(); },
  write(db) { this.set(DB_KEY, db); },
  getAll(collection) { return this.database()[collection] || []; },
  getById(collection, id) { return this.getAll(collection).find(r => r.id === id) || null; },
  query(collection, predicate) { return this.getAll(collection).filter(predicate); },
  async locked(fn) {
    if (navigator.locks) return navigator.locks.request('repflow-database-write', fn);
    return fn();
  },
  id(db, collection, prefix) {
    const highest = Math.max(0, ...db[collection].map(r => Number(String(r.id).split('-').pop()) || 0), db.counters[collection] || 0);
    db.counters[collection] = highest + 1;
    return prefix + '-' + String(highest + 1).padStart(4, '0');
  },
  record(db, collection, prefix, data) {
    const now = new Date().toISOString();
    const record = { ...data, id: data.id || this.id(db, collection, prefix), createdAt: data.createdAt || now, updatedAt: now };
    db[collection].push(record); return record;
  },
  async transact(action, module, fn) {
    return this.locked(async () => {
      const db = this.database();
      const result = await fn(db);
      const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
      this.record(db, 'audit_logs', 'RF-LOG', { userId: user?.id || null, userName: user?.name || 'System', role: user?.role || null, action, module, recordId: result?.id || '', description: result?.audit || `${action}: ${module}` });
      this.write(db);
      return result;
    });
  }
};
