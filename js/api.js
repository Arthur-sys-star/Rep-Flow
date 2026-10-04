/* All business rules execute locally. No HTTP API or server is required. */
'use strict';
const TICKET_STATUSES = ['New','Diagnosing','Waiting for Approval','Waiting for Parts','In Progress','Testing','Ready','Delivered','Cancelled'];
const NEXT_STATUS = {
  New:['Diagnosing','Cancelled'], Diagnosing:['Waiting for Approval','Waiting for Parts','In Progress','Cancelled'],
  'Waiting for Approval':['In Progress','Cancelled'], 'Waiting for Parts':['In Progress','Cancelled'],
  'In Progress':['Waiting for Parts','Testing','Cancelled'], Testing:['In Progress','Ready','Cancelled'],
  Ready:['In Progress','Delivered'], Delivered:[], Cancelled:[]
};
const MANAGERS = ['admin','staff'];
const money = n => Math.round((Number(n) + Number.EPSILON)*100)/100;
function requireSession(...roles) {
  const u=Auth.getUser();
  if(!u) throw new Error('Please sign in again.');
  if(roles.length && !roles.includes(u.role)) throw new Error('Your role cannot perform this action.');
  return u;
}
function textValue(value,label,required=true,max=2000) {
  const s=String(value??'').trim();
  if(required&&!s) throw new Error(`${label} is required.`);
  if(s.length>max) throw new Error(`${label} is too long (maximum ${max} characters).`);
  return s;
}
function num(value,label,min=0,max=10000000,integer=false) {
  const n=Number(value);
  if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n))) throw new Error(`${label} must be ${integer?'a whole number':'a number'} between ${min} and ${max}.`);
  return n;
}
function choice(value,choices,label) { if(!choices.includes(value)) throw new Error(`Choose a valid ${label}.`); return value; }
function findRecord(db,c,id) { const r=db[c].find(x=>x.id===id); if(!r) throw new Error('This record no longer exists. Refresh and try again.');return r; }
function change(record,patch) { Object.assign(record,patch,{updatedAt:new Date().toISOString()});return record; }
function ticketAccess(db,id) {
  const u=requireSession();const t=findRecord(db,'tickets',id);
  if(u.role==='technician'&&!db.technicians.some(x=>x.id===t.technician_id&&x.user_id===u.id&&x.status==='Active')) throw new Error('This ticket is not assigned to you.');
  return t;
}
function editableTicket(db,id) { const t=ticketAccess(db,id);if(['Delivered','Cancelled'].includes(t.status))throw new Error('This ticket is closed.');return t; }
function noInvoice(db,id) { if(db.billing.some(i=>i.ticket_id===id)) throw new Error('This ticket has an invoice. Delete the unpaid invoice before changing billable parts.'); }
function validEmail(v,required=false) { const s=textValue(v,'Email',required,160).toLowerCase();if(s&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw new Error('Enter a valid email address.');return s; }
function validPhone(v) { const s=textValue(v,'Phone',true,30);if(!/^[+\d\s()-]{7,30}$/.test(s)||s.replace(/\D/g,'').length<7)throw new Error('Enter a valid phone number.');return s; }
const Repo = {
  visibleTickets(db=Storage.database()) {
    const u=requireSession();
    return u.role==='technician'?db.tickets.filter(t=>db.technicians.some(x=>x.id===t.technician_id&&x.user_id===u.id&&x.status==='Active')):db.tickets;
  },
  invoiceBalance(inv,db=Storage.database()) {
    const paid=money(db.payments.filter(p=>p.invoice_id===inv.id).reduce((s,p)=>s+Number(p.amount),0));
    return {paid,balance:money(inv.total-paid),status:paid>=inv.total?'Paid':paid>0?'Partial':'Pending'};
  },
  async saveCustomer(id,p) {
    requireSession(...MANAGERS);
    const data={name:textValue(p.name,'Name',true,100),phone:validPhone(p.phone),email:validEmail(p.email),address:textValue(p.address,'Address',false,500)};
    return Storage.transact(id?'UPDATE':'CREATE','customers',db=>id?change(findRecord(db,'customers',id),data):Storage.record(db,'customers','RF-CUS',data));
  },
  async deleteCustomer(id) {
    requireSession(...MANAGERS);
    return Storage.transact('DELETE','customers',db=>{
      findRecord(db,'customers',id);
      if(db.tickets.some(t=>t.customer_id===id)||db.billing.some(i=>i.customer_id===id))throw new Error('Customers with repair history cannot be deleted.');
      db.customers=db.customers.filter(c=>c.id!==id);return {id};
    });
  },
  async saveTechnician(id,p) {
    requireSession('admin');
    const data={name:textValue(p.name,'Name',true,100),phone:validPhone(p.phone),specialization:textValue(p.specialization,'Specialization',true,150),experience_years:num(p.experience_years,'Experience',0,70),status:choice(p.status,['Active','Inactive'],'status'),user_id:p.user_id||null};
    return Storage.transact(id?'UPDATE':'CREATE','technicians',db=>{
      if(data.user_id){const u=findRecord(db,'users',data.user_id);if(u.role!=='technician')throw new Error('Select a technician login account.');if(db.technicians.some(t=>t.id!==id&&t.user_id===data.user_id))throw new Error('This login is already linked to a technician.');}
      if(data.status==='Inactive'&&db.tickets.some(t=>t.technician_id===id&&!['Delivered','Cancelled'].includes(t.status)))throw new Error('Reassign open tickets before deactivating this technician.');
      return id?change(findRecord(db,'technicians',id),data):Storage.record(db,'technicians','RF-TEC',data);
    });
  },
  async deleteTechnician(id) {
    requireSession('admin');return Storage.transact('DELETE','technicians',db=>{findRecord(db,'technicians',id);if(db.tickets.some(t=>t.technician_id===id))throw new Error('Technicians with ticket history cannot be deleted.');db.technicians=db.technicians.filter(t=>t.id!==id);return {id};});
  },
  async saveUser(id,p) {
    const current=requireSession('admin');
    const data={name:textValue(p.name,'Name',true,100),email:validEmail(p.email,true),role:choice(p.role,['admin','staff','technician'],'role'),is_active:p.is_active===true||p.is_active==='true'};
    if(!id&&!p.password)throw new Error('A password is required.');
    if(p.password){if(String(p.password).length<8)throw new Error('Use at least 8 characters for the demo password.');data.password_hash=await hashPassword(p.password);}
    return Storage.transact(id?'UPDATE':'CREATE','users',db=>{
      if(db.users.some(u=>u.id!==id&&u.email===data.email))throw new Error('An account with this email already exists.');
      if(id===current.id&&(!data.is_active||data.role!=='admin'))throw new Error('You cannot deactivate or remove your own administrator role.');
      const old=id?findRecord(db,'users',id):null;
      if(old&&data.role!=='technician'&&db.technicians.some(t=>t.user_id===id))throw new Error('Unlink this account from its technician profile before changing the role.');
      if(!data.is_active&&db.tickets.some(t=>db.technicians.some(tech=>tech.id===t.technician_id&&tech.user_id===id)&&!['Delivered','Cancelled'].includes(t.status)))throw new Error('Reassign open tickets before deactivating this account.');
      return old?change(old,data):Storage.record(db,'users','RF-USR',data);
    });
  },
  async deleteUser(id) {
    const u=requireSession('admin');return Storage.transact('DELETE','users',db=>{findRecord(db,'users',id);if(id===u.id)throw new Error('You cannot delete your own account.');if(db.technicians.some(t=>t.user_id===id))throw new Error('Unlink this account from its technician profile first.');db.users=db.users.filter(x=>x.id!==id);return {id};});
  },
  async savePart(id,p) {
    requireSession(...MANAGERS);
    const data={name:textValue(p.name,'Part name',true,120),sku:textValue(p.sku,'SKU',true,60).toUpperCase(),category:textValue(p.category,'Category',true,80),supplier:textValue(p.supplier,'Supplier',false,120),purchase_price:money(num(p.purchase_price,'Purchase price')),selling_price:money(num(p.selling_price,'Selling price')),min_stock:num(p.min_stock,'Minimum stock',0,100000,true)};
    return Storage.transact(id?'UPDATE':'CREATE','inventory',db=>{
      if(db.inventory.some(x=>x.id!==id&&x.sku===data.sku))throw new Error('This SKU already exists.');
      if(id)return change(findRecord(db,'inventory',id),data);
      const record=Storage.record(db,'inventory','RF-PRT',{...data,quantity:num(p.quantity,'Quantity',0,100000,true)});
      Storage.record(db,'inventory_tx','RF-MOV',{part_id:record.id,quantity:record.quantity,type:'Opening',note:'Opening stock',ticket_id:null});return record;
    });
  },
  async adjustStock(id,delta,note) {
    requireSession(...MANAGERS);const amount=num(delta,'Stock adjustment',-100000,100000,true);if(!amount)throw new Error('Adjustment cannot be zero.');
    const reason=textValue(note,'Reason',true,300);
    return Storage.transact('ADJUST','inventory',db=>{const part=findRecord(db,'inventory',id);if(part.quantity+amount<0)throw new Error('Stock cannot fall below zero.');change(part,{quantity:part.quantity+amount});Storage.record(db,'inventory_tx','RF-MOV',{part_id:id,quantity:amount,type:'Adjustment',note:reason,ticket_id:null});return part;});
  },
  async deletePart(id) {
    requireSession(...MANAGERS);return Storage.transact('DELETE','inventory',db=>{const p=findRecord(db,'inventory',id);if(p.quantity!==0)throw new Error('Adjust the remaining stock to zero before deleting this part.');if(db.tickets.some(t=>(t.parts||[]).some(x=>x.part_id===id)))throw new Error('Parts used in repair history cannot be deleted.');db.inventory=db.inventory.filter(x=>x.id!==id);return {id};});
  },
  async saveTicket(id,p) {
    const user=requireSession(...MANAGERS);
    const data={customer_id:p.customer_id,device_type:choice(p.device_type,['Laptop','Desktop','Mobile','Tablet','Printer','Other'],'device type'),model:textValue(p.model,'Device / model',true,150),serial_number:textValue(p.serial_number,'Serial number',false,100),issue:textValue(p.issue,'Problem description',true,2000),accessories:textValue(p.accessories,'Accessories',false,300),priority:choice(p.priority,['Low','Normal','High','Urgent'],'priority'),technician_id:p.technician_id||'',due_date:p.due_date||'',estimate:money(num(p.estimate||0,'Estimate'))};
    if(data.due_date&&!/^\d{4}-\d{2}-\d{2}$/.test(data.due_date))throw new Error('Choose a valid due date.');
    return Storage.transact(id?'UPDATE':'CREATE','tickets',db=>{
      findRecord(db,'customers',data.customer_id);
      if(data.technician_id&&findRecord(db,'technicians',data.technician_id).status!=='Active')throw new Error('Choose an active technician.');
      if(id){const t=editableTicket(db,id);if(db.billing.some(i=>i.ticket_id===id)&&t.customer_id!==data.customer_id)throw new Error('The customer cannot be changed after invoicing.');return change(t,data);}
      return Storage.record(db,'tickets','RF-TKT',{...data,status:'New',parts:[],photos:[],notes:[],handover:{},history:[{status:'New',note:'Device checked in',by:user.name,at:new Date().toISOString()}]});
    });
  },
  async setStatus(id,status,note,handover={}) {
    const user=requireSession();return Storage.transact('STATUS','tickets',db=>{
      const t=editableTicket(db,id);if(!(NEXT_STATUS[t.status]||[]).includes(status))throw new Error('This status transition is not allowed.');
      if(user.role==='technician'&&['Delivered','Cancelled'].includes(status))throw new Error('Only front-desk staff can deliver or cancel a ticket.');
      if(status==='Delivered'){
        const invoice=db.billing.find(i=>i.ticket_id===id);if(!invoice||this.invoiceBalance(invoice,db).balance>0)throw new Error('Create and fully settle the invoice before delivery.');
        if(!handover.tested||!handover.accessories||!handover.received)throw new Error('Complete all three handover checks.');
        t.handover=handover;t.deliveredAt=new Date().toISOString();
      }
      if(status==='Cancelled'){
        noInvoice(db,id);
        for(const line of t.parts||[]){const p=findRecord(db,'inventory',line.part_id);p.quantity+=line.quantity;Storage.record(db,'inventory_tx','RF-MOV',{part_id:p.id,quantity:line.quantity,type:'Return',ticket_id:id,note:'Ticket cancelled'});}
        t.parts=[];
      }
      t.history=t.history||[];t.history.push({status,note:textValue(note,'Note',false,1000),by:user.name,at:new Date().toISOString()});return change(t,{status});
    });
  },
  async addNote(id,note) {
    const user=requireSession();const message=textValue(note,'Note',true,2000);
    return Storage.transact('NOTE','tickets',db=>{const t=editableTicket(db,id);t.notes=t.notes||[];t.notes.push({id:crypto.randomUUID(),text:message,by:user.name,at:new Date().toISOString()});return change(t,{});});
  },
  async usePart(id,partId,quantity) {
    requireSession();const qty=num(quantity,'Quantity',1,100000,true);
    return Storage.transact('USE_PART','tickets',db=>{const t=editableTicket(db,id);noInvoice(db,id);const p=findRecord(db,'inventory',partId);if(p.quantity<qty)throw new Error('Not enough stock for this repair.');p.quantity-=qty;t.parts=t.parts||[];const line=t.parts.find(x=>x.part_id===partId);if(line)line.quantity+=qty;else t.parts.push({part_id:partId,name:p.name,sku:p.sku,quantity:qty,unit_price:p.selling_price});Storage.record(db,'inventory_tx','RF-MOV',{part_id:partId,quantity:-qty,type:'Repair',ticket_id:id,note:'Issued to repair'});return change(t,{});});
  },
  async returnPart(id,partId) {
    requireSession();return Storage.transact('RETURN_PART','tickets',db=>{const t=editableTicket(db,id);noInvoice(db,id);const line=(t.parts||[]).find(p=>p.part_id===partId);if(!line)throw new Error('Part is no longer on this ticket.');findRecord(db,'inventory',partId).quantity+=line.quantity;t.parts=t.parts.filter(p=>p.part_id!==partId);Storage.record(db,'inventory_tx','RF-MOV',{part_id:partId,quantity:line.quantity,type:'Return',ticket_id:id,note:'Returned from repair'});return change(t,{});});
  },
  async addPhoto(id,file,kind,caption) {
    ticketAccess(Storage.database(),id);
    if(file.size>5*1024*1024)throw new Error('Choose an image smaller than 5 MB.');
    const dataUrl=await PhotoStore.readAndCompress(file);const photoId='RF-PHOTO-'+crypto.randomUUID();
    await PhotoStore.put(photoId,dataUrl);
    try{return await Storage.transact('PHOTO','tickets',db=>{const t=editableTicket(db,id);t.photos=t.photos||[];if(t.photos.length>=20)throw new Error('Each ticket supports up to 20 repair photos.');t.photos.push({id:photoId,kind:choice(kind,['Before','After'],'photo type'),caption:textValue(caption,'Caption',false,200),at:new Date().toISOString()});return change(t,{});});}
    catch(e){await PhotoStore.remove(photoId);throw e;}
  },
  async deletePhoto(id,photoId) {
    await Storage.transact('DELETE_PHOTO','tickets',db=>{const t=editableTicket(db,id);t.photos=(t.photos||[]).filter(p=>p.id!==photoId);return change(t,{});});await PhotoStore.remove(photoId);
  },
  invoicePreview(t,labor,tax,discount) {
    const parts=money((t.parts||[]).reduce((s,p)=>s+money(p.quantity*p.unit_price),0));
    const laborAmount=money(num(labor,'Labor charge'));const rate=num(tax,'Tax rate',0,100);const discountAmount=money(num(discount,'Discount'));const subtotal=money(parts+laborAmount);
    if(discountAmount>subtotal)throw new Error('Discount cannot exceed the subtotal.');
    const taxable=money(subtotal-discountAmount);const taxAmount=money(taxable*rate/100);
    return {parts_total:parts,labor:laborAmount,subtotal,discount:discountAmount,tax_rate:rate,tax_amount:taxAmount,total:money(taxable+taxAmount)};
  },
  async createInvoice(p) {
    requireSession(...MANAGERS);return Storage.transact('CREATE','billing',db=>{const t=findRecord(db,'tickets',p.ticket_id);if(['Cancelled','Delivered'].includes(t.status))throw new Error('Select an open ticket.');noInvoice(db,t.id);const totals=this.invoicePreview(t,p.labor,p.tax_rate,p.discount);if(totals.total<=0)throw new Error('The invoice total must be greater than zero.');return Storage.record(db,'billing','RF-INV',{ticket_id:t.id,customer_id:t.customer_id,customer:{...findRecord(db,'customers',t.customer_id)},business:{...db.payment_settings},device:t.model,lines:(t.parts||[]).map(x=>({...x})),...totals,notes:textValue(p.notes,'Invoice notes',false,1000)});});
  },
  async deleteInvoice(id) {
    requireSession(...MANAGERS);return Storage.transact('DELETE','billing',db=>{findRecord(db,'billing',id);if(db.payments.some(p=>p.invoice_id===id))throw new Error('Invoices with recorded payments cannot be deleted.');db.billing=db.billing.filter(i=>i.id!==id);return {id};});
  },
  async recordPayment(id,p) {
    requireSession(...MANAGERS);const amount=money(num(p.amount,'Payment amount',0.01));
    return Storage.transact('PAYMENT','billing',db=>{const inv=findRecord(db,'billing',id);if(amount>this.invoiceBalance(inv,db).balance)throw new Error('Payment exceeds the outstanding balance.');const method=choice(p.method,['Cash','UPI','Bank transfer','Card'],'payment method');const reference=textValue(p.reference,'Reference',method!=='Cash',100);if(reference&&db.payments.some(x=>x.method===method&&x.reference===reference))throw new Error('That payment reference has already been recorded.');return Storage.record(db,'payments','RF-PAY',{invoice_id:id,amount,method,reference,note:textValue(p.note,'Payment note',false,500)});});
  },
  async saveSettings(p) {
    requireSession('admin');const settings={};
    for(const key of ['business_name','upi_id','bank_name','account_holder','account_number','ifsc','branch','instructions','address','phone'])settings[key]=textValue(p[key],key.replaceAll('_',' '),key==='business_name',key==='instructions'?1000:250);
    if(settings.upi_id&&!/^[\w.-]+@[\w.-]+$/.test(settings.upi_id))throw new Error('Enter a valid UPI ID or leave it blank.');
    return Storage.transact('UPDATE','settings',db=>{db.payment_settings={...db.payment_settings,...settings};return {id:'payment_settings'};});
  },
  async saveQR(file) {
    requireSession('admin');if(file.size>5*1024*1024)throw new Error('Choose an image smaller than 5 MB.');
    const url=await PhotoStore.readAndCompress(file,1000,.95);const id='RF-QR-'+crypto.randomUUID();await PhotoStore.put(id,url);
    try{return await Storage.transact('QR_UPLOAD','settings',db=>{const old=db.payment_settings.upi_qr_photo_id;db.payment_settings.upi_qr_photo_id=id;if(old&&!db.billing.some(i=>i.business?.upi_qr_photo_id===old)&&db.photo_data)delete db.photo_data[old];return {id};});}catch(e){await PhotoStore.remove(id);throw e;}
  },
  async removeQR() {requireSession('admin');return Storage.transact('QR_REMOVE','settings',db=>{const old=db.payment_settings.upi_qr_photo_id;db.payment_settings.upi_qr_photo_id=null;if(old&&!db.billing.some(i=>i.business?.upi_qr_photo_id===old)&&db.photo_data)delete db.photo_data[old];return {id:'payment_settings'};});}
};
