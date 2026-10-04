/* Page controller: dependency-free, multi-page UI. */
'use strict';
const App = {
  page:document.body.dataset.page, q:new URLSearchParams(location.search).get('q')||'', filter:new URLSearchParams(location.search).get('low')?'Low stock':'',
  user:null, db:null,
  async init() {
    try {
      await seedInitialData();const info=PAGES.find(p=>p[0]===this.page);this.user=Auth.requirePage(...(info?.[3]||[]));if(!this.user)return;
      UI.shell(this.page,this.user);await this.render();
      document.body.addEventListener('click',async e=>{
        const button=e.target.closest('[data-action]');if(!button)return;
        e.preventDefault();if(button.disabled)return;
        try{await this.action(button.dataset.action,button.dataset.id,button);}catch(err){toast(err.message,'error');}
      });
      window.addEventListener('storage',async e=>{
        if(e.key==='repflow_session'||e.key===DB_KEY){if(!Auth.getUser()){location.href='index.html';return;}
          const permitted=PAGES.find(p=>p[0]===this.page)?.[3]||[];
          if(!permitted.includes(Auth.getUser().role)){location.href='dashboard.html';return;}
          this.user=Auth.getUser();
          if(document.querySelector('.modal-overlay'))toast('Data changed in another tab. Reopen this form to see the latest values.','info');else await this.render();}
      });
      if(this.page==='tickets'){
        const id=new URLSearchParams(location.search).get('id');if(id)await TicketUI.detail(id);
        if(new URLSearchParams(location.search).has('new'))TicketUI.edit();
      }
      if(this.page==='billing'&&new URLSearchParams(location.search).get('ticket'))BillingUI.create(new URLSearchParams(location.search).get('ticket'));
    }catch(err){document.body.innerHTML=`<main class="startup-error"><h1>Unable to open Rep-Flow</h1><p>${E(err.message)}</p><p>Open the site through GitHub Pages or a local static server. Your existing data has not been reset.</p><button class="btn btn-primary" onclick="location.reload()">Try again</button></main>`;console.error(err);}
  },
  async render() {
    this.db=Storage.database();
    if(this.page==='dashboard')this.dashboard();
    else if(this.page==='tickets')TicketUI.list();
    else if(['customers','technicians','inventory','users'].includes(this.page))this.catalog();
    else if(this.page==='billing')BillingUI.list();
    else if(this.page==='reports')this.reports();
    else if(this.page==='payment-settings')await BillingUI.settings();
    else if(this.page==='audit-log')this.audit();
    else if(this.page==='data')DataUI.render();
    UI.alerts();
  },
  searchbar(placeholder,options=[]) {return `<div class="toolbar"><div class="search-box"><input type="search" id="pageSearch" aria-label="${E(placeholder)}" placeholder="${E(placeholder)}" value="${E(this.q)}"></div>${options.length?`<select id="pageFilter" aria-label="Filter records"><option value="">All ${this.page==='tickets'?'statuses':'records'}</option>${options.map(o=>`<option ${this.filter===o?'selected':''}>${E(o)}</option>`).join('')}</select>`:''}<div class="spacer"></div><span class="results-count" id="resultCount"></span></div>`;},
  wireSearch(renderRows) {
    document.getElementById('pageSearch').oninput=e=>{this.q=e.target.value;renderRows();};
    const filter=document.getElementById('pageFilter');if(filter)filter.onchange=e=>{this.filter=e.target.value;renderRows();};renderRows();
  },
  matches(values) {return values.join(' ').toLowerCase().includes(this.q.toLowerCase().trim());},
  customer(id) {return this.db.customers.find(c=>c.id===id)?.name||'Unknown customer';},
  technician(id) {return this.db.technicians.find(c=>c.id===id)?.name||'Unassigned';},
  dashboard() {
    const db=this.db,tickets=Repo.visibleTickets(db),open=tickets.filter(t=>!['Delivered','Cancelled'].includes(t.status)),ready=tickets.filter(t=>t.status==='Ready'),today=new Date().toLocaleDateString('en-CA');
    const manager=this.user.role!=='technician';const payments=db.payments.reduce((s,p)=>s+Number(p.amount),0);const low=db.inventory.filter(p=>p.quantity<=p.min_stock);const overdue=open.filter(t=>t.due_date&&t.due_date<today);
    UI.content.innerHTML=UI.heading('WORKSHOP AT A GLANCE',`Welcome back, ${E(this.user.name.split(' ')[0])}.`,'Keep every repair moving, from check-in to handover.',manager?UI.button(icon('plus')+' New repair','ticket-new','','primary'):`<a class="btn btn-primary" href="tickets.html">My assigned repairs ${icon('arrow')}</a>`)+
    `<section class="stat-grid" aria-label="Workshop summary">${UI.stat('Open repairs',open.length,'Across the repair queue')}${UI.stat('Ready for pickup',ready.length,'Finished and awaiting handover','success')}${UI.stat(manager?'Payments collected':'My completed jobs',manager?formatCurrency(payments):tickets.filter(t=>t.status==='Delivered').length,manager?'All recorded payments':'Delivered repairs','accent')}${UI.stat('Needs attention',overdue.length+(manager?low.length:0),`${overdue.length} overdue${manager?` · ${low.length} low-stock items`:''}`,'danger')}</section>
    <div class="two-col section-gap"><section class="card"><div class="card-header"><h3>Repair pipeline</h3><span class="muted">${tickets.length} total tickets</span></div><div class="card-body pipeline">${TICKET_STATUSES.filter(s=>!['Delivered','Cancelled'].includes(s)).map(s=>{const count=tickets.filter(t=>t.status===s).length;return `<a class="pipeline-row" href="tickets.html?status=${encodeURIComponent(s)}"><span>${pill(s)}</span><div class="pipeline-track"><div style="width:${Math.round(count/Math.max(open.length,1)*100)}%"></div></div><b>${count}</b></a>`;}).join('')}</div></section>
    <section class="card"><div class="card-header"><h3>${manager?'Team workload':'Your priorities'}</h3><span class="tag-label">LIVE</span></div><div class="card-body">${manager?db.technicians.filter(t=>t.status==='Active').map(t=>{const jobs=open.filter(x=>x.technician_id===t.id);return `<div class="person-row"><span class="avatar pale">${E(initials(t.name))}</span><div><b>${E(t.name)}</b><span class="muted">${E(t.specialization)}</span></div><b class="job-count">${jobs.length}<small>open</small></b></div>`;}).join(''):open.slice(0,4).map(t=>`<a class="priority-row" href="tickets.html?id=${encodeURIComponent(t.id)}"><b>${E(t.model)}</b>${pill(t.priority)}<span>${E(t.id)} · Due ${E(formatDate(t.due_date))}</span></a>`).join('')||'<p class="muted">No assigned repairs yet.</p>'}
    <div class="info-note">${manager?'Assign tickets to an active technician to keep ownership clear.':'Update the status and add notes as you work on each repair.'}</div></div></section></div>
    <section class="card section-gap"><div class="card-header"><h3>Recent repairs</h3><a class="text-link" href="tickets.html">View all tickets ${icon('arrow')}</a></div>${this.ticketTable(tickets.slice().reverse().slice(0,5))}</section>
    <div class="overview-bottom"><span class="muted">${icon('clock')} Last refreshed ${E(new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}))}</span><span>All records remain in this browser.</span></div>`;
  },
  ticketTable(rows) {return UI.table(['Ticket / device','Customer','Assigned to','Status','Due date',''],rows.map(t=>`<tr><td><a class="record-link" href="tickets.html?id=${encodeURIComponent(t.id)}">${E(t.id)}</a><span class="cell-sub">${E(t.model)}</span></td><td>${E(this.customer(t.customer_id))}</td><td>${E(this.technician(t.technician_id))}</td><td>${pill(t.status)}</td><td>${E(formatDate(t.due_date))}</td><td>${UI.button('Open','ticket-view',t.id)}</td></tr>`),'No repair tickets. Create a repair to get started.');},
  catalog() {
    const config={customers:['CUSTOMER DIRECTORY','Customers','Keep contact details and repair history in one place.','customer','Add customer'],technicians:['YOUR REPAIR TEAM','Technicians','Manage technician profiles, account links, and workload.','technician','Add technician'],inventory:['PARTS & SUPPLIES','Inventory','Track parts, stock movements, and reorder levels.','part','Add part'],users:['WORKSPACE ACCESS','User accounts','Manage local demo accounts and role-specific workspaces.','user','Add user']}[this.page];
    const canEdit=this.page==='technicians'||this.page==='users'?this.user.role==='admin':this.user.role!=='technician';
    UI.content.innerHTML=UI.heading(config[0],config[1],config[2],canEdit?UI.button(icon('plus')+' '+config[4],config[3]+'-edit','','primary'):'')+
      (this.page==='inventory'?`<div class="stat-grid">${UI.stat('Part types',this.db.inventory.length,'Items in your catalog')}${UI.stat('Units on hand',this.db.inventory.reduce((s,p)=>s+p.quantity,0),'Available for repairs')}${UI.stat('Stock value',formatCurrency(this.db.inventory.reduce((s,p)=>s+p.quantity*p.purchase_price,0)),'At purchase price')}${UI.stat('Low stock',this.db.inventory.filter(p=>p.quantity<=p.min_stock).length,'At or below minimum','danger')}</div>`:'')+
      `<section class="card"><div class="card-body">${this.searchbar('Search '+config[1].toLowerCase()+'…',this.page==='inventory'?['Low stock']:this.page==='users'?['admin','staff','technician']:[])}</div><div id="catalogRows"></div></section>`;
    this.wireSearch(()=>{
      const rows=this.db[this.page].filter(r=>this.matches([r.id,r.name,r.email||'',r.phone||'',r.sku||'',r.specialization||''])&&(!this.filter||(this.page==='inventory'?r.quantity<=r.min_stock:r.role===this.filter)));
      document.getElementById('resultCount').textContent=rows.length+' records';let headers,cells;
      if(this.page==='customers') {headers=['Customer','Contact','Address','Repairs','Actions'];cells=rows.map(r=>`<tr><td><b>${E(r.name)}</b><span class="cell-sub">${E(r.id)}</span></td><td>${E(r.phone)}<span class="cell-sub">${E(r.email||'—')}</span></td><td>${E(r.address||'—')}</td><td>${this.db.tickets.filter(t=>t.customer_id===r.id).length}</td><td><div class="table-actions">${UI.button('History','customer-history',r.id)}${UI.button('Edit','customer-edit',r.id)}${UI.button('Delete','customer-delete',r.id,'danger')}</div></td></tr>`);}
      if(this.page==='technicians'){headers=['Technician','Specialization','Account','Workload','Status','Actions'];cells=rows.map(r=>`<tr><td><b>${E(r.name)}</b><span class="cell-sub">${E(r.phone)}</span></td><td>${E(r.specialization)}<span class="cell-sub">${E(r.experience_years)} years experience</span></td><td>${E(this.db.users.find(u=>u.id===r.user_id)?.email||'No linked login')}</td><td>${this.db.tickets.filter(t=>t.technician_id===r.id&&!['Delivered','Cancelled'].includes(t.status)).length} open</td><td>${pill(r.status)}</td><td><div class="table-actions">${canEdit?UI.button('Edit','technician-edit',r.id)+UI.button('Delete','technician-delete',r.id,'danger'):'<span class="muted">View only</span>'}</div></td></tr>`);}
      if(this.page==='inventory'){headers=['Part','Category','Stock','Purchase / sale','Actions'];cells=rows.map(r=>`<tr><td><b>${E(r.name)}</b><span class="cell-sub">${E(r.sku)} · ${E(r.supplier||'No supplier')}</span></td><td>${E(r.category)}</td><td><b>${r.quantity}</b> units ${r.quantity<=r.min_stock?'<span class="low-stock-badge">Low</span>':''}<span class="cell-sub">Minimum ${r.min_stock}</span></td><td>${formatCurrency(r.purchase_price)} / ${formatCurrency(r.selling_price)}</td><td><div class="table-actions">${UI.button('History','part-history',r.id)}${canEdit?UI.button('Edit','part-edit',r.id)+UI.button('Adjust','part-adjust',r.id)+UI.button('Delete','part-delete',r.id,'danger'):''}</div></td></tr>`);}
      if(this.page==='users'){headers=['User','Email','Role','Status','Actions'];cells=rows.map(r=>`<tr><td><b>${E(r.name)}</b><span class="cell-sub">${E(r.id)}</span></td><td>${E(r.email)}</td><td>${pill(r.role)}</td><td>${pill(r.is_active?'Active':'Inactive')}</td><td><div class="table-actions">${UI.button('Edit / password','user-edit',r.id)}${r.id!==this.user.id?UI.button('Delete','user-delete',r.id,'danger'):''}</div></td></tr>`);}
      document.getElementById('catalogRows').innerHTML=UI.table(headers,cells,'No matching records.');
    });
  },
  editCatalog(type,id) {
    const collection={customer:'customers',technician:'technicians',part:'inventory',user:'users'}[type];const r=id?Storage.getById(collection,id):{};if(!r)throw new Error('Record no longer exists.');let fields='';
    if(type==='customer')fields=UI.field('Full name','name',r.name,'text','required maxlength="100"')+UI.field('Phone','phone',r.phone,'tel','required maxlength="30"')+UI.field('Email (optional)','email',r.email,'email')+UI.area('Address','address',r.address,'maxlength="500"');
    if(type==='technician')fields=UI.field('Full name','name',r.name,'text','required')+UI.field('Phone','phone',r.phone,'tel','required')+UI.field('Specialization','specialization',r.specialization,'text','required')+UI.field('Experience (years)','experience_years',r.experience_years||0,'number','min="0" max="70" step="0.5" required')+UI.select('Status','status',['Active','Inactive'],r.status||'Active')+UI.select('Linked login account','user_id',[['','No account linked'],...this.db.users.filter(u=>u.role==='technician').map(u=>[u.id,u.email])],r.user_id||'')+'<p class="muted full">Create a technician login in User accounts, then link it here. A profile can also exist without a login.</p>';
    if(type==='part')fields=UI.field('Part name','name',r.name,'text','required')+UI.field('SKU','sku',r.sku,'text','required')+UI.field('Category','category',r.category||'Laptop Parts','text','required')+UI.field('Supplier','supplier',r.supplier)+(!id?UI.field('Opening quantity','quantity',0,'number','min="0" step="1" required'):'')+UI.field('Minimum stock','min_stock',r.min_stock||0,'number','min="0" step="1" required')+UI.field('Purchase price (₹)','purchase_price',r.purchase_price||0,'number','min="0" step="0.01" required')+UI.field('Selling price (₹)','selling_price',r.selling_price||0,'number','min="0" step="0.01" required');
    if(type==='user')fields=UI.field('Full name','name',r.name,'text','required')+UI.field('Email','email',r.email,'email','required')+UI.select('Role','role',['admin','staff','technician'],r.role||'staff')+UI.select('Account status','is_active',[['true','Active'],['false','Inactive']],String(r.is_active??true))+UI.field(id?'New demo password (leave blank to keep)':'Demo password','password','','password',`minlength="8" autocomplete="new-password" ${id?'':'required'}`)+'<p class="muted full">Use a made-up password. These accounts only control the demo interface on this browser.</p>';
    const save={customer:'saveCustomer',technician:'saveTechnician',part:'savePart',user:'saveUser'}[type];
    UI.modal((id?'Edit ':'Add ')+type,`<div class="form-grid">${fields}</div>`,{submit:'Save '+type,onSubmit:async p=>{await Repo[save](id,p);toast('Saved successfully.');await this.render();}});
  },
  reports() {
    UI.content.innerHTML=UI.heading('BUSINESS INSIGHTS','Reports','Review repair activity and payments by date. All totals use your saved records.',UI.button('Export CSV','report-export'))+
      `<div class="card section-gap"><div class="card-body report-filters">${UI.field('From date','from','','date')}${UI.field('To date','to','','date')}<button class="btn btn-primary" id="applyReport">Apply dates</button><button class="btn btn-outline" id="clearReport">All time</button></div></div><div id="reportBody"></div>`;
    const draw=()=>{
      const from=document.getElementById('f-from').value,to=document.getElementById('f-to').value;if(from&&to&&from>to){toast('From date must be before To date.','error');return;}
      const range=d=>{const value=String(d||'').slice(0,10);return(!from||value>=from)&&(!to||value<=to);};
      const tickets=this.db.tickets.filter(t=>range(t.createdAt));const inv=this.db.billing.filter(i=>range(i.createdAt));const pay=this.db.payments.filter(p=>range(p.createdAt));const revenue=money(pay.reduce((s,p)=>s+p.amount,0));
      this.reportRows=tickets.map(t=>[t.id,this.customer(t.customer_id),t.model,t.status,this.technician(t.technician_id),t.createdAt,t.due_date]);
      document.getElementById('reportBody').innerHTML=`<div class="stat-grid">${UI.stat('Tickets received',tickets.length,'Created in selected period')}${UI.stat('Invoiced',formatCurrency(inv.reduce((s,i)=>s+i.total,0)),'Invoices created in period')}${UI.stat('Payments collected',formatCurrency(revenue),'Payments received in period','success')}${UI.stat('Outstanding',formatCurrency(inv.reduce((s,i)=>s+Repo.invoiceBalance(i,this.db).balance,0)),'Current balance of selected invoices','danger')}</div><div class="two-col section-gap"><section class="card"><div class="card-header"><h3>Ticket status</h3></div><div class="card-body pipeline">${TICKET_STATUSES.map(s=>{const n=tickets.filter(t=>t.status===s).length;return `<div class="pipeline-row"><span>${E(s)}</span><div class="pipeline-track"><div style="width:${n/Math.max(tickets.length,1)*100}%"></div></div><b>${n}</b></div>`;}).join('')}</div></section><section class="card"><div class="card-header"><h3>Payment methods</h3></div>${UI.table(['Method','Transactions','Collected'],['Cash','UPI','Bank transfer','Card'].map(m=>{const rows=pay.filter(p=>p.method===m);return `<tr><td>${m}</td><td>${rows.length}</td><td>${formatCurrency(rows.reduce((s,p)=>s+p.amount,0))}</td></tr>`;}))}<div class="card-body"><p class="muted">Payments are manually recorded. The website does not process or verify transfers.</p></div></section></div><section class="card"><div class="card-header"><h3>Repair records in this period</h3></div>${this.ticketTable(tickets.slice().reverse())}</section>`;
    };
    document.getElementById('applyReport').onclick=draw;document.getElementById('clearReport').onclick=()=>{document.getElementById('f-from').value='';document.getElementById('f-to').value='';draw();};draw();
  },
  audit() {
    UI.content.innerHTML=UI.heading('WORKSPACE HISTORY','Activity log','Review logins, record changes, stock adjustments, and payments.',UI.button('Export CSV','audit-export'))+`<section class="card"><div class="card-body">${this.searchbar('Search activity…')}</div><div id="auditRows"></div></section>`;
    this.wireSearch(()=>{const rows=this.db.audit_logs.slice().reverse().filter(r=>this.matches([r.userName,r.action,r.module,r.recordId,r.description]));this.auditRows=rows;document.getElementById('resultCount').textContent=rows.length+' events';document.getElementById('auditRows').innerHTML=UI.table(['Time','User','Action','Module / record','Details'],rows.map(r=>`<tr><td>${E(formatDateTime(r.createdAt))}</td><td>${E(r.userName)}</td><td>${pill(r.action)}</td><td>${E(r.module)}<span class="cell-sub">${E(r.recordId)}</span></td><td>${E(r.description)}</td></tr>`),'No activity found.');});
  },
  async action(action,id,button) {
    if(action.startsWith('ticket-'))return TicketUI.action(action,id,button);
    if(action.startsWith('invoice-')||action.startsWith('payment-')||action.startsWith('qr-'))return BillingUI.action(action,id,button);
    if(action.startsWith('data-'))return DataUI.action(action);
    const [type,verb]=action.split('-');
    if(['customer','technician','part','user'].includes(type)&&verb==='edit')return this.editCatalog(type,id);
    if(['customer','technician','part','user'].includes(type)&&verb==='delete')return UI.confirm(`Delete this ${type}? Linked records may prevent deletion.`,()=>Repo['delete'+{customer:'Customer',technician:'Technician',part:'Part',user:'User'}[type]](id));
    if(action==='customer-history'){const c=Storage.getById('customers',id);return UI.modal(c.name+' · Repair history',this.ticketTable(this.db.tickets.filter(t=>t.customer_id===id)),{wide:true});}
    if(action==='part-adjust'){const p=Storage.getById('inventory',id);return UI.modal('Adjust stock · '+p.name,`<p class="info-note">Current stock: ${p.quantity}. Enter a positive number to add stock or a negative number to remove it.</p>${UI.field('Quantity change','delta',1,'number','step="1" required')}${UI.area('Reason','note','','required')}`,{submit:'Save adjustment',onSubmit:async data=>{await Repo.adjustStock(id,data.delta,data.note);toast('Stock updated.');await this.render();}});}
    if(action==='part-history'){return UI.modal('Stock movement history',UI.table(['Date','Type','Change','Reference / reason'],this.db.inventory_tx.filter(t=>t.part_id===id).reverse().map(t=>`<tr><td>${E(formatDateTime(t.createdAt))}</td><td>${E(t.type)}</td><td>${t.quantity>0?'+':''}${t.quantity}</td><td>${E(t.ticket_id||'')} ${E(t.note)}</td></tr>`),'No stock movements yet.'),{wide:true});}
    if(action==='report-export')UI.csv('repflow-repair-report.csv',['Ticket','Customer','Device','Status','Technician','Created','Due'],this.reportRows);
    if(action==='audit-export')UI.csv('repflow-activity.csv',['Time','User','Action','Module','Record','Details'],this.auditRows.map(r=>[r.createdAt,r.userName,r.action,r.module,r.recordId,r.description]));
  }
};
App.init();
