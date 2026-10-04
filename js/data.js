/* Portable JSON backups include records and compressed photos, but no active session. */
'use strict';
const DataUI = {
  render() {
    const db=Storage.database();const bytes=new Blob([JSON.stringify(db)]).size;const photos=Object.keys(db.photo_data||{}).length;
    UI.content.innerHTML=UI.heading('YOUR WORKSPACE DATA','Backup & restore','Keep a portable copy of this browser’s records and compressed repair photos.')+
      `<div class="stat-grid">${UI.stat('Database size',(bytes/1024).toFixed(0)+' KB','Serialized JSON size')}${UI.stat('Saved records',COLLECTIONS.reduce((n,c)=>n+db[c].length,0),'Across all collections')}${UI.stat('Stored images',photos,'Repair photos and payment QR images')}</div><div class="two-col"><section class="card"><div class="card-header"><h3>Export your workspace</h3></div><div class="card-body"><p>Create a JSON backup containing customers, tickets, inventory, invoices, payments, demo accounts, settings, activity, and images.</p><p class="muted small-note">Keep backups private. They contain the workshop information you entered and demo account password hashes.</p>${UI.button('Download full backup','data-export','','primary')}</div></section><section class="card"><div class="card-header"><h3>Restore a backup</h3></div><div class="card-body"><p>Restore a Rep-Flow version 2 JSON backup. This replaces the current workspace after validation and signs you out.</p><p class="muted small-note">Export the current workspace first. After restoring, use an account from the imported backup to sign in.</p>${UI.button('Choose backup file','data-import')}</div></section></div><section class="card section-gap storage-explainer"><div class="card-body"><h3>How saving works</h3><p>All data is saved in Chrome localStorage for this site address and browser profile. It stays after refresh or reopening Chrome, unless you clear site data or use a private session. Other devices have their own data.</p><p>Photos share the same limited storage space. If saving fails, download a backup and remove unneeded photos. The app reports a failed save instead of silently discarding it.</p></div></section><section class="card danger-zone"><div class="card-body"><h3>Reset sample workspace</h3><p>Replace all current Rep-Flow data with the original sample customers, tickets, inventory, and demo accounts.</p>${UI.button('Reset to demo data','data-reset','','danger')}</div></section>`;
  },
  validate(payload) {
    if(!payload||payload.format!=='repflow-backup'||payload.version!==2||!payload.database)throw new Error('Choose a Rep-Flow version 2 backup JSON file.');
    const db=payload.database;if(db.version!==2||db.seeded!==true||!db.counters||typeof db.counters!=='object'||Array.isArray(db.counters))throw new Error('The backup database header is invalid.');
    for(const c of COLLECTIONS){
      if(!Array.isArray(db[c])||db[c].length>100000)throw new Error('Invalid collection: '+c);
      const ids=new Set();for(const r of db[c]){if(!r||typeof r!=='object'||typeof r.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(r.id)||ids.has(r.id))throw new Error('Invalid or duplicate record ID in '+c);ids.add(r.id);}
    }
    const ref=(c,id)=>db[c].some(x=>x.id===id);
    const string=(v,label)=>{if(typeof v!=='string')throw new Error('Invalid '+label+' in backup.');};
    const number=(v,label,min=0)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min)throw new Error('Invalid '+label+' in backup.');};
    if(!db.users.some(u=>u.role==='admin'&&u.is_active))throw new Error('Backup must have at least one active administrator.');
    const emails=new Set();for(const u of db.users){string(u.name,'user name');string(u.email,'email');if(emails.has(u.email.toLowerCase()))throw new Error('Duplicate account email in backup.');emails.add(u.email.toLowerCase());if(!['admin','staff','technician'].includes(u.role)||typeof u.is_active!=='boolean'||!/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(u.password_hash))throw new Error('Invalid demo account in backup.');}
    for(const c of db.customers){string(c.name,'customer name');string(c.phone,'phone');}
    for(const t of db.technicians){string(t.name,'technician name');if(!['Active','Inactive'].includes(t.status)||(t.user_id&&!db.users.some(u=>u.id===t.user_id&&u.role==='technician')))throw new Error('Invalid technician account link.');}
    for(const p of db.inventory){string(p.name,'part name');string(p.sku,'SKU');for(const n of ['quantity','purchase_price','selling_price','min_stock'])number(p[n],n);if(!Number.isInteger(p.quantity)||!Number.isInteger(p.min_stock))throw new Error('Stock counts must be whole numbers.');}
    if(!db.photo_data||typeof db.photo_data!=='object'||Array.isArray(db.photo_data))throw new Error('Invalid photo collection.');
    for(const value of Object.values(db.photo_data))if(typeof value!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)||value.length>1000000)throw new Error('Invalid image data in backup.');
    for(const t of db.tickets){
      string(t.model,'device model');string(t.issue,'repair issue');if(!ref('customers',t.customer_id)||(t.technician_id&&!ref('technicians',t.technician_id))||!TICKET_STATUSES.includes(t.status))throw new Error('Invalid ticket or missing linked record.');
      for(const key of ['parts','photos','notes','history'])if(!Array.isArray(t[key]))throw new Error('Invalid ticket '+key);
      for(const p of t.parts){if(!p||!ref('inventory',p.part_id))throw new Error('Ticket references a missing part.');number(p.quantity,'part quantity',1);number(p.unit_price,'part price');if(!Number.isInteger(p.quantity))throw new Error('Part quantities must be whole numbers.');}
      for(const p of t.photos)if(!p||!Object.hasOwn(db.photo_data,p.id)||!['Before','After'].includes(p.kind))throw new Error('A repair photo is missing or invalid.');
      for(const n of t.notes){if(!n)throw new Error('Invalid repair note.');string(n.text,'note');string(n.by,'note author');string(n.at,'note date');}
      for(const h of t.history){if(!h||!TICKET_STATUSES.includes(h.status))throw new Error('Invalid status history.');string(h.by,'history author');string(h.at,'history date');}
    }
    const tickets=new Set();for(const i of db.billing){if(!ref('tickets',i.ticket_id)||!ref('customers',i.customer_id)||tickets.has(i.ticket_id)||!Array.isArray(i.lines)||!i.customer||!i.business)throw new Error('Invalid invoice or duplicate ticket invoice.');tickets.add(i.ticket_id);for(const line of i.lines){if(!line)throw new Error('Invalid invoice line.');string(line.name,'invoice line name');number(line.quantity,'invoice quantity',1);number(line.unit_price,'invoice unit price');if(!Number.isInteger(line.quantity))throw new Error('Invoice quantities must be whole numbers.');}const parts=money(i.lines.reduce((sum,line)=>sum+money(line.quantity*line.unit_price),0));if(parts!==money(i.parts_total)||money(parts+i.labor)!==money(i.subtotal)||money((i.subtotal-i.discount)*i.tax_rate/100)!==money(i.tax_amount))throw new Error('Invoice line totals do not match.');for(const n of ['parts_total','labor','subtotal','discount','tax_rate','tax_amount','total'])number(i[n],n);if(i.discount>i.subtotal||i.tax_rate>100||money(i.subtotal-i.discount+i.tax_amount)!==money(i.total))throw new Error('Invalid invoice totals.');}
    for(const p of db.payments){if(!ref('billing',p.invoice_id)||!['Cash','UPI','Bank transfer','Card'].includes(p.method))throw new Error('Invalid payment reference.');number(p.amount,'payment amount',.01);}
    for(const i of db.billing)if(Repo.invoiceBalance(i,db).balance<0)throw new Error('An invoice has excess payments in this backup.');
    if(!db.payment_settings||typeof db.payment_settings!=='object'||Array.isArray(db.payment_settings))throw new Error('Invalid payment settings.');
    if(db.payment_settings.upi_qr_photo_id&&!db.photo_data[db.payment_settings.upi_qr_photo_id])throw new Error('Payment QR image is missing.');
    return db;
  },
  async restore(payload) {
    requireSession('admin');const db=this.validate(payload);
    return Storage.locked(()=>{Storage.record(db,'audit_logs','RF-LOG',{userName:'System',action:'RESTORE',module:'data',description:'Restored a validated backup',recordId:''});Storage.write(db);Auth.clear();});
  },
  async action(action) {
    requireSession('admin');
    if(action==='data-export'){
      const backup={format:'repflow-backup',version:2,exportedAt:new Date().toISOString(),database:Storage.database()};
      UI.download('repflow-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(backup,null,2));toast('Backup downloaded.');return;
    }
    if(action==='data-import')return UI.modal('Restore workspace backup',`<p class="info-note">This replaces current records. Export a backup first.</p>${UI.field('Rep-Flow JSON backup','backup','','file','accept="application/json,.json" required')}${UI.field('Type RESTORE to confirm','confirm','','text','required pattern="RESTORE" autocomplete="off"')}`,{submit:'Restore backup',onSubmit:async(p,form)=>{if(p.confirm!=='RESTORE')throw new Error('Type RESTORE to confirm.');const file=form.elements.backup.files[0];if(file.size>20*1024*1024)throw new Error('Backup files must be smaller than 20 MB.');let payload;try{payload=JSON.parse(await file.text());}catch{throw new Error('The file is not valid JSON.');}await this.restore(payload);location.href='index.html';}});
    if(action==='data-reset')return UI.modal('Reset to demo data',`<p class="info-note">All current Rep-Flow records and photos will be replaced. Other websites’ storage is untouched.</p>${UI.field('Type RESET to confirm','confirm','','text','required pattern="RESET" autocomplete="off"')}`,{submit:'Reset workspace',onSubmit:async p=>{if(p.confirm!=='RESET')throw new Error('Type RESET to confirm.');const db=await buildDemoData();await Storage.locked(()=>Storage.write(db));Auth.clear();location.href='index.html';}});
  }
};
