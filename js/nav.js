/* Shared navigation and accessible interface helpers. */
'use strict';
const PAGES = [
 ['dashboard','Overview','grid',['admin','staff','technician']],
 ['tickets','Repair tickets','tool',['admin','staff','technician']],
 ['customers','Customers','users',['admin','staff']],
 ['technicians','Technicians','wrench',['admin','staff']],
 ['inventory','Inventory','box',['admin','staff','technician']],
 ['billing','Billing & payments','receipt',['admin','staff']],
 ['reports','Reports','chart',['admin','staff']],
 ['users','User accounts','shield',['admin']],
 ['payment-settings','Payment settings','settings',['admin']],
 ['audit-log','Activity log','clock',['admin']],
 ['data','Backup & restore','database',['admin']]
];
const ICONS = {
 grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 tool:'M14 6a5 5 0 0 0-6 6L3 17a2.8 2.8 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3z',
 wrench:'M14 6a5 5 0 0 0-6 6L3 17a2.8 2.8 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3z',
 users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-4 M16 3a4 4 0 0 1 0 8',
 box:'M3 7l9-5 9 5v10l-9 5-9-5z M3 7l9 5 9-5 M12 12v10 M7 4l10 5',
 receipt:'M5 3h14v19l-3-2-4 2-4-2-3 2z M8 8h8 M8 12h8 M8 16h4',
 chart:'M4 3v17h17 M8 16v-5 M13 16V7 M18 16V4',
 shield:'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
 clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',
 database:'M3 6c0-5 18-5 18 0s-18 5-18 0v12c0 5 18 5 18 0V6 M3 12c0 5 18 5 18 0',
 plus:'M12 5v14 M5 12h14', arrow:'M5 12h14 M14 7l5 5-5 5', search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',logout:'M9 3H3v18h6 M10 12h11 M17 8l4 4-4 4',menu:'M4 6h16 M4 12h16 M4 18h16',bell:'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4z M10 21h4'
};
function icon(name) {return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name]||ICONS.grid}"/></svg>`;}
const E=escapeHtml;
const UI = {
  content:null,
  shell(page,user) {
    const current=PAGES.find(p=>p[0]===page);
    document.body.innerHTML=`<a class="skip-link" href="#main">Skip to content</a><div class="app-shell">
      <aside class="sidebar" id="sidebar" aria-label="Main navigation"><a class="brand" href="dashboard.html"><div class="logo-mark">RF</div><div class="brand-text"><b>Rep-Flow<span class="brand-dot">.</span></b><span>REPAIR WORKSPACE</span></div></a>
      <div class="nav-caption">WORKSHOP</div><ul class="nav-list">${PAGES.filter(p=>p[3].includes(user.role)).map(p=>`<li><a href="${p[0]}.html" ${p[0]===page?'class="active" aria-current="page"':''}>${icon(p[2])}${p[1]}</a></li>`).join('')}</ul>
      <div class="sidebar-footer"><div class="local-indicator"><i></i> Saved on this browser</div><div class="user-chip"><div class="avatar">${E(initials(user.name))}</div><div class="who"><b>${E(user.name)}</b><span>${E(user.role)} account</span></div></div><button class="logout-button" id="logoutBtn">${icon('logout')} Sign out</button></div></aside>
      <button class="sidebar-scrim" id="sidebarScrim" aria-label="Close navigation" hidden></button>
      <div class="main-area"><header class="topbar"><div class="top-left"><button class="menu-toggle" id="menuToggle" aria-label="Open navigation" aria-expanded="false">${icon('menu')}</button><span class="breadcrumb">Workspace <span>/</span> <b>${current[1]}</b></span></div><div class="top-right"><div class="global-search">${icon('search')}<input type="search" id="globalSearch" placeholder="Find a ticket or customer…" aria-label="Search tickets and customers" autocomplete="off"><div class="global-search-results" id="globalResults"></div></div><div class="notif-bell-wrap"><button class="notif-bell" id="notificationsBtn" aria-label="Workshop alerts" aria-expanded="false">${icon('bell')}<span class="notif-dot" id="alertDot" hidden></span></button><div class="notif-dropdown" id="notificationPanel"></div></div></div></header>
      <main class="page-body" id="main" tabindex="-1"><div class="loading-state">Loading your workspace…</div></main><footer class="app-footer">Rep-Flow Client Edition <span>Browser-local demo · ${new Date().getFullYear()}</span></footer></div></div>`;
    this.content=document.getElementById('main');
    document.getElementById('logoutBtn').onclick=()=>Auth.logout().catch(e=>toast(e.message,'error'));
    const toggle=()=>{const open=document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarScrim').hidden=!open;document.getElementById('menuToggle').setAttribute('aria-expanded',open);};
    document.getElementById('menuToggle').onclick=toggle;document.getElementById('sidebarScrim').onclick=toggle;
    const search=document.getElementById('globalSearch'),results=document.getElementById('globalResults');
    search.oninput=()=>{
      const q=search.value.trim().toLowerCase();if(!q){results.classList.remove('open');return;}
      const db=Storage.database();const tickets=Repo.visibleTickets(db).filter(t=>[t.id,t.model,db.customers.find(c=>c.id===t.customer_id)?.name].join(' ').toLowerCase().includes(q)).slice(0,6);
      const customers=user.role==='technician'?[]:db.customers.filter(c=>[c.id,c.name,c.phone].join(' ').toLowerCase().includes(q)).slice(0,4);
      results.innerHTML=[...tickets.map(t=>`<a class="search-result-item" href="tickets.html?id=${encodeURIComponent(t.id)}"><b>${E(t.id)}</b> · ${E(t.model)}</a>`),...customers.map(c=>`<a class="search-result-item" href="customers.html?q=${encodeURIComponent(c.name)}">${E(c.name)} <span class="muted">· Customer</span></a>`)].join('')||'<div class="notif-empty">No matches found.</div>';results.classList.add('open');
    };
    document.addEventListener('click',e=>{if(!e.target.closest('.global-search'))results.classList.remove('open');if(!e.target.closest('.notif-bell-wrap')){document.getElementById('notificationPanel').classList.remove('open');document.getElementById('notificationsBtn').setAttribute('aria-expanded','false');}});
    document.getElementById('notificationsBtn').onclick=()=>{this.alerts();const open=document.getElementById('notificationPanel').classList.toggle('open');document.getElementById('notificationsBtn').setAttribute('aria-expanded',open);};
    this.alerts();
  },
  alerts() {
    const db=Storage.database(),today=new Date().toLocaleDateString('en-CA');
    const alerts=Repo.visibleTickets(db).filter(t=>t.due_date&&t.due_date<today&&!['Delivered','Cancelled'].includes(t.status)).map(t=>`<a class="notif-item notif-warning" href="tickets.html?id=${encodeURIComponent(t.id)}">${E(t.id)} · ${E(t.model)}<br><span class="muted">Overdue since ${E(formatDate(t.due_date))}</span></a>`);
    if(Auth.hasRole(MANAGERS)) db.inventory.filter(p=>p.quantity<=p.min_stock).forEach(p=>alerts.push(`<a class="notif-item notif-danger" href="inventory.html?low=1">${E(p.name)}<br><span class="muted">Low stock: ${p.quantity} remaining</span></a>`));
    document.getElementById('notificationPanel').innerHTML='<div class="panel-label">Needs attention</div>'+(alerts.slice(0,12).join('')||'<div class="notif-empty">You’re all caught up.</div>');document.getElementById('alertDot').hidden=!alerts.length;
  },
  heading(eyebrow,title,description,actions='') {return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div><div class="heading-actions">${actions}</div></div>`;},
  button(label,action,id='',style='outline') {return `<button type="button" class="btn btn-${style}" data-action="${action}" data-id="${E(id)}">${label}</button>`;},
  stat(label,value,sub='',style='') {return `<div class="stat-card ${style}"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-sub">${sub}</div></div>`;},
  table(headers,rows,empty='No records yet.',id='') {return `<div class="table-wrap" ${id?`id="${id}"`:''}><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr class="empty-row"><td colspan="${headers.length}">${empty}</td></tr>`}</tbody></table></div>`;},
  field(label,name,value='',type='text',extra='') {return `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${E(value)}" ${extra}></div>`;},
  area(label,name,value='',extra='') {return `<div class="field full"><label for="f-${name}">${label}</label><textarea id="f-${name}" name="${name}" rows="3" ${extra}>${E(value)}</textarea></div>`;},
  select(label,name,options,value='',extra='') {return `<div class="field"><label for="f-${name}">${label}</label><select id="f-${name}" name="${name}" ${extra}>${options.map(x=>{const v=Array.isArray(x)?x[0]:x;const l=Array.isArray(x)?x[1]:x;return `<option value="${E(v)}" ${String(v)===String(value)?'selected':''}>${E(l)}</option>`;}).join('')}</select></div>`;},
  modal(title,body,{submit,onSubmit,wide=false,after}={}) {
    if(this.closeModal)this.closeModal();
    const before=document.activeElement;const overlay=document.createElement('div');overlay.className='modal-overlay open';
    overlay.innerHTML=`<div class="modal-box ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><h3 id="modalTitle">${E(title)}</h3><button class="modal-close" type="button" data-close aria-label="Close dialog">×</button></div><form id="modalForm"><div class="modal-body">${body}<div class="form-error" id="formError" role="alert" hidden></div></div><div class="modal-foot"><button class="btn btn-outline" type="button" data-close>${submit?'Cancel':'Close'}</button>${submit?`<button class="btn btn-primary" type="submit">${E(submit)}</button>`:''}</div></form></div>`;
    const close=()=>{overlay.remove();document.removeEventListener('keydown',key);if(this.closeModal===close)this.closeModal=null;before?.focus();};
    this.closeModal=close;
    const key=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const nodes=[...overlay.querySelectorAll('button,input,select,textarea,a[href]')].filter(x=>!x.disabled&&x.offsetParent!==null);if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus();}}};
    overlay.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);overlay.onclick=e=>{if(e.target===overlay)close();};document.addEventListener('keydown',key);document.body.append(overlay);
    const form=overlay.querySelector('form');form.onsubmit=async e=>{e.preventDefault();if(!onSubmit)return;const button=form.querySelector('[type=submit]');button.disabled=true;const error=overlay.querySelector('#formError');error.hidden=true;try{await onSubmit(Object.fromEntries(new FormData(form)),form);close();}catch(err){error.textContent=err.message;error.hidden=false;error.scrollIntoView({block:'nearest'});}finally{button.disabled=false;}};
    setTimeout(()=>overlay.querySelector('input:not([type=hidden]),select,textarea,button')?.focus(),30);if(after)after(overlay);return overlay;
  },
  confirm(message,fn) {this.modal('Confirm action',`<p>${E(message)}</p>`,{submit:'Confirm',onSubmit:async()=>{await fn();toast('Changes saved.');await App.render();}});},
  download(name,content,type='application/json') {const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
  csv(name,headers,rows) {const clean=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};this.download(name,'\ufeff'+[headers,...rows].map(r=>r.map(clean).join(',')).join('\r\n'),'text/csv;charset=utf-8');}
};
