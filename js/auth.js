/* Demo accounts only: browser code and browser data are editable by the user. */
'use strict';
async function sha256Hex(text) {
  if (!crypto.subtle) throw new Error('Open Rep-Flow through HTTPS or http://localhost. Web Crypto is required for demo login.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
}
async function hashPassword(password) {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,'0')).join('');
  return salt + ':' + await sha256Hex(salt + password);
}
async function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, digest] = stored.split(':');
  return await sha256Hex(salt + password) === digest;
}
const Auth = {
  getToken() { return Storage.get('repflow_session')?.token || null; },
  getUser() {
    const session = Storage.get('repflow_session');
    if (!session?.token) return null;
    const u = Storage.getById('users', session.user?.id);
    if (!u?.is_active) return null;
    return { id:u.id, name:u.name, email:u.email, role:u.role };
  },
  getCurrentUser() { return this.getUser(); },
  setSession(token,user) { Storage.set('repflow_session',{token,user,loginTime:new Date().toISOString()}); },
  clear() { Storage.remove('repflow_session'); },
  hasRole(roles) { return (Array.isArray(roles)?roles:[roles]).includes(this.getUser()?.role); },
  isLoggedIn() { return !!this.getUser(); },
  requirePage(...roles) {
    const u = this.getUser();
    if (!u) { location.replace('index.html'); return null; }
    if (roles.length && !roles.includes(u.role)) { location.replace('dashboard.html'); return null; }
    return u;
  },
  async login(email,password,role) {
    const user = Storage.getAll('users').find(u => u.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!user || !await verifyPassword(password,user.password_hash)) throw new Error('Invalid email or password.');
    if (!user.is_active) throw new Error('This account is inactive. Contact the administrator.');
    if (role && role !== user.role) throw new Error(`Select the ${user.role} tab for this account.`);
    const safe = {id:user.id,name:user.name,email:user.email,role:user.role};
    this.setSession(crypto.randomUUID(),safe);
    await Storage.transact('LOGIN','auth',()=>({id:user.id,audit:`${user.name} signed in`}));
    return {token:this.getToken(),user:safe};
  },
  async logout() {
    try { await Storage.transact('LOGOUT','auth',()=>({audit:'Signed out'})); }
    finally { this.clear(); location.href='index.html'; }
  }
};
