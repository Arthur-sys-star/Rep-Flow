/* Sample workshop records, seeded once. Browser-local demo accounts only. */

const DEMO_USERS = [
  { id: 'RF-USR-0001', name: 'Admin User', email: 'admin@repflow.com', role: 'admin', password: 'Admin@123' },
  { id: 'RF-USR-0002', name: 'Staff User', email: 'staff@repflow.com', role: 'staff', password: 'Staff@123' },
  { id: 'RF-USR-0003', name: 'Rahul Verma', email: 'technician@repflow.com', role: 'technician', password: 'Tech@123' }
];

const DEMO_TECHNICIANS = [
  { id: 'RF-TEC-0001', user_id: 'RF-USR-0003', name: 'Rahul Verma', phone: '9876543210', specialization: 'Laptop & Desktop Repair', experience_years: 3.5, status: 'Active' },
  { id: 'RF-TEC-0002', user_id: null, name: 'Sana Sheikh', phone: '9123456780', specialization: 'Mobile & Tablet Repair', experience_years: 2.0, status: 'Active' }
];

const DEMO_CUSTOMERS = [
  { id: 'RF-CUS-0001', name: 'Ankit Sharma', phone: '9000011111', email: 'ankit.sharma@example.com', address: 'Andheri West, Mumbai' }
];

const DEMO_PARTS = [
  { name: 'USB-C Charging Port', category: 'Laptop Parts', sku: 'CHG-USBC-01', supplier: 'TechSource Distributors', quantity: 10, purchase_price: 300.00, selling_price: 450.00, min_stock: 3 },
  { name: 'Laptop Battery (Generic 6-cell)', category: 'Laptop Parts', sku: 'BAT-GEN-06', supplier: 'PowerCell India', quantity: 6, purchase_price: 1600.00, selling_price: 2200.00, min_stock: 2 },
  { name: 'Mobile Display Assembly', category: 'Mobile Parts', sku: 'DISP-MOB-01', supplier: 'ScreenHub', quantity: 8, purchase_price: 1300.00, selling_price: 1800.00, min_stock: 3 },
  { name: 'RAM Module 8GB DDR4', category: 'Laptop Parts', sku: 'RAM-DDR4-8', supplier: 'MemoryWorks', quantity: 12, purchase_price: 1100.00, selling_price: 1500.00, min_stock: 4 },
  { name: 'Laptop Keyboard', category: 'Laptop Parts', sku: 'KEY-LAP-01', supplier: 'TechSource Distributors', quantity: 5, purchase_price: 650.00, selling_price: 900.00, min_stock: 2 },
  { name: 'Mobile Battery (Generic)', category: 'Mobile Parts', sku: 'BAT-MOB-01', supplier: 'PowerCell India', quantity: 1, purchase_price: 450.00, selling_price: 650.00, min_stock: 3 },
  { name: 'Printer Ink Cartridge (Black)', category: 'Printer Parts', sku: 'INK-BLK-01', supplier: 'InkDepot', quantity: 15, purchase_price: 380.00, selling_price: 550.00, min_stock: 5 },
  { name: 'HDD to SSD 480GB', category: 'Storage', sku: 'SSD-480-01', supplier: 'MemoryWorks', quantity: 4, purchase_price: 2000.00, selling_price: 2600.00, min_stock: 2 }
];

const DEFAULT_PAYMENT_SETTINGS = {
  business_name: 'Rep-Flow Repair Services',
  upi_id: 'repflow@upi',
  upi_qr_photo_id: null,
  bank_name: 'State Bank of India',
  account_holder: 'Rep-Flow Repair Services',
  account_number: '000000000000',
  ifsc: 'SBIN0000000',
  branch: 'Main Branch',
  instructions: 'Please share the payment screenshot or UTR number with the front desk after paying.'
};

async function buildDemoData() {
    const db = Storage.empty();
    for (const u of DEMO_USERS) {
      const {password,...data} = u;
      Storage.record(db,'users','RF-USR',{...data,password_hash:await hashPassword(password),is_active:true});
    }
    DEMO_TECHNICIANS.forEach(t=>Storage.record(db,'technicians','RF-TEC',t));
    [...DEMO_CUSTOMERS,
      {id:'RF-CUS-0002',name:'Priya Mehta',phone:'9000022222',email:'priya@example.com',address:'Bandra, Mumbai'},
      {id:'RF-CUS-0003',name:'Vikram Rao',phone:'9000033333',email:'vikram@example.com',address:'Powai, Mumbai'}
    ].forEach(c=>Storage.record(db,'customers','RF-CUS',c));
    DEMO_PARTS.forEach(p=>Storage.record(db,'inventory','RF-PRT',p));
    db.payment_settings = {...DEFAULT_PAYMENT_SETTINGS,upi_id:'',bank_name:'',account_holder:'',account_number:'',ifsc:'',branch:'',instructions:'Add your business payment details in Payment settings.'};
    const date = n => {const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
    const examples = [
      ['RF-CUS-0001','Laptop','Dell Inspiron 15','Not charging; inspect the USB-C port.','High','Diagnosing','RF-TEC-0001',1],
      ['RF-CUS-0002','Mobile','Samsung Galaxy A54','Screen flickers after a fall.','Normal','Waiting for Parts','RF-TEC-0002',2],
      ['RF-CUS-0003','Laptop','Lenovo ThinkPad','Slow startup; check storage and memory.','Normal','In Progress','RF-TEC-0001',0],
      ['RF-CUS-0001','Printer','HP LaserJet','Paper jams during printing.','Low','New','',3]
    ];
    examples.forEach(([customer_id,device_type,model,issue,priority,status,technician_id,offset],i)=> {
      const now=new Date();now.setDate(now.getDate()-i-1);
      Storage.record(db,'tickets','RF-TKT',{customer_id,device_type,model,serial_number:'DEMO-'+(1001+i),issue,priority,status,technician_id,due_date:date(offset),estimate:0,accessories:'Device only',parts:[],photos:[],notes:[],handover:{},history:[{status,note:'Sample repair ticket',by:'System',at:now.toISOString()}],createdAt:now.toISOString()});
    });
    db.seeded = true;
    Storage.record(db,'audit_logs','RF-LOG',{userName:'System',action:'INITIALIZE',module:'data',description:'Created sample workshop data',recordId:''});
    return db;
}
async function seedInitialData() {
  Storage.init();
  return Storage.locked(async () => {
    if (Storage.database().seeded) return;
    Storage.write(await buildDemoData());
  });
}
