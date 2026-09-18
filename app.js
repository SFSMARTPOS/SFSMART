// Global Shop Settings — these details control the login screen and all new bills.
const SHOP_SETTINGS_KEY='sf_smart_pos_shop_settings';
let shopSettings=JSON.parse(localStorage.getItem(SHOP_SETTINGS_KEY)||'null');
if(!shopSettings || typeof shopSettings!=='object'){
  shopSettings={name:'',address:'',phone:'',footer:'',logo:''};
  localStorage.setItem(SHOP_SETTINGS_KEY,JSON.stringify(shopSettings));
}else{
  shopSettings={name:shopSettings.name||'',address:shopSettings.address||'',phone:shopSettings.phone||'',footer:shopSettings.footer||'',logo:shopSettings.logo||''};
}
function saveShopSettings(){
  localStorage.setItem(SHOP_SETTINGS_KEY,JSON.stringify(shopSettings));
  if(typeof queuePcSave==='function') queuePcSave();
}

// Product Categories — default categories plus user-added categories.
const CATEGORIES_KEY='sf_smart_pos_categories';
const DEFAULT_CATEGORIES=['Mobile Phone','Accessories','Repair Parts'];
let categories=JSON.parse(localStorage.getItem(CATEGORIES_KEY)||'null');
if(!Array.isArray(categories) || !categories.length) categories=[...DEFAULT_CATEGORIES];
categories=[...new Set(categories.map(x=>String(x||'').trim()).filter(Boolean))];
DEFAULT_CATEGORIES.forEach(c=>{if(!categories.includes(c))categories.push(c)});
function saveCategories(){
  try{localStorage.setItem(CATEGORIES_KEY,JSON.stringify(categories))}catch(e){console.warn('Could not save categories to browser cache',e)}
  if(typeof queuePcSave==='function')queuePcSave();
}
function renderCategoryOptions(selected=''){
  const productSel=document.getElementById('productCategorySelect');
  if(productSel){
    const current=selected||productSel.value||categories[0]||'';
    productSel.innerHTML=categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if(categories.includes(current))productSel.value=current;
  }
  const filter=document.getElementById('catFilter');
  if(filter){
    const current=filter.value;
    filter.innerHTML='<option value="">All Categories</option>'+categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if(categories.includes(current))filter.value=current;
  }
}
function addCategory(){
  const m=document.getElementById('categoryManagerModal');
  if(m){m.classList.add('show');renderCategoryManager();setTimeout(()=>document.getElementById('newCategoryName')?.focus(),50);}
}
function closeCategoryManager(){document.getElementById('categoryManagerModal')?.classList.remove('show')}
function renderCategoryManager(){
  const list=document.getElementById('categoryManagerList');
  if(!list)return;
  list.innerHTML=categories.map((c,i)=>`<div class="category-manager-row"><div class="category-manager-name">${esc(c)}</div><button class="secondary category-edit-btn" onclick="editCategory(${i})">✎ Edit</button><button class="secondary category-delete-btn" onclick="deleteCategory(${i})">🗑 Delete</button></div>`).join('');
}
function addCategoryFromManager(){
  const input=document.getElementById('newCategoryName');
  const name=(input?.value||'').trim();
  if(!name){alert('Category name cannot be empty.');input?.focus();return}
  if(categories.some(c=>c.toLowerCase()===name.toLowerCase())){alert('This category already exists.');input?.focus();return}
  categories.push(name);saveCategories();renderCategoryOptions(name);renderCategoryManager();input.value='';input.focus();
}
function editCategory(index){
  const oldName=categories[index];
  if(!oldName)return;
  const raw=prompt('Edit category name:',oldName);
  if(raw===null)return;
  const name=raw.trim();
  if(!name)return alert('Category name cannot be empty.');
  if(categories.some((c,i)=>i!==index&&c.toLowerCase()===name.toLowerCase()))return alert('This category already exists.');
  categories[index]=name;
  let changedProducts=0;
  if(typeof db==='object'&&db&&Array.isArray(db.products)){
    db.products.forEach(p=>{if(String(p.category||'')===oldName){p.category=name;changedProducts++;}});
  }
  saveCategories();
  if(typeof saveCurrentCompanyData==='function')saveCurrentCompanyData();
  renderCategoryOptions(name);renderCategoryManager();
  if(typeof renderProducts==='function')renderProducts();
  alert('Category updated successfully. '+(changedProducts?changedProducts+' product(s) updated.':''));
}
function deleteCategory(index){
  const name=categories[index];
  if(!name)return;
  if(DEFAULT_CATEGORIES.includes(name)){alert('Default categories cannot be deleted. You can edit them if needed.');return}
  const used=typeof db==='object'&&db&&Array.isArray(db.products)?db.products.filter(p=>String(p.category||'')===name):[];
  if(used.length){alert('Cannot delete this category because '+used.length+' product(s) are using it. Edit the category instead, or move those products to another category first.');return}
  if(!confirm('Delete category “'+name+'”?'))return;
  categories.splice(index,1);saveCategories();renderCategoryOptions();renderCategoryManager();
}
renderCategoryOptions();

// Company management
const COMPANIES_KEY='rasith_mobile_companies';
let companies=JSON.parse(localStorage.getItem(COMPANIES_KEY)||'null');
if(!Array.isArray(companies) || !companies.length){
  companies=[{
    id:Date.now(),
    name:'Rasith Mobile',
    phone:'',
    address:'',
    footer:'Thank you for your business!',
    logo:'icon-512.png',
    active:true
  }];
  localStorage.setItem(COMPANIES_KEY,JSON.stringify(companies));
}
// Ensure older company records have a logo field.
companies.forEach(c=>{if(!c.logo)c.logo='icon-512.png'});
function saveCompanies(){localStorage.setItem(COMPANIES_KEY,JSON.stringify(companies));renderCompanies()}
function openCompanyManagement(){
  if(bypassSecurityForCurrentUser()){showPage('companies');renderCompanies();return;}
  document.getElementById('securityModal').classList.add('show');
  document.getElementById('managementPassword').value='';
  document.getElementById('securityError').textContent='';
}
function openAddCompany(){document.getElementById('companyModal').classList.add('show')}
function closeCompanyModal(){document.getElementById('companyModal').classList.remove('show')}
function renderCompanies(){
  const t=document.getElementById('companyTable'); if(!t)return;
  t.innerHTML=companies.map((c,i)=>`<tr>
    <td><b>${c.name}</b></td><td>${c.phone||'—'}</td><td>${c.address||'—'}</td>
    <td><span class="badge ${c.active?'ok':'low'}">${c.active?'Active':'Inactive'}</span></td>
    <td>${c.active?'<span class="badge ok">Current</span>':`<button class="textbtn" onclick="switchCompany(${i})">Use Company</button>`}
    ${companies.length>1?` <button class="textbtn" onclick="removeCompany(${i})">Remove</button>`:''}</td>
  </tr>`).join('');
}
function switchCompany(i){
  if(!companies[i] || companies[i].active)return;
  saveCurrentCompanyData();
  companies.forEach((c,n)=>c.active=n===i);
  saveCompanies();
  loadCompanyData();
  cart=[];
  if(typeof clearPosFields==='function') clearPosFields();
  refreshAll();
  updateCompanyDisplay();
  applyShopBranding();
  showPage('dashboard');
  alert('Company changed to '+companies[i].name+'\nSeparate stock, sales and customer data loaded.');
}
function removeCompany(i){
  if(companies.length===1)return alert('At least one company must remain.');
  if(companies[i].active)return alert('Switch to another company before removing this company.');
  if(confirm('Remove '+companies[i].name+' and ALL of its stock, sales and customer data?')){
    localStorage.removeItem(COMPANY_DB_PREFIX+companies[i].id);
    companies.splice(i,1);
    saveCompanies();
  }
}
document.getElementById('companyForm').onsubmit=function(e){
  e.preventDefault();
  const name=document.getElementById('companyName').value.trim();
  if(!name)return;
  const id=Date.now();
  const company={
    id,name,
    phone:document.getElementById('companyPhone').value.trim(),
    address:document.getElementById('companyAddress').value.trim(),
    footer:document.getElementById('companyFooter').value.trim()||'Thank you for your business!',
    logo:'icon-512.png',
    active:false
  };
  companies.push(company);
  localStorage.setItem(COMPANY_DB_PREFIX+id,JSON.stringify(emptyCompanyDb(false)));
  saveCompanies();closeCompanyModal();e.target.reset();
  alert(name+' created successfully. Its stock, sales and customer data are separate from '+activeCompany().name+'.');
};
function activeCompany(){return companies.find(c=>c.active)||companies[0]}
function updateCompanyDisplay(){
  const c=activeCompany();
  const title=document.getElementById('pageTitle');
  if(title && document.getElementById('dashboard').classList.contains('active')) title.textContent='Dashboard — '+c.name;
  if(typeof applyShopBranding==='function') applyShopBranding();
}

// User management
const MANAGEMENT_PASSWORD='1302513025';
const USERS_KEY='rasith_mobile_users';
let users=JSON.parse(localStorage.getItem(USERS_KEY)||'null');
if(!Array.isArray(users) || !users.length){
  users=[{username:'admin',password:'admin123',role:'Admin'}];
  localStorage.setItem(USERS_KEY,JSON.stringify(users));
}

let currentUser=null;
// Normalize legacy role names to the new three-role system.
let _rolesChanged=false;
users=users.map(u=>{const role=String(u.role||'Normal User'); const mapped=role==='Admin'?'Owner':(role==='Cashier'?'Normal User':role); if(mapped!==role){_rolesChanged=true; return {...u,role:mapped};} return u;});
if(_rolesChanged)localStorage.setItem(USERS_KEY,JSON.stringify(users));
function saveUsers(){localStorage.setItem(USERS_KEY,JSON.stringify(users));renderUsers()}
function isOwnerOrManager(){const role=String(currentUser?.role||'').trim().toLowerCase();return role==='owner'||role==='manager';}
function bypassSecurityForCurrentUser(){return isOwnerOrManager();}
let securityAction='users';
function openUserManagement(){
  securityAction='users';
  document.getElementById('securityModal').classList.add('show');
  document.getElementById('securityMessage').textContent='Enter the management password to open User Management.';
  document.getElementById('managementPassword').value='';
  document.getElementById('securityError').textContent='';
}
function openDataFolderSecurity(){
  if(bypassSecurityForCurrentUser()){chooseDataFolder();return;}
  securityAction='data-folder';
  document.getElementById('securityModal').classList.add('show');
  document.getElementById('securityMessage').textContent='Enter the management password to choose the PC data storage location.';
  document.getElementById('managementPassword').value='';
  document.getElementById('securityError').textContent='';
}
function openDataBackupSecurity(){
  if(bypassSecurityForCurrentUser()){backupDataFile();return;}
  securityAction='data-backup';
  document.getElementById('securityModal').classList.add('show');
  document.getElementById('securityMessage').textContent='Enter the management password to create a backup file.';
  document.getElementById('managementPassword').value='';
  document.getElementById('securityError').textContent='';
}
function openOldDataLoadSecurity(){
  if(bypassSecurityForCurrentUser()){loadOldDataFile();return;}
  securityAction='data-load-old';
  document.getElementById('securityModal').classList.add('show');
  document.getElementById('securityMessage').textContent='Enter the management password to load backup data.';
  document.getElementById('managementPassword').value='';
  document.getElementById('securityError').textContent='';
}
function openDataRestoreSecurity(){
  if(bypassSecurityForCurrentUser()){restoreDataFromFolder();return;}
  securityAction='data-restore';
  document.getElementById('securityModal').classList.add('show');
  document.getElementById('securityMessage').textContent='Enter the management password to restore data from the PC data store.';
  document.getElementById('managementPassword').value='';
  document.getElementById('securityError').textContent='';
}
function openDataJsonRecoverySecurity(){
  if(bypassSecurityForCurrentUser()){restoreDataFromSelectedJson();return;}
  securityAction='data-json-recovery';
  document.getElementById('securityModal').classList.add('show');
  document.getElementById('securityMessage').textContent='Enter the management password to recover the database from a JSON file.';
  document.getElementById('managementPassword').value='';
  document.getElementById('securityError').textContent='';
}
function openShopSettings(){
  securityAction='shop-settings';
  document.getElementById('securityModal').classList.add('show');
  document.getElementById('securityMessage').textContent='Enter the management password to change shop name, address, contact number or logo.';
  document.getElementById('managementPassword').value='';
  document.getElementById('securityError').textContent='';
}
function loadShopSettingsForm(){
  document.getElementById('shopSettingName').value=shopSettings.name||'';
  document.getElementById('shopSettingPhone').value=shopSettings.phone||'';
  document.getElementById('shopSettingAddress').value=shopSettings.address||'';
  document.getElementById('shopSettingFooter').value=shopSettings.footer||'';
  const preview=document.getElementById('shopLogoPreview');
  if(shopSettings.logo){preview.src=shopSettings.logo;preview.style.display='block'}
  else {preview.removeAttribute('src');preview.style.display='none'}
}
function applyShopBranding(){
  const logo=shopSettings.logo||'';
  const loginLogo=document.getElementById('loginLogo');
  if(loginLogo){if(logo){loginLogo.src=logo;loginLogo.style.display='block'}else{loginLogo.removeAttribute('src');loginLogo.style.display='none'}}
  // Sidebar branding follows Shop Settings too. Blank logo/name stay blank.
  const brandLogo=document.getElementById('brandLogo');
  if(brandLogo){
    if(logo){brandLogo.src=logo;brandLogo.style.display='block'}
    else{brandLogo.removeAttribute('src');brandLogo.style.display='none'}
  }
  const name=document.getElementById('loginShopName'); if(name)name.textContent=shopSettings.name||'';
  const bn=document.getElementById('brandShopName'); if(bn)bn.textContent=shopSettings.name||'';
  const contact=document.getElementById('loginShopContact');
  if(contact){contact.innerHTML=esc(shopSettings.address||'')+((shopSettings.address&&shopSettings.phone)?'<br>':'')+esc(shopSettings.phone||'');contact.style.display=(shopSettings.address||shopSettings.phone)?'block':'none'}
}
function closeSecurity(){document.getElementById('securityModal').classList.remove('show')}
async function verifyManagement(){
  if(document.getElementById('managementPassword').value===MANAGEMENT_PASSWORD){
    const action=securityAction;
    closeSecurity();
    if(action==='data-folder') await chooseDataFolder();
    else if(action==='data-backup') await backupDataFile();
    else if(action==='data-load-old') await loadOldDataFile();
    else if(action==='data-restore') await restoreDataFromFolder();
    else if(action==='data-json-recovery') await restoreDataFromSelectedJson();
    else if(action==='shop-settings'){loadShopSettingsForm();showPage('settings');}
    else { showPage('users'); renderUsers(); }
  }else document.getElementById('securityError').textContent='Incorrect management password.';
}
function renderUsers(){
  const t=document.getElementById('userTable'); if(!t)return;
  t.innerHTML=users.map((u,i)=>`<tr><td><b>${esc(u.username)}</b></td><td><span class="badge ${String(u.role).toLowerCase()==='owner'?'ok':''}">${esc(u.role||'Normal User')}</span></td><td><button class="textbtn" onclick="openEditUserRole(${i})">✎ Edit Role</button> <button class="textbtn" onclick="removeUser(${i})">Remove</button></td></tr>`).join('');
}
function openAddUser(){document.getElementById('userModal').classList.add('show')}
function closeUserModal(){document.getElementById('userModal').classList.remove('show')}
let editingUserRoleIndex=null;
function openEditUserRole(index){
  const u=users[index]; if(!u)return;
  editingUserRoleIndex=index;
  document.getElementById('editUserRoleName').textContent=u.username;
  document.getElementById('editUserRoleSelect').value=['Owner','Manager','Normal User'].includes(u.role)?u.role:'Normal User';
  document.getElementById('editUserRoleModal').classList.add('show');
}
function closeEditUserRole(){editingUserRoleIndex=null;document.getElementById('editUserRoleModal')?.classList.remove('show')}
function saveEditedUserRole(){
  if(editingUserRoleIndex===null)return;
  const u=users[editingUserRoleIndex]; if(!u)return;
  const role=document.getElementById('editUserRoleSelect').value;
  u.role=role;
  if(currentUser && currentUser.username===u.username) currentUser.role=role;
  saveUsers(); closeEditUserRole();
  alert('Role updated successfully for '+u.username+'.');
}
document.getElementById('userForm').onsubmit=function(e){
  e.preventDefault();
  const username=document.getElementById('newUsername').value.trim();
  const password=document.getElementById('newUserPassword').value;
  const role=document.getElementById('newUserRole').value;
  if(users.some(u=>u.username.toLowerCase()===username.toLowerCase()))return alert('Username already exists.');
  users.push({username,password,role});saveUsers();closeUserModal();e.target.reset();
};
function removeUser(i){
  const u=users[i];
  if(!u)return;
  if(confirm('Remove user '+u.username+'?')){
    users.splice(i,1);
    if(users.length===0){
      alert('All users have been removed. Add a new user before the next login.');
    }
    saveUsers();
  }
}

// Simple local login for this prototype.
// Production version should use server-side authentication and hashed passwords.
const AUTH_KEY='rasith_mobile_auth';
function checkLogin(){
  if(sessionStorage.getItem(AUTH_KEY)==='1'){
    const savedUser=sessionStorage.getItem('rasith_current_user');
    currentUser=users.find(x=>x.username===savedUser)||null;
    document.getElementById('loginScreen').style.display='none';
  } else {
    currentUser=null;
    document.getElementById('loginScreen').style.display='grid';
  }
}
document.getElementById('loginForm').onsubmit=function(e){
  e.preventDefault();
  const u=document.getElementById('loginUser').value.trim();
  const p=document.getElementById('loginPass').value;
  const found=users.find(x=>x.username===u && x.password===p);
  if(found){
    currentUser=found;
    sessionStorage.setItem(AUTH_KEY,'1');
    sessionStorage.setItem('rasith_current_user',u);
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('loginError').textContent='';
    startSessionTimer();
    refreshAll();
  }else{
    document.getElementById('loginError').textContent='Invalid username or password.';
  }
};
function logout(){
  clearSessionTimers();
  sessionStorage.removeItem(AUTH_KEY);
  document.getElementById('loginUser').value='';
  document.getElementById('loginPass').value='';
  checkLogin(); if(sessionStorage.getItem(AUTH_KEY)==='1') startSessionTimer();
}
checkLogin();

const COMPANY_DB_PREFIX='rasith_mobile_company_data_';
const LEGACY_KEY='rasith_mobile_v1';
function emptyCompanyDb(withSample=false){
  return {
    products:withSample?[
      {id:1,name:'Samsung A15 5G',code:'RM1001',category:'Mobile Phone',imei:'',cost:58000,price:65000,qty:2,low:1},
      {id:2,name:'Type-C Charging Cable',code:'RM2001',category:'Accessories',imei:'',cost:350,price:700,qty:12,low:3},
      {id:3,name:'iPhone 11 Battery',code:'RM3001',category:'Repair Parts',imei:'',cost:4200,price:6500,qty:1,low:2}
    ]:[],
    sales:[],
    stockEntries:[],
    tempAccounts:[],
    dailyExpenses:[],
    repairs:[],
    technicianProfiles:[],
    technicianCommissions:{},
    repairReceivingItems:['Phone','Tablet','Smart Watch','Laptop','Other'],
    customers:[{name:'Walk-in Customer',phone:'',address:'',outstanding:0}]
  };
}
function activeCompanyDataKey(){return COMPANY_DB_PREFIX+activeCompany().id}
function saveCurrentCompanyData(){
  if(typeof db==='undefined')return;
  localStorage.setItem(activeCompanyDataKey(),JSON.stringify(db));
}
function loadCompanyData(){
  const key=activeCompanyDataKey();
  let stored=JSON.parse(localStorage.getItem(key)||'null');
  if(!stored){
    // One-time migration: move the old single-company database into the first company.
    const legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');
    const firstCompany=companies.length===1 && companies[0].name==='Rasith Mobile';
    stored=(firstCompany && legacy)?legacy:emptyCompanyDb(false);
    localStorage.setItem(key,JSON.stringify(stored));
    if(legacy) localStorage.removeItem(LEGACY_KEY);
  }
  stored.products=Array.isArray(stored.products)?stored.products:[];
  stored.sales=Array.isArray(stored.sales)?stored.sales:[];
  stored.stockEntries=Array.isArray(stored.stockEntries)?stored.stockEntries:[];
  stored.tempAccounts=Array.isArray(stored.tempAccounts)?stored.tempAccounts:[];
  stored.dailyExpenses=Array.isArray(stored.dailyExpenses)?stored.dailyExpenses:[];
  stored.repairs=Array.isArray(stored.repairs)?stored.repairs:[];
  stored.technicianProfiles=Array.isArray(stored.technicianProfiles)?stored.technicianProfiles:[];
  stored.technicianCommissions=(stored.technicianCommissions&&typeof stored.technicianCommissions==='object')?stored.technicianCommissions:{};
  stored.technicianProfiles.forEach(t=>{t.id=t.id||('TECH-'+Date.now()+'-'+Math.random().toString(36).slice(2,7));t.name=String(t.name||'').trim();t.phone=String(t.phone||'');t.joinDate=t.joinDate||'';t.note=String(t.note||'');t.active=t.active!==false;t.commissionHistory=Array.isArray(t.commissionHistory)?t.commissionHistory:[];t.commissionHistory=t.commissionHistory.map(h=>({effectiveMonth:String(h.effectiveMonth||''),rate:Math.min(100,Math.max(0,Number(h.rate||0))),updatedAt:h.updatedAt||''})).filter(h=>/^\d{4}-\d{2}$/.test(h.effectiveMonth)).sort((a,b)=>a.effectiveMonth.localeCompare(b.effectiveMonth));});
  stored.repairs.forEach(r=>{r.receivingItems=Array.isArray(r.receivingItems)&&r.receivingItems.length?r.receivingItems:(r.receivingItem?[r.receivingItem]:[]); r.receivingItem=r.receivingItems.join(', ');});
  stored.repairReceivingItems=Array.isArray(stored.repairReceivingItems)&&stored.repairReceivingItems.length?stored.repairReceivingItems:['Phone','Tablet','Smart Watch','Laptop','Other'];
  stored.products.forEach(p=>{
    p.createdBy=p.createdBy||'Unknown / Old Data';
    p.createdAt=p.createdAt||'';
    p.lastStockUpdatedBy=p.lastStockUpdatedBy||p.createdBy||'Unknown / Old Data';
    p.lastStockUpdatedAt=p.lastStockUpdatedAt||p.createdAt||'';
  });
  stored.sales.forEach(x=>{x.billMadeBy=x.billMadeBy||'Unknown / Old Data'; if(x.payment==='Credit'){x.creditPayments=Array.isArray(x.creditPayments)?x.creditPayments:[]; x.creditPaid=Number(x.creditPaid||0); x.creditBalance=Number.isFinite(Number(x.creditBalance))?Number(x.creditBalance):Math.max(0,Number(x.total||0)-x.creditPaid); x.customerPhone=x.customerPhone||x.whatsapp||''; x.customerAddress=x.customerAddress||'';}});
  stored.customers=Array.isArray(stored.customers)&&stored.customers.length?stored.customers:[{name:'Walk-in Customer',phone:'',address:'',outstanding:0}];
  return stored;
}
let db=loadCompanyData();
migrateTechnicianCommissionData();
let cart=[];
const money=n=>'Rs. '+Number(n||0).toLocaleString('en-LK');
const save=()=>{saveCurrentCompanyData();refreshAll()};
const $=id=>document.getElementById(id);
function clearPosFields(){
  const ids=['saleCustomer','saleWhatsapp','saleAddress','discount','cashReceived'];
  ids.forEach(id=>{const el=$(id);if(el)el.value=id==='saleCustomer'||id==='saleWhatsapp'?'':0});
}

function toggleProductsMenu(force){
 const menu=$('productsSubmenu'), parent=$('productsNav'); if(!menu||!parent)return;
 const open=force===undefined?!menu.classList.contains('show'):!!force;
 menu.classList.toggle('show',open); parent.classList.toggle('expanded',open);
}
function toggleRepairingMenu(force){
 const menu=$('repairingSubmenu'), parent=$('repairingNav'); if(!menu||!parent)return;
 const open=force===undefined?!menu.classList.contains('show'):!!force;
 menu.classList.toggle('show',open); parent.classList.toggle('expanded',open);
}
function showPage(page){
 document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
 const target=$(page); if(target)target.classList.add('active');
 document.querySelectorAll('.nav[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
 const productsArea=page==='products'||page==='stockdetails';
 $('productsNav')?.classList.toggle('active',productsArea);
 if(productsArea)toggleProductsMenu(true);
 const repairingViews=['repairs','technician-commission','my-profit','technician-profiles'];
 const repairingArea=page==='temporary' && repairingViews.includes(temporaryView);
 const temporaryArea=page==='temporary' && !repairingArea;
 $('temporaryNav')?.classList.toggle('active',temporaryArea);
 $('repairingNav')?.classList.toggle('active',repairingArea);
 if(temporaryArea)toggleTemporaryMenu(true);
 if(repairingArea)toggleRepairingMenu(true);
 $('pageTitle').textContent=page==='pos'?'POS Billing':page==='products'?'Add Products':page==='stockdetails'?'Stock Details':page==='credit'?'Credit Customers':page==='temporary'?(repairingArea?'Repairing':'Temporary Accounts'):page[0].toUpperCase()+page.slice(1);
 if(page==='pos'){ $('invoiceNo').textContent=nextInvoice(); renderPosProducts(); renderCart(); }
 if(page==='products')renderProducts(); if(page==='stockdetails')renderStockDetails(); if(page==='sales')renderSales(); if(page==='customers')renderCustomers(); if(page==='credit')renderCredit(); if(page==='temporary'){applyTemporaryView();} if(page==='reports')renderReports();
}
document.querySelectorAll('.nav[data-page]').forEach(b=>b.onclick=()=>{if(b.dataset.page==='settings'){openShopSettings();return}if(b.dataset.page==='temporary'){showTemporaryView('sale');return}showPage(b.dataset.page)});
$('menuBtn').onclick=()=>document.querySelector('.sidebar').classList.toggle('open');

function nextInvoice(){return 'INV-'+String(db.sales.length+1).padStart(5,'0')}
let editingProductId=null;
function openProductModal(){$('modal').classList.add('show');$('productForm').reset();editingProductId=null;renderCategoryOptions();document.querySelector('#productForm button[type=submit]').textContent='Save Product';document.querySelector('#modal .panel-head h2').textContent='Add Product';showEditProductStickerTools(false);if($('productCategorySelect'))$('productCategorySelect').value=categories[0]||''}

let pendingProductStickerPrint=null;
function openProductStickerPrintChoice(product){
  if(!product)return;
  pendingProductStickerPrint={id:product.id,quantity:Math.max(0,Math.floor(Number(product.qty||0)))};
  const name=$('productStickerPrintName'),code=$('productStickerPrintCode'),qty=$('productStickerPrintQty');
  if(name)name.textContent=product.name||'Unnamed Product';
  if(code)code.textContent=product.code||'No code';
  if(qty)qty.textContent=String(pendingProductStickerPrint.quantity);
  const all=$('printProductAllQtyButton');
  if(all){all.disabled=pendingProductStickerPrint.quantity<1;all.textContent=pendingProductStickerPrint.quantity>0?`🏷 PRINT ${pendingProductStickerPrint.quantity} STICKERS`:'🏷 PRINT ALL (NO STOCK QUANTITY)';}
  $('productStickerPrintChoiceModal')?.classList.add('show');
}
function closeProductStickerPrintChoice(){ $('productStickerPrintChoiceModal')?.classList.remove('show'); pendingProductStickerPrint=null; }
function printProductStickerChoice(mode){
  if(!pendingProductStickerPrint)return;
  const product=(db.products||[]).find(p=>String(p.id)===String(pendingProductStickerPrint.id));
  if(!product){closeProductStickerPrintChoice();return alert('Product was not found.');}
  const copies=mode==='all'?Math.max(1,Math.floor(Number(product.qty||0))):1;
  closeProductStickerPrintChoice();
  if(!copies)return;
  openRepairPrintWindow(getProductStickerHtml(product,copies,true),`${product.code||product.name||'Product'} Stickers`);
}
function productStickerQrUrl(product){
  // Product QR must contain ONLY the item code.
  const payload=String(product?.code||'').trim();
  return 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data='+encodeURIComponent(payload);
}
function getShopCodePrefix(shopName){
  const words=String(shopName||'').trim().toUpperCase().split(/\s+/).filter(Boolean);
  if(!words.length) return 'RM';
  const letters=words.map(w=>(w.match(/[A-Z]/)||[''])[0]).join('');
  return (letters||'RM').slice(0,4);
}
function nextProductCode(){
  const prefix=getShopCodePrefix(shopSettings?.name);
  const nums=(db.products||[]).map(p=>{
    const m=String(p.code||'').match(new RegExp('^'+prefix+'(\\d+)$','i'));
    return m?Number(m[1]):0;
  }).filter(Number.isFinite);
  const next=Math.max(0,...nums)+1;
  return prefix+String(next).padStart(5,'0');
}
function getProductStickerHtml(product,copies=1,autoPrint=true){
  const st=getRepairStickerSettings(),layout=calcRepairStickerLayout(st),safeCopies=Math.max(1,Math.floor(Number(copies||1))),qr=productStickerQrUrl(product);
  const printScript=autoPrint?`<script>window.onload=function(){var imgs=[].slice.call(document.images);Promise.all(imgs.map(function(img){return img.complete?Promise.resolve():new Promise(function(res){img.onload=img.onerror=res})})).then(function(){setTimeout(function(){try{window.print()}catch(e){}},400)});};window.onafterprint=function(){setTimeout(function(){try{window.close()}catch(e){}},300)}<\/script>`:'';
  const pages=[];let remaining=safeCopies;
  while(remaining>0){
    const count=Math.min(remaining,layout.capacity);let stickers='';
    for(let i=0;i<count;i++){
      const col=i%layout.cols,row=Math.floor(i/layout.cols);
      stickers+=`<div class="product-sticker" style="left:${(st.marginLeft+col*(st.stickerWidth+st.gapX)).toFixed(2)}mm;top:${(st.marginTop+row*(st.stickerHeight+st.gapY)).toFixed(2)}mm;width:${st.stickerWidth}mm;height:${st.stickerHeight}mm"><div class="product-sticker-inner"><div class="product-sticker-qr-wrap"><img class="product-sticker-qr" src="${qr}" alt="QR Code"><span>SCAN</span></div><div class="product-sticker-info"><div class="product-sticker-brand">${esc(shopSettings.name||'SF SMART POS')}</div><div class="product-sticker-name">${esc(product.name||'Product')}</div><div class="product-sticker-code">CODE: ${esc(product.code||'—')}</div><div class="product-sticker-category">${esc(product.category||'')}</div><div class="product-sticker-price">Rs. ${Number(product.price||0).toLocaleString()}</div></div></div></div>`;
    }
    pages.push(`<div class="product-print-page">${stickers}</div>`);remaining-=count;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(product.code||product.name||'Product')} — Product Sticker Print</title><style>@page{size:${st.pageWidth}mm ${st.pageHeight}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#e9edf2;color:#111;font-family:'Segoe UI',Arial,sans-serif}.preview-bar{position:sticky;top:0;z-index:10;background:#101828;color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px;font-size:13px}.preview-bar button{border:0;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer}.print-btn{background:#fff;color:#172033}.close-btn{background:#344054;color:#fff}.size-note{margin-left:auto;font-size:12px;opacity:.85}.preview-area{padding:28px;display:flex;flex-direction:column;align-items:center;gap:20px}.product-print-page{position:relative;width:${st.pageWidth}mm;height:${st.pageHeight}mm;background:#fff;box-shadow:0 5px 24px rgba(15,23,42,.18);overflow:hidden}.product-sticker{position:absolute;border:0;background:#fff;border-radius:1.4mm;padding:.8mm;overflow:hidden}.product-sticker-inner{width:100%;height:100%;display:flex;align-items:center;gap:1.15mm;padding:.25mm}.product-sticker-qr-wrap{width:${st.qrSize}mm;flex:0 0 ${st.qrSize}mm;height:${st.qrSize}mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}.product-sticker-qr{width:calc(${st.qrSize}mm - 1mm);height:calc(${st.qrSize}mm - 1mm);display:block;object-fit:contain;background:#fff}.product-sticker-qr-wrap span{font-size:3.1px;font-weight:900;letter-spacing:.5px;line-height:1}.product-sticker-info{min-width:0;overflow:hidden;line-height:1.05}.product-sticker-brand{font-size:4px;font-weight:800;letter-spacing:.3px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.product-sticker-name{font-size:6.4px;font-weight:950;margin-top:.55mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.product-sticker-code{font-size:4.2px;font-weight:800;margin-top:.55mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.product-sticker-category{font-size:3.9px;color:#64748b;margin-top:.35mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.product-sticker-price{font-size:6.3px;font-weight:950;margin-top:.7mm;white-space:nowrap}.page-label{display:none}@media print{html,body{background:#fff}.preview-bar{display:none}.preview-area{padding:0;gap:0}.product-print-page{box-shadow:none;page-break-after:always}.product-print-page:last-child{page-break-after:auto}.product-sticker{border:0;border-radius:0}}</style></head><body><div class="preview-bar"><button class="print-btn" onclick="window.print()">🖨 PRINT ${safeCopies} STICKER${safeCopies===1?'':'S'}</button><button class="close-btn" onclick="window.close()">✕ CLOSE</button><span class="size-note">${st.stickerWidth}×${st.stickerHeight}mm • Page ${st.pageWidth}×${st.pageHeight}mm • ${layout.cols} per row</span></div><div class="preview-area">${pages.join('')}</div>${printScript}</body></html>`;
}
function closeModal(){$('modal').classList.remove('show');editingProductId=null;showEditProductStickerTools(false);}
let pendingProductAction=null;
function verifyProductManagement(action='edit', id=null){
 if(bypassSecurityForCurrentUser()){ if(action==='delete') performDeleteProduct(id); else performEditProduct(id); return; }
 pendingProductAction={action,id};
 document.getElementById('productManagementPassword').value='';
 document.getElementById('productSecurityError').textContent='';
 document.getElementById('productSecurityTitle').textContent='Security Verification';
 document.getElementById('productSecurityMessage').textContent=action==='delete' ? 'Enter the management password to delete this product.' : 'Enter the management password to edit this product.';
 document.getElementById('productSecurityModal').classList.add('show');
 setTimeout(()=>document.getElementById('productManagementPassword').focus(),50);
}
function closeProductSecurity(){
 document.getElementById('productSecurityModal').classList.remove('show');
 pendingProductAction=null;
}
function verifyProductManagementModal(){
 const pw=document.getElementById('productManagementPassword').value;
 if(pw!==MANAGEMENT_PASSWORD){
   document.getElementById('productSecurityError').textContent='Incorrect management password.';
   return;
 }
 const pending=pendingProductAction;
 closeProductSecurity();
 if(!pending)return;
 if(pending.action==='delete') performDeleteProduct(pending.id);
 else performEditProduct(pending.id);
}
let pendingSaleAction=null;
function verifySaleManagement(action='edit', invoice=''){
  if(bypassSecurityForCurrentUser()){ if(action==='delete') performDeleteSale(invoice); else performEditSale(invoice); return; }
  pendingSaleAction={action,invoice};
  document.getElementById('productManagementPassword').value='';
  document.getElementById('productSecurityError').textContent='';
  document.getElementById('productSecurityTitle').textContent='Security Verification';
  document.getElementById('productSecurityMessage').textContent=action==='delete' ? 'Enter the management password to delete this bill.' : 'Enter the management password to edit this bill.';
  document.getElementById('productSecurityModal').classList.add('show');
  setTimeout(()=>document.getElementById('productManagementPassword').focus(),50);
}
function editSale(invoice){verifySaleManagement('edit',invoice)}
function deleteSale(invoice){verifySaleManagement('delete',invoice)}
function performSaleSecurityAction(){
  const pw=document.getElementById('productManagementPassword').value;
  if(pw!==MANAGEMENT_PASSWORD){document.getElementById('productSecurityError').textContent='Incorrect management password.';return}
  const pending=pendingSaleAction; closeProductSecurity(); if(!pending)return;
  if(pending.action==='delete') performDeleteSale(pending.invoice); else performEditSale(pending.invoice);
}
const _verifyProductManagementModal=verifyProductManagementModal;
verifyProductManagementModal=function(){ if(pendingSaleAction){performSaleSecurityAction();return} _verifyProductManagementModal(); };
function performDeleteSale(invoice){
  const sale=db.sales.find(s=>s.invoice===invoice); if(!sale)return alert('Invoice not found.');
  const extra=sale.payment==='Credit'?'\n\nThis is a credit bill. Its payment history will also be removed.':'';
  if(!confirm('Delete '+invoice+'?\n\nThe sold stock quantity will be returned to stock.'+extra+'\n\nThis cannot be undone.'))return;
  (sale.items||[]).forEach(item=>{ const p=db.products.find(x=>x.name===item.name); if(p){p.qty=Number(p.qty||0)+Number(item.qty||0);p.lastStockUpdatedBy=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown';p.lastStockUpdatedAt=new Date().toLocaleString();} });
  db.sales=db.sales.filter(s=>s.invoice!==invoice); refreshCreditBalances(); save(); renderSales(); if(typeof renderCredit==='function')renderCredit();
  alert(invoice+' deleted successfully. Stock has been restored.');
}
let editingSaleInvoice=null;
let editingSaleItems=[];
function saleItemProduct(item){
  return db.products.find(p=>String(p.id)===String(item.id)) || db.products.find(p=>p.name===item.name);
}
function performEditSale(invoice){
  const sale=db.sales.find(s=>s.invoice===invoice); if(!sale)return alert('Invoice not found.');
  editingSaleInvoice=invoice;
  editingSaleItems=(sale.items||[]).map(i=>({id:i.id||saleItemProduct(i)?.id||null,name:i.name||'',qty:Number(i.qty||1),originalQty:Number(i.qty||1),price:Number(i.price||0),cost:Number(i.cost??saleItemProduct(i)?.cost??0)}));
  document.getElementById('editSaleInvoice').textContent=invoice;
  document.getElementById('editSaleCustomer').value=sale.customer||'';
  document.getElementById('editSalePhone').value=sale.customerPhone||sale.whatsapp||'';
  document.getElementById('editSaleAddress').value=sale.customerAddress||'';
  document.getElementById('editSaleDiscount').value=Number(sale.discount||0);
  document.getElementById('editSaleCreditNote').textContent=sale.payment==='Credit'?'Credit bill: existing payments are preserved. The new total cannot be less than the amount already paid.':'Stock quantities will be adjusted automatically when you add, change or remove items.';
  renderEditSaleItems();
  document.getElementById('saleEditModal').classList.add('show');
}
function renderEditSaleItems(){
  const box=document.getElementById('editSaleItems'); if(!box)return;
  const options=db.products.map(p=>`<option value="${p.id}">${esc(p.name)} • ${esc(p.code)} • ${money(p.price)}</option>`).join('');
  box.innerHTML=editingSaleItems.map((it,idx)=>{
    const p=saleItemProduct(it), pid=p?.id??it.id??'';
    const maxStock=(p?Number(p.qty||0):0)+Number(it.originalQty||0);
    return `<div class="edit-item-row"><select onchange="editSaleChangeProduct(${idx},this.value)"><option value="">Select product</option>${options}</select><input type="number" min="1" value="${Math.max(1,Number(it.qty||1))}" onchange="editSaleChangeQty(${idx},this.value)"><span class="edit-item-price">${money(it.price)} × ${Number(it.qty||0)} = <b>${money(Number(it.price||0)*Number(it.qty||0))}</b></span><button type="button" class="textbtn danger" onclick="editSaleRemoveItem(${idx})">🗑 Remove</button><span class="edit-item-stock">Stock: ${maxStock}</span></div>`;
  }).join('')||'<p class="muted">No items. Add at least one item.</p>';
  editingSaleItems.forEach((it,idx)=>{const sel=box.querySelectorAll('select')[idx]; if(sel){const p=saleItemProduct(it); if(p)sel.value=String(p.id)}});
  renderEditSaleTotals();
}
function editSaleChangeProduct(idx,value){
  const p=db.products.find(x=>x.id===Number(value)); if(!p)return;
  const it=editingSaleItems[idx]; if(!it)return;
  it.id=p.id;it.name=p.name;it.price=Number(p.price||0);it.cost=Number(p.cost||0);it.qty=Math.max(1,Number(it.qty||1));
  renderEditSaleItems();
}
function editSaleChangeQty(idx,value){
  const it=editingSaleItems[idx]; if(!it)return;
  it.qty=Math.max(1,Math.floor(Number(value)||1)); renderEditSaleItems();
}
function editSaleRemoveItem(idx){
  if(editingSaleItems.length<=1)return alert('A bill must contain at least one item.');
  editingSaleItems.splice(idx,1); renderEditSaleItems();
}
function addEditSaleItem(){
  const hasStock=db.products.some(x=>Number(x.qty||0)>0); if(!hasStock)return alert('No products are currently in stock.');
  // Always insert a NEW blank item at the TOP of the bill.
  // Do not automatically select the first product; the user should choose it.
  editingSaleItems.unshift({id:null,name:'',qty:1,originalQty:0,price:0,cost:0});
  renderEditSaleItems();
  // Put the cursor on the newly created product selector.
  setTimeout(()=>{
    const first=document.querySelector('#editSaleItems select');
    if(first) first.focus();
  },0);
}
function renderEditSaleTotals(){
  const sub=editingSaleItems.reduce((a,i)=>a+Number(i.qty||0)*Number(i.price||0),0);
  const d=Math.max(0,Number(document.getElementById('editSaleDiscount')?.value||0));
  const total=Math.max(0,sub-d);
  if(document.getElementById('editSaleSubtotal'))document.getElementById('editSaleSubtotal').textContent=money(sub);
  if(document.getElementById('editSaleTotal'))document.getElementById('editSaleTotal').textContent=money(total);
}
function closeSaleEditModal(){document.getElementById('saleEditModal').classList.remove('show');editingSaleInvoice=null;editingSaleItems=[]}
function setEditBillSaving(isSaving){
  const modal=document.getElementById('saleEditModal');
  const saveBtn=modal?.querySelector('.modal-actions button.primary');
  const cancelBtn=modal?.querySelector('.modal-actions button.secondary');
  if(!modal||!saveBtn)return;
  if(isSaving){
    saveBtn.dataset.saving='1';
    saveBtn.disabled=true;
    if(cancelBtn)cancelBtn.disabled=true;
    modal.querySelectorAll('input,select,button').forEach(el=>{
      if(el!==saveBtn){el.dataset.sfWasDisabled=el.disabled?'1':'0';el.disabled=true;}
    });
    saveBtn.innerHTML='<span class="sf-save-spinner" aria-hidden="true"></span>SAVING BILL CHANGES...';
    modal.classList.add('sf-saving');
  }else{
    saveBtn.dataset.saving='0';
    saveBtn.disabled=false;
    modal.querySelectorAll('input,select,button').forEach(el=>{
      if(el===saveBtn)return;
      const was=el.dataset.sfWasDisabled;
      if(was!==undefined){el.disabled=was==='1';delete el.dataset.sfWasDisabled;}
    });
    if(cancelBtn)cancelBtn.disabled=false;
    saveBtn.innerHTML='SAVE BILL CHANGES';
    modal.classList.remove('sf-saving');
  }
}

async function saveEditedSale(){
  setEditBillSaving(true);
  try{
  const sale=db.sales.find(s=>s.invoice===editingSaleInvoice); if(!sale){setEditBillSaving(false);return;}
  const customer=document.getElementById('editSaleCustomer').value.trim(), phone=document.getElementById('editSalePhone').value.trim(), address=document.getElementById('editSaleAddress').value.trim(), discount=Math.max(0,Number(document.getElementById('editSaleDiscount').value||0));
  if(!editingSaleItems.length){setEditBillSaving(false);return alert('The bill must contain at least one item.');}
  if(sale.payment==='Credit' && (!customer||!phone)){setEditBillSaving(false);return alert('For Credit bills, Customer Name and Phone / WhatsApp Number are required.');}
  const seen=new Set();
  for(const it of editingSaleItems){
    const p=saleItemProduct(it); if(!p){setEditBillSaving(false);return alert('One of the selected products no longer exists.');}
    if(seen.has(p.id)){setEditBillSaving(false);return alert('The same product cannot be added twice. Please combine its quantity into one line.');}
    seen.add(p.id); it.id=p.id;it.name=p.name;it.price=Number(it.price||p.price||0);it.cost=Number(it.cost??p.cost??0);it.qty=Math.max(1,Math.floor(Number(it.qty)||1));
  }
  const oldItems=(sale.items||[]).map(i=>({p:saleItemProduct(i),qty:Number(i.qty||0)}));
  const oldById={}; oldItems.forEach(x=>{if(x.p)oldById[x.p.id]=(oldById[x.p.id]||0)+x.qty});
  const newById={}; editingSaleItems.forEach(i=>{newById[i.id]=(newById[i.id]||0)+i.qty});
  for(const [id,newQty] of Object.entries(newById)){
    const p=db.products.find(x=>x.id===Number(id)); if(!p){setEditBillSaving(false);return alert('Product not found.');}
    const available=Number(p.qty||0)+(oldById[id]||0);
    if(newQty>available){setEditBillSaving(false);return alert(`${p.name}: only ${available} units are available for this edited bill.`);}
  }
  if(discount>editingSaleItems.reduce((a,i)=>a+Number(i.qty||0)*Number(i.price||0),0)){setEditBillSaving(false);return alert('Discount cannot be greater than the subtotal.');}
  const newSubtotal=editingSaleItems.reduce((a,i)=>a+Number(i.qty||0)*Number(i.price||0),0);
  const newTotal=Math.max(0,newSubtotal-discount), paid=Number(sale.creditPaid||0);
  if(sale.payment==='Credit' && newTotal+0.0001<paid){setEditBillSaving(false);return alert('The new total cannot be less than the amount already paid ('+money(paid)+').');}
  const oldTotal=Number(sale.total||0), oldProfit=Number(sale.profit||0);
  // Return the original sale quantities first, then deduct the edited quantities.
  oldItems.forEach(({p,qty})=>{if(p)p.qty=Number(p.qty||0)+qty});
  editingSaleItems.forEach(i=>{const p=db.products.find(x=>x.id===i.id); if(p)p.qty=Number(p.qty||0)-i.qty});
  const userId=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown';
  const now=new Date().toLocaleString();
  const allIds=new Set([...Object.keys(oldById),...Object.keys(newById)]);
  allIds.forEach(id=>{
    const p=db.products.find(x=>x.id===Number(id)); if(!p)return;
    const delta=(oldById[id]||0)-(newById[id]||0);
    if(delta!==0){
      db.stockEntries.push({date:now,action:'Sale Bill Edit Stock Adjustment',productId:p.id,code:p.code,name:p.name,quantityChange:delta,quantityAfter:Number(p.qty||0),userId,editingSaleInvoice});
      p.lastStockUpdatedBy=userId;p.lastStockUpdatedAt=now;
    }
  });
  const newProfit=editingSaleItems.reduce((a,i)=>a+(Number(i.price||0)-Number(i.cost||0))*Number(i.qty||0),0)-discount;
  sale.customer=customer||'Walk-in Customer'; sale.customerPhone=phone; sale.whatsapp=phone; sale.customerAddress=address; sale.discount=discount; sale.subtotal=newSubtotal; sale.total=newTotal; sale.profit=newProfit;
  sale.items=editingSaleItems.map(i=>({id:i.id,name:i.name,qty:i.qty,price:i.price,cost:i.cost}));
  if(sale.payment==='Credit')sale.creditBalance=Math.max(0,newTotal-paid); else if(sale.payment==='Cash')sale.balance=Math.max(0,Number(sale.cashReceived||0)-newTotal);
  sale.editedBy=userId; sale.editedAt=now;
  const updatedInvoice=editingSaleInvoice;
  // Persist the edited bill first, then close the editor immediately.
  // The old flow refreshed the whole application before closing the modal;
  // any refresh error could leave the editor open and make it appear that
  // SAVE BILL CHANGES did not work.
  refreshCreditBalances();
  // Persist to the browser cache when possible and, critically, wait for the
  // permanent PC-folder write when a PC data folder is connected.
  saveCurrentCompanyData();
  let pcPersisted=true;
  try{
    if(typeof pcDataFolder!=='undefined' && pcDataFolder){
      pcPersisted=await writeSnapshotToFolder(false);
    }
  }catch(e){
    console.error('Edited bill PC persistence failed:',e);
    pcPersisted=false;
  }
  if(!pcPersisted){
    // Do not silently claim a permanent save. Keep the edited data in memory
    // and leave the editor open so the user can reconnect the PC data folder.
    setEditBillSaving(false);
    alert('Bill changes were not permanently saved. Please reconnect your PC data folder in Data & Backup and try again.');
    return;
  }
  closeSaleEditModal();
  try{
    renderSales();
    if(typeof renderCredit==='function')renderCredit();
    if(typeof renderReports==='function')renderReports();
    if(typeof refreshAll==='function')refreshAll();
  }catch(e){ console.error('Post-save refresh error:',e); }
  showEditSaveSuccess(updatedInvoice);
  setEditBillSaving(false);
  }catch(e){
    console.error('Save edited bill error:',e);
    setEditBillSaving(false);
    alert('Could not save the bill changes. No changes were confirmed as saved.');
  }
}
function showToast(message,type='success',duration=4500){
  let toast=document.getElementById('sfGlobalToast');
  if(!toast){
    toast=document.createElement('div');
    toast.id='sfGlobalToast';
    toast.style.cssText='position:fixed;right:24px;top:24px;z-index:100000;min-width:330px;max-width:460px;padding:16px 20px;border-radius:14px;box-shadow:0 14px 36px rgba(0,0,0,.22);font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.45;display:none;cursor:pointer';
    document.body.appendChild(toast);
  }
  const styles={success:['#eaf8ef','#176b35','#9bd5ad','✓'],error:['#fff0f0','#a51d2d','#e2a0a8','✕'],warning:['#fff8e6','#8a5a00','#e8c46a','!'],info:['#eef5ff','#174ea6','#9dbbe8','i']};
  const st=styles[type]||styles.success;
  toast.style.background=st[0];toast.style.color=st[1];toast.style.border='1px solid '+st[2];
  toast.innerHTML='<span style="display:inline-flex;width:25px;height:25px;border-radius:50%;align-items:center;justify-content:center;margin-right:8px;font-weight:900;background:'+st[2]+';color:#fff">'+st[3]+'</span><span style="vertical-align:middle">'+String(message)+'</span>';
  toast.style.display='flex';toast.style.alignItems='center';
  clearTimeout(window.__sfToastTimer);
  window.__sfToastTimer=setTimeout(()=>{toast.style.display='none'},duration);
  toast.onclick=()=>{toast.style.display='none'};
}

function showEditSaveSuccess(invoice){
  let toast=document.getElementById('editSaveSuccessToast');
  if(!toast){
    toast=document.createElement('div');
    toast.id='editSaveSuccessToast';
    toast.style.cssText='position:fixed;right:24px;top:24px;z-index:99999;background:#eaf8ef;border:1px solid #9bd5ad;color:#176b35;border-radius:12px;padding:15px 20px;box-shadow:0 12px 30px rgba(0,0,0,.14);font-weight:700;min-width:300px';
    document.body.appendChild(toast);
  }
  toast.innerHTML='✓ Bill <b>'+esc(invoice)+'</b> changed successfully.<div style="font-size:12px;font-weight:500;margin-top:4px;color:#3f6f50">Bill record and stock changes have been saved.</div>';
  toast.style.display='block';
  clearTimeout(window.__editSaveSuccessTimer);
  window.__editSaveSuccessTimer=setTimeout(()=>{toast.style.display='none'},3500);
}

function getCurrentProductFormStickerData(){
 const f=$('productForm'); if(!f)return null;
 const name=(f.elements.name?.value||'').trim();
 const code=(f.elements.code?.value||'').trim();
 const category=(f.elements.category?.value||'').trim();
 const qty=Math.max(0,Math.floor(Number(f.elements.qty?.value||0)));
 const cost=Math.max(0,Number(f.elements.cost?.value||0));
 const price=Math.max(0,Number(f.elements.price?.value||0));
 if(!name)return null;
 return {id:editingProductId??('EDIT-'+Date.now()),name,code,category,qty,cost,price,imei:(f.elements.imei?.value||'').trim()};
}
function showEditProductStickerTools(show=true){
 const box=$('editProductStickerTools'); if(box)box.style.display=show?'block':'none';
}
function previewProductStickerFromEdit(){
 const product=getCurrentProductFormStickerData();
 if(!product)return alert('Please enter the Product Name first.');
 openRepairPrintWindow(getProductStickerHtml(product,1,false),`${product.code||product.name||'Product'} Sticker Preview`);
}
function openEditProductStickerPrintChoice(){
 const product=getCurrentProductFormStickerData();
 if(!product)return alert('Please enter the Product Name first.');
 window.pendingEditedProductSticker=product;
 const name=$('editProductStickerPrintName'),code=$('editProductStickerPrintCode'),qty=$('editProductStickerPrintQty'),all=$('printEditedProductAllButton'),custom=$('editProductStickerCustomQty');
 if(name)name.textContent=product.name||'Unnamed Product';
 if(code)code.textContent=product.code||'No code';
 if(qty)qty.textContent=String(product.qty);
 if(all){all.disabled=product.qty<1;all.textContent=product.qty>0?`🏷 PRINT ${product.qty} STICKERS`:'🏷 PRINT ALL (NO QUANTITY)';}
 if(custom){custom.value=product.qty>0?Math.min(product.qty,1):1;custom.max=Math.max(1,product.qty||999999);}
 $('editProductStickerPrintChoiceModal')?.classList.add('show');
}
function closeEditProductStickerPrintChoice(){ $('editProductStickerPrintChoiceModal')?.classList.remove('show'); window.pendingEditedProductSticker=null; }
function printEditedProductStickers(mode){
 const product=window.pendingEditedProductSticker; if(!product)return;
 let copies=1;
 if(mode==='all') copies=Math.max(0,Math.floor(Number(product.qty||0)));
 if(mode==='custom'){ copies=Math.max(1,Math.floor(Number($('editProductStickerCustomQty')?.value||1))); if(product.qty>0)copies=Math.min(copies,Math.floor(Number(product.qty))); }
 if(!copies){showToast('No stock quantity is available for printing.','error',3000);return;}
 closeEditProductStickerPrintChoice();
 openRepairPrintWindow(getProductStickerHtml(product,copies,true),`${product.code||product.name||'Product'} Stickers`);
}
function editProduct(id){
 verifyProductManagement('edit',id);
}
function performEditProduct(id){
 const p=db.products.find(x=>x.id===id); if(!p)return;
 editingProductId=id;
 const f=$('productForm'); f.reset();
 renderCategoryOptions(p.category||categories[0]||'Mobile Phone');
 f.elements.name.value=p.name||''; f.elements.code.value=p.code||''; f.elements.category.value=p.category||categories[0]||'Mobile Phone'; f.elements.imei.value=p.imei||''; f.elements.qty.value=p.qty??0; f.elements.cost.value=p.cost??0; f.elements.price.value=p.price??0; f.elements.low.value=p.low??0;
 document.querySelector('#modal .panel-head h2').textContent='Edit Product';
 document.querySelector('#productForm button[type=submit]').textContent='Update Product';
 showEditProductStickerTools(true);
 $('modal').classList.add('show');
}
$('productForm').onsubmit=e=>{
 e.preventDefault();let f=new FormData(e.target);
 const data={name:f.get('name'),code:f.get('code')||nextProductCode(),category:f.get('category'),imei:f.get('imei'),qty:+f.get('qty'),cost:+f.get('cost'),price:+f.get('price'),low:+f.get('low')};
 const userId=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown';
 const now=new Date().toLocaleString();
 if(editingProductId!==null){
   const idx=db.products.findIndex(p=>p.id===editingProductId);
   if(idx>=0){
     const oldQty=Number(db.products[idx].qty||0), newQty=Number(data.qty||0);
     db.products[idx]={...db.products[idx],...data};
     if(oldQty!==newQty){
       db.products[idx].lastStockUpdatedBy=userId;
       db.products[idx].lastStockUpdatedAt=now;
       db.stockEntries.push({date:now,action:'Stock Adjustment',productId:db.products[idx].id,code:db.products[idx].code,name:db.products[idx].name,quantityChange:newQty-oldQty,quantityAfter:newQty,userId});
     }
   }
 }else{
   const id=Date.now();
   const product={id,...data,createdBy:userId,createdAt:now,lastStockUpdatedBy:userId,lastStockUpdatedAt:now};
   db.products.push(product);
   db.stockEntries.push({date:now,action:'Stock Entry',productId:id,code:product.code,name:product.name,quantityChange:Number(data.qty||0),quantityAfter:Number(data.qty||0),userId});
   closeModal();save();
   renderProducts();
   if(Number(data.qty||0)>0) openProductStickerPrintChoice(product);
   else showToast('Product saved. No stock quantity was entered, so there are no quantity stickers to print.','success',3500);
   return;
 }
 closeModal();save();
};

function renderProducts(){
 let q=($('productSearch').value||'').toLowerCase(), cat=$('catFilter').value;
 let arr=db.products.filter(p=>(!cat||p.category===cat)&&[p.name,p.code,p.imei,p.category].join(' ').toLowerCase().includes(q));
 $('productTable').innerHTML=arr.map(p=>`<tr><td>${p.code}</td><td><b>${p.name}</b></td><td>${p.category}</td><td>${p.imei||'—'}</td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td>${p.qty}</td><td><span class="badge ${p.qty<=p.low?'low':'ok'}">${p.qty<=p.low?'Low Stock':'In Stock'}</span></td><td><b>${esc(p.lastStockUpdatedBy||p.createdBy||'Unknown')}</b><br><small>${esc(p.lastStockUpdatedAt||p.createdAt||'')}</small></td><td><button class="textbtn" onclick="editProduct(${p.id})">Edit</button> <button class="textbtn" onclick="deleteProduct(${p.id})">Delete</button></td></tr>`).join('')||'<tr><td colspan="10">No products found.</td></tr>';
}
function deleteProduct(id){
 verifyProductManagement('delete',id);
}
function performDeleteProduct(id){
 const p=db.products.find(x=>x.id===id);
 if(!p)return;
 if(confirm('Delete '+p.name+'? This cannot be undone.')){db.products=db.products.filter(p=>p.id!==id);save()}
}
function renderStockDetails(){
 const products=Array.isArray(db.products)?db.products:[];
 const names=Array.from(new Set([...products.map(p=>String(p.category||'Uncategorized'))]));
 const catNames=(Array.isArray(categories)?categories:[]).concat(names.filter(n=>!categories.includes(n)));
 const rows=catNames.map(category=>{
   const list=products.filter(p=>String(p.category||'Uncategorized')===category);
   const qty=list.reduce((a,p)=>a+Number(p.qty||0),0);
   const cost=list.reduce((a,p)=>a+Number(p.qty||0)*Number(p.cost||0),0);
   const retail=list.reduce((a,p)=>a+Number(p.qty||0)*Number(p.price||0),0);
   const low=list.filter(p=>Number(p.qty||0)<=Number(p.low||0)).length;
   return {category,products:list.length,qty,cost,retail,profit:retail-cost,low};
 }).filter(r=>r.products||r.qty);
 const totalQty=products.reduce((a,p)=>a+Number(p.qty||0),0);
 const totalCost=products.reduce((a,p)=>a+Number(p.qty||0)*Number(p.cost||0),0);
 const totalRetail=products.reduce((a,p)=>a+Number(p.qty||0)*Number(p.price||0),0);
 const totalProfit=totalRetail-totalCost;
 $('stockDetailQty').textContent=totalQty.toLocaleString();
 $('stockDetailCost').textContent=money(totalCost);
 $('stockDetailRetail').textContent=money(totalRetail);
 $('stockDetailProfit').textContent=money(totalProfit);
 renderStockCategoryChart(rows);
 const saleMap={};
 (db.sales||[]).forEach(sale=>(sale.items||[]).forEach(item=>{
   const product=products.find(p=>String(p.id)===String(item.id));
   const category=String(item.category||product?.category||'Uncategorized');
   saleMap[category]=(saleMap[category]||0)+Number(item.qty||0);
 }));
 const saleCategoryNames=Array.from(new Set([...catNames,...Object.keys(saleMap)]));
 const saleRows=saleCategoryNames.map(category=>{
   const list=products.filter(p=>String(p.category||'Uncategorized')===category);
   return {category,sold:Number(saleMap[category]||0),products:list.length};
 }).filter(r=>r.sold>0);
 renderStockSalesCategoryChart(saleRows);
 $('stockCategoryTable').innerHTML=rows.map(r=>`<tr><td><b>${esc(r.category)}</b></td><td>${r.products}</td><td>${r.qty.toLocaleString()}</td><td>${money(r.cost)}</td><td>${money(r.retail)}</td><td>${money(r.profit)}</td><td><span class="badge ${r.low?'low':'ok'}">${r.low}</span></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No stock data available.</td></tr>';
 const sold={};
 (db.sales||[]).forEach(s=>(s.items||[]).forEach(i=>{const id=String(i.id||'');sold[id]=sold[id]||[];sold[id].push(s.date||s.createdAt||'')}));
 const now=Date.now(), FOUR_MONTHS=1000*60*60*24*120;
 const staleProducts=products.map(p=>{
   const dates=(sold[String(p.id)]||[]).map(d=>new Date(d).getTime()).filter(Number.isFinite);
   const lastSale=dates.length?Math.max(...dates):null;
   const entered=new Date(p.createdAt||p.created||now).getTime();
   const anchor=lastSale||entered;
   const days=Math.max(0,Math.floor((now-anchor)/86400000));
   return {...p,lastSale,entered,days,stale:days>=120&&Number(p.qty||0)>0};
 }).filter(p=>p.stale).sort((a,b)=>b.days-a.days);
 const lowProducts=products.filter(p=>Number(p.qty||0)<=Number(p.low||0));
 const overStock=products.filter(p=>Number(p.qty||0)>=Math.max(Number(p.low||0)*4,20));
 const topValue=[...products].sort((a,b)=>(Number(b.qty||0)*Number(b.cost||0))-(Number(a.qty||0)*Number(a.cost||0))).slice(0,3);
 const topCategory=rows.slice().sort((a,b)=>b.qty-a.qty)[0];
 const totalCategories=rows.length;
 const categoryHtml=rows.map(r=>`<button type="button" class="category-glass-item" onclick="showCategoryStockPopup(${JSON.stringify(r.category)})"><span class="category-icon">⌂</span><span class="category-name">${esc(r.category)}</span><strong>${r.qty.toLocaleString()}</strong><small>${r.products} product${r.products===1?'':'s'}</small></button>`).join('');
 $('stockAnalysisList').innerHTML=`
   <div class="analysis-item glass-metric"><span><i class="ios-mini-icon">▥</i> Largest stock category</span><b>${topCategory?esc(topCategory.category):'—'} ${topCategory?'• '+topCategory.qty.toLocaleString()+' units':''}</b></div>
   <div class="analysis-item glass-metric"><span><i class="ios-mini-icon">⌁</i> Low-stock products</span><b>${lowProducts.length}</b></div>
   <button type="button" class="analysis-item glass-metric clickable-analysis ${staleProducts.length?'has-alert':''}" onclick="showStaleStockModal()">
     <span><i class="ios-mini-icon">◷</i> No sales for more than 4 months</span><b>${staleProducts.length} product${staleProducts.length===1?'':'s'}</b><small>Tap to see product, entry date, last sale and exact days without a sale.</small>
   </button>
   <button type="button" class="analysis-item glass-metric clickable-analysis" onclick="showNeverSoldModal()">
     <span><i class="ios-mini-icon">▦</i> Products never sold</span><b>${products.filter(p=>Number(p.qty||0)>0&&!sold[String(p.id)]).length} product${products.filter(p=>Number(p.qty||0)>0&&!sold[String(p.id)]).length===1?'':'s'}</b><small>Tap to see product, stock, category, entry date and pricing details.</small>
   </button>
   <div class="analysis-item glass-metric"><span><i class="ios-mini-icon">◇</i> Highest stock investment</span><b>${topValue[0]?esc(topValue[0].name)+' • '+money(Number(topValue[0].qty||0)*Number(topValue[0].cost||0)):'—'}</b></div>`;
 $('stockRecommendations').innerHTML=`
   <div class="category-total-glass"><span>Total Categories</span><strong>${totalCategories}</strong><small>All categories currently holding products</small></div>
   <div class="category-list-glass">${categoryHtml||'<div class="empty">No category stock data available.</div>'}</div>`;
}
function showStaleStockModal(){
 const products=Array.isArray(db.products)?db.products:[];
 const sold={};
 (db.sales||[]).forEach(s=>(s.items||[]).forEach(i=>{const id=String(i.id||'');sold[id]=sold[id]||[];sold[id].push(s.date||s.createdAt||'')}));
 const now=Date.now(), stale=products.map(p=>{const dates=(sold[String(p.id)]||[]).map(d=>new Date(d).getTime()).filter(Number.isFinite);const lastSale=dates.length?Math.max(...dates):null;const entered=new Date(p.createdAt||now).getTime();const anchor=lastSale||entered;const days=Math.max(0,Math.floor((now-anchor)/86400000));return {...p,lastSale,entered,days}}).filter(p=>Number(p.qty||0)>0&&p.days>=120).sort((a,b)=>b.days-a.days);
 const list=$('staleStockList');
 if(!stale.length){list.innerHTML='<div class="stale-empty">✓ No products currently meet the 4-month no-sale condition.</div>';}else list.innerHTML=stale.map(p=>`<div class="stale-stock-row"><div><strong>${esc(p.name)}</strong><span>${esc(p.code||'No code')} • ${esc(p.category||'Uncategorized')} • ${Number(p.qty||0).toLocaleString()} units</span></div><div class="stale-stock-meta"><span>Entered: <b>${formatAnalysisDate(p.entered)}</b></span><span>${p.lastSale?'Last sale: <b>'+formatAnalysisDate(p.lastSale)+'</b>':'No recorded sale'}</span><strong>${p.days.toLocaleString()} days without sale</strong></div></div>`).join('');
 const m=$('staleStockModal');m.classList.add('show');m.setAttribute('aria-hidden','false');
}
function showNeverSoldModal(){
 const products=Array.isArray(db.products)?db.products:[];
 const sold={};
 (db.sales||[]).forEach(s=>(s.items||[]).forEach(i=>{const id=String(i.id||'');sold[id]=true;}));
 const list=$('neverSoldList');
 const never=products.filter(p=>Number(p.qty||0)>0&&!sold[String(p.id)]).sort((a,b)=>Number(b.qty||0)-Number(a.qty||0));
 if(!never.length){
   list.innerHTML='<div class="stale-empty">✓ All products with available stock have at least one recorded sale.</div>';
 }else{
   list.innerHTML=never.map(p=>{
     const entered=new Date(p.createdAt||p.created||Date.now()).getTime();
     const days=Math.max(0,Math.floor((Date.now()-entered)/86400000));
     const stockValue=Number(p.qty||0)*Number(p.cost||0);
     const salesValue=Number(p.qty||0)*Number(p.price||0);
     return `<div class="never-sold-card">
       <div class="never-sold-top"><div><strong>${esc(p.name)}</strong><span>${esc(p.code||'No code')} • ${esc(p.category||'Uncategorized')}</span></div><div class="never-sold-badge">NEVER SOLD</div></div>
       <div class="never-sold-grid">
         <div><small>Available Stock</small><b>${Number(p.qty||0).toLocaleString()} units</b></div>
         <div><small>Entered Date</small><b>${formatAnalysisDate(entered)}</b></div>
         <div><small>Days in Stock</small><b>${days.toLocaleString()} days</b></div>
         <div><small>Purchase Price</small><b>${money(Number(p.cost||0))}</b></div>
         <div><small>Selling Price</small><b>${money(Number(p.price||0))}</b></div>
         <div><small>Stock Investment</small><b>${money(stockValue)}</b></div>
         <div><small>Potential Sales</small><b>${money(salesValue)}</b></div>
         <div><small>Potential Profit</small><b>${money(salesValue-stockValue)}</b></div>
       </div>
     </div>`;
   }).join('');
 }
 const m=$('neverSoldModal');if(m){m.classList.add('show');m.setAttribute('aria-hidden','false')}
}
function closeNeverSoldModal(){const m=$('neverSoldModal');if(m){m.classList.remove('show');m.setAttribute('aria-hidden','true')}}
function closeStaleStockModal(){const m=$('staleStockModal');if(m){m.classList.remove('show');m.setAttribute('aria-hidden','true')}}
function formatAnalysisDate(ts){const d=new Date(ts);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}):'—'}
function showCategoryStockPopup(category){
 const products=(db.products||[]).filter(p=>String(p.category||'Uncategorized')===String(category));
 const lines=products.map(p=>`${p.name} — ${Number(p.qty||0).toLocaleString()} units`).join('\n');
 alert(`${category}\n\n${products.length} product${products.length===1?'':'s'}\n${products.reduce((a,p)=>a+Number(p.qty||0),0).toLocaleString()} units available\n\n${lines||'No products.'}`);
}
function renderStockCategoryChart(rows){
 const el=$('stockCategoryChart'); if(!el)return;
 if(!rows.length){el.innerHTML='<div class="empty">No stock data available.</div>';return}
 const W=960,H=390,left=64,right=30,top=30,bottom=82,plotW=W-left-right,plotH=H-top-bottom;
 const max=Math.max(...rows.map(r=>Number(r.qty||0)),1);
 const pts=rows.map((r,i)=>({
   x:left+(rows.length===1?plotW/2:(plotW*i/(rows.length-1))),
   y:top+plotH-(Number(r.qty||0)/max)*plotH,
   qty:Number(r.qty||0), category:r.category, products:r.products
 }));
 const smoothPath=(points)=>{
   if(!points.length)return '';
   if(points.length===1)return `M ${points[0].x} ${points[0].y}`;
   let d=`M ${points[0].x} ${points[0].y}`;
   for(let i=1;i<points.length;i++){
     const p0=points[i-1],p1=points[i],dx=(p1.x-p0.x)/2;
     d+=` C ${p0.x+dx} ${p0.y}, ${p1.x-dx} ${p1.y}, ${p1.x} ${p1.y}`;
   }
   return d;
 };
 const line=smoothPath(pts);
 const area=`${line} L ${pts[pts.length-1].x} ${top+plotH} L ${pts[0].x} ${top+plotH} Z`;
 const fmt=v=>Number(v||0).toLocaleString();
 const ticks=[max,max*.75,max*.5,max*.25,0];
 let svg=[`<svg class="stock-line-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Category-wise available stock line chart">`,
   `<defs>
     <linearGradient id="stockLineGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#38bdf8"/><stop offset="45%" stop-color="#6366f1"/><stop offset="100%" stop-color="#c084fc"/></linearGradient>
     <linearGradient id="stockAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38bdf8" stop-opacity=".30"/><stop offset="55%" stop-color="#6366f1" stop-opacity=".14"/><stop offset="100%" stop-color="#0f172a" stop-opacity="0"/></linearGradient>
     <linearGradient id="stockFloorGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1" stop-opacity=".22"/><stop offset="100%" stop-color="#38bdf8" stop-opacity=".02"/></linearGradient>
     <filter id="stockGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
   </defs>`];
 ticks.forEach((v,i)=>{
   const y=top+plotH-(v/max)*plotH;
   svg.push(`<line x1="${left}" y1="${y}" x2="${W-right}" y2="${y}" stroke="rgba(148,163,184,.16)" stroke-width="1" stroke-dasharray="4 6"/><text x="${left-14}" y="${y+4}" text-anchor="end" font-size="12" font-weight="700" fill="#94a3b8">${fmt(Math.round(v))}</text>`);
 });
 pts.forEach(p=>svg.push(`<line x1="${p.x}" y1="${top}" x2="${p.x}" y2="${top+plotH}" stroke="rgba(148,163,184,.07)" stroke-width="1" stroke-dasharray="3 8"/>`));
 svg.push(`<path d="M ${left} ${top+plotH} L ${W-right} ${top+plotH} L ${W-right+14} ${top+plotH-10} L ${left+14} ${top+plotH-10} Z" fill="url(#stockFloorGradient)"/>`);
 svg.push(`<path d="${area}" fill="url(#stockAreaGradient)"/>`);
 svg.push(`<path d="${line}" fill="none" stroke="rgba(15,23,42,.70)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,7)" opacity=".65" filter="url(#stockGlow)"/>`);
 svg.push(`<path d="${line}" fill="none" stroke="rgba(56,189,248,.30)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" filter="url(#stockGlow)"/>`);
 svg.push(`<path class="stock-line-main" d="${line}" fill="none" stroke="url(#stockLineGradient)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`);
 svg.push(`<path d="${line}" fill="none" stroke="rgba(255,255,255,.78)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,-1)"/>`);
 pts.forEach((p,i)=>{
   svg.push(`<g class="stock-line-point" data-index="${i}" transform="translate(${p.x},${p.y})"><circle r="11" fill="rgba(56,189,248,.14)" stroke="rgba(255,255,255,.16)" stroke-width="1"/><circle r="6" fill="#0f172a" stroke="#67e8f9" stroke-width="3"/><circle r="2.2" fill="#fff"/><text x="0" y="-17" text-anchor="middle" font-size="14" font-weight="900" fill="#f8fafc">${fmt(p.qty)}</text></g>`);
 });
 svg.push('</svg>');
 el.innerHTML=`<div class="stock-line-wrap"><div class="stock-line-grid-title"><span>AVAILABLE UNITS</span><b>Category trend</b></div>${svg.join('')}<div class="stock-line-labels">${pts.map(p=>`<div><b>${esc(p.category)}</b><small>${p.products} product${p.products===1?'':'s'}</small></div>`).join('')}</div><div class="stock-line-tooltip" id="stockCategoryTooltip"></div></div>`;
 const tip=$('stockCategoryTooltip');
 el.querySelectorAll('.stock-line-point').forEach(g=>{
   const p=pts[Number(g.dataset.index)];
   const show=()=>{tip.innerHTML=`<b>${esc(p.category)}</b><strong>${fmt(p.qty)} units</strong><span>${p.products} product${p.products===1?'':'s'}</span>`;tip.style.display='block';const r=el.getBoundingClientRect();const x=(p.x/W)*r.width;const y=(p.y/H)*r.height;tip.style.left=Math.min(Math.max(x,80),r.width-80)+'px';tip.style.top=Math.max(12,y-12)+'px';};
   g.addEventListener('mouseenter',show);g.addEventListener('mouseleave',()=>tip.style.display='none');
   g.addEventListener('touchstart',e=>{e.preventDefault();show();},{passive:false});
 });
}

function renderStockSalesCategoryChart(rows){
 const el=$('stockSalesCategoryChart'); if(!el)return;
 if(!rows.length){el.innerHTML='<div class="empty">No sales data available.</div>';return}
 const W=960,H=390,left=64,right=30,top=30,bottom=82,plotW=W-left-right,plotH=H-top-bottom;
 const max=Math.max(...rows.map(r=>Number(r.sold||0)),1);
 const pts=rows.map((r,i)=>({
   x:left+(rows.length===1?plotW/2:(plotW*i/(rows.length-1))),
   y:top+plotH-(Number(r.sold||0)/max)*plotH,
   sold:Number(r.sold||0), category:r.category, products:r.products
 }));
 const smoothPath=(points)=>{
   if(!points.length)return '';
   if(points.length===1)return `M ${points[0].x} ${points[0].y}`;
   let d=`M ${points[0].x} ${points[0].y}`;
   for(let i=1;i<points.length;i++){
     const p0=points[i-1],p1=points[i],dx=(p1.x-p0.x)/2;
     d+=` C ${p0.x+dx} ${p0.y}, ${p1.x-dx} ${p1.y}, ${p1.x} ${p1.y}`;
   }
   return d;
 };
 const line=smoothPath(pts);
 const area=`${line} L ${pts[pts.length-1].x} ${top+plotH} L ${pts[0].x} ${top+plotH} Z`;
 const fmt=v=>Number(v||0).toLocaleString();
 const ticks=[max,max*.75,max*.5,max*.25,0];
 let svg=[`<svg class="stock-line-svg stock-sales-line-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Category-wise sale stock line chart">`,
   `<defs>
     <linearGradient id="salesLineGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#34d399"/><stop offset="48%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#6366f1"/></linearGradient>
     <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#34d399" stop-opacity=".24"/><stop offset="58%" stop-color="#0ea5e9" stop-opacity=".11"/><stop offset="100%" stop-color="#6366f1" stop-opacity="0"/></linearGradient>
     <filter id="salesGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
   </defs>`];
 ticks.forEach(v=>{
   const y=top+plotH-(v/max)*plotH;
   svg.push(`<line x1="${left}" y1="${y}" x2="${W-right}" y2="${y}" stroke="rgba(148,163,184,.16)" stroke-width="1" stroke-dasharray="4 6"/><text x="${left-14}" y="${y+4}" text-anchor="end" font-size="12" font-weight="700" fill="#94a3b8">${fmt(Math.round(v))}</text>`);
 });
 pts.forEach(p=>svg.push(`<line x1="${p.x}" y1="${top}" x2="${p.x}" y2="${top+plotH}" stroke="rgba(148,163,184,.07)" stroke-width="1" stroke-dasharray="3 8"/>`));
 svg.push(`<path d="${area}" fill="url(#salesAreaGradient)"/>`);
 svg.push(`<path d="${line}" fill="none" stroke="rgba(14,165,233,.16)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" filter="url(#salesGlow)"/>`);
 svg.push(`<path d="${line}" fill="none" stroke="url(#salesLineGradient)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`);
 pts.forEach((p,i)=>svg.push(`<g class="stock-line-point sales-line-point" data-index="${i}" transform="translate(${p.x},${p.y})"><circle r="10" fill="rgba(52,211,153,.10)" stroke="rgba(255,255,255,.72)" stroke-width="1"/><circle r="5" fill="#fff" stroke="#0ea5e9" stroke-width="2.5"/><circle r="1.8" fill="#34d399"/><text x="0" y="-16" text-anchor="middle" font-size="14" font-weight="900" fill="#52647d">${fmt(p.sold)}</text></g>`));
 svg.push('</svg>');
 el.innerHTML=`<div class="stock-line-wrap sales-stock-line-wrap"><div class="stock-line-grid-title"><span>SOLD UNITS</span><b>Sales trend by category</b></div>${svg.join('')}<div class="stock-line-labels">${pts.map(p=>`<div><b>${esc(p.category)}</b><small>${p.products} product${p.products===1?'':'s'}</small></div>`).join('')}</div><div class="stock-line-tooltip" id="stockSalesCategoryTooltip"></div></div>`;
 const tip=$('stockSalesCategoryTooltip');
 el.querySelectorAll('.sales-line-point').forEach(g=>{
   const p=pts[Number(g.dataset.index)];
   const show=()=>{tip.innerHTML=`<b>${esc(p.category)}</b><strong>${fmt(p.sold)} units sold</strong><span>${p.products} current product${p.products===1?'':'s'}</span>`;tip.style.display='block';const r=el.getBoundingClientRect();const x=(p.x/W)*r.width;const y=(p.y/H)*r.height;tip.style.left=Math.min(Math.max(x,80),r.width-80)+'px';tip.style.top=Math.max(12,y-12)+'px';};
   g.addEventListener('mouseenter',show);g.addEventListener('mouseleave',()=>tip.style.display='none');
   g.addEventListener('touchstart',e=>{e.preventDefault();show();},{passive:false});
 });
}

function renderPosProducts(){
 let q=($('posSearch').value||'').toLowerCase();
 let arr=db.products.filter(p=>p.qty>0&&[p.name,p.code,p.imei].join(' ').toLowerCase().includes(q)).slice(0,12);
 $('posProducts').innerHTML=arr.map(p=>`<button class="product-pick" onclick="addToCart(${p.id})"><b>${p.name}</b><small>${p.code} • ${money(p.price)} • Stock ${p.qty}</small></button>`).join('')||'<div>No available products.</div>';
}
function addToCart(id){let p=db.products.find(x=>x.id===id), row=cart.find(x=>x.id===id); if(row){if(row.qty<p.qty)row.qty++}else cart.push({id,qty:1});renderCart()}
function renderCart(){
 let sub=0,profit=0;
 $('cart').innerHTML=cart.map(r=>{let p=db.products.find(x=>x.id===r.id);let total=p.price*r.qty;sub+=total;profit+=(p.price-p.cost)*r.qty;return `<div class="cartrow"><span><b>${p.name}</b><br><small>${money(p.price)} each</small></span><input type="number" min="1" max="${p.qty}" value="${r.qty}" onchange="setCartQty(${r.id},this.value)"><b>${money(total)}</b><button class="remove" onclick="removeCart(${r.id})">×</button></div>`}).join('')||'<p>No items added.</p>';
 let d=+$('discount').value||0,total=Math.max(0,sub-d),cash=+$('cashReceived').value||0;
 const payment=$('payment')?.value||'Cash'; const shownBalance=payment==='Credit'?total:(payment==='Cash'?Math.max(0,cash-total):0);
 $('subTotal').textContent=money(sub);$('discTotal').textContent=money(d);$('grandTotal').textContent=money(total);$('balance').textContent=money(shownBalance);
}
function setCartQty(id,v){let p=db.products.find(x=>x.id===id),r=cart.find(x=>x.id===id);r.qty=Math.max(1,Math.min(+v||1,p.qty));renderCart()}
function removeCart(id){cart=cart.filter(x=>x.id!==id);renderCart()}
function clearCart(){cart=[];$('discount').value=0;$('cashReceived').value=0;renderCart()}
function toggleCreditCustomerFields(){
  const isCredit=$('payment')?.value==='Credit';
  if($('saleAddress')) $('saleAddress').style.display=isCredit?'block':'none';
  if($('saleAddressLabel')) $('saleAddressLabel').style.display=isCredit?'block':'none';
  if($('saleCustomer')) $('saleCustomer').placeholder=isCredit?'Required for credit customer':'Walk-in Customer';
  if($('saleWhatsapp')) $('saleWhatsapp').placeholder=isCredit?'Required phone / WhatsApp':'0771234567';
  renderCart();
}
function findOrCreateCreditCustomer(name,phone,address){
  const n=(name||'').trim(), ph=(phone||'').trim();
  let c=db.customers.find(x=>x.name.trim().toLowerCase()===n.toLowerCase() && (ph?x.phone===ph:true));
  if(!c){c={name:n,phone:ph,address:(address||'').trim(),outstanding:0};db.customers.push(c)}
  else {c.phone=ph||c.phone;c.address=(address||'').trim()||c.address}
  return c;
}
function setPosSaleSaving(isSaving, sendWhatsApp=false){
  const printBtn=document.querySelector('#posBilling button[onclick*="handleCompleteSale(false)"]');
  const waBtn=document.querySelector('#posBilling button[onclick*="handleCompleteSale(true)"]');
  let overlay=document.getElementById('sfPosSaleLoading');
  if(isSaving){
    [printBtn,waBtn].forEach(btn=>{
      if(!btn)return;
      btn.disabled=true;
      btn.dataset.sfOriginalText=btn.textContent;
      btn.innerHTML='<span class="sf-pos-spinner" aria-hidden="true"></span>'+((sendWhatsApp&&btn===waBtn)?'SAVING & OPENING WHATSAPP...':'SAVING INVOICE...');
      btn.classList.add('sf-pos-processing');
    });
    if(!overlay){
      overlay=document.createElement('div');
      overlay.id='sfPosSaleLoading';
      overlay.innerHTML='<div class="sf-pos-loading-card"><span class="sf-pos-loading-spinner"></span><b>Saving Invoice...</b><span>Please wait a moment</span></div>';
      document.body.appendChild(overlay);
    }
    overlay.classList.add('show');
  }else{
    [printBtn,waBtn].forEach(btn=>{
      if(!btn)return;
      btn.disabled=false;
      btn.innerHTML=btn.dataset.sfOriginalText||((btn===waBtn)?'SAVE & SEND BILL ON WHATSAPP':'SAVE & PRINT INVOICE');
      delete btn.dataset.sfOriginalText;
      btn.classList.remove('sf-pos-processing');
    });
    if(overlay)overlay.classList.remove('show');
  }
}
async function handleCompleteSale(sendWhatsApp=false){
  setPosSaleSaving(true,sendWhatsApp);
  try{ await completeSale(sendWhatsApp); }
  finally{ setPosSaleSaving(false,sendWhatsApp); }
}

async function completeSale(sendWhatsApp=false){
  if(!Array.isArray(cart) || !cart.length){alert('Please add at least one item.');return;}
  const paymentEl=$('payment'), discountEl=$('discount'), cashEl=$('cashReceived');
  const customerEl=$('saleCustomer'), phoneEl=$('saleWhatsapp'), addressEl=$('saleAddress');
  if(!paymentEl || !discountEl || !cashEl || !customerEl || !phoneEl){alert('POS screen is not ready. Please reopen POS Billing and try again.');return;}
  try{
    let sub=cart.reduce((sum,r)=>{const p=db.products.find(x=>String(x.id)===String(r.id));return sum+(p?Number(p.price||0)*Number(r.qty||0):0)},0);
    let d=Math.max(0,Number(discountEl.value)||0), total=Math.max(0,sub-d);
    let payment=paymentEl.value, cash=Number(cashEl.value)||0;
    if(payment==='Cash'&&cash<total){alert('Cash received is less than the total.');return;}
    if(payment==='Credit'){
      const name=customerEl.value.trim(), phone=phoneEl.value.trim();
      if(!name || !phone){alert('For Credit sales, Customer Name and Phone / WhatsApp Number are required. The bill will not be printed until customer details are entered.');return;}
    }
    const saleWhatsapp=phoneEl.value.trim(), saleAddress=addressEl?.value.trim()||'';
    const customerName=customerEl.value.trim()||'Walk-in Customer';
    let creditCustomer=null;
    if(payment==='Credit') creditCustomer=findOrCreateCreditCustomer(customerName,saleWhatsapp,saleAddress);
    let profit=cart.reduce((sum,r)=>{const p=db.products.find(x=>String(x.id)===String(r.id));return sum+(p?(Number(p.price||0)-Number(p.cost||0))*Number(r.qty||0):0)},0)-d;
    const invoice=nextInvoice(), now=new Date().toLocaleString();
    const sale={invoice,date:now,customer:customerName,customerPhone:saleWhatsapp,customerAddress:saleAddress,whatsapp:saleWhatsapp,
      billMadeBy:currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown',
      company:{name:shopSettings.name||'',phone:shopSettings.phone||'',address:shopSettings.address||'',footer:shopSettings.footer||'',logo:shopSettings.logo||''},
      items:cart.map(r=>{const p=db.products.find(x=>String(x.id)===String(r.id));return {id:p.id,name:p.name,category:p.category||'Uncategorized',qty:Number(r.qty||0),price:Number(p.price||0),cost:Number(p.cost||0)}}),
      subtotal:sub,discount:d,total,payment,cashReceived:payment==='Cash'?cash:0,balance:payment==='Cash'?Math.max(0,cash-total):0,profit,
      creditPaid:0,creditBalance:payment==='Credit'?total:0,creditPayments:[]};

    // Update the live database first. When a PC folder is connected, it is the
    // primary durable store for this transaction.
    cart.forEach(r=>{const p=db.products.find(x=>String(x.id)===String(r.id));if(p)p.qty-=Number(r.qty||0)});
    db.sales.unshift(sale);
    if(creditCustomer)creditCustomer.outstanding=Number(creditCustomer.outstanding||0)+total;

    let pcSaved=false, localSaved=false;
    // PC-folder storage is the primary durable store. If Chrome cleared its
    // saved folder handle, ask the user to reconnect the same data folder
    // instead of failing the invoice with a misleading 'no storage' error.
    if(!pcDataFolder){
      try{pcDataFolder=await getSavedFolderHandle()}catch(e){pcDataFolder=null}
    }
    if(pcDataFolder){
      try{
        pcSaved=await writeSnapshotToFolder(false);
      }catch(saveError){
        pcSaved=false;
        console.error('Permanent PC save error:',saveError);
      }
    }
    if(!pcSaved && !pcDataFolder && window.showDirectoryPicker){
      try{
        const reconnect=confirm('Your permanent PC data folder is not connected.\n\nClick OK to select the same SF SMART POS SYSTEM data folder now.\nClick Cancel to use browser storage if available.');
        if(reconnect){
          const handle=await window.showDirectoryPicker({mode:'readwrite'});
          if(await verifyFolderPermission(handle,true)){
            pcDataFolder=handle;
            await saveFolderHandle(handle);
            updatePcDataStatus(true);
            const existing=await handle.getFileHandle(PC_DATA_FILE,{create:false}).catch(()=>null);
            if(existing){
              const useFolderData=confirm('SF SMART POS SYSTEM data file found in this folder.\n\nOK = load the folder data first (recommended).\nCancel = keep the current screen data and overwrite the folder file.');
              if(useFolderData){
                const loaded=await loadSnapshotFile(handle);
                if(loaded){
                  alert('Folder data was loaded. Please verify the invoice/cart before saving again.');
                  return;
                }
              }
            }
            pcSaved=await writeSnapshotToFolder(false);
          }
        }
      }catch(reconnectError){
        if(reconnectError && reconnectError.name!=='AbortError') console.error('PC folder reconnect error:',reconnectError);
      }
    }
    // Browser cache is only a secondary fallback. A localStorage failure must
    // never reject an invoice that has already been written to the PC database.
    try{localStorage.setItem(activeCompanyDataKey(),JSON.stringify(db));localSaved=true}
    catch(saveError){localSaved=false;console.warn('Browser storage unavailable; permanent PC database is being used.',saveError)}

    // Do not print until we have confirmed that the invoice is durably saved.
    if(!pcSaved && !localSaved){
      db.sales=db.sales.filter(s=>s!==sale);
      cart=sale.items.map(i=>({id:i.id,qty:i.qty}));
      cart.forEach(r=>{const p=db.products.find(x=>String(x.id)===String(r.id));if(p)p.qty+=Number(r.qty||0)});
      if(creditCustomer)creditCustomer.outstanding=Math.max(0,Number(creditCustomer.outstanding||0)-total);
      renderCart();
      showToast('Invoice '+invoice+' was NOT saved. Please reconnect the SF SMART POS SYSTEM PC data folder in Data & Backup and try again.','error',7000);
      return;
    }

    let printed=false;
    try{printed=!!printInvoice(sale)}catch(printError){console.error('Invoice print error:',printError)}
    if(sendWhatsApp){try{sendBillWhatsApp(sale)}catch(waError){console.error('WhatsApp error:',waError)}}
    try{refreshAll()}catch(refreshError){console.error('Dashboard refresh error after sale:',refreshError)}
    clearCart();customerEl.value='';phoneEl.value='';if(addressEl)addressEl.value='';toggleCreditCustomerFields();

    if(!printed){
      showToast('Invoice '+invoice+' saved successfully, but the print window could not be opened. You can use Reprint Bill from Sales History.','warning',7000);
    }else{
      showToast('Invoice '+invoice+' saved successfully. Print window opened.','success',4500);
    }
  }catch(error){console.error('completeSale unexpected error:',error);showToast('Invoice could not be completed. No invoice was confirmed as saved.','error',7000);}
}

function normalizeWhatsAppNumber(value){
 let n=(value||'').replace(/\D/g,'');
 if(n.startsWith('0')) n='94'+n.slice(1);
 if(n.startsWith('94')) return n;
 return n;
}
function sendBillWhatsApp(s){
 const number=normalizeWhatsAppNumber(s.whatsapp);
 if(!number){
   alert('Please enter the customer WhatsApp number before sending the bill.');
   return;
 }
 const company=s.company||shopSettings;
 const lines=[`*${company.name}*`,`Invoice: ${s.invoice}`,`Date: ${s.date}`,`Customer: ${s.customer}`,s.customerPhone?`Phone: ${s.customerPhone}`:'',...s.items.map(i=>`${i.name} x${i.qty} = ${money(i.qty*i.price)}`),'',`*TOTAL: ${money(s.total)}*`,`Payment: ${s.payment}`,s.payment==='Credit'?`Credit Paid: ${money(+s.creditPaid||0)}`:'',s.payment==='Credit'?`Credit Balance: ${money(+s.creditBalance||s.total||0)}`:'',company.footer||'Thank you for your business!'];
 const url='https://wa.me/'+number+'?text='+encodeURIComponent(lines.join('\n'));
 window.open(url,'_blank');
}
function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
// Show a confirmation in the main POS window after the print dialog is closed.
window.addEventListener('message',function(e){
  if(e && e.data && e.data.type==='sf-invoice-printed'){
    const inv=String(e.data.invoice||'');
    showToast('Invoice '+inv+' printed successfully.','success',5000);
  }
  if(e && e.data && e.data.type==='sf-invoice-print-error'){
    const inv=String(e.data.invoice||'');
    showToast('Invoice '+inv+' was saved, but printing could not be completed. Please use Reprint Bill.','warning',7000);
  }
});

function getInvoiceHtml(s, autoPrint=false){
 const company={name:shopSettings.name||'',address:shopSettings.address||'',phone:shopSettings.phone||'',footer:shopSettings.footer||'',logo:shopSettings.logo||''};
 const subtotal=Number.isFinite(+s.subtotal)?+s.subtotal:s.items.reduce((a,i)=>a+i.qty*i.price,0);
 const discount=Number.isFinite(+s.discount)?+s.discount:Math.max(0,subtotal-(+s.total||0));
 const total=+s.total||0;
 const itemRows=s.items.map(i=>`<tr><td class="item">${esc(i.name)}<span>${money(i.price)} × ${i.qty}</span></td><td class="qty">${i.qty}</td><td class="amt">${money(i.qty*i.price)}</td></tr>`).join('');
 const footer=company.footer||'Thank you for your business!';
 const printScript=autoPrint?`<script>window.onload=function(){setTimeout(function(){try{window.print()}catch(err){try{if(window.opener&&!window.opener.closed){window.opener.postMessage({type:'sf-invoice-print-error',invoice:${JSON.stringify(s.invoice)}},'*')}}catch(e){}}},250)};window.onafterprint=function(){try{if(window.opener&&!window.opener.closed){window.opener.postMessage({type:'sf-invoice-printed',invoice:${JSON.stringify(s.invoice)}},'*')}}catch(e){};setTimeout(function(){try{window.close()}catch(e){}},200)}</script>`:'';
 return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.invoice)}</title><style>
 @page{size:80mm auto;margin:3mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:'Segoe UI',Arial,Helvetica,sans-serif}body{width:74mm;margin:0 auto;font-size:11px;line-height:1.35}.head{padding:2px 0 8px;border-bottom:2px solid #111;text-align:center}.invoice-logo{width:18mm;height:18mm;object-fit:contain;display:block;margin:0 auto 3px}.head-info{min-width:0;text-align:center;padding-top:0}.shop{font-size:22px;font-weight:900;line-height:1.12;letter-spacing:.2px;text-align:center}.contact{font-size:13px;font-weight:600;line-height:1.4;margin-top:5px;word-break:break-word;text-align:center}.title{font-size:13px;font-weight:900;letter-spacing:1px;margin-top:7px;text-align:center}.meta{padding:8px 0 5px;font-size:10.5px}.meta div{display:flex;gap:6px;margin:2px 0}.meta b{min-width:53px}.rule{border-top:1px dashed #555;margin:4px 0 6px}table{width:100%;border-collapse:collapse;table-layout:fixed}th{font-size:9.5px;font-weight:800;text-transform:uppercase;border-bottom:1px solid #111;padding:4px 0;text-align:left}.item{width:55%;font-weight:700;vertical-align:top;padding:5px 0}.item span{display:block;font-size:9px;font-weight:400;margin-top:1px}.qty{width:12%;text-align:center;vertical-align:top;padding:5px 0;font-weight:700}.amt{width:33%;text-align:right;vertical-align:top;padding:5px 0;font-weight:700;white-space:nowrap}.totals{margin-top:5px;border-top:1px solid #111;padding-top:4px}.totals div{display:flex;justify-content:space-between;padding:2px 0}.grand{font-size:15px;font-weight:900;border-top:2px solid #111;margin-top:4px;padding-top:5px}.payment{margin-top:6px;padding:5px 0;border-top:1px dashed #555;font-size:10.5px}.thanks{text-align:center;border-top:1px solid #111;margin-top:8px;padding-top:8px;font-weight:700;font-size:10.5px;line-height:1.5}.small{font-size:9px;font-weight:400} @media print{body{width:74mm}.no-print{display:none}}
 </style></head><body>
 <div class="head">${company.logo?`<img class="invoice-logo" src="${company.logo}" alt="Logo">`:''}<div class="head-info"><div class="shop">${esc(company.name||'')}</div><div class="contact">${esc(company.address||'')}${company.address&&company.phone?'<br>':''}${esc(company.phone||'')}</div></div><div class="title">SALES INVOICE</div></div>
 <div class="meta"><div><b>Invoice</b><span>${esc(s.invoice)}</span></div><div><b>Date</b><span>${esc(s.date)}</span></div><div><b>Customer</b><span>${esc(s.customer)}</span></div>${s.payment==='Credit'&&s.customerPhone?`<div><b>Phone</b><span>${esc(s.customerPhone)}</span></div>`:''}${s.payment==='Credit'&&s.customerAddress?`<div><b>Address</b><span>${esc(s.customerAddress)}</span></div>`:''}</div>
 <div class="rule"></div>
 <table><thead><tr><th>Item</th><th class="qty">Qty</th><th class="amt">Amount</th></tr></thead><tbody>${itemRows}</tbody></table>
 <div class="totals"><div><span>Subtotal</span><b>${money(subtotal)}</b></div>${discount>0?`<div><span>Discount</span><b>- ${money(discount)}</b></div>`:''}<div class="grand"><span>TOTAL</span><span>${money(total)}</span></div></div>
 <div class="payment"><b>Payment:</b> ${esc(s.payment)}${s.payment==='Cash'?`<br><b>Cash Received:</b> ${money(+s.cashReceived||0)}${Number(s.change||0)>0?`<br><b>Change:</b> ${money(+s.change||0)}`:`<br><b>Balance Due:</b> ${money(+s.balance||0)}`}`:''}${s.payment==='Credit'?`<br><b>Credit Paid:</b> ${money(+s.creditPaid||0)}<br><b>Credit Balance:</b> ${money(+s.creditBalance||s.total||0)}`:''}</div>
 <div class="thanks">${esc(footer)}<br><span class="small">Thank you for your business.</span></div>${printScript}</body></html>`;
}
function printInvoice(s){
 let w=window.open('','_blank','width=420,height=760'); if(!w)return false;
 w.document.write(getInvoiceHtml(s,true));
 w.document.close();
 return true;
}

let tempItemRows=[];
let temporaryView='dashboard';
let pendingTemporaryAction=null;
let technicianProfileAccessGranted=false;
let verifiedRepairingView=null;
let editingTemporaryRef=null;
let editingTemporaryItems=[];
let temporaryInvoiceViewRef='';
let temporaryCustomerBillsRef='';
let editingTemporaryPaymentRef='';

function toggleTemporaryMenu(force){
  const menu=$('temporarySubmenu'),parent=$('temporaryNav'); if(!menu||!parent)return;
  const open=force===undefined?!menu.classList.contains('show'):!!force;
  menu.classList.toggle('show',open); parent.classList.toggle('expanded',open);
}
function applyTemporaryView(){
  ['dashboard','sale','sales','credit','payment','expenses','income','technician-commission','my-profit','technician-profiles','repairs'].forEach(v=>{const el=$('temporary'+(v==='dashboard'?'Dashboard':v==='sale'?'Sale':v==='sales'?'Sales':v==='credit'?'Credit':v==='payment'?'Payment':v==='expenses'?'Expenses':v==='income'?'Income':v==='technician-commission'?'TechnicianCommission':v==='my-profit'?'MyProfit':v==='technician-profiles'?'TechnicianProfiles':'Repairs')+'View');if(el)el.style.display=v===temporaryView?'block':'none';});
  if(temporaryView==='sale')initTemporaryForm();
  if(temporaryView==='sales')renderTemporarySalesHistory();
  if(temporaryView==='dashboard')renderTemporaryDashboard();
  if(temporaryView==='income')renderTemporaryIncome();
  if(temporaryView==='expenses')renderTemporaryExpenses();
  if(temporaryView==='technician-commission')renderTechnicianCommission();
  if(temporaryView==='my-profit')renderMyProfitDashboard();
  if(temporaryView==='technician-profiles')renderTechnicianProfiles();
  if(temporaryView==='credit')renderTemporaryCredit();
  if(temporaryView==='payment'){renderTemporaryPaymentCustomers();updateTemporaryPaymentBalance();}
  if(temporaryView==='repairs')initRepairServiceView();
}
function showTemporaryView(view='sale'){
  const securedRepairingViews=['technician-commission','my-profit','technician-profiles'];
  if(securedRepairingViews.includes(view) && !bypassSecurityForCurrentUser()){
    if(verifiedRepairingView===view){verifiedRepairingView=null;}
    else {
      pendingTemporaryAction={action:'repairing-view',view};
      openTemporarySecurity('repairing-view');
      return;
    }
  }
  temporaryView=view;
  showPage('temporary');
  ['dashboard','sale','sales','credit','payment','expenses','income','technician-commission','my-profit','technician-profiles','repairs'].forEach(v=>{const el=$('temporary'+(v==='dashboard'?'Dashboard':v==='sale'?'Sale':v==='sales'?'Sales':v==='credit'?'Credit':v==='payment'?'Payment':v==='expenses'?'Expenses':v==='income'?'Income':v==='technician-commission'?'TechnicianCommission':v==='my-profit'?'MyProfit':v==='technician-profiles'?'TechnicianProfiles':'Repairs')+'View');if(el)el.style.display=v===view?'block':'none';});
  const repairingViews=['repairs','technician-commission','my-profit','technician-profiles'];
  if(repairingViews.includes(view)) toggleRepairingMenu(true); else toggleTemporaryMenu(true);
  if(view==='sale')initTemporaryForm();
  if(view==='sales')renderTemporarySalesHistory();
  if(view==='dashboard')renderTemporaryDashboard();
  if(view==='income')renderTemporaryIncome();
  if(view==='expenses')renderTemporaryExpenses();
  if(view==='technician-commission')renderTechnicianCommission();
  if(view==='my-profit')renderMyProfitDashboard();
  if(view==='technician-profiles')renderTechnicianProfiles();
  if(view==='credit'){renderTemporaryCredit();}
  if(view==='payment'){renderTemporaryPaymentCustomers();updateTemporaryPaymentBalance();}
  if(view==='repairs')initRepairServiceView();
}
function isTodayDate(value){try{return new Date(value).toLocaleDateString()===new Date().toLocaleDateString()}catch(e){return false}}
function temporaryIncomeToday(){return (db.tempAccounts||[]).filter(x=>(x.type==='Cash Sale'||x.type==='Credit Sale'||x.type==='Sale'||x.type==='Credit')&&isTodayDate(x.date)).reduce((a,x)=>a+Number(x.total||0),0)}
function temporaryExpensesToday(){return (db.dailyExpenses||[]).filter(x=>isTodayDate(x.date)).reduce((a,x)=>a+Number(x.amount||0),0)}
function myProfitMonthKey(r){return repairAnalysisMonthKey(r);}
function myProfitDateRange(){
  const from=($('myProfitFromMonth')?.value||'').trim(), to=($('myProfitToMonth')?.value||'').trim();
  return {from,to};
}
function myProfitRangeFilter(r){
  const key=myProfitMonthKey(r); if(!key)return false;
  const {from,to}=myProfitDateRange();
  if(from && key<from)return false;
  if(to && key>to)return false;
  return true;
}
function getMyProfitRepairNumbers(r){
  const itemCost=repairItemsTotal(r), itemSale=repairItemSaleTotal(r);
  const itemProfit=repairItemSaleProfit(r);
  const serviceProfit=repairServiceCharge(r);
  const rate=getRepairCommissionRate(r);
  const technicianCommission=serviceProfit*rate/100;
  const myServiceCommission=Math.max(0,serviceProfit-technicianCommission);
  const myTotalProfit=itemProfit+myServiceCommission;
  return {itemCost,itemSale,itemProfit,serviceProfit,rate,technicianCommission,myServiceCommission,myTotalProfit};
}
function myProfitFilteredRepairs(){return (db.repairs||[]).filter(r=>r.status==='Finished'&&myProfitRangeFilter(r)).sort((a,b)=>new Date(b.finishedDate||b.date)-new Date(a.finishedDate||a.date));}
function renderMyProfitDashboard(){
  const tokenTable=$('myProfitTokenTable'), monthTable=$('myProfitMonthlyTable'), techTable=$('myProfitTechnicianTable');
  const repairs=myProfitFilteredRepairs();
  let itemProfit=0,serviceCommission=0,totalProfit=0,techCommission=0,serviceProfit=0;
  repairs.forEach(r=>{const n=getMyProfitRepairNumbers(r);itemProfit+=n.itemProfit;serviceCommission+=n.myServiceCommission;totalProfit+=n.myTotalProfit;techCommission+=n.technicianCommission;serviceProfit+=n.serviceProfit;});
  if($('myProfitItemProfit'))$('myProfitItemProfit').textContent=money(itemProfit);
  if($('myProfitServiceCommission'))$('myProfitServiceCommission').textContent=money(serviceCommission);
  if($('myProfitTotalProfit'))$('myProfitTotalProfit').textContent=money(totalProfit);
  if($('myProfitTechnicianCommission'))$('myProfitTechnicianCommission').textContent=money(techCommission);
  if($('myProfitServiceProfit'))$('myProfitServiceProfit').textContent=money(serviceProfit);
  if($('myProfitRepairCount'))$('myProfitRepairCount').textContent=repairs.length;
  if($('myProfitRangeLabel')){
    const {from,to}=myProfitDateRange();
    $('myProfitRangeLabel').textContent=from||to?`${from||'All'} → ${to||'All'}`:'All finished repairs';
  }
  if(tokenTable){
    tokenTable.innerHTML=repairs.map(r=>{const n=getMyProfitRepairNumbers(r);const month=myProfitMonthKey(r);return `<tr><td><b>${esc(r.token)}</b></td><td>${esc(r.finishedDate||r.date||'')}</td><td>${esc(r.customerName||'')}</td><td>${esc(r.deviceModel||'')}</td><td>${esc(r.technician||'Not assigned')}</td><td>${money(n.technicianCommission)}<br><small>${n.rate}%</small></td><td><b>${money(n.myServiceCommission)}</b><br><small>${money(n.serviceProfit)} − tech commission</small></td><td><b>${money(n.itemProfit)}</b></td><td><b>${money(n.myTotalProfit)}</b></td></tr>`;}).join('')||'<tr><td colspan="9">No finished repair records found for the selected month range.</td></tr>';
  }
  const months={}; repairs.forEach(r=>{const m=myProfitMonthKey(r);const n=getMyProfitRepairNumbers(r);if(!months[m])months[m]={itemProfit:0,serviceCommission:0,totalProfit:0,serviceProfit:0,techCommission:0,count:0};months[m].itemProfit+=n.itemProfit;months[m].serviceCommission+=n.myServiceCommission;months[m].totalProfit+=n.myTotalProfit;months[m].serviceProfit+=n.serviceProfit;months[m].techCommission+=n.technicianCommission;months[m].count++;});
  if(monthTable){monthTable.innerHTML=Object.entries(months).sort((a,b)=>b[0].localeCompare(a[0])).map(([m,g])=>`<tr><td><b>${esc(monthLabel(m))}</b></td><td>${g.count}</td><td>${money(g.itemProfit)}</td><td>${money(g.serviceCommission)}</td><td><b>${money(g.totalProfit)}</b></td><td>${money(g.serviceProfit)}</td><td>${money(g.techCommission)}</td></tr>`).join('')||'<tr><td colspan="7">No monthly records found.</td></tr>';}
  const tech={}; repairs.forEach(r=>{const name=String(r.technician||'Not assigned').trim()||'Not assigned',m=myProfitMonthKey(r),n=getMyProfitRepairNumbers(r),key=m+'||'+name;if(!tech[key])tech[key]={month:m,name,serviceProfit:0,techCommission:0,myServiceCommission:0,count:0};tech[key].serviceProfit+=n.serviceProfit;tech[key].techCommission+=n.technicianCommission;tech[key].myServiceCommission+=n.myServiceCommission;tech[key].count++;});
  if(techTable){techTable.innerHTML=Object.values(tech).sort((a,b)=>(b.month+b.name).localeCompare(a.month+a.name)).map(g=>`<tr><td><b>${esc(monthLabel(g.month))}</b></td><td>${esc(g.name)}</td><td>${g.count}</td><td>${money(g.serviceProfit)}</td><td>${money(g.techCommission)}</td><td><b>${money(g.myServiceCommission)}</b></td></tr>`).join('')||'<tr><td colspan="6">No technician service commission records found.</td></tr>';}
}
function clearMyProfitRange(){if($('myProfitFromMonth'))$('myProfitFromMonth').value='';if($('myProfitToMonth'))$('myProfitToMonth').value='';renderMyProfitDashboard();}
function exportMyProfitDashboardExcel(){
  const {from,to}=myProfitDateRange();
  if(from&&to&&from>to){alert('From Month cannot be after To Month.');return;}
  const repairs=myProfitFilteredRepairs();
  if(!repairs.length){alert('No finished repair records found for the selected month range.');return;}
  const detailRows=repairs.map(r=>{const n=getMyProfitRepairNumbers(r);return [myProfitMonthKey(r),r.token,r.finishedDate||r.date||'',r.customerName||'',r.phone||'',r.deviceModel||'',r.technician||'Not assigned',n.itemCost.toFixed(2),n.itemSale.toFixed(2),n.itemProfit.toFixed(2),Number(r.totalCharge||0).toFixed(2),n.serviceProfit.toFixed(2),n.rate.toFixed(2)+'%',n.technicianCommission.toFixed(2),n.myServiceCommission.toFixed(2),n.myTotalProfit.toFixed(2),r.status||''];});
  const monthly={};repairs.forEach(r=>{const m=myProfitMonthKey(r),n=getMyProfitRepairNumbers(r);if(!monthly[m])monthly[m]={count:0,itemProfit:0,serviceCommission:0,totalProfit:0,serviceProfit:0,techCommission:0};monthly[m].count++;monthly[m].itemProfit+=n.itemProfit;monthly[m].serviceCommission+=n.myServiceCommission;monthly[m].totalProfit+=n.myTotalProfit;monthly[m].serviceProfit+=n.serviceProfit;monthly[m].techCommission+=n.technicianCommission;});
  const monthlyRows=Object.entries(monthly).sort((a,b)=>a[0].localeCompare(b[0])).map(([m,g])=>[m,g.count,g.itemProfit.toFixed(2),g.serviceCommission.toFixed(2),g.totalProfit.toFixed(2),g.serviceProfit.toFixed(2),g.techCommission.toFixed(2)]);
  const tech={};repairs.forEach(r=>{const m=myProfitMonthKey(r),name=String(r.technician||'Not assigned').trim()||'Not assigned',n=getMyProfitRepairNumbers(r),k=m+'||'+name;if(!tech[k])tech[k]={m,name,count:0,serviceProfit:0,techCommission:0,myServiceCommission:0};tech[k].count++;tech[k].serviceProfit+=n.serviceProfit;tech[k].techCommission+=n.technicianCommission;tech[k].myServiceCommission+=n.myServiceCommission;});
  const techRows=Object.values(tech).sort((a,b)=>(a.m+a.name).localeCompare(b.m+b.name)).map(g=>[g.m,g.name,g.count,g.serviceProfit.toFixed(2),g.techCommission.toFixed(2),g.myServiceCommission.toFixed(2)]);
  downloadExcelWorkbook('SF_My_Profit_Report_'+(from||'ALL')+'_to_'+(to||'ALL')+'.xls',[
    {title:'Token Wise Profit',headers:['Month','Token','Finished Date','Customer','Phone','Device','Technician','Item Cost','Item Sale','My Item Profit','Customer Charge','Service Profit','Commission %','Technician Commission','My Service Commission','My Total Profit','Status'],rows:detailRows},
    {title:'Monthly My Profit',headers:['Month','Finished Repairs','My Item Profit','My Service Commission','My Total Profit','Service Profit','Technician Commission'],rows:monthlyRows},
    {title:'Technician Monthly',headers:['Month','Technician','Repairs','Service Profit','Technician Commission','My Service Commission'],rows:techRows}
  ]);
}
function renderTemporaryDashboard(){const income=temporaryIncomeToday(),expense=temporaryExpensesToday();if($('tempDashIncome'))$('tempDashIncome').textContent=money(income);if($('tempDashExpense'))$('tempDashExpense').textContent=money(expense);if($('tempDashBalance'))$('tempDashBalance').textContent=money(income-expense);}
function renderTemporaryIncome(){const t=$('tempIncomeTable');if(!t)return;const rows=(db.tempAccounts||[]).filter(x=>(x.type==='Cash Sale'||x.type==='Credit Sale'||x.type==='Sale'||x.type==='Credit')&&isTodayDate(x.date)).sort((a,b)=>new Date(b.date)-new Date(a.date));t.innerHTML=rows.map(x=>`<tr><td><button class="textbtn" onclick="viewTemporaryInvoice('${esc(x.invoice)}')"><b>${esc(x.invoice)}</b></button></td><td>${esc(x.date)}</td><td>${esc(x.customer||'Walk-in Customer')}</td><td>${money(x.total)}</td><td>${esc(x.payment||x.type)}</td></tr>`).join('')||'<tr><td colspan="5">No income today.</td></tr>';}
function exportTemporaryIncomeExcel(){const rows=(db.tempAccounts||[]).filter(x=>(x.type==='Cash Sale'||x.type==='Credit Sale'||x.type==='Sale'||x.type==='Credit')&&isTodayDate(x.date)).map(x=>[x.invoice,x.date,x.customer||'Walk-in Customer',Number(x.total||0).toFixed(2),x.payment||x.type]);downloadExcelFile('SF_Temporary_Today_Income.xls','Today Income',['Bill Number','Buy Date','Customer','Amount','Payment'],rows);}
function clearTemporaryExpenseForm(){if($('tempExpenseName'))$('tempExpenseName').value='';if($('tempExpenseAmount'))$('tempExpenseAmount').value='';if($('tempExpenseNote'))$('tempExpenseNote').value='';if($('tempExpenseDate'))$('tempExpenseDate').value=new Date().toISOString().slice(0,16);}
async function saveTemporaryExpense(){const name=($('tempExpenseName')?.value||'').trim(),amount=Number($('tempExpenseAmount')?.value||0),date=$('tempExpenseDate')?.value?new Date($('tempExpenseDate').value).toLocaleString():new Date().toLocaleString(),note=($('tempExpenseNote')?.value||'').trim(),user=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown';if(!name)return alert('Please enter the expense description.');if(amount<=0)return alert('Please enter a valid expense amount.');db.dailyExpenses=db.dailyExpenses||[];db.dailyExpenses.unshift({id:'TMP-EXP-'+Date.now(),date,name,amount,note,user});saveCurrentCompanyData();await saveTemporaryIndexedDb();if(typeof refreshAll==='function')refreshAll();renderTemporaryExpenses();renderTemporaryDashboard();clearTemporaryExpenseForm();showToast('Expense saved successfully.','success',3000);}
function renderTemporaryExpenses(){const t=$('tempExpenseTable');if(!t)return;const rows=(db.dailyExpenses||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));t.innerHTML=rows.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.name)}</td><td>${money(x.amount)}</td><td>${esc(x.note||'')}</td><td>${esc(x.user||'Unknown')}</td><td><button class="textbtn danger" onclick="deleteTemporaryExpense('${esc(x.id)}')">🗑 Delete</button></td></tr>`).join('')||'<tr><td colspan="6">No expenses yet.</td></tr>';}
async function deleteTemporaryExpense(id){if(!confirm('Delete this expense?'))return;db.dailyExpenses=(db.dailyExpenses||[]).filter(x=>x.id!==id);saveCurrentCompanyData();await saveTemporaryIndexedDb();renderTemporaryExpenses();renderTemporaryDashboard();}
function exportTemporaryExpensesExcel(){const rows=(db.dailyExpenses||[]).map(x=>[x.date,x.name,Number(x.amount||0).toFixed(2),x.note||'',x.user||'Unknown']);downloadExcelFile('SF_Temporary_Expense_History.xls','Daily Expenses',['Date','Expense','Amount','Note','Added By'],rows);}
function nextTemporaryInvoice(){
  const arr=db.tempAccounts||[]; const nums=arr.map(x=>String(x.invoice||'').match(/^TMP-INV-(\d+)$/)).filter(Boolean).map(m=>Number(m[1]));
  return 'TMP-INV-'+String((nums.length?Math.max(...nums):0)+1).padStart(5,'0');
}
function nextTemporaryPaymentRef(){
  const arr=db.tempAccounts||[]; const nums=arr.map(x=>String(x.ref||'').match(/^TMP-PAY-(\d+)$/)).filter(Boolean).map(m=>Number(m[1]));
  return 'TMP-PAY-'+String((nums.length?Math.max(...nums):0)+1).padStart(5,'0');
}
function initTemporaryForm(){
  const d=$('tempDate'); if(d&&!d.value)d.value=new Date().toLocaleString();
  const inv=$('tempInvoiceNo'); if(inv)inv.textContent=nextTemporaryInvoice();
  if(!tempItemRows.length)addTemporaryItem();
  refreshTemporaryCreditCustomerList();
  toggleTemporaryType(); renderTemporaryItems(); updateTemporaryCheckout();
}
function refreshTemporaryCreditCustomerList(){
  const list=$('tempCreditCustomerList'); if(!list)return;
  const groups=tempCustomerSummary().filter(g=>Number(g.balance||0)>0 || Number(g.total||0)>0);
  list.innerHTML=groups.map(g=>`<option value="${esc(g.name)}" label="${esc(g.phone||'No phone')} — Balance ${esc(money(g.balance||0))}"></option>`).join('');
}
function selectTemporaryCreditCustomer(){
  const input=$('tempCustomer'); if(!input)return;
  const typed=input.value.trim().toLowerCase();
  const groups=tempCustomerSummary();
  const match=groups.find(g=>String(g.name||'').trim().toLowerCase()===typed);
  if(match){
    if($('tempPhone') && match.phone)$('tempPhone').value=match.phone;
    const hint=$('tempCustomerHint'); if(hint)hint.textContent=`Existing credit customer • Outstanding balance: ${money(match.balance||0)}`;
  }else{
    const hint=$('tempCustomerHint'); if(hint)hint.textContent=typed?'New customer name — phone number can be entered manually.':'Existing credit customers will appear as you type.';
  }
}

function addTemporaryItem(){tempItemRows.push({name:'',qty:1,price:0});renderTemporaryItems();}
function removeTemporaryItem(i){tempItemRows.splice(i,1);if(!tempItemRows.length)addTemporaryItem();renderTemporaryItems();}
function renderTemporaryItems(){
  const t=$('tempItems');if(!t)return;
  t.innerHTML=tempItemRows.map((r,i)=>`<tr><td><input value="${esc(r.name||'')}" placeholder="Type item / description" oninput="tempItemRows[${i}].name=this.value;updateTemporaryLine(${i},this)"></td><td><input type="number" min="1" step="1" value="${Number(r.qty||1)}" oninput="tempItemRows[${i}].qty=Math.max(1,Number(this.value)||1);updateTemporaryLine(${i},this)"></td><td><input type="number" min="0" step="0.01" value="${Number(r.price||0)}" placeholder="0.00" oninput="tempItemRows[${i}].price=Math.max(0,Number(this.value)||0);updateTemporaryLine(${i},this)"></td><td><b id="tempLineTotal-${i}">${money(Number(r.qty||0)*Number(r.price||0))}</b></td><td><button class="textbtn danger" type="button" onclick="removeTemporaryItem(${i})">🗑</button></td></tr>`).join('');
  updateTemporaryCheckout();
}
function updateTemporaryLine(i){
  const r=tempItemRows[i];if(!r)return;
  const line=$('tempLineTotal-'+i);if(line)line.textContent=money(Number(r.qty||0)*Number(r.price||0));
  updateTemporaryCheckout();
}
function updateTemporaryCheckout(){
  const subtotal=tempItemRows.reduce((a,r)=>a+Number(r.qty||0)*Number(r.price||0),0);
  const discount=Math.max(0,Number($('tempDiscount')?.value||0));
  const total=Math.max(0,subtotal-discount);
  const type=$('tempType')?.value||'Cash Sale';
  const received=type==='Credit Sale'?0:Math.max(0,Number($('tempCashReceived')?.value||0));
  const balance=type==='Credit Sale'?total:Math.max(0,total-received);
  const change=type==='Cash Sale'?Math.max(0,received-total):0;
  if($('tempSubtotal'))$('tempSubtotal').textContent=money(subtotal);
  if($('tempDiscountTotal'))$('tempDiscountTotal').textContent=money(discount);
  if($('tempTotal'))$('tempTotal').textContent=money(total);
  if($('tempBalance'))$('tempBalance').textContent=money(balance);
  if($('tempChange'))$('tempChange').textContent=money(change);
  const changeRow=$('tempChangeRow'); if(changeRow)changeRow.style.display=change>0?'flex':'none';
  const balLabel=$('tempBalanceLabel'); if(balLabel)balLabel.textContent=change>0?'Change':'Balance Due';
}
function toggleTemporaryType(){
  const type=$('tempType')?.value||'Cash Sale';
  const credit=type==='Credit Sale';
  const customerFields=$('tempCreditCustomerFields');
  const cashWrap=$('tempCashReceivedWrap');
  if(customerFields)customerFields.style.display=credit?'block':'none';
  if(cashWrap)cashWrap.style.display=credit?'none':'block';
  if($('tempCreditNote'))$('tempCreditNote').style.display=credit?'block':'none';
  if(credit){refreshTemporaryCreditCustomerList();selectTemporaryCreditCustomer();}
  updateTemporaryCheckout();
}
function clearTemporaryForm(){
  if($('tempCustomer'))$('tempCustomer').value='';if($('tempPhone'))$('tempPhone').value='';if($('tempType'))$('tempType').value='Cash Sale';if($('tempDiscount'))$('tempDiscount').value='0';if($('tempCashReceived'))$('tempCashReceived').value='0';if($('tempDate'))$('tempDate').value=new Date().toLocaleString();if($('tempInvoiceNo'))$('tempInvoiceNo').textContent=nextTemporaryInvoice();tempItemRows=[];addTemporaryItem();updateTemporaryCheckout();
}
document.addEventListener('input',function(e){if(e.target&&e.target.id==='tempCustomer')selectTemporaryCreditCustomer();});
document.addEventListener('change',function(e){if(e.target&&e.target.id==='tempCustomer')selectTemporaryCreditCustomer();});
async function saveTemporarySale(doPrint){
  const type=$('tempType')?.value||'Cash Sale',customer=(($('tempCustomer')?.value||'').trim()||'Walk-in Customer'),phone=($('tempPhone')?.value||'').trim();
  const items=tempItemRows.filter(r=>String(r.name||'').trim()).map(r=>({name:String(r.name).trim(),qty:Math.max(1,Number(r.qty||1)),price:Math.max(0,Number(r.price||0))}));
  if(!items.length)return alert('Please add at least one item.');
  const subtotal=items.reduce((a,r)=>a+r.qty*r.price,0),discount=Math.min(Math.max(0,Number($('tempDiscount')?.value||0)),subtotal),total=Math.max(0,subtotal-discount);
  if(total<=0)return alert('Please enter valid item prices.');
  if(type==='Credit Sale'&&(!String(customer).trim()||customer==='Walk-in Customer'))return alert('For Credit Sale, please enter or select a customer name.');
  const cashReceived=type==='Credit Sale'?0:Math.max(0,Number($('tempCashReceived')?.value||0));
  if(type==='Cash Sale'&&cashReceived<=0)return alert('Please enter the Cash Received amount.');
  const balance=type==='Credit Sale'?total:Math.max(0,total-cashReceived);
  const change=type==='Cash Sale'?Math.max(0,cashReceived-total):0;
  const now=new Date().toLocaleString(),invoice=nextTemporaryInvoice(),user=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown';
  const tx={ref:invoice,invoice,date:now,type,customer,phone,items,subtotal,discount,total,amount:total,payment:type==='Credit Sale'?'Credit':'Cash',cashReceived,creditPaid:0,creditBalance:type==='Credit Sale'?total:0,balance,change,creditPayments:[],user,billMadeBy:user,company:{name:shopSettings.name||'',phone:shopSettings.phone||'',address:shopSettings.address||'',footer:shopSettings.footer||'',logo:shopSettings.logo||''}};
  db.tempAccounts=db.tempAccounts||[];db.tempAccounts.unshift(tx);await persistTemporaryData();clearTemporaryForm();
  if(doPrint)printTemporaryAccount(tx);
  showToast(invoice+' saved successfully.','success',3500);showTemporaryView('sales');
}
// Permanent local recovery store for Temporary Accounts. This is a second durable
// copy in IndexedDB so closing/reopening the web app does not depend on Chrome
// localStorage or on a previously-granted File System Access permission.
const TEMP_PERSIST_DB='SFSmartPOSTemporaryAccountsPermanent';
const TEMP_PERSIST_STORE='records';
function openTemporaryPersistDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(TEMP_PERSIST_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(TEMP_PERSIST_STORE))r.result.createObjectStore(TEMP_PERSIST_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveTemporaryIndexedDb(){
  try{const idb=await openTemporaryPersistDb();await new Promise((resolve,reject)=>{const tx=idb.transaction(TEMP_PERSIST_STORE,'readwrite');tx.objectStore(TEMP_PERSIST_STORE).put(JSON.parse(JSON.stringify(db.tempAccounts||[])),'all');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});return true}catch(e){console.warn('Temporary IndexedDB save failed:',e);return false}
}
async function loadTemporaryIndexedDb(){
  try{const idb=await openTemporaryPersistDb();const rows=await new Promise((resolve,reject)=>{const tx=idb.transaction(TEMP_PERSIST_STORE,'readonly');const r=tx.objectStore(TEMP_PERSIST_STORE).get('all');r.onsuccess=()=>resolve(Array.isArray(r.result)?r.result:[]);r.onerror=()=>reject(r.error)});return rows}catch(e){console.warn('Temporary IndexedDB load failed:',e);return []}
}
function mergeTemporaryAccounts(primary,secondary){
  const map=new Map();
  [...(Array.isArray(primary)?primary:[]),...(Array.isArray(secondary)?secondary:[])].forEach(x=>{if(!x)return;const key=String(x.invoice||x.ref||'');if(key)map.set(key,x)});
  return [...map.values()].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
}
async function restoreTemporaryAccountsFromLocalPermanentStore(){
  const saved=await loadTemporaryIndexedDb();
  if(!saved.length)return false;
  const current=Array.isArray(db.tempAccounts)?db.tempAccounts:[];
  const merged=mergeTemporaryAccounts(current,saved);
  if(merged.length!==current.length || merged.some((x,i)=>x!==current[i])){db.tempAccounts=merged;try{localStorage.setItem(activeCompanyDataKey(),JSON.stringify(db))}catch(e){};try{refreshAll()}catch(e){}}
  return true;
}

async function persistTemporaryData(){
  // Temporary Accounts are permanent records. Save the live database to browser
  // storage first, then WAIT for the PC-folder database write to finish before
  // the calling action continues. This prevents the last Temporary transaction
  // from being lost when the app is closed immediately after Save.
  try{saveCurrentCompanyData()}catch(e){console.warn('Temporary browser save warning:',e)}
  // Always keep a dedicated local permanent copy as well.
  await saveTemporaryIndexedDb();
  if(pcDataFolder){
    try{await writeSnapshotToFolder(false)}catch(e){console.error('Temporary PC save error:',e)}
  }
  try{refreshAll()}catch(e){}
  return true;
}
function temporaryCreditSales(){return (db.tempAccounts||[]).filter(x=>x.type==='Credit Sale'||x.type==='Credit'||x.payment==='Credit');}
function refreshTemporaryCreditBalances(){
  temporaryCreditSales().forEach(s=>{s.creditPaid=Array.isArray(s.creditPayments)?s.creditPayments.reduce((a,p)=>a+Number(p.amount||0),0):Number(s.creditPaid||0);s.creditBalance=Math.max(0,Number(s.total||0)-s.creditPaid);});
}
function tempCreditGroups(){refreshTemporaryCreditBalances();const groups={};temporaryCreditSales().forEach(s=>{const k=s.customer||'Unknown';if(!groups[k])groups[k]={name:k,phone:s.phone||'',total:0,paid:0,balance:0,bills:[]};const g=groups[k];if(!g.phone)g.phone=s.phone||'';g.total+=Number(s.total||0);g.paid+=Number(s.creditPaid||0);g.balance+=Number(s.creditBalance||0);g.bills.push(s);});return groups;}
function renderTemporarySalesHistory(){
  const t=$('temporarySalesTable');if(!t)return;const q=($('tempSalesSearch')?.value||'').toLowerCase();const arr=(db.tempAccounts||[]).filter(x=>{const saleType=x.type==='Cash Sale'||x.type==='Credit Sale'||x.type==='Sale'||x.type==='Credit';return saleType&&(String(x.invoice||x.ref).toLowerCase().includes(q)||String(x.customer||'').toLowerCase().includes(q));}).sort((a,b)=>new Date(b.date)-new Date(a.date));
  t.innerHTML=arr.map(x=>`<tr><td><button class="textbtn" onclick="viewTemporaryInvoice('${x.invoice}')"><b>${esc(x.invoice)}</b></button></td><td>${esc(x.date)}</td><td>${esc(x.customer)}</td><td>${(x.items||[]).reduce((a,i)=>a+Number(i.qty||0),0)}</td><td>${money(x.total)}</td><td>${esc(x.payment||x.type)}</td><td>${x.payment==='Credit'?money(x.creditBalance):'—'}</td><td><b>${esc(x.billMadeBy||x.user||'Unknown')}</b></td><td><button class="textbtn" onclick="viewTemporaryInvoice('${x.invoice}')">👁 View</button> <button class="textbtn printbtn" onclick="reprintTemporaryInvoice('${x.invoice}')">🖨 Reprint</button> <button class="textbtn" onclick="requestTemporaryEdit('${x.invoice}')">✎ Edit</button> <button class="textbtn danger" onclick="requestTemporaryDelete('${x.invoice}')">🗑 Delete</button></td></tr>`).join('')||'<tr><td colspan="9">No temporary sales yet.</td></tr>';
}
function exportTemporarySalesExcel(){const rows=(db.tempAccounts||[]).filter(x=>x.type==='Cash Sale'||x.type==='Credit Sale').map(x=>[x.invoice,x.date,x.customer,x.phone||'',(x.items||[]).reduce((a,i)=>a+i.qty,0),Number(x.subtotal||x.total||0).toFixed(2),Number(x.total||0).toFixed(2),x.payment,x.payment==='Credit'?Number(x.creditPaid||0).toFixed(2):'',x.payment==='Credit'?Number(x.creditBalance||0).toFixed(2):'',x.billMadeBy||x.user||'Unknown']);downloadExcelFile('SF_Temporary_Sales_History.xls','Temporary Sales History',['Invoice','Date','Customer','Phone','Items','Subtotal','Total','Payment','Paid','Balance','Bill Made By (User ID)'],rows);}
function requestTemporaryEdit(invoice){pendingTemporaryAction={action:'edit',invoice};openTemporarySecurity('edit');}
function requestTemporaryDelete(invoice){pendingTemporaryAction={action:'delete',invoice};openTemporarySecurity('delete');}
function openTemporarySecurity(action){
  if(bypassSecurityForCurrentUser()){
    const p=pendingTemporaryAction;
    if(action==='technician-profile'){technicianProfileAccessGranted=true;showTemporaryView('technician-profiles');return;}
    if(action==='technician-commission'){if(p?.technician)openTechnicianCommissionModal(p.technician);return;}
    if(action==='edit'){if(p?.invoice)performEditTemporarySale(p.invoice);return;}
    if(action==='delete'){if(p?.invoice)performDeleteTemporarySale(p.invoice);return;}
    if(action==='payment-edit'){if(p?.ref)performEditTemporaryPayment(p.ref);return;}
    if(action==='payment-delete'){if(p?.ref)performDeleteTemporaryPayment(p.ref);return;}
    if(action==='repair-edit'){if(p?.token)performEditRepairAfterSecurity(p.token);return;}
    if(action==='repair-delete'){if(p?.token)performDeleteRepairAfterSecurity(p.token);return;}
    if(action==='repair-cancel'){if(p?.token)performCancelRepairAfterSecurity(p.token);return;}
    if(action==='repair-return'){if(p?.token)performReturnRepairAfterSecurity(p.token);return;}
    if(action==='repair-history-open'){if(p?.token)performOpenRepairHistoryAfterSecurity(p.token);return;}
    pendingTemporaryAction=null;
    return;
  }
  $('tempManagementPassword').value='';$('tempSecurityError').textContent='';$('tempSecurityTitle').textContent='Security Verification';const msg={delete:'Enter the management password to delete this Temporary bill.',edit:'Enter the management password to edit this Temporary bill.','payment-delete':'Enter the management password to delete this Credit Payment.','payment-edit':'Enter the management password to edit this Credit Payment.','repair-edit':'Enter the management password to edit this Repair History record.','repair-delete':'Enter the management password to permanently delete this Repair History record.','repair-cancel':'Enter the management password to cancel this Repair Job.','repair-return':'Enter the management password to mark this Repair Job as RETURN.', 'repair-history-open':'Enter the management password to open this Repair History record.','technician-commission':'Enter the management password to open Technician Commission.','my-profit':'Enter the management password to open My Profit Dashboard.','technician-profile':'Enter the management password to open Technician Profile.','repairing-view':'Enter the management password to open this Repairing section.'};$('tempSecurityMessage').textContent=msg[action]||'Enter the management password.';$('tempSecurityModal').classList.add('show');setTimeout(()=>$('tempManagementPassword').focus(),50);}
function closeTemporarySecurity(){if($('tempSecurityModal'))$('tempSecurityModal').classList.remove('show');pendingTemporaryAction=null;}
function verifyTemporarySecurity(){if($('tempManagementPassword').value!==MANAGEMENT_PASSWORD){$('tempSecurityError').textContent='Incorrect management password.';return;}const p=pendingTemporaryAction;closeTemporarySecurity();if(!p)return;if(p.action==='edit')performEditTemporarySale(p.invoice);else if(p.action==='delete')performDeleteTemporarySale(p.invoice);else if(p.action==='payment-edit')performEditTemporaryPayment(p.ref);else if(p.action==='payment-delete')performDeleteTemporaryPayment(p.ref);else if(p.action==='repair-edit')performEditRepairAfterSecurity(p.token);else if(p.action==='repair-delete')performDeleteRepairAfterSecurity(p.token);else if(p.action==='repair-cancel')performCancelRepairAfterSecurity(p.token);else if(p.action==='repair-return')performReturnRepairAfterSecurity(p.token); else if(p.action==='repair-history-open')performOpenRepairHistoryAfterSecurity(p.token);else if(p.action==='technician-commission')openTechnicianCommissionModal(p.technician);else if(p.action==='technician-profile'){technicianProfileAccessGranted=true;showTemporaryView('technician-profiles');}else if(p.action==='repairing-view'){verifiedRepairingView=p.view;showTemporaryView(p.view);}}
async function performDeleteTemporarySale(invoice){const s=(db.tempAccounts||[]).find(x=>x.invoice===invoice);if(!s)return alert('Invoice not found.');if(!confirm('Delete '+invoice+'?\n\nThis will remove the Temporary bill and its linked payment history. No Stock will be changed.'))return;db.tempAccounts=db.tempAccounts.filter(x=>x.invoice!==invoice && !(x.type==='Credit Payment'&&x.invoice===invoice));await persistTemporaryData();renderTemporarySalesHistory();renderTemporaryCredit();alert(invoice+' deleted successfully.');}
function performEditTemporarySale(invoice){const s=(db.tempAccounts||[]).find(x=>x.invoice===invoice);if(!s)return alert('Invoice not found.');editingTemporaryRef=invoice;editingTemporaryItems=(s.items||[]).map(i=>({name:i.name,qty:Number(i.qty||1),price:Number(i.price||0)}));$('tempEditInvoice').textContent=invoice;$('tempEditType').value=s.type;$('tempEditCustomer').value=s.customer||'';$('tempEditPhone').value=s.phone||'';$('tempEditDate').value=s.date||'';$('tempEditNote').textContent=Number(s.creditPaid||0)>0?'This Credit bill already has payments. New total cannot be less than the paid amount. No Stock is changed.':'No Stock is changed by Temporary Accounts.';renderTemporaryEditItems();$('tempEditModal').classList.add('show');}
function closeTemporaryEdit(){if($('tempEditModal'))$('tempEditModal').classList.remove('show');editingTemporaryRef=null;editingTemporaryItems=[];}
function addTemporaryEditItem(){editingTemporaryItems.push({name:'',qty:1,price:0});renderTemporaryEditItems();}
function removeTemporaryEditItem(i){if(editingTemporaryItems.length<=1)return alert('A bill must contain at least one item.');editingTemporaryItems.splice(i,1);renderTemporaryEditItems();}
function renderTemporaryEditItems(){const box=$('tempEditItems');if(!box)return;box.innerHTML=editingTemporaryItems.map((it,i)=>`<div class="edit-item-row"><input placeholder="Item / description" value="${esc(it.name||'')}" oninput="editingTemporaryItems[${i}].name=this.value"><input type="number" min="1" value="${Number(it.qty||1)}" oninput="editingTemporaryItems[${i}].qty=Math.max(1,Number(this.value)||1);renderTemporaryEditItems()"><input type="number" min="0" step="0.01" value="${Number(it.price||0)}" oninput="editingTemporaryItems[${i}].price=Math.max(0,Number(this.value)||0);renderTemporaryEditItems()"><span class="edit-item-price">${money(it.price*it.qty)}</span><button type="button" class="textbtn danger" onclick="removeTemporaryEditItem(${i})">🗑 Remove</button></div>`).join('');$('tempEditTotal').textContent=money(editingTemporaryItems.reduce((a,i)=>a+Number(i.qty||0)*Number(i.price||0),0));}
async function saveEditedTemporarySale(){const s=(db.tempAccounts||[]).find(x=>x.invoice===editingTemporaryRef);if(!s)return;const items=editingTemporaryItems.filter(i=>String(i.name||'').trim()).map(i=>({name:String(i.name).trim(),qty:Math.max(1,Number(i.qty||1)),price:Math.max(0,Number(i.price||0))}));if(!items.length)return alert('Please add at least one item.');const total=items.reduce((a,i)=>a+i.qty*i.price,0);if(total<=0)return alert('Total must be greater than zero.');if(Number(s.creditPaid||0)>total)return alert('Total cannot be less than the amount already paid.');const newType=$('tempEditType').value;if(Number(s.creditPaid||0)>0&&newType!=='Credit Sale')return alert('A credit bill with payments cannot be changed to Cash Sale.');s.type=newType;s.payment=s.type==='Credit Sale'?'Credit':'Cash';s.customer=$('tempEditCustomer').value.trim();s.phone=$('tempEditPhone').value.trim();if(!s.customer)return alert('Customer name is required.');if(s.payment==='Credit'&&!s.phone)return alert('Credit Sale requires a phone number.');s.items=items;s.subtotal=total;s.total=total;s.amount=total;s.creditBalance=s.payment==='Credit'?Math.max(0,total-Number(s.creditPaid||0)):0;
s.cashReceived=s.payment==='Credit'?0:Number(s.cashReceived||0);
s.balance=s.payment==='Credit'?0:Math.max(0,total-s.cashReceived);
s.change=s.payment==='Credit'?0:Math.max(0,s.cashReceived-total);
s.editedBy=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown';s.editedAt=new Date().toLocaleString();await persistTemporaryData();closeTemporaryEdit();renderTemporarySalesHistory();renderTemporaryCredit();showToast(s.invoice+' updated successfully.','success',3500);}
function tempCustomerSummary(){const groups=tempCreditGroups();return Object.values(groups).sort((a,b)=>b.balance-a.balance);}
function renderTemporaryCredit(){
  const sales=temporaryCreditSales(),total=sales.reduce((a,s)=>a+Number(s.total||0),0),paid=sales.reduce((a,s)=>a+Number(s.creditPaid||0),0),balance=sales.reduce((a,s)=>a+Number(s.creditBalance||0),0),groups=tempCustomerSummary();
  if($('tempCreditTotalSales'))$('tempCreditTotalSales').textContent=money(total);if($('tempCreditTotalPaid'))$('tempCreditTotalPaid').textContent=money(paid);if($('tempCreditTotalBalance'))$('tempCreditTotalBalance').textContent=money(balance);if($('tempCreditCustomerCount'))$('tempCreditCustomerCount').textContent=groups.filter(g=>g.balance>0).length;
  $('tempCreditCustomerTable').innerHTML=groups.filter(g=>g.total>0).map(g=>`<tr><td><button class="textbtn" title="View customer invoices" onclick='showTemporaryCustomerBills(${JSON.stringify(g.name)})'><b>${esc(g.name)}</b></button></td><td>${esc(g.phone)}</td><td>${g.bills.length}</td><td>${money(g.total)}</td><td>${money(g.paid)}</td><td><b>${money(g.balance)}</b></td><td>${g.balance>0?`<button class="textbtn" onclick="selectTemporaryPaymentCustomer('${String(g.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">💰 Paid</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="7">No Temporary credit customer records.</td></tr>';
  $('tempCreditBillTable').innerHTML=sales.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s=>`<tr><td><button class="textbtn" onclick="viewTemporaryInvoice('${s.invoice}')"><b>${esc(s.invoice)}</b></button></td><td>${esc(s.date)}</td><td>${esc(s.customer)}</td><td>${money(s.total)}</td><td>${money(s.creditPaid)}</td><td><b>${money(s.creditBalance)}</b></td><td>${esc(s.billMadeBy||s.user||'Unknown')}</td></tr>`).join('')||'<tr><td colspan="7">No Temporary credit bills yet.</td></tr>';
  const payments=(db.tempAccounts||[]).filter(x=>x.type==='Credit Payment').sort((a,b)=>new Date(b.date)-new Date(a.date));
  $('tempCreditPaymentTable').innerHTML=payments.map(p=>`<tr><td>${esc(p.date)}</td><td>${esc(p.customer)}</td><td>${money(p.amount)}</td><td>${esc(p.user||'Unknown')}</td><td>${esc(p.reference||'')} <small>${esc(p.invoice||'')}</small></td><td><button class="textbtn printbtn" onclick='reprintTemporaryPayment(${JSON.stringify(p.ref||'')})'>🖨 Reprint</button> <button class="textbtn" onclick='requestTemporaryPaymentEdit(${JSON.stringify(p.ref||'')})'>✎ Edit</button> <button class="textbtn danger" onclick='requestTemporaryPaymentDelete(${JSON.stringify(p.ref||'')})'>🗑 Delete</button></td></tr>`).join('')||'<tr><td colspan="6">No Temporary credit payments yet.</td></tr>';
}
function showTemporaryCustomerBills(customer){
  const bills=temporaryCreditSales().filter(s=>String(s.customer||'')===String(customer||'')).sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(!bills.length)return alert('No Temporary credit bills found for this customer.');
  temporaryCustomerBillsRef=String(customer||'');
  $('tempCustomerBillsName').textContent=temporaryCustomerBillsRef;
  $('tempCustomerBillsTable').innerHTML=bills.map(s=>`<tr><td><button class="textbtn" onclick='viewTemporaryInvoice(${JSON.stringify(s.invoice)})'><b>${esc(s.invoice)}</b></button></td><td>${esc(s.date)}</td><td>${money(s.total)}</td><td><b>${money(s.creditBalance)}</b></td></tr>`).join('');
  const btn=$('tempCustomerExportBtn'); if(btn)btn.onclick=()=>exportTemporaryCustomerExcel(temporaryCustomerBillsRef);
  $('tempCustomerBillsModal').classList.add('show');
}
function closeTemporaryCustomerBills(){ $('tempCustomerBillsModal').classList.remove('show'); }
function exportTemporaryCustomerExcel(customer){
  const bills=temporaryCreditSales().filter(s=>String(s.customer||'')===String(customer||''));
  const rows=[];
  bills.forEach(s=>(s.items||[]).forEach(i=>rows.push([s.invoice,i.name||'',Number(i.qty||1),Number(i.price||0).toFixed(2),(Number(i.qty||1)*Number(i.price||0)).toFixed(2),s.date])));
  downloadExcelFile('SF_Temporary_Customer_Purchases.xls','Temporary Customer Purchases',['Bill Number','Buying Item','Qty','Unit Price (Rs.)','Amount (Rs.)','Buy Date'],rows);
}

function exportTemporaryCreditExcel(){refreshTemporaryCreditBalances();const rows=temporaryCreditSales().map(s=>[s.invoice,s.date,s.customer,s.phone||'',Number(s.total||0).toFixed(2),Number(s.creditPaid||0).toFixed(2),Number(s.creditBalance||0).toFixed(2),s.billMadeBy||s.user||'Unknown']);downloadExcelFile('SF_Temporary_Credit_Report.xls','Temporary Credit Report',['Invoice','Date','Customer','Phone','Credit Total','Paid','Balance','Bill Made By (User ID)'],rows);}
function renderTemporaryPaymentCustomers(){const sel=$('tempPaymentCustomer');if(!sel)return;const groups=tempCustomerSummary().filter(g=>g.balance>0);sel.innerHTML=groups.map(g=>`<option value="${esc(g.name)}">${esc(g.name)} — ${money(g.balance)}</option>`).join('')||'<option value="">No outstanding Temporary credit</option>';const q=groups.map(g=>`<tr><td>${esc(g.name)}</td><td>${esc(g.phone)}</td><td>${money(g.total)}</td><td>${money(g.paid)}</td><td><b>${money(g.balance)}</b></td><td><button class="textbtn" onclick="selectTemporaryPaymentCustomer('${String(g.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">💰 Select</button></td></tr>`).join('');$('tempPaymentCustomerTable').innerHTML=q||'<tr><td colspan="6">No outstanding Temporary credit customers.</td></tr>';}
function selectTemporaryPaymentCustomer(name){showTemporaryView('payment');const sel=$('tempPaymentCustomer');if(sel){sel.value=name;updateTemporaryPaymentBalance();}}
function temporaryOutstanding(name){const g=tempCustomerSummary().find(x=>x.name===name);return Number(g?.balance||0);}
function updateTemporaryPaymentBalance(){const name=$('tempPaymentCustomer')?.value||'';const bal=temporaryOutstanding(name);if($('tempPaymentBalance'))$('tempPaymentBalance').value=money(bal);const amount=Number($('tempPaymentAmount')?.value||0);if(amount>bal&&bal>0)$('tempPaymentAmount').value=bal;}
async function recordTemporaryCreditPayment(doPrint){
  refreshTemporaryCreditBalances();
  const customer=$('tempPaymentCustomer')?.value||'', amount=Number($('tempPaymentAmount')?.value||0), bal=temporaryOutstanding(customer), reference=($('tempPaymentReference')?.value||'').trim();
  if(!customer)return alert('Please select a customer.');
  if(amount<=0)return alert('Enter a valid payment amount.');
  if(amount>bal+0.0001)return alert('Payment cannot be greater than the outstanding balance.');
  const balanceAfter=Math.max(0,bal-amount), user=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown';
  const ref=nextTemporaryPaymentRef(); let remaining=amount; const allocations=[]; const now=new Date().toLocaleString();
  const bills=temporaryCreditSales().filter(s=>s.customer===customer&&Number(s.creditBalance||0)>0).sort((a,b)=>new Date(a.date)-new Date(b.date));
  let firstInvoice='';
  bills.forEach(s=>{
    if(remaining<=0)return;
    const take=Math.min(remaining,Number(s.creditBalance||0));
    if(!firstInvoice)firstInvoice=s.invoice;
    if(!Array.isArray(s.creditPayments))s.creditPayments=[];
    s.creditPayments.push({date:now,amount:take,userId:user,reference,invoice:s.invoice,paymentRef:ref});
    s.creditPaid=Number(s.creditPaid||0)+take; s.creditBalance=Math.max(0,Number(s.total||0)-s.creditPaid); remaining-=take;
    allocations.push({invoice:s.invoice,amount:take});
  });
  const tx={ref,invoice:firstInvoice,type:'Credit Payment',payment:'Credit Payment Received',date:now,customer,phone:(tempCustomerSummary().find(g=>g.name===customer)?.phone||''),amount,total:amount,balanceAfter,reference,user,allocations,company:{name:shopSettings.name||'',phone:shopSettings.phone||'',address:shopSettings.address||'',footer:shopSettings.footer||'',logo:shopSettings.logo||''}};
  db.tempAccounts.unshift(tx); await persistTemporaryData();
  if($('tempPaymentAmount'))$('tempPaymentAmount').value=''; if($('tempPaymentReference'))$('tempPaymentReference').value='';
  renderTemporaryCredit(); renderTemporaryPaymentCustomers(); updateTemporaryPaymentBalance();
  if(doPrint)printTemporaryAccount(tx); showToast('Payment of '+money(amount)+' recorded successfully.','success',3500);
}
function findTemporaryPayment(ref){return (db.tempAccounts||[]).find(x=>x.type==='Credit Payment'&&x.ref===ref);}
function paymentAllocations(tx){
  if(Array.isArray(tx.allocations)&&tx.allocations.length)return tx.allocations.map(a=>({invoice:a.invoice,amount:Number(a.amount||0)}));
  const out=[]; let remaining=Number(tx.amount||0);
  const sales=temporaryCreditSales().filter(s=>s.customer===tx.customer).sort((a,b)=>new Date(a.date)-new Date(b.date));
  for(const s of sales){
    const matches=(s.creditPayments||[]).filter(p=>p.paymentRef===tx.ref);
    for(const p of matches){const a=Number(p.amount||0);if(a>0){out.push({invoice:s.invoice,amount:a});remaining-=a;}}
  }
  if(out.length)return out;
  // Legacy fallback: match by date/customer/amount when older payment records lack paymentRef.
  for(const s of sales){
    for(const p of (s.creditPayments||[])){
      if(remaining<=0)break;
      if(p.date===tx.date && Math.abs(Number(p.amount||0))>0){const a=Math.min(remaining,Number(p.amount||0));out.push({invoice:s.invoice,amount:a});remaining-=a;}
    }
    if(remaining<=0)break;
  }
  return out;
}
function reverseTemporaryPayment(tx){
  const alloc=paymentAllocations(tx); let reversed=0;
  alloc.forEach(a=>{const sale=(db.tempAccounts||[]).find(x=>x.invoice===a.invoice&&x.type!=='Credit Payment'); if(!sale)return; const idx=(sale.creditPayments||[]).findIndex(p=>p.paymentRef===tx.ref && Math.abs(Number(p.amount||0)-a.amount)<0.0001); if(idx>=0){sale.creditPayments.splice(idx,1);reversed+=a.amount;}else{const idx2=(sale.creditPayments||[]).findIndex(p=>p.date===tx.date&&Math.abs(Number(p.amount||0)-a.amount)<0.0001);if(idx2>=0){sale.creditPayments.splice(idx2,1);reversed+=a.amount;}} sale.creditPaid=(sale.creditPayments||[]).reduce((sum,p)=>sum+Number(p.amount||0),0); sale.creditBalance=Math.max(0,Number(sale.total||0)-sale.creditPaid);});
  return reversed;
}
function applyTemporaryPaymentToCustomer(customer,amount,reference,user,ref){
  let remaining=amount; const allocations=[]; const now=new Date().toLocaleString();
  const bills=temporaryCreditSales().filter(s=>s.customer===customer&&Number(s.creditBalance||0)>0).sort((a,b)=>new Date(a.date)-new Date(b.date));
  bills.forEach(s=>{if(remaining<=0)return;const take=Math.min(remaining,Number(s.creditBalance||0));if(!Array.isArray(s.creditPayments))s.creditPayments=[];s.creditPayments.push({date:now,amount:take,userId:user,reference,invoice:s.invoice,paymentRef:ref});s.creditPaid=Number(s.creditPaid||0)+take;s.creditBalance=Math.max(0,Number(s.total||0)-s.creditPaid);remaining-=take;allocations.push({invoice:s.invoice,amount:take});});
  return {remaining,allocations};
}
function reprintTemporaryPayment(ref){const tx=findTemporaryPayment(ref);if(tx)printTemporaryPaymentReceipt(tx);}
function requestTemporaryPaymentEdit(ref){pendingTemporaryAction={action:'payment-edit',ref};openTemporarySecurity('payment-edit');}
function requestTemporaryPaymentDelete(ref){pendingTemporaryAction={action:'payment-delete',ref};openTemporarySecurity('payment-delete');}
async function performDeleteTemporaryPayment(ref){const tx=findTemporaryPayment(ref);if(!tx)return alert('Payment record not found.');if(!confirm('Delete payment '+ref+'?\n\nThe payment will be removed and the customer credit balance will be restored.'))return;reverseTemporaryPayment(tx);db.tempAccounts=db.tempAccounts.filter(x=>x.ref!==ref);await persistTemporaryData();renderTemporaryCredit();renderTemporaryPaymentCustomers();alert(ref+' deleted successfully.');}
function performEditTemporaryPayment(ref){const tx=findTemporaryPayment(ref);if(!tx)return alert('Payment record not found.');editingTemporaryPaymentRef=ref;$('tempPaymentEditRef').textContent=ref;$('tempPaymentEditCustomer').value=tx.customer||'';$('tempPaymentEditAmount').value=Number(tx.amount||0);$('tempPaymentEditReference').value=tx.reference||'';$('tempPaymentEditBalance').value=money(temporaryOutstanding(tx.customer)+Number(tx.amount||0));$('tempPaymentEditModal').classList.add('show');}
function closeTemporaryPaymentEdit(){if($('tempPaymentEditModal'))$('tempPaymentEditModal').classList.remove('show');editingTemporaryPaymentRef='';}
async function saveEditedTemporaryPayment(){const tx=findTemporaryPayment(editingTemporaryPaymentRef);if(!tx)return;const oldAmount=Number(tx.amount||0),oldAlloc=paymentAllocations(tx),customer=tx.customer,amount=Number($('tempPaymentEditAmount')?.value||0),reference=($('tempPaymentEditReference')?.value||'').trim(),user=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown';if(amount<=0)return alert('Enter a valid payment amount.');reverseTemporaryPayment(tx);const newBal=temporaryOutstanding(customer);if(amount>newBal+0.0001){ // restore original allocation exactly
  oldAlloc.forEach(a=>{const sale=(db.tempAccounts||[]).find(x=>x.invoice===a.invoice);if(sale){if(!Array.isArray(sale.creditPayments))sale.creditPayments=[];sale.creditPayments.push({date:tx.date,amount:a.amount,userId:tx.user,reference:tx.reference||'',invoice:sale.invoice,paymentRef:tx.ref});sale.creditPaid=(sale.creditPayments||[]).reduce((sum,p)=>sum+Number(p.amount||0),0);sale.creditBalance=Math.max(0,Number(sale.total||0)-sale.creditPaid);}});return alert('Payment cannot be greater than the outstanding balance.');}
  const applied=applyTemporaryPaymentToCustomer(customer,amount,reference,user,tx.ref);tx.amount=amount;tx.total=amount;tx.reference=reference;tx.user=user;tx.allocations=applied.allocations;tx.balanceAfter=temporaryOutstanding(customer);tx.editedAt=new Date().toLocaleString();tx.editedBy=user;await persistTemporaryData();closeTemporaryPaymentEdit();renderTemporaryCredit();renderTemporaryPaymentCustomers();showToast(tx.ref+' updated successfully.','success',3500);}

function viewTemporaryInvoice(invoice){const sale=(db.tempAccounts||[]).find(x=>x.invoice===invoice&&x.type!=='Credit Payment');if(!sale)return alert('Invoice not found.');temporaryInvoiceViewRef=invoice;$('tempInvoiceViewTitle').textContent=invoice;$('tempInvoiceViewFrame').srcdoc=getInvoiceHtml({...sale, customerPhone:sale.phone||'', customerAddress:''}, false);$('tempInvoiceViewModal').classList.add('show');}
function closeTemporaryInvoiceView(){if($('tempInvoiceViewFrame'))$('tempInvoiceViewFrame').srcdoc='';if($('tempInvoiceViewModal'))$('tempInvoiceViewModal').classList.remove('show');temporaryInvoiceViewRef='';}
function reprintCurrentTemporaryInvoice(){if(temporaryInvoiceViewRef)reprintTemporaryInvoice(temporaryInvoiceViewRef);}
function exportCurrentTemporaryInvoice(){const s=(db.tempAccounts||[]).find(x=>x.invoice===temporaryInvoiceViewRef);if(s)exportTemporaryInvoiceExcel(s);}
function reprintTemporaryInvoice(invoice){const s=(db.tempAccounts||[]).find(x=>x.invoice===invoice);if(s)printTemporaryAccount(s);}
function exportTemporaryInvoiceExcel(s){const rows=(s.items||[]).map(i=>[s.invoice,s.date,s.customer,s.phone||'',i.name,i.qty,Number(i.price||0).toFixed(2),Number(i.qty*i.price).toFixed(2)]);downloadExcelFile('SF_'+s.invoice+'.xls','Invoice '+s.invoice,['Invoice','Date','Customer','Phone','Item','Qty','Unit Price','Line Total'],rows);}
function getTemporaryInvoiceHtml(tx){const shop=tx.company||shopSettings;const rows=(tx.items||[]).map(i=>`<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.price)}</td><td>${money(Number(i.qty)*Number(i.price))}</td></tr>`).join('');const title=tx.payment==='Credit'?'TEMPORARY CREDIT BILL':'TEMPORARY SALES INVOICE';const paid=Number(tx.creditPaid||0),bal=Number(tx.creditBalance||0);return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:0;padding:18px;color:#111}.bill{max-width:700px;margin:auto;border:1px solid #ddd;padding:22px}h1,h2{text-align:center;margin:4px 0}.muted{text-align:center;color:#555}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}th:nth-child(n+2),td:nth-child(n+2){text-align:right}.total{font-size:20px;text-align:right;margin-top:15px;font-weight:bold}.foot{text-align:center;margin-top:25px;color:#555}</style></head><body><div class="bill"><h1>${esc(shop.name||'')}</h1><div class="muted">${esc(shop.address||'')}<br>${esc(shop.phone||'')}</div><h2>${title}</h2><p><b>Invoice:</b> ${esc(tx.invoice)} &nbsp; <b>Date:</b> ${esc(tx.date)}</p><p><b>Customer:</b> ${esc(tx.customer)}<br><b>Phone:</b> ${esc(tx.phone||'')}</p><table><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>${rows}</table><div class="total">TOTAL: ${money(tx.total)}</div><p><b>Payment:</b> ${esc(tx.payment)}${tx.payment==='Credit'?`<br><b>Paid:</b> ${money(paid)}<br><b>Balance:</b> ${money(bal)}`:''}</p><p><b>Bill Made By:</b> ${esc(tx.billMadeBy||tx.user||'')}</p><div class="foot">${esc(shop.footer||'')}<br>Thank you for your business.</div></div></body></html>`;}

/* ========================= REPAIR SERVICE MODULE ========================= */
const REPAIR_SERVICES=['General Repair','Screen / LCD Repair','Battery Replacement','Charging Port Repair','Software / OS Service','Board / Chip Level Repair','Water Damage Repair','Other'];
let repairItemEditIndex=-1;
let repairDetailRef='';
let repairHistoryAuthorized=false;
let repairPartEditRef='';
function repairNow(){return new Date().toLocaleString();}
function nextRepairToken(){const nums=(db.repairs||[]).map(x=>String(x.token||'').match(/^RPR-(\d+)$/)).filter(Boolean).map(m=>Number(m[1]));return 'RPR-'+String((nums.length?Math.max(...nums):0)+1).padStart(5,'0');}
function initRepairServiceView(){
  if(!Array.isArray(window.repairFormReceivingItems))window.repairFormReceivingItems=[];
  renderSelectedRepairReceivingItems();
  const service=$('repairService'); if(service && !service.options.length)service.innerHTML=REPAIR_SERVICES.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  refreshRepairReceivingItems(); refreshRepairFilters(); renderRepairPending(); renderRepairHistory(); renderRepairSummary(); renderRepairAnalysis(); updateRepairStickerInfo();
  const month=$('repairAnalysisMonth'); if(month&&!month.value)month.value=new Date().toISOString().slice(0,7);
  const histMonth=$('repairHistoryMonthFilter'); if(histMonth&&!histMonth.value)histMonth.value='';
}
function refreshRepairReceivingItems(){const items=db.repairReceivingItems||[];const sel=$('repairReceivingItem');if(sel){const old=sel.value;sel.innerHTML=items.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if(old&&items.includes(old))sel.value=old;}const cards=$('repairReceivingItemCards');if(cards)cards.innerHTML=items.map((x,i)=>`<button type="button" class="repair-receiving-item-card" onclick="addSelectedRepairReceivingItemByIndex(${i})" title="Click to add ${esc(x)}"><span class="repair-receiving-item-icon">＋</span><span>${esc(x)}</span></button>`).join('')||'<div class="empty">No receiving items. Add one in Manage Receiving Items.</div>';const list=$('repairReceivingItemsList');if(list)list.innerHTML=items.map((x,i)=>`<div class="repair-item-card"><span>${esc(x)}</span><div><button class="textbtn" onclick="editRepairReceivingItem(${i})">✎ Edit</button><button class="textbtn danger" onclick="deleteRepairReceivingItem(${i})">🗑 Delete</button></div></div>`).join('')||'<div class="empty">No receiving items. Add one above.</div>';}
function openRepairReceivingItemsModal(){refreshRepairReceivingItems();$('repairReceivingItemsModal')?.classList.add('show');setTimeout(()=>$('newRepairReceivingItem')?.focus(),80);}
function closeRepairReceivingItemsModal(){$('repairReceivingItemsModal')?.classList.remove('show');}
function addRepairReceivingItem(){const el=$('newRepairReceivingItem'),name=(el?.value||'').trim();if(!name)return alert('Enter a receiving item.');db.repairReceivingItems=db.repairReceivingItems||[];if(db.repairReceivingItems.some(x=>x.toLowerCase()===name.toLowerCase()))return alert('This receiving item already exists.');db.repairReceivingItems.push(name);saveCurrentCompanyData();refreshRepairReceivingItems();if(el)el.value='';}
function editRepairReceivingItem(i){const old=db.repairReceivingItems?.[i];if(!old)return;const name=prompt('Edit receiving item:',old);if(name===null)return;const v=name.trim();if(!v)return;if(db.repairReceivingItems.some((x,j)=>j!==i&&x.toLowerCase()===v.toLowerCase()))return alert('This receiving item already exists.');db.repairReceivingItems[i]=v;saveCurrentCompanyData();refreshRepairReceivingItems();}
function deleteRepairReceivingItem(i){const old=db.repairReceivingItems?.[i];if(!old)return;if((db.repairReceivingItems||[]).length<=1)return alert('Keep at least one receiving item.');if(!confirm(`Delete receiving item "${old}"?`))return;db.repairReceivingItems.splice(i,1);saveCurrentCompanyData();refreshRepairReceivingItems();}
function repairPhoneChanged(){const phone=($('repairPhone')?.value||'').replace(/\D/g,'');const hint=$('repairPhoneHint'),nameEl=$('repairCustomerName');if(!phone){if(hint)hint.textContent='If the customer already exists, the name will fill automatically.';return;}let c=(db.customers||[]).slice().reverse().find(x=>String(x.phone||'').replace(/\D/g,'')===phone);if(!c){const r=(db.repairs||[]).slice().reverse().find(x=>String(x.phone||'').replace(/\D/g,'')===phone);if(r)c={name:r.customerName};}if(c?.name){if(nameEl)nameEl.value=c.name;if(hint)hint.textContent='Existing customer found — name filled automatically.';}else if(hint)hint.textContent='New customer number — enter the customer name.';}
function addSelectedRepairReceivingItem(itemName){const sel=$('repairReceivingItem');const value=String(itemName||sel?.value||'').trim();if(!value)return alert('Select a receiving item first.');if(sel)sel.value=value;const items=Array.isArray(window.repairFormReceivingItems)?window.repairFormReceivingItems:[];if(items.some(x=>x.toLowerCase()===value.toLowerCase()))return;items.push(value);window.repairFormReceivingItems=items;renderSelectedRepairReceivingItems();}
function addSelectedRepairReceivingItemByIndex(i){const items=db.repairReceivingItems||[];const value=items[i];if(value)addSelectedRepairReceivingItem(value);}
function removeSelectedRepairReceivingItem(i){const items=Array.isArray(window.repairFormReceivingItems)?window.repairFormReceivingItems:[];items.splice(i,1);window.repairFormReceivingItems=items;renderSelectedRepairReceivingItems();}
function renderSelectedRepairReceivingItems(){const box=$('repairSelectedReceivingItems');if(!box)return;const items=Array.isArray(window.repairFormReceivingItems)?window.repairFormReceivingItems:[];box.innerHTML=items.map((x,i)=>`<span class="repair-selected-chip">${esc(x)} <button type="button" onclick="removeSelectedRepairReceivingItem(${i})" title="Remove">×</button></span>`).join('')||'<span class="muted">No receiving items added yet.</span>';}
function clearRepairForm(){window.repairFormReceivingItems=[];renderSelectedRepairReceivingItems();['repairPhone','repairCustomerName','repairDeviceModel','repairIssue'].forEach(id=>{const e=$(id);if(e)e.value='';});const s=$('repairService');if(s)s.selectedIndex=0;const r=$('repairReceivingItem');if(r&&r.options.length)r.selectedIndex=0;}
function showRepairLoading(show=true){const e=$('repairPrintLoading');if(e)e.style.display=show?'flex':'none';}
function openRepairPrintWindow(html,title){const w=window.open('','_blank','width=420,height=760');if(!w)return null;w.document.open();w.document.write(html);w.document.close();return w;}
function getCode39BarcodeSvg(value){
 const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
 const patterns={
 '0':'101001101101','1':'110100101011','2':'101100101011','3':'110110010101','4':'101001101011','5':'110100110101','6':'101100110101','7':'101001011011','8':'110100101101','9':'101100101101',
 'A':'110101001011','B':'101101001011','C':'110110100101','D':'101011001011','E':'110101100101','F':'101101100101','G':'101010011011','H':'110101001101','I':'101101001101','J':'101011001101',
 'K':'110101010011','L':'101101010011','M':'110110101001','N':'101011010011','O':'110101101001','P':'101101101001','Q':'101010110011','R':'110101011001','S':'101101011001','T':'101011011001',
 'U':'110010101011','V':'100110101011','W':'110011010101','X':'100101101011','Y':'110010110101','Z':'100110110101','-':'100101101101','.':'110010101101',' ':'100110101101','$':'100100100101','/':'100100101001','+':'100101001001','%':'101001001001','*':'100101101101'
 };
 let text=String(value||'').toUpperCase().replace(/[^0-9A-Z. $/+%-]/g,'-');
 const encoded='*'+text+'*';let x=2,parts=[];
 for(const ch of encoded){const pat=patterns[ch]||patterns['-'];let i=0,black=true;while(i<pat.length){let j=i+1;while(j<pat.length&&pat[j]===pat[i])j++;parts.push({black,width:j-i===2?2:1});i=j;black=!black;}parts.push({black:false,width:1});}
 const module=1.15,total=parts.reduce((a,p)=>a+p.width,0)*module+8,barH=38,barY=2;
 let cur=4,rects='';for(const p of parts){if(p.black)rects+=`<rect x="${cur.toFixed(2)}" y="${barY}" width="${(p.width*module).toFixed(2)}" height="${barH}"/>`;cur+=p.width*module;}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="72mm" height="18mm" viewBox="0 0 ${total.toFixed(2)} 54" role="img" aria-label="Barcode ${esc(text)}"><rect width="100%" height="100%" fill="#fff"/><g shape-rendering="crispEdges">${rects}</g><line x1="4" y1="43" x2="${(total-4).toFixed(2)}" y2="43" stroke="#111" stroke-width="0.5"/><text x="${(total/2).toFixed(2)}" y="51" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" font-weight="700" letter-spacing="1.2">${esc(text)}</text></svg>`;
}
function getRepairTokenHtml(r,autoPrint=true){const company=shopSettings||{};const barcode=getCode39BarcodeSvg(r.token);const printScript=autoPrint?`<script>window.onload=function(){setTimeout(function(){try{window.print()}catch(e){}},250)};window.onafterprint=function(){setTimeout(function(){try{window.close()}catch(e){}},250)}<\/script>`:'';return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.token)}</title><style>@page{size:80mm auto;margin:3mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:'Segoe UI',Arial,Helvetica,sans-serif}body{width:74mm;margin:0 auto;font-size:11px;line-height:1.35}.head{padding:2px 0 8px;border-bottom:2px solid #111;text-align:center}.invoice-logo{width:18mm;height:18mm;object-fit:contain;display:block;margin:0 auto 3px}.shop{font-size:22px;font-weight:900;line-height:1.12;text-align:center}.contact{font-size:13px;font-weight:600;line-height:1.4;margin-top:5px;word-break:break-word;text-align:center}.title{font-size:13px;font-weight:900;letter-spacing:1px;margin-top:7px;text-align:center}.meta{padding:8px 0 5px;font-size:10.5px}.meta div{display:flex;gap:6px;margin:3px 0}.meta b{min-width:58px}.rule{border-top:1px dashed #555;margin:5px 0 7px}.issue{border:1px solid #aaa;border-radius:5px;padding:7px;margin-top:5px}.label{font-size:9px;text-transform:uppercase;font-weight:800;color:#444}.value{font-size:12px;font-weight:700;margin-top:2px}.barcode{margin-top:9px;padding-top:7px;border-top:1px dashed #555;text-align:center;overflow:hidden}.barcode svg{display:block;width:72mm;height:18mm;max-width:72mm;margin:0 auto}.thanks{text-align:center;border-top:1px solid #111;margin-top:7px;padding-top:7px;font-weight:700;font-size:10.5px;line-height:1.5}.small{font-size:9px;font-weight:400}@media print{body{width:74mm}.barcode svg{width:72mm;height:18mm}}</style></head><body><div class="head">${company.logo?`<img class="invoice-logo" src="${company.logo}" alt="Logo">`:''}<div class="shop">${esc(company.name||'')}</div><div class="contact">${esc(company.address||'')}${company.address&&company.phone?'<br>':''}${esc(company.phone||'')}</div><div class="title">REPAIR RECEIVING TOKEN</div></div><div class="meta"><div><b>Token No.</b><span>${esc(r.token)}</span></div><div><b>Date &amp; Time</b><span>${esc(r.date)}</span></div><div><b>Customer</b><span>${esc(r.customerName)}</span></div><div><b>Phone</b><span>${esc(r.phone)}</span></div><div><b>Device</b><span>${esc(r.deviceModel)}</span></div><div><b>Receiving</b><span>${esc((Array.isArray(r.receivingItems)?r.receivingItems:[r.receivingItem]).join(', '))}</span></div><div><b>Service</b><span>${esc(r.service)}</span></div></div><div class="rule"></div><div class="issue"><div class="label">Device Issue</div><div class="value">${esc(r.issue)}</div></div><div class="barcode">${barcode}</div><div class="thanks">${esc(company.footer||'')}<br><span class="small">Please keep this token for device collection.</span></div>${printScript}</body></html>`;}
function getRepairStickerSettings(){
 const d={stickerWidth:30,stickerHeight:20,pageWidth:90,pageHeight:20,gapX:0,gapY:0,marginLeft:0,marginTop:0,columns:3,rows:1,autoFit:false,qrSize:10,copies:3,showIssue:true};
 const x=(db&&db.repairStickerSettings&&typeof db.repairStickerSettings==='object')?db.repairStickerSettings:{};
 const n=(v,f,min,max)=>{const q=Number(v);return Number.isFinite(q)?Math.min(max,Math.max(min,q)):f;};
 return {stickerWidth:n(x.stickerWidth,d.stickerWidth,5,100),stickerHeight:n(x.stickerHeight,d.stickerHeight,5,100),pageWidth:n(x.pageWidth,d.pageWidth,10,500),pageHeight:n(x.pageHeight,d.pageHeight,10,500),gapX:n(x.gapX,d.gapX,0,30),gapY:n(x.gapY,d.gapY,0,30),marginLeft:n(x.marginLeft,d.marginLeft,0,50),marginTop:n(x.marginTop,d.marginTop,0,50),columns:Math.round(n(x.columns,d.columns,1,30)),rows:Math.round(n(x.rows,d.rows,1,50)),autoFit:!!x.autoFit,qrSize:n(x.qrSize,d.qrSize,5,25),copies:Math.round(n(x.copies,d.copies,1,100)),showIssue:x.showIssue===undefined?d.showIssue:!!x.showIssue};
}
function calcRepairStickerLayout(st){
 let cols=st.columns,rows=st.rows;
 if(st.autoFit){
  cols=Math.max(1,Math.floor((st.pageWidth-st.marginLeft+st.gapX)/(st.stickerWidth+st.gapX)));
  rows=Math.max(1,Math.floor((st.pageHeight-st.marginTop+st.gapY)/(st.stickerHeight+st.gapY)));
 }
 return {cols,rows,capacity:cols*rows};
}
function repairStickerQrUrl(token){return 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=1&data='+encodeURIComponent(String(token||''));}
function setRepairStickerSettingFields(st){
 const ids={stickerWidthMm:st.stickerWidth,stickerHeightMm:st.stickerHeight,stickerPageWidthMm:st.pageWidth,stickerPageHeightMm:st.pageHeight,stickerGapX:st.gapX,stickerGapY:st.gapY,stickerMarginLeft:st.marginLeft,stickerMarginTop:st.marginTop,stickerColumns:st.columns,stickerRows:st.rows,stickerQrSize:st.qrSize,stickerCopies:st.copies};
 Object.entries(ids).forEach(([id,v])=>{const e=$(id);if(e)e.value=v;});
 const af=$('stickerAutoFit');if(af)af.checked=st.autoFit;
 const si=$('stickerShowIssue');if(si)si.checked=st.showIssue;
}
function readRepairStickerSettingFields(){
 const old=getRepairStickerSettings(),num=(id,f)=>{const v=Number($(id)?.value);return Number.isFinite(v)?v:f;};
 const out={stickerWidth:num('stickerWidthMm',old.stickerWidth),stickerHeight:num('stickerHeightMm',old.stickerHeight),pageWidth:num('stickerPageWidthMm',old.pageWidth),pageHeight:num('stickerPageHeightMm',old.pageHeight),gapX:num('stickerGapX',old.gapX),gapY:num('stickerGapY',old.gapY),marginLeft:num('stickerMarginLeft',old.marginLeft),marginTop:num('stickerMarginTop',old.marginTop),columns:Math.max(1,Math.round(num('stickerColumns',old.columns))),rows:Math.max(1,Math.round(num('stickerRows',old.rows))),autoFit:!!$('stickerAutoFit')?.checked,qrSize:num('stickerQrSize',old.qrSize),copies:Math.max(1,Math.round(num('stickerCopies',old.copies))),showIssue:$('stickerShowIssue')?.checked!==false}; return out;
}
function renderRepairStickerPreviewFor(r,st){
 const box=$('repairStickerLivePage'),meta=$('stickerPreviewMeta'),badge=$('stickerFitBadge');if(!box)return;box.parentElement?.querySelectorAll('.repair-sticker-more-note').forEach(e=>e.remove());
 const layout=calcRepairStickerLayout(st);const used=Math.min(st.copies,layout.capacity);const token=r?.token||'RPR-00001',qr=repairStickerQrUrl(token);
 if(meta)meta.textContent=`${st.pageWidth} × ${st.pageHeight} mm • ${layout.cols} × ${layout.rows} layout • ${st.copies} copy${st.copies===1?'':'ies'}`;
 if(badge)badge.textContent=`${layout.cols} per row • ${layout.capacity} / page`;
 box.style.width=st.pageWidth+'mm';box.style.height=st.pageHeight+'mm';box.innerHTML='';
 for(let i=0;i<used;i++){
  const el=document.createElement('div');el.className='repair-sticker-live-sticker';el.style.width=st.stickerWidth+'mm';el.style.height=st.stickerHeight+'mm';el.style.marginLeft=(i%layout.cols===0?st.marginLeft:st.gapX)+'mm';el.style.marginTop=(i<layout.cols?st.marginTop:st.gapY)+'mm';
  const q=document.createElement('img');q.src=qr;q.alt='QR';q.className='live-sticker-qr';q.style.width=st.qrSize+'mm';q.style.height=st.qrSize+'mm';
  const info=document.createElement('div');info.className='live-sticker-info';info.innerHTML=`<div class="live-sticker-token">${esc(token)}</div><div class="live-sticker-customer">${esc(r?.customerName||'Customer')}</div><div class="live-sticker-device">${esc(r?.deviceModel||'Device')}</div><div class="live-sticker-date">${esc(r?.date||'')}</div>${st.showIssue?`<div class="live-sticker-issue">${esc(r?.issue||'')}</div>`:''}`;
  el.appendChild(q);el.appendChild(info);box.appendChild(el);
 }
 if(st.copies>used){const more=document.createElement('div');more.className='repair-sticker-more-note';more.textContent=`+ ${st.copies-used} more sticker${st.copies-used===1?'':'s'} will print on the next page.`;box.parentElement?.appendChild(more);}
}
function updateRepairStickerSettingsPreview(){const st=readRepairStickerSettingFields();const r=(db.repairs||[]).find(x=>x.token===repairDetailRef)||(db.repairs||[])[0]||{};renderRepairStickerPreviewFor(r,st);}
function openRepairStickerSettings(){const modal=$('repairStickerSettingsModal');if(!modal)return;const st=getRepairStickerSettings();setRepairStickerSettingFields(st);modal.classList.add('show');updateRepairStickerSettingsPreview();}
function closeRepairStickerSettings(){$('repairStickerSettingsModal')?.classList.remove('show');}
function resetRepairStickerSettings(){const st={stickerWidth:30,stickerHeight:20,pageWidth:90,pageHeight:20,gapX:0,gapY:0,marginLeft:0,marginTop:0,columns:3,rows:1,autoFit:false,qrSize:10,copies:3,showIssue:true};setRepairStickerSettingFields(st);updateRepairStickerSettingsPreview();}
function saveRepairStickerSettings(){const st=readRepairStickerSettingFields();db.repairStickerSettings=st;saveCurrentCompanyData();closeRepairStickerSettings();updateRepairStickerInfo();showToast('Sticker printer settings saved.','success',2800);}
function updateRepairStickerInfo(){const e=$('repairStickerInfoText');if(!e)return;const st=getRepairStickerSettings(),l=calcRepairStickerLayout(st);e.textContent=`${st.stickerWidth}mm × ${st.stickerHeight}mm each • ${l.cols} per row • ${st.copies} copies`;
}
function getRepairStickerHtml(r,autoPrint=false){
 const st=getRepairStickerSettings(),layout=calcRepairStickerLayout(st),printScript=autoPrint?`<script>window.onload=function(){var imgs=[].slice.call(document.images);Promise.all(imgs.map(function(img){return img.complete?Promise.resolve():new Promise(function(res){img.onload=img.onerror=res})})).then(function(){setTimeout(function(){try{window.print()}catch(e){}},350)});};window.onafterprint=function(){setTimeout(function(){try{window.close()}catch(e){}},250)}<\/script>`:'';
 const qr=repairStickerQrUrl(r.token);const pages=[];let remaining=st.copies;
 while(remaining>0){const count=Math.min(remaining,layout.capacity);let stickers='';for(let i=0;i<count;i++){const col=i%layout.cols,row=Math.floor(i/layout.cols);stickers+=`<div class="sticker" style="left:${(st.marginLeft+col*(st.stickerWidth+st.gapX)).toFixed(2)}mm;top:${(st.marginTop+row*(st.stickerHeight+st.gapY)).toFixed(2)}mm;width:${st.stickerWidth}mm;height:${st.stickerHeight}mm"><div class="sticker-inner"><img class="qr" src="${qr}" alt="QR"><div class="sticker-info"><div class="token">${esc(r.token)}</div><div class="customer">${esc(r.customerName||'Customer')}</div><div class="device">${esc(r.deviceModel||'Device')}</div><div class="dt">${esc(r.date||'')}</div>${st.showIssue?`<div class="issue">${esc(r.issue||'')}</div>`:''}</div></div></div>`;}pages.push(`<div class="print-page">${stickers}</div>`);remaining-=count;}
 return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.token)} — Sticker Print</title><style>@page{size:${st.pageWidth}mm ${st.pageHeight}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#e9edf2;color:#111;font-family:'Segoe UI',Arial,sans-serif}.preview-bar{position:sticky;top:0;z-index:10;background:#101828;color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px;font-size:13px}.preview-bar button{border:0;border-radius:10px;padding:10px 16px;font-weight:800;cursor:pointer}.print-btn{background:#fff;color:#172033}.close-btn{background:#344054;color:#fff}.size-note{margin-left:auto;font-size:12px;opacity:.85}.preview-area{padding:28px;display:flex;flex-direction:column;align-items:center;gap:20px}.print-page{position:relative;width:${st.pageWidth}mm;height:${st.pageHeight}mm;background:#fff;box-shadow:0 5px 24px rgba(15,23,42,.18);overflow:hidden}.sticker{position:absolute;border:0;background:#fff;border-radius:1.5mm;padding:0.9mm;overflow:hidden}.sticker-inner{width:100%;height:100%;display:flex;align-items:center;gap:1.2mm;padding:.3mm}.qr{width:${st.qrSize}mm;height:${st.qrSize}mm;flex:0 0 ${st.qrSize}mm;display:block;image-rendering:auto}.sticker-info{min-width:0;overflow:hidden;line-height:1.08}.token{font-size:7.2px;font-weight:900;letter-spacing:.15px;white-space:nowrap}.customer{font-size:5.2px;font-weight:800;margin-top:.7mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.device{font-size:5px;font-weight:700;margin-top:.45mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dt{font-size:4.4px;margin-top:.5mm;white-space:nowrap}.issue{font-size:4.2px;color:#475467;margin-top:.5mm;line-height:1.08;max-height:${Math.max(3,st.stickerHeight-st.qrSize-5)}mm;overflow:hidden}.page-label{display:none}@media print{html,body{background:#fff}.preview-bar{display:none}.preview-area{padding:0;gap:0}.print-page{box-shadow:none;page-break-after:always}.print-page:last-child{page-break-after:auto}.sticker{border:0;border-radius:0}}</style></head><body><div class="preview-bar"><button class="print-btn" onclick="window.print()">🖨 PRINT ${st.copies} STICKER${st.copies===1?'':'S'}</button><button class="close-btn" onclick="window.close()">✕ CLOSE</button><span class="size-note">Sticker ${st.stickerWidth}×${st.stickerHeight}mm • Page ${st.pageWidth}×${st.pageHeight}mm • ${layout.cols} per row • Gap ${st.gapX}/${st.gapY}mm</span></div><div class="preview-area">${pages.join('')}</div>${printScript}</body></html>`;
}
async function saveRepairService(){
 const service=$('repairService')?.value||'',phone=($('repairPhone')?.value||'').trim(),customerName=($('repairCustomerName')?.value||'').trim(),deviceModel=($('repairDeviceModel')?.value||'').trim(),receivingItems=Array.isArray(window.repairFormReceivingItems)?window.repairFormReceivingItems.slice():[],issue=($('repairIssue')?.value||'').trim();
 if(!service||!phone||!customerName||!deviceModel||!receivingItems.length||!issue)return alert('Please add at least one Receiving Item. You can add Phone, Charger, Back Cover, SIM, etc. one by one.');
 const receivingItem=receivingItems.join(', ');
 const token=nextRepairToken(),date=repairNow();const r={id:'REPAIR-'+Date.now(),token,date,service,phone,customerName,deviceModel,receivingItem,receivingItems,issue,status:'Pending',technician:'',items:[],itemCostTotal:0,totalCharge:0,serviceCharge:0,createdBy:currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),finishedDate:'',finishedBy:'',company:{name:shopSettings.name||'',address:shopSettings.address||'',phone:shopSettings.phone||'',footer:shopSettings.footer||'',logo:shopSettings.logo||''}};
 db.repairs=db.repairs||[];db.repairs.unshift(r);saveCurrentCompanyData();
 try{await saveTemporaryIndexedDb();}catch(e){console.warn(e)}
 // Do not leave a newly-added repair only in the browser cache. When a PC data
 // folder is connected, write the repair to the permanent JSON store immediately
 // so a fast refresh cannot restore an older snapshot and make the repair vanish.
 try{if(pcDataFolder)await writeSnapshotToFolder(false);}catch(e){console.warn('Immediate repair PC save failed:',e)}
 clearRepairForm();showRepairLoading(true);await new Promise(res=>setTimeout(res,500));
 try{openRepairPrintWindow(getRepairTokenHtml(r,true),r.token);await new Promise(res=>setTimeout(res,250));openRepairPrintWindow(getRepairStickerHtml(r,true),r.token+' Stickers');}finally{showRepairLoading(false);}
 renderRepairSummary();renderRepairPending();renderRepairHistory();renderRepairAnalysis();showToast(r.token+' saved. Token & 3 stickers sent to print.','success',4500);
}
function repairItemsTotal(r){return (r.items||[]).reduce((a,i)=>a+Number(i.total??(Number(i.qty||0)*Number(i.unitPrice||i.price||0))),0);}
function repairItemSaleTotal(r){return (r.items||[]).reduce((a,i)=>a+Number(i.saleTotal??(Number(i.qty||0)*Number(i.salePrice||0))),0);}
function repairServiceCharge(r){const saleTotal=repairItemSaleTotal(r);return Math.max(0,Number(r.totalCharge||0)-saleTotal);}
function repairItemSaleProfit(r){return Math.max(0,repairItemSaleTotal(r)-repairItemsTotal(r));}
function repairProfit(r){return repairItemSaleProfit(r)+repairServiceCharge(r);}
function repairAnalysisMonthKey(r){const raw=r.finishedDate||r.date||'';const d=new Date(raw);if(Number.isNaN(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function repairItemPriceMissing(i){if(!i)return true;const costEntered=i.costPriceEntered!==undefined?i.costPriceEntered:String(i.costPrice??(i.unitPrice??i.price??'')).trim()!=='';const saleEntered=i.salePriceEntered!==undefined?i.salePriceEntered:String(i.salePrice??'').trim()!=='';return !costEntered||!saleEntered;}
function repairMissingPriceCount(){return (db.repairs||[]).reduce((n,r)=>n+(r.items||[]).filter(repairItemPriceMissing).length,0);}
function getRepairMissingPriceEntries(){const out=[];(db.repairs||[]).forEach(r=>(r.items||[]).forEach((item,index)=>{if(repairItemPriceMissing(item))out.push({repair:r,item,index,missingCost:!(item.costPriceEntered!==undefined?item.costPriceEntered:String(item.costPrice??(item.unitPrice??item.price??'')).trim()!==''),missingSale:!(item.salePriceEntered!==undefined?item.salePriceEntered:String(item.salePrice??'').trim()!=='')});}));return out;}
function renderRepairPriceBell(){const count=repairMissingPriceCount(),bell=$('repairPriceBell'),badge=$('repairPriceBellCount');if(badge)badge.textContent=count;if(bell){bell.classList.toggle('has-alert',count>0);bell.title=count?`${count} repair item${count===1?'':'s'} need Cost Price / Sale Price`: 'No missing repair prices';}}
function renderRepairSummary(){const arr=db.repairs||[];const pending=arr.filter(r=>r.status!=='Finished').length,cost=arr.reduce((a,r)=>a+repairItemsTotal(r),0),profit=arr.reduce((a,r)=>a+repairProfit(r),0),service=arr.reduce((a,r)=>a+repairServiceCharge(r),0),missing=repairMissingPriceCount();if($('repairPendingCount'))$('repairPendingCount').textContent=pending;if($('repairCostTotal'))$('repairCostTotal').textContent=money(cost);if($('repairProfitTotal'))$('repairProfitTotal').textContent=money(profit);if($('repairServiceTotal'))$('repairServiceTotal').textContent=money(service);if($('repairMissingPriceCount'))$('repairMissingPriceCount').textContent=missing;if($('repairMissingPriceText'))$('repairMissingPriceText').textContent=missing?`${missing} item${missing===1?'':'s'} need Cost Price / Sale Price`: 'All item Cost & Sale Prices entered';$('repairMissingPriceCard')?.classList.toggle('needs-entry',missing>0);renderRepairPriceBell();}
function renderRepairPriceNotifications(){const list=$('repairPriceNotificationsList');if(!list)return;const entries=getRepairMissingPriceEntries();if(!entries.length){list.innerHTML='<div class="repair-price-empty">✓ All repair item Cost Prices and Sale Prices are entered.</div>';return;}list.innerHTML=entries.map((e,i)=>{const r=e.repair,item=e.item;const missing=e.missingCost&&e.missingSale?'Cost Price + Sale Price':e.missingCost?'Cost Price':'Sale Price';return `<button type="button" class="repair-price-notification-item" onclick="openRepairMissingFromNotification(${i})"><div class="repair-price-notification-icon">⚠</div><div class="repair-price-notification-main"><b>${esc(item.name||'Unnamed Item')} × ${Number(item.qty||1)}</b><span>${esc(r.token)} • ${esc(r.customerName||'Customer')} • ${esc(r.deviceModel||'Device')}</span><small>Need to enter: <strong>${missing}</strong></small></div><span class="repair-price-notification-arrow">›</span></button>`;}).join('');}
function openRepairPriceNotifications(){renderRepairPriceNotifications();$('repairPriceNotificationsModal')?.classList.add('show');}
function closeRepairPriceNotifications(){$('repairPriceNotificationsModal')?.classList.remove('show');}
function openRepairMissingFromNotification(i){const entries=getRepairMissingPriceEntries(),e=entries[i];if(!e)return;closeRepairPriceNotifications();openRepairDetail(e.repair.token);setTimeout(()=>openRepairItemModal(e.index),180);}
function openNextRepairMissingPrice(){const entries=getRepairMissingPriceEntries();if(!entries.length){showToast('All repair item Cost Price and Sale Price fields are entered.','success',2500);return;}openRepairMissingFromNotification(0);}
function repairTechnicians(){return [...new Set((db.repairs||[]).map(r=>String(r.technician||'').trim()).filter(Boolean))].sort();}
function refreshRepairFilters(){const techs=repairTechnicians(),services=[...new Set((db.repairs||[]).map(r=>r.service).filter(Boolean))],receiving=[...new Set((db.repairs||[]).map(r=>r.receivingItem).filter(Boolean))];[['repairPendingTechnicianFilter',techs],['repairHistoryTechnicianFilter',techs],['repairAnalysisTechnician',techs]].forEach(([id,vals])=>{const e=$(id);if(!e)return;const old=e.value;e.innerHTML='<option value="">All Technicians</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(vals.includes(old))e.value=old;});const sf=$('repairPendingServiceFilter');if(sf){const old=sf.value;sf.innerHTML='<option value="">All Services</option>'+services.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(services.includes(old))sf.value=old;}const rf=$('repairPendingReceivingFilter');if(rf){const old=rf.value;rf.innerHTML='<option value="">All Receiving Items</option>'+receiving.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(receiving.includes(old))rf.value=old;}}
function repairSearchMatch(r,q){return !q||(r.token+' '+r.phone+' '+r.customerName+' '+r.deviceModel+' '+r.receivingItem+' '+r.issue+' '+r.service+' '+(r.technician||'')).toLowerCase().includes(q);}
function requestRepairHistoryOpen(token){pendingTemporaryAction={action:'repair-history-open',token};openTemporarySecurity('repair-history-open');}
function performOpenRepairHistoryAfterSecurity(token){const r=(db.repairs||[]).find(x=>x.token===token);if(!r)return;openRepairDetail(token,true);showToast(token+' access verified.','success',2200);}
function requestRepairDelete(token){pendingTemporaryAction={action:'repair-delete',token};openTemporarySecurity('repair-delete');}
function performEditRepairAfterSecurity(token){const r=(db.repairs||[]).find(x=>x.token===token);if(!r)return;openRepairDetail(token);showToast(token+' edit access verified.','success',2500);}
function performDeleteRepairAfterSecurity(token){const idx=(db.repairs||[]).findIndex(x=>x.token===token);if(idx<0)return;if(!confirm(`DELETE JOB ${token}?\n\nCustomer: ${(db.repairs[idx].customerName||'Customer')}\nDevice: ${(db.repairs[idx].deviceModel||'Device')}\n\nThis job and its repair details will be permanently deleted. This cannot be undone.`))return;db.repairs.splice(idx,1);saveCurrentCompanyData();try{saveTemporaryIndexedDb()}catch(e){}if(repairDetailRef===token){$('repairDetailModal')?.classList.remove('show');repairDetailRef='';}renderRepairSummary();renderRepairPending();renderRepairHistory();renderRepairAnalysis();showToast(token+' deleted successfully.','success',3000);}
function renderRepairPending(){const t=$('repairPendingTable');if(!t)return;refreshRepairFilters();const q=($('repairPendingSearch')?.value||'').toLowerCase().trim(),tech=$('repairPendingTechnicianFilter')?.value||'',service=$('repairPendingServiceFilter')?.value||'',rec=$('repairPendingReceivingFilter')?.value||'';const rows=(db.repairs||[]).filter(r=>r.status==='Pending'&&repairSearchMatch(r,q)&&(!tech||r.technician===tech)&&(!service||r.service===service)&&(!rec||(Array.isArray(r.receivingItems)?r.receivingItems:[r.receivingItem]).includes(rec))).sort((a,b)=>new Date(b.date)-new Date(a.date));t.innerHTML=rows.map(r=>`<tr><td><button class="textbtn" onclick="openRepairDetail('${esc(r.token)}')"><b>${esc(r.token)}</b></button></td><td>${esc(r.date)}</td><td>${esc(r.customerName)}</td><td>${esc(r.phone)}</td><td>${esc(r.deviceModel)}</td><td>${esc((Array.isArray(r.receivingItems)?r.receivingItems:[r.receivingItem]).join(', '))}</td><td title="${esc(r.issue)}">${esc(r.issue).slice(0,40)}${r.issue.length>40?'…':''}</td><td>${esc(r.technician||'Not assigned')}</td><td><span class="badge pending-status">Pending</span><div class="repair-row-actions"><button class="textbtn danger" onclick="requestRepairDelete('${esc(r.token)}')">🗑 Delete</button></div></td></tr>`).join('')||'<tr><td colspan="9">No pending repairs found.</td></tr>';}
function renderRepairHistory(){const t=$('repairHistoryTable');if(!t)return;const q=($('repairHistorySearch')?.value||'').toLowerCase().trim(),status=$('repairHistoryStatusFilter')?.value||'',month=$('repairHistoryMonthFilter')?.value||'',tech=$('repairHistoryTechnicianFilter')?.value||'';const rows=(db.repairs||[]).filter(r=>repairSearchMatch(r,q)&&(!status||r.status===status)&&(!month||String(r.date).slice(0,7)===month)&&(!tech||r.technician===tech)).sort((a,b)=>new Date(b.date)-new Date(a.date));t.innerHTML=rows.map(r=>{const cost=repairItemsTotal(r),charge=Number(r.totalCharge||0),profit=repairProfit(r);const st=r.status==='Finished'?'<span class="badge ok">Finished</span>':r.status==='Return'?'<span class="badge repair-return-badge">RETURN</span>':r.status==='Cancelled'?'<span class="badge repair-cancel-badge">Cancelled</span>':'<span class="badge pending-status">Pending</span>';return `<tr><td><button class="textbtn repair-history-token" onclick="requestRepairHistoryOpen('${esc(r.token)}')"><b>${esc(r.token)}</b></button></td><td>${esc(r.date)}</td><td>${esc(r.customerName)}<br><small>${esc(r.phone)}</small></td><td>${esc(r.deviceModel)}</td><td><button type="button" class="textbtn repair-items-view-btn" onclick="openRepairItemsHistoryModal('${esc(r.token)}')">👁 View</button></td><td>${money(charge)}</td><td><b>${money(profit)}</b><br><small>Total − Item Cost</small></td><td>${esc(r.technician||'Not assigned')}</td><td>${st}</td></tr>`;}).join('')||'<tr><td colspan="9">No repair history found.</td></tr>';refreshRepairFilters();}
function technicianProfiles(){
  db.technicianProfiles=Array.isArray(db.technicianProfiles)?db.technicianProfiles:[];
  return db.technicianProfiles;
}
function technicianCommissionRates(){db.technicianCommissions=(db.technicianCommissions&&typeof db.technicianCommissions==='object')?db.technicianCommissions:{};return db.technicianCommissions;}
function currentMonthKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function technicianProfileByName(name){const n=String(name||'').trim().toLowerCase();return technicianProfiles().find(t=>String(t.name||'').trim().toLowerCase()===n)||null;}
function getTechnicianCommissionRate(name,targetMonth=''){
  const n=String(name||'').trim();
  if(!n)return 0;
  const profile=technicianProfileByName(n);
  const month=String(targetMonth||currentMonthKey());
  if(profile&&Array.isArray(profile.commissionHistory)&&profile.commissionHistory.length){
    let chosen=null;
    profile.commissionHistory.slice().sort((a,b)=>a.effectiveMonth.localeCompare(b.effectiveMonth)).forEach(h=>{if(h.effectiveMonth<=month)chosen=h;});
    if(chosen)return Math.min(100,Math.max(0,Number(chosen.rate||0)));
  }
  const legacy=Number(technicianCommissionRates()[n]??0);
  return Number.isFinite(legacy)?Math.min(100,Math.max(0,legacy)):0;
}
function getRepairCommissionRate(r){
  if(r&&r.commissionRateSnapshot!==undefined&&Number.isFinite(Number(r.commissionRateSnapshot)))return Number(r.commissionRateSnapshot);
  return getTechnicianCommissionRate(r?.technician||'',repairAnalysisMonthKey(r)||currentMonthKey());
}
function migrateTechnicianCommissionData(){
  technicianProfiles();
  const legacy=technicianCommissionRates();
  const names=new Set();
  technicianProfiles().forEach(t=>{if(t.name)names.add(t.name);});
  Object.keys(legacy).forEach(n=>{if(String(n).trim())names.add(String(n).trim());});
  (db.repairs||[]).forEach(r=>{if(String(r.technician||'').trim())names.add(String(r.technician).trim());});
  names.forEach(name=>{
    let p=technicianProfileByName(name);
    if(!p){p={id:'TECH-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name,phone:'',joinDate:'',note:'',active:true,commissionHistory:[]};technicianProfiles().push(p);}
    if(!Array.isArray(p.commissionHistory))p.commissionHistory=[];
    const legacyRate=Number(legacy[name]);
    if(!p.commissionHistory.length&&Number.isFinite(legacyRate))p.commissionHistory.push({effectiveMonth:currentMonthKey(),rate:Math.min(100,Math.max(0,legacyRate)),updatedAt:new Date().toISOString()});
  });
  // Freeze any existing finished repair that did not yet have a snapshot. This
  // prevents a future commission change from rewriting old historical profit.
  (db.repairs||[]).forEach(r=>{
    if(r.status==='Finished'&&r.commissionRateSnapshot===undefined&&String(r.technician||'').trim()){
      r.commissionRateSnapshot=getTechnicianCommissionRate(r.technician,repairAnalysisMonthKey(r)||currentMonthKey());
    }
  });
}
function repairTechnicians(){
  const fromProfiles=technicianProfiles().filter(t=>t.active!==false&&String(t.name||'').trim()).map(t=>String(t.name).trim());
  const fromRepairs=(db.repairs||[]).map(r=>String(r.technician||'').trim()).filter(Boolean);
  return [...new Set([...fromProfiles,...fromRepairs])].sort((a,b)=>a.localeCompare(b));
}
function allTechnicianNames(){
  const fromProfiles=technicianProfiles().map(t=>String(t.name||'').trim()).filter(Boolean);
  const fromRepairs=(db.repairs||[]).map(r=>String(r.technician||'').trim()).filter(Boolean);
  return [...new Set([...fromProfiles,...fromRepairs])].sort((a,b)=>a.localeCompare(b));
}
function refreshRepairFilters(){const techs=repairTechnicians(),services=[...new Set((db.repairs||[]).map(r=>r.service).filter(Boolean))],receiving=[...new Set((db.repairs||[]).map(r=>r.receivingItem).filter(Boolean))];[['repairPendingTechnicianFilter',techs],['repairHistoryTechnicianFilter',techs],['repairAnalysisTechnician',techs]].forEach(([id,vals])=>{const e=$(id);if(!e)return;const old=e.value;e.innerHTML='<option value="">All Technicians</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(vals.includes(old))e.value=old;});const sf=$('repairPendingServiceFilter');if(sf){const old=sf.value;sf.innerHTML='<option value="">All Services</option>'+services.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(services.includes(old))sf.value=old;}const rf=$('repairPendingReceivingFilter');if(rf){const old=rf.value;rf.innerHTML='<option value="">All Receiving Items</option>'+receiving.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(receiving.includes(old))rf.value=old;}}
function openTechnicianProfileModal(id=''){
  const p=id?technicianProfiles().find(x=>x.id===id):null;
  $('technicianProfileModalTitle').textContent=p?'👨‍🔧 Edit Technician':'👨‍🔧 Add Technician';
  $('technicianProfileForm').dataset.editId=p?.id||'';
  $('technicianProfileName').value=p?.name||'';
  $('technicianProfilePhone').value=p?.phone||'';
  $('technicianProfileJoinDate').value=p?.joinDate||'';
  $('technicianProfileActive').value=String(p?.active!==false);
  $('technicianProfileNote').value=p?.note||'';
  $('technicianProfileModal')?.classList.add('show');
  setTimeout(()=>$('technicianProfileName')?.focus(),60);
}
function closeTechnicianProfileModal(){$('technicianProfileModal')?.classList.remove('show');}
function saveTechnicianProfile(){
  const form=$('technicianProfileForm');
  const name=($('technicianProfileName')?.value||'').trim();
  const phone=($('technicianProfilePhone')?.value||'').trim();
  const joinDate=$('technicianProfileJoinDate')?.value||'';
  const active=$('technicianProfileActive')?.value!=='false';
  const note=($('technicianProfileNote')?.value||'').trim();
  if(!name)return alert('Please enter the technician name.');
  const duplicate=technicianProfiles().find(t=>t.id!==form?.dataset.editId&&String(t.name||'').trim().toLowerCase()===name.toLowerCase());
  if(duplicate)return alert('This technician name already exists.');
  let p=form?.dataset.editId?technicianProfiles().find(t=>t.id===form.dataset.editId):null;
  if(!p){p={id:'TECH-'+Date.now(),name:'',phone:'',joinDate:'',note:'',active:true,commissionHistory:[]};technicianProfiles().push(p);}
  p.name=name;p.phone=phone;p.joinDate=joinDate;p.note=note;p.active=active;p.commissionHistory=Array.isArray(p.commissionHistory)?p.commissionHistory:[];
  saveCurrentCompanyData();try{saveTemporaryIndexedDb()}catch(e){}
  closeTechnicianProfileModal();renderTechnicianProfiles();refreshRepairFilters();refreshRepairReceivingItems();showToast(name+' technician profile saved.','success',3000);
}
function renderTechnicianProfiles(){
  const t=$('technicianProfileTable');if(!t)return;
  const list=technicianProfiles().slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
  if($('technicianProfileCount'))$('technicianProfileCount').textContent=list.length+' Technician'+(list.length===1?'':'s');
  t.innerHTML=list.map(p=>{
    const current=getTechnicianCommissionRate(p.name,currentMonthKey());
    const history=(p.commissionHistory||[]).slice().sort((a,b)=>b.effectiveMonth.localeCompare(a.effectiveMonth));
    const historyText=history.length?`<button type="button" class="iconbtn technician-history-view-btn" title="View Commission History" aria-label="View Commission History" onclick="openTechnicianHistoryModal('${esc(p.id)}')">👁</button>`:'<span class="muted">—</span>';
    return `<tr><td><b>${esc(p.name)}</b><br><small>${esc(p.note||'')}</small></td><td>${esc(p.phone||'—')}</td><td>${esc(p.joinDate||'—')}</td><td><span class="commission-rate-badge">${current}%</span></td><td><div class="technician-history-list">${historyText}</div></td><td><span class="badge ${p.active!==false?'ok':'low'}">${p.active!==false?'Active':'Inactive'}</span></td><td><button class="textbtn technician-commission-link" type="button" onclick="requestTechnicianCommission('${esc(p.name)}')">% Set Commission</button><button class="textbtn" type="button" onclick="openTechnicianProfileModal('${esc(p.id)}')">✎ Edit</button></td></tr>`;
  }).join('')||'<tr><td colspan="7">No technician profiles yet. Click ADD TECHNICIAN to create one.</td></tr>';
}
function openTechnicianHistoryModal(id){const p=technicianProfiles().find(x=>x.id===id);if(!p)return;const box=$('technicianHistoryModalContent');if(!box)return;const history=(p.commissionHistory||[]).slice().sort((a,b)=>b.effectiveMonth.localeCompare(a.effectiveMonth));$('technicianHistoryModalName').textContent=p.name||'Technician';box.innerHTML=history.length?history.map(h=>`<div class="technician-history-modal-row"><div><b>${esc(monthLabel(h.effectiveMonth))}</b><small>Effective from this month</small></div><span class="commission-rate-badge">${Number(h.rate||0)}%</span></div>`).join(''):'<div class="muted">No commission history yet.</div>';$('technicianHistoryModal')?.classList.add('show');}
function closeTechnicianHistoryModal(){$('technicianHistoryModal')?.classList.remove('show');}
function requestTechnicianCommission(technician){const name=String(technician||'').trim();if(!name||name==='Unassigned')return;pendingTemporaryAction={action:'technician-commission',technician:name};openTemporarySecurity('technician-commission');}
function openTechnicianCommissionModal(technician){
  const name=String(technician||'').trim();if(!name)return;
  if($('commissionTechnicianName'))$('commissionTechnicianName').textContent=name;
  const month=currentMonthKey();
  const rate=getTechnicianCommissionRate(name,month);
  if($('commissionCurrentRate'))$('commissionCurrentRate').textContent=rate+'%';
  if($('technicianCommissionPercent'))$('technicianCommissionPercent').value='';
  if($('technicianCommissionEffectiveMonth'))$('technicianCommissionEffectiveMonth').value=month;
  renderTechnicianCommissionHistoryModal(name);
  $('technicianCommissionModal')?.classList.add('show');
  setTimeout(()=>$('technicianCommissionEffectiveMonth')?.focus(),60);
}
function renderTechnicianCommissionHistoryModal(name){
  const box=$('technicianCommissionHistory');if(!box)return;
  const p=technicianProfileByName(name);
  const history=(p?.commissionHistory||[]).slice().sort((a,b)=>b.effectiveMonth.localeCompare(a.effectiveMonth));
  box.innerHTML=history.length?'<div class="technician-history-title">Commission History</div>'+history.map(h=>`<div class="technician-history-row"><span>${esc(monthLabel(h.effectiveMonth))}</span><b>${Number(h.rate||0)}%</b></div>`).join(''):'<div class="muted">No commission history yet.</div>';
}
function closeTechnicianCommissionModal(){$('technicianCommissionModal')?.classList.remove('show');}
function saveTechnicianCommission(){
  const name=($('commissionTechnicianName')?.textContent||'').trim();
  const raw=$('technicianCommissionPercent')?.value??'';
  const effectiveMonth=($('technicianCommissionEffectiveMonth')?.value||'').trim();
  const rate=Number(raw);
  if(!name)return;
  if(!/^\d{4}-\d{2}$/.test(effectiveMonth))return alert('Please select the month when this commission should start.');
  if(raw.trim()===''||!Number.isFinite(rate)||rate<0||rate>100)return alert('Enter a commission percentage from 0 to 100.');
  let p=technicianProfileByName(name);
  if(!p){p={id:'TECH-'+Date.now(),name,phone:'',joinDate:'',note:'',active:true,commissionHistory:[]};technicianProfiles().push(p);}
  p.commissionHistory=Array.isArray(p.commissionHistory)?p.commissionHistory:[];
  const old=p.commissionHistory.find(h=>h.effectiveMonth===effectiveMonth);
  const entry={effectiveMonth,rate,updatedAt:new Date().toISOString()};
  if(old)Object.assign(old,entry);else p.commissionHistory.push(entry);
  p.commissionHistory.sort((a,b)=>a.effectiveMonth.localeCompare(b.effectiveMonth));
  db.technicianCommissions[name]=rate; // compatibility with older v19 records; repair snapshots remain untouched.
  // Freeze any existing finished repair in the selected month that still lacks a snapshot.
  (db.repairs||[]).forEach(r=>{if(r.status==='Finished'&&r.commissionRateSnapshot===undefined&&String(r.technician||'').trim().toLowerCase()===name.toLowerCase()&&repairAnalysisMonthKey(r)===effectiveMonth)r.commissionRateSnapshot=rate;});
  saveCurrentCompanyData();try{saveTemporaryIndexedDb()}catch(e){}
  closeTechnicianCommissionModal();renderTechnicianProfiles();renderRepairAnalysis();renderTechnicianCommission();renderMyProfitDashboard();refreshRepairFilters();
  showToast(name+' commission set to '+rate+'% from '+monthLabel(effectiveMonth)+'.','success',3500);
}
function renderRepairAnalysis(){const t=$('repairTechnicianAnalysisTable');if(!t)return;const month=$('repairAnalysisMonth')?.value||new Date().toISOString().slice(0,7);const tech=$('repairAnalysisTechnician')?.value||'';const done=(db.repairs||[]).filter(r=>r.status==='Finished'&&repairAnalysisMonthKey(r)===month&&(!tech||String(r.technician||'Unassigned')===tech));const groups={};let itemSaleProfit=0,serviceProfit=0,totalProfit=0,totalCommission=0;done.forEach(r=>{const k=r.technician||'Unassigned';const itemSale=repairItemSaleTotal(r),itemCost=repairItemsTotal(r),itemProfit=repairItemSaleProfit(r),service=repairServiceCharge(r),profit=itemProfit+service,commission=service*getRepairCommissionRate(r)/100;if(!groups[k])groups[k]={count:0,cost:0,sale:0,itemProfit:0,service:0,profit:0,commission:0};groups[k].count++;groups[k].cost+=itemCost;groups[k].sale+=itemSale;groups[k].itemProfit+=itemProfit;groups[k].service+=service;groups[k].profit+=profit;groups[k].commission+=commission;itemSaleProfit+=itemProfit;serviceProfit+=service;totalProfit+=profit;totalCommission+=commission;});if($('repairAnalysisItemSaleProfit'))$('repairAnalysisItemSaleProfit').textContent=money(itemSaleProfit);if($('repairAnalysisServiceProfit'))$('repairAnalysisServiceProfit').textContent=money(serviceProfit);if($('repairAnalysisTotalProfit'))$('repairAnalysisTotalProfit').textContent=money(totalProfit);t.innerHTML=Object.entries(groups).sort((a,b)=>b[1].profit-a[1].profit).map(([name,g])=>`<tr><td><button type="button" class="textbtn technician-commission-link" onclick="requestTechnicianCommission('${esc(name)}')">👨‍🔧 <b>${esc(name)}</b></button></td><td>${g.count}</td><td>${money(g.cost)}</td><td>${money(g.sale)}</td><td><b>${money(g.itemProfit)}</b></td><td><b>${money(g.service)}</b></td><td><b>${money(g.profit)}</b></td><td><b class="commission-value">${money(g.commission)}</b><br><small>${getTechnicianCommissionRate(name,month)}%</small></td></tr>`).join('')||'<tr><td colspan="8">No finished repairs for this month.</td></tr>';}
function renderTechnicianCommission(){const t=$('tempTechnicianCommissionTable');if(!t)return;const month=$('tempCommissionMonth')?.value||new Date().toISOString().slice(0,7);if($('tempCommissionMonth')&&!$('tempCommissionMonth').value)$('tempCommissionMonth').value=month;const repairs=(db.repairs||[]).filter(r=>r.status==='Finished'&&repairAnalysisMonthKey(r)===month);const names=repairTechnicians();const groups={};names.forEach(n=>groups[n]={count:0,service:0,commission:0,rate:getTechnicianCommissionRate(n,month)});repairs.forEach(r=>{const n=String(r.technician||'').trim()||'Unassigned';if(!groups[n])groups[n]={count:0,service:0,commission:0,rate:getRepairCommissionRate(r)};const service=repairServiceCharge(r),rate=getRepairCommissionRate(r);groups[n].count++;groups[n].service+=service;groups[n].commission+=service*rate/100;});let totalService=0,totalCommission=0;Object.values(groups).forEach(g=>{totalService+=g.service;totalCommission+=g.commission;});if($('tempCommissionTechCount'))$('tempCommissionTechCount').textContent=Object.keys(groups).length;if($('tempCommissionServiceProfit'))$('tempCommissionServiceProfit').textContent=money(totalService);if($('tempCommissionTotal'))$('tempCommissionTotal').textContent=money(totalCommission);t.innerHTML=Object.entries(groups).sort((a,b)=>b[1].commission-a[1].commission).map(([name,g])=>`<tr><td><b>${esc(name)}</b></td><td><span class="commission-rate-badge">${g.rate}%</span></td><td>${g.count}</td><td>${money(g.service)}</td><td><b class="commission-value">${money(g.commission)}</b></td></tr>`).join('')||'<tr><td colspan="5">No technician commission records for this month.</td></tr>';}
function openRepairDetail(token,authorizedFromHistory=false){const r=(db.repairs||[]).find(x=>x.token===token);if(!r)return;repairHistoryAuthorized=authorizedFromHistory===true;repairDetailRef=token;$('repairDetailToken').textContent=token;const cost=repairItemsTotal(r),saleTotal=repairItemSaleTotal(r),charge=Number(r.totalCharge||0),service=repairServiceCharge(r);$('repairDetailContent').innerHTML=`<div class="repair-detail-grid"><div><span>Customer</span><b>${esc(r.customerName)}</b></div><div><span>Phone</span><b>${esc(r.phone)}</b></div><div><span>Device</span><b>${esc(r.deviceModel)}</b></div><div><span>Receiving Items</span><b>${esc((Array.isArray(r.receivingItems)?r.receivingItems:[r.receivingItem]).join(', '))}</b></div><div><span>Service</span><b>${esc(r.service)}</b></div><div><span>Status</span><b>${r.status==='Finished'?'Finished':r.status==='Return'?'RETURN':r.status==='Cancelled'?'Cancelled':'Pending'}</b></div></div><div class="repair-issue-box"><b>Device Issue</b><p>${esc(r.issue)}</p></div><div class="panel repair-parts-panel"><div class="panel-head"><div><h3>Repair Items / Parts &amp; Price</h3><p class="muted">Cost Price = shop cost. Sale Price = amount charged for the item. Missing prices are highlighted.</p></div><div class="repair-parts-add-actions"><button class="secondary" onclick="openRepairItemModal()">＋ Add Item</button><button class="primary repair-add-stock-btn" onclick="openRepairStockModal()">📦 Add From Stock</button></div></div><div class="table-wrap"><table><thead><tr><th>Item / Part</th><th>Cost Price</th><th>Sale Price</th><th>Qty</th><th>Total Cost</th><th>Total Sale</th><th></th></tr></thead><tbody>${(r.items||[]).map((i,idx)=>{const costRaw=i.costPrice??i.unitPrice??i.price??'',saleRaw=i.salePrice??'';const missingCost=i.costPriceEntered!==undefined?!i.costPriceEntered:String(costRaw).trim()==='';const missingSale=i.salePriceEntered!==undefined?!i.salePriceEntered:String(saleRaw).trim()==='';return `<tr class="${missingCost||missingSale?'repair-price-missing-row':''}"><td>${esc(i.name)}${i.fromStock?'<br><span class="repair-stock-source-badge">📦 FROM STOCK</span>':''}${missingCost||missingSale?'<br><span class="repair-price-missing-badge">⚠ PRICE NEEDED</span>':''}</td><td>${missingCost?'<span class="repair-price-missing">⚠ Enter Cost</span>':money(costRaw)}</td><td>${missingSale?'<span class="repair-price-missing">⚠ Enter Sale</span>':money(saleRaw)}</td><td>${i.qty}</td><td>${Number(i.total||0)>0?money(i.total):'<span class="muted">Rs. 0</span>'}</td><td>${Number(i.saleTotal||0)>0?money(i.saleTotal):'<span class="muted">Rs. 0</span>'}</td><td><button class="textbtn" onclick="openRepairItemModal(${idx})">✎ Edit</button> <button class="textbtn danger" onclick="deleteRepairPart(${idx})">🗑</button></td></tr>`;}).join('')||'<tr><td colspan="7">No repair items added yet.</td></tr>'}</tbody></table></div></div><div class="repair-charge-grid"><div><label>Customer Total Charge (Rs.)</label><input id="repairTotalChargeInput" type="number" min="0" step="0.01" value="${charge}" oninput="updateRepairChargePreview()"></div><div><label>Technician Name</label><input id="repairTechnicianInput" list="repairTechList" value="${esc(r.technician||'')}" placeholder="Technician name"><datalist id="repairTechList">${allTechnicianNames().map(x=>`<option value="${esc(x)}">`).join('')}</datalist></div></div><div class="repair-analysis-strip"><div><span>Total Item Cost</span><b id="repairDetailCost">${money(cost)}</b></div><div><span>Total Item Sale</span><b id="repairDetailSale">${money(saleTotal)}</b><small>Sum of all item Total Sale</small></div><div><span>Service Charge</span><b id="repairDetailService">${money(service)}</b><small>Total Charge − Item Sale Total</small></div><div><span>Repair Profit</span><b id="repairDetailProfit">${money(service)}</b></div></div>`;$('repairDetailModal').classList.add('show');updateRepairDetailButtons();} 
function updateRepairDetailButtons(){const r=(db.repairs||[]).find(x=>x.token===repairDetailRef),btn=document.querySelector('#repairDetailModal .repair-detail-actions .primary'),ret=document.getElementById('repairReturnJobButton'),del=document.getElementById('repairHistoryDeleteButton');if(btn){btn.style.display=(r&&r.status==='Pending')?'inline-flex':'none';btn.textContent='✓ MARK REPAIR FINISHED';}if(ret){ret.style.display=(r&&r.status==='Pending')?'inline-flex':'none';ret.textContent='↩ RETURN ITEM TO CUSTOMER';ret.title='Return this repair item to the customer before repair is finished';}if(del){del.style.display=(r&&repairHistoryAuthorized)?'inline-flex':'none';}}
function requestRepairReturnFromDetail(){const r=(db.repairs||[]).find(x=>x.token===repairDetailRef);if(!r||r.status!=='Pending')return;pendingTemporaryAction={action:'repair-return',token:r.token};openTemporarySecurity('repair-return');}
async function performReturnRepairAfterSecurity(token){const r=(db.repairs||[]).find(x=>x.token===token);if(!r||r.status!=='Pending')return;const ok=confirm(`RETURN ITEM TO CUSTOMER?\n\nToken: ${r.token}\nCustomer: ${(r.customerName||'Customer')}\nDevice: ${(r.deviceModel||'Device')}\n\nThis will change the repair status to RETURN and remove it from Pending Repairs.`);if(!ok)return;r.status='Return';r.returnedDate=repairNow();r.updatedAt=new Date().toISOString();r.returnedBy=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown';r.returnReason='Item returned to customer before repair finished';try{saveCurrentCompanyData();await saveTemporaryIndexedDb();}catch(e){console.error('Repair return save error:',e);showToast('Could not save the RETURN status. Please try again.','error',4000);return;}if(repairDetailRef===token){$('repairDetailModal')?.classList.remove('show');repairDetailRef='';}renderRepairSummary();renderRepairPending();renderRepairHistory();renderRepairAnalysis();showToast(r.token+' marked as RETURN.','success',3500);}
function requestRepairDeleteFromDetail(){const r=(db.repairs||[]).find(x=>x.token===repairDetailRef);if(!r)return;requestRepairCancelFromDetail();}

function updateRepairChargePreview(){const r=(db.repairs||[]).find(x=>x.token===repairDetailRef);if(!r)return;const cost=repairItemsTotal(r),saleTotal=repairItemSaleTotal(r),charge=Math.max(0,Number($('repairTotalChargeInput')?.value||0)),service=Math.max(0,charge-saleTotal),profit=Math.max(0,charge-cost);if($('repairDetailCost'))$('repairDetailCost').textContent=money(cost);if($('repairDetailSale'))$('repairDetailSale').textContent=money(saleTotal);if($('repairDetailService'))$('repairDetailService').textContent=money(service);if($('repairDetailProfit'))$('repairDetailProfit').textContent=money(profit);}
function deleteAuthorizedRepairFromDetail(){const token=repairDetailRef;if(!token||!repairHistoryAuthorized)return;const idx=(db.repairs||[]).findIndex(x=>x.token===token);if(idx<0)return;const r=db.repairs[idx];if(!confirm(`DELETE REPAIR RECORD ${token}?\n\nCustomer: ${(r.customerName||'Customer')}\nDevice: ${(r.deviceModel||'Device')}\nStatus: ${(r.status||'Pending')}\n\nThis repair record will be permanently deleted. This cannot be undone.`))return;db.repairs.splice(idx,1);saveCurrentCompanyData();try{saveTemporaryIndexedDb()}catch(e){}repairHistoryAuthorized=false;$('repairDetailModal')?.classList.remove('show');repairDetailRef='';repairHistoryAuthorized=false;renderRepairSummary();renderRepairPending();renderRepairHistory();renderRepairAnalysis();showToast(token+' deleted successfully.','success',3000);}
function closeRepairDetailModal(){const r=(db.repairs||[]).find(x=>x.token===repairDetailRef);if(r){r.totalCharge=Math.max(0,Number($('repairTotalChargeInput')?.value||r.totalCharge||0));r.updatedAt=new Date().toISOString();r.technician=($('repairTechnicianInput')?.value||r.technician||'').trim();r.itemCostTotal=repairItemsTotal(r);r.serviceCharge=repairServiceCharge(r);saveCurrentCompanyData();}$('repairDetailModal')?.classList.remove('show');repairDetailRef='';repairHistoryAuthorized=false;renderRepairSummary();renderRepairPending();renderRepairHistory();renderRepairAnalysis();}
function getRepairStockProducts(){return (db.products||[]).filter(p=>Number(p.qty||0)>0).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));}
function openRepairStockModal(){
  const modal=$('repairStockModal'); if(!modal)return;
  $('repairStockSearch').value=''; $('repairStockQty').value=1; repairStockSelectedId=null;
  renderRepairStockPicker(); modal.classList.add('show'); setTimeout(()=>$('repairStockSearch')?.focus(),80);
}
function closeRepairStockModal(){$('repairStockModal')?.classList.remove('show');repairStockSelectedId=null;}
let repairStockSelectedId=null;
function renderRepairStockPicker(){
  const list=$('repairStockList'); if(!list)return;
  const q=String($('repairStockSearch')?.value||'').trim().toLowerCase();
  const rows=getRepairStockProducts().filter(p=>[p.name,p.code,p.category].join(' ').toLowerCase().includes(q));
  list.innerHTML=rows.map(p=>`<button type="button" class="repair-stock-option ${repairStockSelectedId===p.id?'selected':''}" onclick="selectRepairStockProduct(${p.id})"><span class="repair-stock-main"><b>${esc(p.name||'Unnamed Product')}</b><small>${esc(p.code||'No code')} • ${esc(p.category||'Uncategorized')}</small></span><span class="repair-stock-meta"><b>${Number(p.qty||0).toLocaleString()} available</b><small>Cost ${money(p.cost||0)} • Sale ${money(p.price||0)}</small></span></button>`).join('')||'<div class="empty">No products with available stock found.</div>';
  const selected=(db.products||[]).find(p=>p.id===repairStockSelectedId);
  const info=$('repairStockSelectedInfo'); if(info)info.innerHTML=selected?`<b>${esc(selected.name)}</b><span>Available: ${Number(selected.qty||0).toLocaleString()} • Cost: ${money(selected.cost||0)} • Sale: ${money(selected.price||0)}</span>`:'Select a stock item above.';
}
function selectRepairStockProduct(id){repairStockSelectedId=id;renderRepairStockPicker();setTimeout(()=>$('repairStockQty')?.focus(),30);}
async function addRepairPartFromStock(){
  const r=(db.repairs||[]).find(x=>x.token===repairDetailRef); if(!r)return;
  const p=(db.products||[]).find(x=>x.id===repairStockSelectedId); if(!p)return alert('Please select a stock item.');
  const qty=Math.max(1,Math.floor(Number($('repairStockQty')?.value||1)));
  const available=Number(p.qty||0); if(qty>available)return alert(`Only ${available} unit${available===1?'':'s'} of ${p.name} available in stock.`);
  r.items=r.items||[];
  const existing=r.items.find(i=>i.sourceProductId===p.id && i.fromStock===true);
  if(existing){
    existing.qty=Number(existing.qty||0)+qty; existing.stockDeductedQty=Number(existing.stockDeductedQty||0)+qty; existing.stockRestored=false; existing.total=Number(existing.costPrice||p.cost||0)*existing.qty; existing.saleTotal=Number(existing.salePrice||p.price||0)*existing.qty;
  }else{
    r.items.push({name:p.name||'',unitPrice:Number(p.cost||0),costPrice:Number(p.cost||0),costPriceEntered:true,salePrice:Number(p.price||0),salePriceEntered:true,qty,total:Number(p.cost||0)*qty,saleTotal:Number(p.price||0)*qty,fromStock:true,sourceProductId:p.id,sourceProductCode:p.code||'',stockDeductedQty:qty,stockDeductionId:'RPR-STOCK-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)});
  }
  p.qty=available-qty;
  const userId=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown', now=new Date().toLocaleString();
  db.stockEntries=db.stockEntries||[]; db.stockEntries.push({date:now,action:'Repair Part Used',repairToken:r.token,productId:p.id,code:p.code,name:p.name,quantityChange:-qty,quantityAfter:p.qty,userId});
  r.itemCostTotal=repairItemsTotal(r); r.serviceCharge=repairServiceCharge(r); r.updatedAt=new Date().toISOString();
  saveCurrentCompanyData(); try{await saveTemporaryIndexedDb()}catch(e){}
  closeRepairStockModal(); openRepairDetail(r.token); renderRepairSummary();
  showToast(`${p.name} × ${qty} added from stock. Stock remaining: ${p.qty}.`,'success',3500);
}
function restoreRepairStockForItem(item,r,reason='Repair record deleted'){
  if(!item?.fromStock || !item.sourceProductId)return 0;
  const qty=Math.max(0,Number(item.stockDeductedQty||item.qty||0)); if(!qty)return 0;
  const p=(db.products||[]).find(x=>x.id===item.sourceProductId); if(!p)return 0;
  p.qty=Number(p.qty||0)+qty;
  const userId=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown', now=new Date().toLocaleString(); db.stockEntries=db.stockEntries||[];
  db.stockEntries.push({date:now,action:'Repair Part Stock Restored',repairToken:r?.token||'',productId:p.id,code:p.code,name:p.name,quantityChange:qty,quantityAfter:p.qty,userId,reason});
  item.stockRestoredQty=qty; item.stockRestoredAt=new Date().toISOString(); item.stockRestored=true;
  return qty;
}
function restoreRepairStockForRecord(r,reason='Repair record deleted'){
  let total=0; (r?.items||[]).forEach(item=>{if(!item.stockRestored)total+=restoreRepairStockForItem(item,r,reason);}); return total;
}
function adjustRepairStockForEdit(item,oldQty,newQty,r){
  if(!item?.fromStock || !item.sourceProductId)return true;
  const delta=Number(newQty||0)-Number(oldQty||0);
  const p=(db.products||[]).find(x=>x.id===item.sourceProductId); if(!p)return false;
  if(delta>0 && Number(p.qty||0)<delta){alert(`Only ${Number(p.qty||0)} more unit${Number(p.qty||0)===1?'':'s'} of ${p.name} available in stock.`);return false;}
  p.qty=Number(p.qty||0)-delta; item.stockDeductedQty=Math.max(0,Number(item.stockDeductedQty||oldQty)+delta); item.stockRestored=false;
  const userId=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown',now=new Date().toLocaleString(); db.stockEntries=db.stockEntries||[];
  db.stockEntries.push({date:now,action:delta>0?'Repair Part Used (Qty Edit)':'Repair Part Stock Restored (Qty Edit)',repairToken:r?.token||'',productId:p.id,code:p.code,name:p.name,quantityChange:-delta,quantityAfter:p.qty,userId});
  return true;
}

function openRepairItemModal(editIndex=-1){if(!repairDetailRef)return;repairItemEditIndex=Number.isInteger(editIndex)?editIndex:-1;const r=(db.repairs||[]).find(x=>x.token===repairDetailRef);const item=repairItemEditIndex>=0?r?.items?.[repairItemEditIndex]:null;['repairPartName','repairPartPrice','repairPartSalePrice'].forEach(id=>{if($(id))$(id).value='';});if($('repairPartQty'))$('repairPartQty').value=1;if(item){$('repairPartName').value=item.name||'';$('repairPartPrice').value=item.costPrice??item.unitPrice??item.price??'';$('repairPartSalePrice').value=item.salePrice??'';$('repairPartQty').value=Math.max(1,Number(item.qty||1));}if($('repairPartTotal'))$('repairPartTotal').value=money(0);if($('repairPartSaleTotal'))$('repairPartSaleTotal').value=money(0);if($('repairItemModalTitle'))$('repairItemModalTitle').textContent=item?'Edit Repair Item / Price':'Repair Parts / Item Price';if($('repairPartSaveButton'))$('repairPartSaveButton').textContent=item?'SAVE PRICE CHANGES':'ADD ITEM';$('repairItemModal').classList.add('show');updateRepairPartTotal();setTimeout(()=>$(item?'repairPartPrice':'repairPartName')?.focus(),80);}
function closeRepairItemModal(){$('repairItemModal')?.classList.remove('show');repairItemEditIndex=-1;renderRepairSummary();renderRepairPriceNotifications();}
function updateRepairPartTotal(){const raw=$('repairPartPrice')?.value??'',saleRaw=$('repairPartSalePrice')?.value??'',p=raw.trim()===''?0:Math.max(0,Number(raw)),sp=saleRaw.trim()===''?0:Math.max(0,Number(saleRaw)),q=Math.max(1,Number($('repairPartQty')?.value||1));if($('repairPartTotal'))$('repairPartTotal').value=money(p*q);if($('repairPartSaleTotal'))$('repairPartSaleTotal').value=money(sp*q);}
$('repairPartPrice')?.addEventListener('input',updateRepairPartTotal);$('repairPartSalePrice')?.addEventListener('input',updateRepairPartTotal);$('repairPartQty')?.addEventListener('input',updateRepairPartTotal);
async function saveRepairPart(){const r=(db.repairs||[]).find(x=>x.token===repairDetailRef);if(!r)return;const name=($('repairPartName')?.value||'').trim(),rawPrice=$('repairPartPrice')?.value??'',rawSale=$('repairPartSalePrice')?.value??'',unitPrice=rawPrice.trim()===''?0:Number(rawPrice),salePrice=rawSale.trim()===''?0:Number(rawSale),qty=Math.max(1,Number($('repairPartQty')?.value||1));if(!name)return alert('Enter the item / part name.');if(!Number.isFinite(unitPrice)||unitPrice<0)return alert('Enter a valid item cost price or leave it blank.');if(!Number.isFinite(salePrice)||salePrice<0)return alert('Enter a valid item sale price or leave it blank.');r.items=r.items||[];const data={name,unitPrice,costPrice:unitPrice,costPriceEntered:rawPrice.trim()!=='',salePrice,salePriceEntered:rawSale.trim()!=='',qty,total:unitPrice*qty,saleTotal:salePrice*qty};if(repairItemEditIndex>=0&&r.items[repairItemEditIndex])r.items[repairItemEditIndex]={...r.items[repairItemEditIndex],...data};else r.items.push(data);r.itemCostTotal=repairItemsTotal(r);r.serviceCharge=repairServiceCharge(r);r.updatedAt=new Date().toISOString();saveCurrentCompanyData();try{await saveTemporaryIndexedDb()}catch(e){}closeRepairItemModal();openRepairDetail(r.token);renderRepairSummary();}
function deleteRepairPart(i){const r=(db.repairs||[]).find(x=>x.token===repairDetailRef);if(!r||!r.items?.[i])return;if(!confirm('Delete this repair item?'))return;r.items.splice(i,1);r.itemCostTotal=repairItemsTotal(r);r.serviceCharge=repairServiceCharge(r);r.updatedAt=new Date().toISOString();saveCurrentCompanyData();openRepairDetail(r.token);renderRepairSummary();}
function markRepairFinishedFromDetail(){const r=(db.repairs||[]).find(x=>x.token===repairDetailRef);if(!r)return;const tech=($('repairTechnicianInput')?.value||'').trim(),charge=Math.max(0,Number($('repairTotalChargeInput')?.value||0)),cost=repairItemsTotal(r);if(!tech)return alert('Enter the technician name before finishing the repair.');const saleTotal=repairItemSaleTotal(r);if(charge<saleTotal)return alert(`Customer total charge cannot be less than item sale total (${money(saleTotal)}).`);r.technician=tech;r.totalCharge=charge;r.itemCostTotal=cost;r.serviceCharge=Math.max(0,charge-saleTotal);r.status='Finished';r.updatedAt=new Date().toISOString();r.commissionRateSnapshot=getTechnicianCommissionRate(tech);r.finishedDate=repairNow();r.finishedBy=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown';saveCurrentCompanyData();try{saveTemporaryIndexedDb()}catch(e){}const billRepair=JSON.parse(JSON.stringify(r));closeRepairDetailModal();renderRepairSummary();renderRepairPending();renderRepairHistory();renderRepairAnalysis();const printed=openRepairPrintWindow(getRepairBillHtml(billRepair,true),billRepair.token+' Repair Bill');if(!printed)showToast(billRepair.token+' finished and saved. Allow pop-ups to print the repair bill.','warning',6000);else showToast(billRepair.token+' marked as finished. Repair bill opened for printing.','success',4000);}
function getRepairBillHtml(r,autoPrint=true){const company={name:shopSettings.name||'',address:shopSettings.address||'',phone:shopSettings.phone||'',footer:shopSettings.footer||'',logo:shopSettings.logo||''};const itemRows=(r.items||[]).map(i=>{const price=Number(i.salePrice??i.price??0),qty=Math.max(1,Number(i.qty||1));return `<tr><td class="item">${esc(i.name)}<span>${money(price)} × ${qty}</span></td><td class="qty">${qty}</td><td class="amt">${money(price*qty)}</td></tr>`;}).join('');const itemSale=(r.items||[]).reduce((a,i)=>a+Number(i.saleTotal ?? (((i.salePrice??i.price??0)*Number(i.qty||1)) || 0)),0);const total=Number(r.totalCharge||0),service=Math.max(0,total-itemSale);const printScript=autoPrint?`<script>window.onload=function(){setTimeout(function(){try{window.print()}catch(e){}},250)};window.onafterprint=function(){setTimeout(function(){try{window.close()}catch(e){}},200)}</script>`:'';return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.token)} Repair Bill</title><style>@page{size:80mm auto;margin:3mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:'Segoe UI',Arial,Helvetica,sans-serif}body{width:74mm;margin:0 auto;font-size:11px;line-height:1.35}.head{padding:2px 0 8px;border-bottom:2px solid #111;text-align:center}.invoice-logo{width:18mm;height:18mm;object-fit:contain;display:block;margin:0 auto 3px}.shop{font-size:22px;font-weight:900;line-height:1.12;letter-spacing:.2px}.contact{font-size:13px;font-weight:600;line-height:1.4;margin-top:5px;word-break:break-word}.title{font-size:13px;font-weight:900;letter-spacing:1px;margin-top:7px}.meta{padding:8px 0 5px;font-size:10.5px}.meta div{display:flex;gap:6px;margin:2px 0}.meta b{min-width:53px}.rule{border-top:1px dashed #555;margin:4px 0 6px}table{width:100%;border-collapse:collapse;table-layout:fixed}th{font-size:9.5px;font-weight:800;text-transform:uppercase;border-bottom:1px solid #111;padding:4px 0;text-align:left}.item{width:55%;font-weight:700;vertical-align:top;padding:5px 0}.item span{display:block;font-size:9px;font-weight:400;margin-top:1px}.qty{width:12%;text-align:center;vertical-align:top;padding:5px 0;font-weight:700}.amt{width:33%;text-align:right;vertical-align:top;padding:5px 0;font-weight:700;white-space:nowrap}.totals{margin-top:5px;border-top:1px solid #111;padding-top:4px}.totals div{display:flex;justify-content:space-between;padding:2px 0}.grand{font-size:15px;font-weight:900;border-top:2px solid #111;margin-top:4px;padding-top:5px}.payment{margin-top:6px;padding:5px 0;border-top:1px dashed #555;font-size:10.5px}.thanks{text-align:center;border-top:1px solid #111;margin-top:8px;padding-top:8px;font-weight:700;font-size:10.5px;line-height:1.5}.small{font-size:9px;font-weight:400}@media print{body{width:74mm}}</style></head><body><div class="head">${company.logo?`<img class="invoice-logo" src="${company.logo}" alt="Logo">`:''}<div class="shop">${esc(company.name||'')}</div><div class="contact">${esc(company.address||'')}${company.address&&company.phone?'<br>':''}${esc(company.phone||'')}</div><div class="title">REPAIR SERVICE INVOICE</div></div><div class="meta"><div><b>Token</b><span>${esc(r.token)}</span></div><div><b>Date</b><span>${esc(r.finishedDate||r.date||'')}</span></div><div><b>Customer</b><span>${esc(r.customerName||'')}</span></div><div><b>Phone</b><span>${esc(r.phone||'')}</span></div><div><b>Device</b><span>${esc(r.deviceModel||'')}</span></div><div><b>Technician</b><span>${esc(r.technician||'')}</span></div></div><div class="rule"></div><table><thead><tr><th>Item / Service</th><th class="qty">Qty</th><th class="amt">Amount</th></tr></thead><tbody>${itemRows||`<tr><td class="item">Repair / Service<span>Service charge</span></td><td class="qty">1</td><td class="amt">${money(service)}</td></tr>`}</tbody></table>${itemRows?`<div class="totals"><div><span>Items Total</span><b>${money(itemSale)}</b></div><div><span>Service Charge</span><b>${money(service)}</b></div><div class="grand"><span>TOTAL</span><span>${money(total)}</span></div></div>`:`<div class="totals"><div class="grand"><span>TOTAL</span><span>${money(total)}</span></div></div>`}<div class="payment"><b>Repair Status:</b> FINISHED<br><b>Received By:</b> ${esc(r.finishedBy||'')}</div><div class="thanks">${esc(company.footer||'')}<br><span class="small">Thank you for your business.</span></div>${printScript}</body></html>`;}
function reprintRepairTokenFromDetail(){const r=(db.repairs||[]).find(x=>x.token===repairDetailRef);if(r)openRepairPrintWindow(getRepairTokenHtml(r,true),r.token);}
function printRepairStickersFromDetail(){const r=(db.repairs||[]).find(x=>x.token===repairDetailRef);if(r)openRepairPrintWindow(getRepairStickerHtml(r,true),r.token+' Stickers');}
function openRepairItemsHistoryModal(token){const r=(db.repairs||[]).find(x=>x.token===token);if(!r)return;const box=$('repairItemsHistoryModalContent');if(!box)return;$('repairItemsHistoryModalToken').textContent=token;const items=r.items||[];box.innerHTML=`<div class="repair-items-history-summary"><div><span>Customer</span><b>${esc(r.customerName||'—')}</b></div><div><span>Device</span><b>${esc(r.deviceModel||'—')}</b></div><div><span>Total Item Cost</span><b>${money(repairItemsTotal(r))}</b></div><div><span>Total Item Sale</span><b>${money(items.reduce((s,i)=>s+Number(i.saleTotal||0),0))}</b></div></div>${items.length?`<div class="table-wrap"><table><thead><tr><th>Item / Part</th><th>Cost Price</th><th>Sale Price</th><th>Qty</th><th>Total Cost</th><th>Total Sale</th></tr></thead><tbody>${items.map(i=>`<tr><td><b>${esc(i.name||'')}</b>${i.fromStock?'<br><span class="repair-stock-source-badge">📦 FROM STOCK</span>':''}</td><td>${money(Number(i.costPrice??i.unitPrice??i.cost??0))}</td><td>${money(Number(i.salePrice??i.price??0))}</td><td>${Number(i.qty||0)}</td><td>${money(Number(i.total||0))}</td><td>${money(Number(i.saleTotal||0))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="muted repair-items-history-empty">No repair items added.</div>'}`;$('repairItemsHistoryModal')?.classList.add('show');}
function closeRepairItemsHistoryModal(){$('repairItemsHistoryModal')?.classList.remove('show');}

function exportRepairHistoryExcel(){const rows=(db.repairs||[]).map(r=>{const n=getMyProfitRepairNumbers(r);return [r.token,r.date,r.customerName,r.phone,r.deviceModel,r.receivingItem,r.service,r.issue,(r.items||[]).map(i=>`${i.name} x${i.qty}`).join('; '),repairItemsTotal(r).toFixed(2),Number(r.totalCharge||0).toFixed(2),repairServiceCharge(r).toFixed(2),r.technician||'',getRepairCommissionRate(r).toFixed(2)+'%',n.technicianCommission.toFixed(2),n.myServiceCommission.toFixed(2),n.itemProfit.toFixed(2),n.myTotalProfit.toFixed(2),r.status];});downloadExcelFile('SF_Repair_Service_History.xls','Repair History',['Token','Received Date','Customer','Phone','Device','Receiving Item','Service','Issue','Items','Item Cost','Customer Charge','Service Charge / Profit','Technician','Commission %','Status'],rows.map(r=>r.filter((_,i)=>![14,15,16,17].includes(i))));}
/* ======================= END REPAIR SERVICE MODULE ======================= */
function printTemporaryAccount(tx){
  if(tx.type==='Credit Payment')return printTemporaryPaymentReceipt(tx);
  // Use the exact same 80mm thermal invoice renderer as the normal POS Billing system.
  // Temporary bills are manually entered, but their printed design/print flow is identical.
  const sale={
    invoice:tx.invoice,
    date:tx.date,
    customer:tx.customer||'Walk-in Customer',
    customerPhone:tx.phone||'',
    payment:tx.payment==='Credit'?'Credit':'Cash',
    items:(tx.items||[]).map(i=>({name:i.name,qty:Number(i.qty||1),price:Number(i.price||0)})),
    subtotal:Number(tx.subtotal||tx.total||0),
    discount:Number(tx.discount||0),
    total:Number(tx.total||0),
    cashReceived:Number(tx.cashReceived||0),
    balance:Number(tx.balance||0),
    change:Number(tx.change||Math.max(0,Number(tx.cashReceived||0)-Number(tx.total||0))),
    creditPaid:Number(tx.creditPaid||0),
    creditBalance:Number(tx.creditBalance||0)
  };
  return printInvoice(sale);
}
function getTemporaryPaymentReceiptHtml(tx,autoPrint=false){
  const company=tx.company||shopSettings||{};
  const printScript=autoPrint?`<script>window.onload=function(){setTimeout(function(){try{window.print()}catch(e){}},250)};window.onafterprint=function(){setTimeout(function(){try{window.close()}catch(e){}},200)}</script>`:'';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(tx.ref||'Credit Payment')}</title><style>
  @page{size:80mm auto;margin:3mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:'Segoe UI',Arial,Helvetica,sans-serif}body{width:74mm;margin:0 auto;font-size:11px;line-height:1.35}.head{padding:2px 0 8px;border-bottom:2px solid #111;text-align:center}.invoice-logo{width:18mm;height:18mm;object-fit:contain;display:block;margin:0 auto 3px}.shop{font-size:22px;font-weight:900;line-height:1.12}.contact{font-size:13px;font-weight:600;line-height:1.4;margin-top:5px;word-break:break-word}.title{font-size:13px;font-weight:900;letter-spacing:1px;margin-top:7px}.meta{padding:8px 0 5px;font-size:10.5px}.meta div{display:flex;gap:6px;margin:2px 0}.meta b{min-width:53px}.rule{border-top:1px dashed #555;margin:4px 0 6px}.amount{text-align:center;font-size:18px;font-weight:900;border-top:2px solid #111;border-bottom:2px solid #111;padding:8px 0;margin:8px 0}.payment{margin-top:6px;padding:5px 0;border-top:1px dashed #555;font-size:10.5px}.thanks{text-align:center;border-top:1px solid #111;margin-top:8px;padding-top:8px;font-weight:700;font-size:10.5px;line-height:1.5}.small{font-size:9px;font-weight:400}@media print{body{width:74mm}}</style></head><body>
  <div class="head">${company.logo?`<img class="invoice-logo" src="${company.logo}" alt="Logo">`:''}<div class="shop">${esc(company.name||'')}</div><div class="contact">${esc(company.address||'')}${company.address&&company.phone?'<br>':''}${esc(company.phone||'')}</div><div class="title">CREDIT PAYMENT RECEIPT</div></div>
  <div class="meta"><div><b>Receipt</b><span>${esc(tx.ref||'')}</span></div><div><b>Date</b><span>${esc(tx.date||'')}</span></div><div><b>Customer</b><span>${esc(tx.customer||'')}</span></div>${tx.phone?`<div><b>Phone</b><span>${esc(tx.phone)}</span></div>`:''}</div><div class="rule"></div>
  <div class="amount">${money(tx.amount||0)}</div>
  <div class="payment"><b>Payment Received:</b> ${money(tx.amount||0)}<br><b>Remaining Balance:</b> ${money(tx.balanceAfter||0)}<br><b>Reference:</b> ${esc(tx.reference||'')||'—'}<br><b>Received By:</b> ${esc(tx.user||'')}</div>
  <div class="thanks">${esc(company.footer||'')}<br><span class="small">Thank you for your payment.</span></div>${printScript}</body></html>`;
}
function printTemporaryPaymentReceipt(tx){const w=window.open('','_blank','width=420,height=760');if(!w)return false;w.document.write(getTemporaryPaymentReceiptHtml(tx,true));w.document.close();return true;}
function renderSales(){
 let q=($('salesSearch').value||'').toLowerCase(),arr=db.sales.filter(s=>(s.invoice+' '+s.customer).toLowerCase().includes(q));
 $('salesTable').innerHTML=arr.map(s=>`<tr><td><b>${s.invoice}</b></td><td>${s.date}</td><td>${s.customer}</td><td>${s.items.reduce((a,i)=>a+i.qty,0)}</td><td>${money(s.total)}</td><td>${s.payment}${s.payment==='Credit'?`<br><small>Bal: ${money(+s.creditBalance||s.total||0)}</small>`:''}</td><td>${money(s.profit)}</td><td><b>${esc(s.billMadeBy||'Unknown / Old Data')}</b></td><td><button class="textbtn viewbillbtn" onclick="viewInvoice('${s.invoice}')">👁 View Bill</button> <button class="textbtn printbtn" onclick="reprintInvoice('${s.invoice}')">🖨 Reprint Bill</button> <button class="textbtn" onclick="editSale('${s.invoice}')">✎ Edit</button> <button class="textbtn danger" onclick="deleteSale('${s.invoice}')">🗑 Delete</button></td></tr>`).join('')||'<tr><td colspan="9">No sales yet.</td></tr>';
}
function viewInvoice(invoice){
 const sale=db.sales.find(s=>s.invoice===invoice);
 if(!sale)return alert('Invoice not found.');
 const modal=$('invoiceViewModal'), frame=$('invoiceViewFrame'), title=$('invoiceViewTitle');
 if(title)title.textContent=sale.invoice;
 if(frame){
   frame.srcdoc=getInvoiceHtml(sale,false);
   frame.onload=()=>{try{frame.contentWindow.scrollTo(0,0)}catch(e){}};
 }
 if(modal)modal.classList.add('show');
}
function closeInvoiceView(){
 const modal=$('invoiceViewModal'), frame=$('invoiceViewFrame');
 if(frame)frame.srcdoc='';
 if(modal)modal.classList.remove('show');
}
function printViewedInvoice(){
 const invoice=$('invoiceViewTitle')?.textContent||'';
 const sale=db.sales.find(s=>s.invoice===invoice);
 if(sale)printInvoice(sale);
}
function renderCustomers(){
 let q=($('customerSearch').value||'').toLowerCase();
 $('customerTable').innerHTML=db.customers.filter(c=>(c.name+' '+c.phone).toLowerCase().includes(q)).map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(c.address||'')}</td><td>${money(c.outstanding)}</td></tr>`).join('');
}
function addCustomer(){let n=prompt('Customer name');if(!n)return;let phone=prompt('Phone number')||'';let address=prompt('Address')||'';db.customers.push({name:n.trim(),phone:phone.trim(),address:address.trim(),outstanding:0});save()}
function creditSales(){return db.sales.filter(s=>s.payment==='Credit');}
function refreshCreditBalances(){
  creditSales().forEach(s=>{
    s.creditPaid=Array.isArray(s.creditPayments)?s.creditPayments.reduce((a,p)=>a+Number(p.amount||0),0):Number(s.creditPaid||0);
    s.creditBalance=Math.max(0,Number(s.total||0)-s.creditPaid);
  });
  db.customers.forEach(c=>c.outstanding=creditSales().filter(s=>s.customer===c.name).reduce((a,s)=>a+Number(s.creditBalance||0),0));
}
function renderCredit(){
  refreshCreditBalances();
  const sales=creditSales();
  const total=sales.reduce((a,s)=>a+Number(s.total||0),0);
  const paid=sales.reduce((a,s)=>a+Number(s.creditPaid||0),0);
  const balance=sales.reduce((a,s)=>a+Number(s.creditBalance||0),0);
  const activeCustomers=db.customers.filter(c=>Number(c.outstanding||0)>0);
  if($('creditTotalSales'))$('creditTotalSales').textContent=money(total);
  if($('creditTotalPaid'))$('creditTotalPaid').textContent=money(paid);
  if($('creditTotalBalance'))$('creditTotalBalance').textContent=money(balance);
  if($('creditCustomerCount'))$('creditCustomerCount').textContent=activeCustomers.length;
  const groups={};
  sales.forEach(s=>{const key=s.customer||'Unknown'; if(!groups[key])groups[key]={name:key,phone:s.customerPhone||'',count:0,total:0,paid:0,balance:0}; groups[key].count++;groups[key].total+=Number(s.total||0);groups[key].paid+=Number(s.creditPaid||0);groups[key].balance+=Number(s.creditBalance||0); if(!groups[key].phone)groups[key].phone=s.customerPhone||'';});
  $('creditCustomerTable').innerHTML=Object.values(groups).filter(g=>g.balance>0||g.total>0).map(g=>`<tr><td><b>${esc(g.name)}</b></td><td>${esc(g.phone||'')}</td><td>${g.count}</td><td>${money(g.total)}</td><td>${money(g.paid)}</td><td><b>${money(g.balance)}</b></td><td>${g.balance>0?`<button class="textbtn" onclick="openCreditPaymentModal('${String(g.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">💰 Paid</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="7">No credit customer records.</td></tr>';
  $('creditBillTable').innerHTML=sales.map(s=>`<tr><td><b>${esc(s.invoice)}</b></td><td>${esc(s.date)}</td><td>${esc(s.customer)}</td><td>${money(s.total)}</td><td>${money(s.creditPaid)}</td><td><b>${money(s.creditBalance)}</b></td><td>${esc(s.billMadeBy||'Unknown')}</td></tr>`).join('')||'<tr><td colspan="7">No credit bills yet.</td></tr>';
  const payments=[]; sales.forEach(s=>(s.creditPayments||[]).forEach(p=>payments.push({date:p.date,customer:s.customer,amount:p.amount,userId:p.userId,reference:p.reference||'',invoice:s.invoice})));
  payments.sort((a,b)=>new Date(b.date)-new Date(a.date));
  $('creditPaymentTable').innerHTML=payments.map(p=>`<tr><td>${esc(p.date)}</td><td>${esc(p.customer)}</td><td>${money(p.amount)}</td><td>${esc(p.userId||'Unknown')}</td><td>${esc(p.reference||'')} <small>${esc(p.invoice||'')}</small></td></tr>`).join('')||'<tr><td colspan="5">No credit payments yet.</td></tr>';
}
let creditPaymentCustomer='';
function openCreditPaymentModal(name){
 refreshCreditBalances(); creditPaymentCustomer=name; const outstanding=db.customers.find(c=>c.name===name)?.outstanding||0;
 $('creditPaymentCustomerText').textContent=`Customer: ${name} • Current Balance: ${money(outstanding)}`;
 $('creditPaymentAmount').value='';$('creditPaymentReference').value='';$('creditPaymentModal').classList.add('show');setTimeout(()=>$('creditPaymentAmount').focus(),50);
}
function closeCreditPaymentModal(){$('creditPaymentModal').classList.remove('show');creditPaymentCustomer='';}
function recordCreditPayment(){
 refreshCreditBalances();
 const amount=Number($('creditPaymentAmount').value||0), customer=creditPaymentCustomer;
 if(!customer||amount<=0)return alert('Enter a valid payment amount.');
 const c=db.customers.find(x=>x.name===customer); const outstanding=Number(c?.outstanding||0);
 if(amount>outstanding+0.0001)return alert(`Payment cannot exceed the current balance of ${money(outstanding)}.`);
 let remaining=amount; const userId=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown'; const now=new Date().toLocaleString(); const reference=$('creditPaymentReference').value.trim();
 const bills=creditSales().filter(s=>s.customer===customer&&Number(s.creditBalance||0)>0).sort((a,b)=>new Date(a.date)-new Date(b.date));
 bills.forEach(s=>{if(remaining<=0)return; const take=Math.min(remaining,Number(s.creditBalance||0)); if(!Array.isArray(s.creditPayments))s.creditPayments=[]; s.creditPayments.push({date:now,amount:take,userId,reference}); s.creditPaid=(Number(s.creditPaid||0)+take);s.creditBalance=Math.max(0,Number(s.total||0)-s.creditPaid);remaining-=take;});
 refreshCreditBalances(); save(); closeCreditPaymentModal(); renderCredit(); alert(`Payment of ${money(amount)} recorded successfully. Remaining balance: ${money(c?.outstanding||0)}`);
}
function openDashboardCreditDetails(){
  refreshCreditBalances();
  const sales=creditSales();
  const total=sales.reduce((a,s)=>a+Number(s.total||0),0);
  const paid=sales.reduce((a,s)=>a+Number(s.creditPaid||0),0);
  const balance=sales.reduce((a,s)=>a+Number(s.creditBalance||0),0);
  const groups={};
  sales.forEach(s=>{
    const key=s.customer||'Unknown Customer';
    if(!groups[key]) groups[key]={name:key,phone:s.customerPhone||'',address:s.customerAddress||'',bills:[],total:0,paid:0,balance:0};
    const g=groups[key];
    if(!g.phone)g.phone=s.customerPhone||''; if(!g.address)g.address=s.customerAddress||'';
    g.bills.push(s); g.total+=Number(s.total||0); g.paid+=Number(s.creditPaid||0); g.balance+=Number(s.creditBalance||0);
  });
  const active=Object.values(groups).filter(g=>g.balance>0).sort((a,b)=>b.balance-a.balance);
  $('dashboardCreditSummary').innerHTML=`
    <div><small>Total Credit</small><b>${money(total)}</b></div>
    <div><small>Total Paid</small><b>${money(paid)}</b></div>
    <div><small>Outstanding</small><b>${money(balance)}</b></div>
    <div><small>Customers</small><b>${active.length}</b></div>`;
  $('dashboardCreditCustomerList').innerHTML=active.length?active.map(g=>{
    const billRows=g.bills.filter(s=>Number(s.creditBalance||0)>0||Number(s.total||0)>0).sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s=>`<tr><td><b>${esc(s.invoice)}</b></td><td>${esc(s.date)}</td><td>${money(s.total)}</td><td>${money(s.creditPaid)}</td><td><b>${money(s.creditBalance)}</b></td></tr>`).join('');
    return `<div class="dashboard-credit-customer">
      <div class="dashboard-credit-customer-head"><div><h3>${esc(g.name)}</h3><p>${esc(g.phone||'No phone number')}${g.address?` • ${esc(g.address)}`:''}</p></div><div class="dashboard-credit-balance"><small>Outstanding</small><b>${money(g.balance)}</b></div></div>
      <div class="dashboard-credit-mini-summary"><span>${g.bills.length} bill(s)</span><span>Credit ${money(g.total)}</span><span>Paid ${money(g.paid)}</span></div>
      <div class="dashboard-credit-table-wrap"><table><thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead><tbody>${billRows}</tbody></table></div>
    </div>`;
  }).join(''):'<div class="empty">No outstanding credit customers.</div>';
  $('dashboardCreditDetailsModal').classList.add('show');
}
function closeDashboardCreditDetails(){$('dashboardCreditDetailsModal').classList.remove('show')}

function exportCreditExcel(){
 refreshCreditBalances();
 const rows=creditSales().map(s=>[s.invoice,s.date,s.customer,s.customerPhone||'',Number(s.total||0).toFixed(2),Number(s.creditPaid||0).toFixed(2),Number(s.creditBalance||0).toFixed(2),s.billMadeBy||'Unknown']);
 downloadExcelFile('SF_Credit_Customer_Report.xls','Credit Report',['Invoice','Date','Customer','Phone','Credit Total','Paid','Balance','Bill Made By (User ID)'],rows);
}
function renderReports(){
 let sales=db.sales.reduce((s,x)=>s+x.total,0),profit=db.sales.reduce((s,x)=>s+x.profit,0),units=db.sales.reduce((s,x)=>s+x.items.reduce((a,i)=>a+i.qty,0),0),stock=db.products.reduce((s,p)=>s+p.cost*p.qty,0);
 $('rSales').textContent=money(sales);$('rProfit').textContent=money(profit);$('rUnits').textContent=units;$('rStockValue').textContent=money(stock);$('reportText').textContent=`The system currently contains ${db.products.length} products and ${db.sales.length} invoices. Stock cost value is ${money(stock)}.`; renderUserRecords()
}
function excelEsc(v){
  return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function downloadExcelFile(filename,title,headers,rows){
  const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${excelEsc(title).slice(0,31)}"><Table><Row>${headers.map(h=>`<Cell><Data ss:Type="String">${excelEsc(h)}</Data></Cell>`).join('')}</Row>${rows.map(r=>`<Row>${r.map(v=>`<Cell><Data ss:Type="String">${excelEsc(v)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`;
  const blob=new Blob([xml],{type:'application/vnd.ms-excel'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadExcelWorkbook(filename,sheets){
  const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${sheets.map(s=>`<Worksheet ss:Name="${excelEsc(s.title).slice(0,31)}"><Table><Row>${s.headers.map(h=>`<Cell><Data ss:Type="String">${excelEsc(h)}</Data></Cell>`).join('')}</Row>${s.rows.map(r=>`<Row>${r.map(v=>`<Cell><Data ss:Type="String">${excelEsc(v)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet>`).join('')}</Workbook>`;
  const blob=new Blob([xml],{type:'application/vnd.ms-excel'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportSalesExcel(){
  const rows=db.sales.map(s=>[
    s.invoice,s.date,s.customer,s.items.reduce((a,i)=>a+i.qty,0),Number(s.subtotal||0).toFixed(2),Number(s.discount||0).toFixed(2),Number(s.total||0).toFixed(2),s.payment,Number(s.profit||0).toFixed(2),s.billMadeBy||'Unknown / Old Data'
  ]);
  downloadExcelFile('SF_Sales_Report.xls','Sales Report',['Invoice','Date','Customer','Items','Subtotal','Discount','Total','Payment Method','Profit','Bill Made By (User ID)'],rows);
}
function exportStockExcel(){
  const rows=db.products.map(p=>[
    p.code,p.name,p.category,p.imei||'',Number(p.cost||0).toFixed(2),Number(p.price||0).toFixed(2),p.qty,Number((p.cost||0)*(p.qty||0)).toFixed(2),p.createdBy||'Unknown / Old Data',p.createdAt||'',p.lastStockUpdatedBy||p.createdBy||'Unknown / Old Data',p.lastStockUpdatedAt||p.createdAt||''
  ]);
  downloadExcelFile('SF_Stock_Report.xls','Stock Report',['Product Code','Product','Category','IMEI / Serial','Cost','Sale Price','Current Qty','Stock Cost Value','Stock Entered By (User ID)','Stock Entry Date','Last Stock Updated By (User ID)','Last Stock Update Date'],rows);
}

function monthKeyFromDate(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return '';
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function monthLabel(key){
  const [y,m]=String(key).split('-').map(Number);
  if(!y||!m)return key;
  return new Date(y,m-1,1).toLocaleString(undefined,{month:'long',year:'numeric'});
}
function populateUserRecordMonths(){
  const sel=$('userRecordMonth'); if(!sel)return;
  // Show only months that actually contain bill records.
  // This avoids listing empty months and makes the report selector easier to use.
  const monthSet=new Set();
  db.sales.forEach(s=>{
    const k=monthKeyFromDate(s.date);
    if(k) monthSet.add(k);
  });
  const keys=Array.from(monthSet).sort((a,b)=>b.localeCompare(a));
  const existing=sel.value;
  if(!keys.length){
    sel.innerHTML='<option value="">No bill records</option>';
    return;
  }
  sel.innerHTML=keys.map(k=>`<option value="${k}">${monthLabel(k)}</option>`).join('');
  if(keys.includes(existing)) sel.value=existing;
  else sel.value=keys[0];
}
function renderUserRecords(){
  const t=$('userRecordsTable'); if(!t)return;
  populateUserRecordMonths();
  const key=$('userRecordMonth').value;
  const rows=users.map(u=>{
    const sales=db.sales.filter(s=>(s.billMadeBy||'Unknown / Old Data')===u.username && monthKeyFromDate(s.date)===key);
    return {username:u.username,role:u.role||'',count:sales.length,total:sales.reduce((a,s)=>a+Number(s.total||0),0)};
  });
  t.innerHTML=rows.map(r=>`<tr><td><b>${esc(r.username)}</b></td><td>${esc(r.role)}</td><td><b>${r.count}</b></td><td>${money(r.total)}</td><td><button class="textbtn" title="Export this user's monthly bills to Excel" onclick="exportUserMonthlyExcel('${String(r.username).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">📊 Excel</button></td></tr>`).join('')||'<tr><td colspan="5">No users found.</td></tr>';
}
function exportUserMonthlyExcel(username){
  const key=$('userRecordMonth')?.value||monthKeyFromDate(new Date());
  const sales=db.sales.filter(s=>(s.billMadeBy||'Unknown / Old Data')===username && monthKeyFromDate(s.date)===key);
  const rows=sales.map(s=>[s.invoice,s.date,s.customer,s.items.reduce((a,i)=>a+i.qty,0),Number(s.total||0).toFixed(2),s.payment||'',Number(s.profit||0).toFixed(2),s.billMadeBy||'Unknown / Old Data']);
  downloadExcelFile(`SF_User_${username}_${key}.xls`,'User Monthly Bills',['Invoice','Date','Customer','Items','Total','Payment Method','Profit','Bill Made By (User ID)'],rows);
}
function exportAllUserMonthlyExcel(){
  const key=$('userRecordMonth')?.value||monthKeyFromDate(new Date());
  const rows=users.map(u=>{
    const sales=db.sales.filter(s=>(s.billMadeBy||'Unknown / Old Data')===u.username && monthKeyFromDate(s.date)===key);
    return [u.username,u.role||'',sales.length,sales.reduce((a,s)=>a+Number(s.total||0),0).toFixed(2)];
  });
  downloadExcelFile(`SF_User_Records_${key}.xls`,'User Records',['User ID','Role','Total Bills','Total Sales'],rows);
}

function clearShopLogo(){
  shopSettings.logo='';
  const preview=document.getElementById('shopLogoPreview');
  preview.removeAttribute('src'); preview.style.display='none';
  document.getElementById('shopLogoFile').value='';
}
document.getElementById('shopLogoFile').addEventListener('change',function(){
  const f=this.files&&this.files[0]; if(!f)return;
  const reader=new FileReader(); reader.onload=()=>{const el=document.getElementById('shopLogoPreview');el.src=reader.result;el.style.display='block'}; reader.readAsDataURL(f);
});
document.getElementById('shopSettingsForm').onsubmit=function(e){
  e.preventDefault();
  shopSettings.name=document.getElementById('shopSettingName').value.trim();
  shopSettings.phone=document.getElementById('shopSettingPhone').value.trim();
  shopSettings.address=document.getElementById('shopSettingAddress').value.trim();
  shopSettings.footer=document.getElementById('shopSettingFooter').value.trim();
  const file=document.getElementById('shopLogoFile').files&&document.getElementById('shopLogoFile').files[0];
  const finish=()=>{saveShopSettings();applyShopBranding();updateCompanyDisplay();document.getElementById('shopLogoFile').value='';alert('Shop details updated successfully. These Shop Settings now control the login screen and new bills/invoices. Blank fields will remain blank.');};
  if(file){const reader=new FileReader();reader.onload=()=>{shopSettings.logo=reader.result;finish()};reader.readAsDataURL(file)}else finish();
};


function applyThemeMode(){
 const mode=localStorage.getItem('sf_theme_mode')||'light';
 const dark=mode==='dark';
 document.body.classList.toggle('dark-mode',dark);
 const label=document.getElementById('themeSwitchLabel');
 const knob=document.getElementById('themeSwitchKnob');
 if(label) label.textContent=dark?'Dark Mode':'Light Mode';
 if(knob) knob.textContent=dark?'☾':'☀';
}
function toggleThemeMode(){
 const dark=!document.body.classList.contains('dark-mode');
 localStorage.setItem('sf_theme_mode',dark?'dark':'light');
 applyThemeMode();
}

function refreshAll(){
 let today=new Date().toLocaleDateString(),tod=db.sales.filter(s=>new Date(s.date).toLocaleDateString()===today);
 const uid=currentUser?.username||sessionStorage.getItem('rasith_current_user')||'Unknown';
 const role=currentUser?.role||'—';
 const userBadge=document.getElementById('currentUserBadge'); if(userBadge) userBadge.textContent='👤 '+uid+' ('+role+')';
 const userBills=tod.filter(s=>(s.billMadeBy||'')===uid).length;
 const userStock=(db.stockEntries||[]).filter(e=>{try{return new Date(e.date).toLocaleDateString()===today}catch(_){return false}}).filter(e=>(e.userId||'')===uid).length;
 refreshCreditBalances(); const totalCreditOutstanding=creditSales().reduce((a,s)=>a+Number(s.creditBalance||0),0); const creditCustomers=db.customers.filter(c=>Number(c.outstanding||0)>0).length;
 if($('dashUserId'))$('dashUserId').textContent=uid;
 if($('dashUserRole'))$('dashUserRole').textContent=role;
 if($('dashActivityUser'))$('dashActivityUser').textContent=uid;
 if($('dashActivityRole'))$('dashActivityRole').textContent=role;
 if($('dashUserBills'))$('dashUserBills').textContent=userBills;
 if($('dashUserStock'))$('dashUserStock').textContent=userStock;
 $('dashSales').textContent=money(tod.reduce((a,s)=>a+s.total,0));$('dashProfit').textContent=money(tod.reduce((a,s)=>a+s.profit,0));$('dashInvoices').textContent=tod.length+' invoices';$('dashStock').textContent=db.products.reduce((a,p)=>a+p.qty,0);$('dashLow').textContent=db.products.filter(p=>p.qty<=p.low).length+' low stock';$('dashCustomers').textContent=db.customers.length; if($('dashCredit'))$('dashCredit').textContent=money(totalCreditOutstanding); if($('dashCreditCustomers'))$('dashCreditCustomers').textContent=creditCustomers+' credit customers';
 $('lowStockList').innerHTML=db.products.filter(p=>p.qty<=p.low).map(p=>`<div><b>${p.name}</b> — ${p.qty} left</div>`).join('')||'<div>All stock levels are healthy.</div>';
 $('recentSales').innerHTML=db.sales.slice(0,5).map(s=>`<div style="padding:10px 0;border-bottom:1px solid #edf0f4">${s.invoice} — ${s.customer}<b style="float:right">${money(s.total)}</b></div>`).join('')||'<p>No sales yet.</p>';
 renderDashboard3DChart();
 renderTemporaryDashboard();
 renderProducts();renderSales();renderCustomers();renderReports();
}

function renderDashboard3DChart(){
 const el=$('dashboard3dChart'); if(!el)return;
 const now=new Date(); const months=[];
 for(let i=5;i>=0;i--){
   const d=new Date(now.getFullYear(),now.getMonth()-i,1);
   const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
   const label=d.toLocaleString(undefined,{month:'short'});
   const sales=db.sales.filter(s=>{const x=new Date(s.date);return x.getFullYear()===d.getFullYear()&&x.getMonth()===d.getMonth()}).reduce((a,s)=>a+Number(s.total||0),0);
   months.push({key,label,sales});
 }
 const max=Math.max(...months.map(m=>m.sales),1);
 const W=900,H=212,padX=22,padY=18,usableW=W-padX*2,usableH=H-padY*2;
 const pts=months.map((m,i)=>({x:padX+(usableW*(months.length===1?0.5:i/(months.length-1))),y:padY+usableH-(m.sales/max)*usableH,sales:m.sales,label:m.label}));
 const smoothPath=(points)=>{
   if(!points.length)return '';
   if(points.length===1)return `M ${points[0].x} ${points[0].y}`;
   let d=`M ${points[0].x} ${points[0].y}`;
   for(let i=1;i<points.length;i++){
     const p0=points[i-1],p1=points[i];
     const dx=(p1.x-p0.x)/2;
     const c1x=p0.x+dx,c2x=p1.x-dx;
     d+=` C ${c1x} ${p0.y}, ${c2x} ${p1.y}, ${p1.x} ${p1.y}`;
   }
   return d;
 };
 const line=smoothPath(pts), area=line+` L ${pts[pts.length-1].x} ${H-padY} L ${pts[0].x} ${H-padY} Z`;
 const tickVals=[max,max*.75,max*.5,max*.25,0];
 const fmt=v=>{if(v>=1000000)return 'Rs. '+(v/1000000).toFixed(v%1000000?1:0)+'M';if(v>=1000)return 'Rs. '+Math.round(v/1000)+'K';return 'Rs. '+Math.round(v)};
 el.innerHTML=`
   <div class="chart-3d-grid"><span></span><span></span><span></span><span></span><span></span></div>
   <div class="chart-3d-y">${tickVals.map(v=>`<span>${fmt(v).replace('Rs. ','')}</span>`).join('')}</div>
   <svg class="chart-3d-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Monthly sales line chart">
     <defs>
       <linearGradient id="sfAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4f46e5" stop-opacity=".34"/><stop offset="48%" stop-color="#38bdf8" stop-opacity=".16"/><stop offset="100%" stop-color="#93c5fd" stop-opacity=".015"/></linearGradient>
       <linearGradient id="sfLineGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#38bdf8"/><stop offset="48%" stop-color="#2563eb"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient>
       <linearGradient id="sfFloorGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1" stop-opacity=".18"/><stop offset="100%" stop-color="#38bdf8" stop-opacity=".03"/></linearGradient>
     </defs>
     <path d="M ${padX} ${H-padY} L ${W-padX} ${H-padY}" stroke="rgba(100,116,139,.16)" stroke-width="1"/>
     <path class="chart-area-3d" d="${area}" fill="url(#sfAreaGradient)"/>
     <path class="chart-line-shadow" d="${line}"/>
     <path class="chart-line-glow" d="${line}"/>
     <path class="chart-line-main" d="${line}"/>
     <path class="chart-line-highlight" d="${line}"/>
     ${pts.map((p,i)=>`<g class="chart-point" data-index="${i}" transform="translate(${p.x},${p.y})"><circle class="outer" r="8"></circle><circle class="inner" r="4"></circle></g>`).join('')}
     <path d="M ${padX} ${H-padY} L ${W-padX} ${H-padY} L ${W-padX+10} ${H-padY-7} L ${padX+10} ${H-padY-7} Z" fill="url(#sfFloorGradient)" opacity=".45"/>
   </svg>
   <div class="chart-3d-months">${pts.map(p=>`<span>${p.label}</span>`).join('')}</div>
   <div class="chart-3d-tooltip" id="dashboardChartTooltip"></div>
   <div class="chart-caption"><span><i class="legend-dot"></i> Monthly Sales</span><b>Last 6 months • Live data</b></div>`;
 const svg=el.querySelector('.chart-3d-svg'), tip=$('dashboardChartTooltip');
 el.querySelectorAll('.chart-point').forEach(g=>{
   const i=Number(g.dataset.index),p=pts[i];
   const show=()=>{tip.innerHTML=`<b>${p.label} ${new Date(months[i].key+'-01').getFullYear()}</b><strong>${money(p.sales)}</strong>`;tip.style.display='block';const rect=svg.getBoundingClientRect();const er=el.getBoundingClientRect();tip.style.left=((p.x/W)*rect.width+rect.left-er.left)+'px';tip.style.top=((p.y/H)*rect.height+rect.top-er.top)+'px';};
   g.addEventListener('mouseenter',show);g.addEventListener('mouseleave',()=>tip.style.display='none');g.addEventListener('touchstart',e=>{e.preventDefault();show();},{passive:false});
 });
}


// v3.35: Robust persistence for edited bills. Browser localStorage is only a cache;
// the PC folder is the primary store. A localStorage failure must never stop
// SAVE BILL CHANGES from reaching the permanent PC database.
const _sfOriginalSaveCurrentCompanyData = saveCurrentCompanyData;
saveCurrentCompanyData = function(){
  if(typeof db==='undefined') return;
  try{
    localStorage.setItem(activeCompanyDataKey(),JSON.stringify(db));
  }catch(e){
    console.warn('Browser cache unavailable; continuing with PC storage.',e);
  }
  try{
    if(typeof queuePcSave==='function') queuePcSave();
  }catch(e){ console.warn('PC save queue warning:',e); }
};

$('dateNow').textContent=new Date().toLocaleString();
applyThemeMode();
refreshAll();renderUsers();renderCompanies();updateCompanyDisplay();applyShopBranding();toggleCreditCustomerFields();showPage('dashboard');


// Automatic inactivity logout: 1 minute total; warning appears at 40 seconds.
const SESSION_TIMEOUT_MS=60*1000;
const SESSION_WARNING_MS=40*1000;
const SESSION_WARNING_SECONDS=20;
let sessionTimer=null, warningTimer=null, countdownTimer=null, warningOpen=false;
function clearSessionTimers(){
  if(sessionTimer) clearTimeout(sessionTimer);
  if(warningTimer) clearTimeout(warningTimer);
  if(countdownTimer) clearInterval(countdownTimer);
  sessionTimer=warningTimer=countdownTimer=null;
}
function startSessionTimer(){
  clearSessionTimers();
  if(sessionStorage.getItem(AUTH_KEY)!=='1') return;
  warningOpen=false;
  warningTimer=setTimeout(showSessionWarning,SESSION_WARNING_MS);
  sessionTimer=setTimeout(autoLogout,SESSION_TIMEOUT_MS);
}
function showSessionWarning(){
  if(sessionStorage.getItem(AUTH_KEY)!=='1') return;
  warningOpen=true;
  const modal=document.getElementById('sessionWarning');
  const number=document.getElementById('countdownNumber');
  let seconds=SESSION_WARNING_SECONDS;
  number.textContent=seconds;
  modal.classList.add('show');
  countdownTimer=setInterval(()=>{
    seconds--; number.textContent=seconds;
    if(seconds<=0){ clearInterval(countdownTimer); countdownTimer=null; autoLogout(); }
  },1000);
}
function cancelAutoLogout(){
  document.getElementById('sessionWarning').classList.remove('show');
  warningOpen=false;
  if(countdownTimer) clearInterval(countdownTimer);
  countdownTimer=null;
  startSessionTimer();
}
function autoLogout(){
  clearSessionTimers(); warningOpen=false;
  document.getElementById('sessionWarning').classList.remove('show');
  sessionStorage.removeItem(AUTH_KEY); sessionStorage.removeItem('rasith_current_user');
  document.getElementById('loginUser').value=''; document.getElementById('loginPass').value='';
  document.getElementById('loginError').textContent='Session expired. Please login again.';
  document.getElementById('loginScreen').style.display='grid';
}
function registerSessionActivity(){
  if(sessionStorage.getItem(AUTH_KEY)!=='1' || warningOpen) return;
  startSessionTimer();
}
['click','keydown','mousemove','scroll','touchstart'].forEach(evt=>document.addEventListener(evt,registerSessionActivity,{passive:true}));

// Permanent PC-folder data storage (File System Access API)
const PC_DATA_FILE='SF SMART POS SYSTEM_Data.json';
const PC_DATA_BACKUP_FILE='SF SMART POS SYSTEM_Data_Backup.json';
const PC_DATA_DB='SFSmartPOSSystemDataSettings';
let pcDataFolder=null;
let pcSaveTimer=null;
function openPcDataDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(PC_DATA_DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function getSavedFolderHandle(){try{const dbi=await openPcDataDb();return await new Promise((resolve,reject)=>{const tx=dbi.transaction('settings','readonly');const r=tx.objectStore('settings').get('folder');r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}catch(e){return null}}
async function saveFolderHandle(handle){const dbi=await openPcDataDb();return new Promise((resolve,reject)=>{const tx=dbi.transaction('settings','readwrite');tx.objectStore('settings').put(handle,'folder');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function verifyFolderPermission(handle,request=false){if(!handle)return false;try{let p=await handle.queryPermission({mode:'readwrite'});if(p==='granted')return true;if(request){p=await handle.requestPermission({mode:'readwrite'});return p==='granted'}return false}catch(e){return false}}
function buildPcSnapshot(){
  // Build from the live in-memory database first. This keeps permanent PC
  // saving working even when Chrome localStorage is unavailable or full.
  const companyData={};
  const activeId=activeCompany().id;
  (companies||[]).forEach(c=>{
    if(c.id===activeId) companyData[c.id]=JSON.parse(JSON.stringify(db));
    else {
      let raw=null;
      try{raw=localStorage.getItem(COMPANY_DB_PREFIX+c.id)}catch(e){raw=null}
      companyData[c.id]=raw?JSON.parse(raw):emptyCompanyDb(false);
    }
  });
  return {format:'SF SMART POS Permanent Data',version:8,savedAt:new Date().toISOString(),shopSettings:JSON.parse(JSON.stringify(shopSettings||{name:'',address:'',phone:'',footer:'',logo:''})),shopProfile:JSON.parse(JSON.stringify(shopSettings||{name:'',address:'',phone:'',footer:'',logo:''})),categories:Array.isArray(categories)?[...categories]:[...DEFAULT_CATEGORIES],companies:JSON.parse(JSON.stringify(companies||[])),users:JSON.parse(JSON.stringify(users||[])),companyData,appSettings:{theme:localStorage.getItem('sf_theme_mode')||'light'}};
}
async function writeSnapshotToFolder(showAlert=false){
  if(!pcDataFolder){if(showAlert)alert('Please select a PC data folder first.');return false}
  if(!(await verifyFolderPermission(pcDataFolder,true))){if(showAlert)alert('Folder permission was not granted. Please select the folder again.');return false}
  try{
    const snapshot=buildPcSnapshot();
    const json=JSON.stringify(snapshot,null,2);
    // Keep a second recovery copy in the same PC folder before replacing the main file.
    // This protects against an interrupted/corrupted main-file write.
    const existing=await pcDataFolder.getFileHandle(PC_DATA_FILE,{create:false}).catch(()=>null);
    if(existing){
      try{
        const oldText=await (await existing.getFile()).text();
        const backupHandle=await pcDataFolder.getFileHandle(PC_DATA_BACKUP_FILE,{create:true});
        const backupWritable=await backupHandle.createWritable();
        await backupWritable.write(oldText);
        await backupWritable.close();
      }catch(backupErr){console.warn('Could not refresh recovery copy',backupErr)}
    }
    const file=await pcDataFolder.getFileHandle(PC_DATA_FILE,{create:true});
    const writable=await file.createWritable();
    await writable.write(json);
    await writable.close();
    updatePcDataStatus(true);
    if(showAlert)alert('Backup saved successfully to:\n'+PC_DATA_FILE);
    return true;
  }catch(e){console.error(e);if(showAlert)alert('Could not save the PC data file. Please check folder permission.');return false}
}
function queuePcSave(){
  if(!pcDataFolder)return;
  clearTimeout(pcSaveTimer);
  pcSaveTimer=setTimeout(()=>writeSnapshotToFolder(false),300);
}
async function chooseDataFolder(){
  if(!window.showDirectoryPicker){alert('Your Chrome version does not support direct PC-folder saving. Please update Chrome.');return}
  try{
    const handle=await window.showDirectoryPicker({mode:'readwrite'});
    if(!(await verifyFolderPermission(handle,true)))return;
    pcDataFolder=handle; await saveFolderHandle(handle); updatePcDataStatus(true);
    const file=await handle.getFileHandle(PC_DATA_FILE,{create:false}).catch(()=>null);
    if(file){
      if(confirm('Existing SF SMART POS SYSTEM data file found.\n\nOK = LOAD data from this folder\nCancel = Keep current data and overwrite the folder file')) await loadSnapshotFile(handle);
      else await writeSnapshotToFolder(false);
    }else await writeSnapshotToFolder(false);
    alert('PC data folder connected. Future changes will be saved automatically.');
  }catch(e){if(e && e.name!=='AbortError')alert('Could not connect the selected folder.');}
}
function mergeRepairRecordsForRestore(localRepairs, pcRepairs){
  const local=Array.isArray(localRepairs)?localRepairs:[];
  const pc=Array.isArray(pcRepairs)?pcRepairs:[];
  const byToken=new Map();
  pc.forEach(r=>{if(r&&r.token)byToken.set(String(r.token),r);});
  local.forEach(r=>{
    if(!r||!r.token)return;
    const token=String(r.token), existing=byToken.get(token);
    if(!existing){byToken.set(token,r);return;}
    const lt=Date.parse(r.updatedAt||r.createdAt||r.finishedDate||r.returnedDate||r.date||0)||0;
    const pt=Date.parse(existing.updatedAt||existing.createdAt||existing.finishedDate||existing.returnedDate||existing.date||0)||0;
    // If timestamps are unavailable (older records), prefer the current browser record.
    if(!pt || (lt && lt>=pt))byToken.set(token,r);
  });
  return Array.from(byToken.values()).sort((a,b)=>{
    const ad=Date.parse(a.date||a.createdAt||0)||0, bd=Date.parse(b.date||b.createdAt||0)||0;
    return bd-ad;
  });
}

async function loadSnapshotFile(handle=pcDataFolder){
  try{
    if(!handle){alert('Please select your SF SMART POS SYSTEM data folder first.');return false;}
    // Request permission here. Restoring must work even after Chrome site data was cleared.
    if(!(await verifyFolderPermission(handle,true))){
      alert('PC data folder permission was not granted. Please select the same data folder again.');
      return false;
    }

    // Read the main file first, then automatically fall back to the recovery copy.
    let snap=null;
    const candidates=[PC_DATA_FILE,PC_DATA_BACKUP_FILE];
    for(const filename of candidates){
      try{
        const fh=await handle.getFileHandle(filename,{create:false});
        const text=await (await fh.getFile()).text();
        const parsed=JSON.parse(text);
        if(parsed && Array.isArray(parsed.companies) && parsed.companyData){snap=parsed;break;}
      }catch(readErr){console.warn('Could not read '+filename,readErr);}
    }
    if(!snap)throw new Error('No valid SF SMART POS data file was found in the selected folder.');

    // Capture the current browser copy BEFORE restoring the PC snapshot. A repair
    // entered moments ago may still be waiting in the PC-folder save queue.
    let localDbBeforeRestore=null;
    try{
      const activeIdBeforeRestore=activeCompany().id;
      localDbBeforeRestore=JSON.parse(localStorage.getItem(COMPANY_DB_PREFIX+activeIdBeforeRestore)||'null');
    }catch(e){localDbBeforeRestore=null;}

    // IMPORTANT: PC folder is the primary database. Do not make restore depend on localStorage.
    // Chrome localStorage may be unavailable, full, or cleared. Such failures are ignored here.
    try{localStorage.setItem(COMPANIES_KEY,JSON.stringify(snap.companies));}catch(e){console.warn('Browser companies cache unavailable during restore',e)}
    try{localStorage.setItem(USERS_KEY,JSON.stringify(Array.isArray(snap.users)?snap.users:[]));}catch(e){console.warn('Browser users cache unavailable during restore',e)}

    const restoredShop=snap.shopSettings&&typeof snap.shopSettings==='object'?snap.shopSettings:(snap.shopProfile&&typeof snap.shopProfile==='object'?snap.shopProfile:null);
    if(restoredShop){
      shopSettings={name:restoredShop.name||'',address:restoredShop.address||'',phone:restoredShop.phone||'',footer:restoredShop.footer||'',logo:restoredShop.logo||''};
      try{localStorage.setItem(SHOP_SETTINGS_KEY,JSON.stringify(shopSettings));}catch(e){console.warn('Browser shop-settings cache unavailable during restore',e)}
    }

    Object.keys(snap.companyData).forEach(id=>{
      try{localStorage.setItem(COMPANY_DB_PREFIX+id,JSON.stringify(snap.companyData[id]));}
      catch(e){console.warn('Browser company cache unavailable for '+id,e)}
    });

    // Rebuild the live application state directly from the restored PC snapshot.
    companies=Array.isArray(snap.companies)?snap.companies:[];
    users=Array.isArray(snap.users)?snap.users:[];
    if(Array.isArray(snap.categories)&&snap.categories.length){categories=[...new Set(snap.categories.map(x=>String(x||'').trim()).filter(Boolean))];DEFAULT_CATEGORIES.forEach(c=>{if(!categories.includes(c))categories.push(c)});try{localStorage.setItem(CATEGORIES_KEY,JSON.stringify(categories))}catch(e){console.warn('Browser categories cache unavailable during JSON restore',e)}}
    if(Array.isArray(snap.categories)&&snap.categories.length){categories=[...new Set(snap.categories.map(x=>String(x||'').trim()).filter(Boolean))];DEFAULT_CATEGORIES.forEach(c=>{if(!categories.includes(c))categories.push(c)});try{localStorage.setItem(CATEGORIES_KEY,JSON.stringify(categories))}catch(e){console.warn('Browser categories cache unavailable during restore',e)}}
    if(!companies.length)throw new Error('The restored data contains no companies.');
    const activeId=activeCompany().id;
    const rawDb=snap.companyData[activeId] || snap.companyData[String(activeId)] || Object.values(snap.companyData)[0];
    if(!rawDb)throw new Error('The restored data contains no company database.');
    // Keep repairs entered immediately before a refresh if the PC snapshot has not
    // received the queued write yet. This prevents a stale PC JSON snapshot from
    // deleting newly-created repair records on startup.
    const pcDb=JSON.parse(JSON.stringify(rawDb));
    pcDb.repairs=mergeRepairRecordsForRestore(localDbBeforeRestore?.repairs,pcDb.repairs);
    const localTemp=await loadTemporaryIndexedDb();
    db=pcDb;
    db.products=Array.isArray(db.products)?db.products:[];
    db.sales=Array.isArray(db.sales)?db.sales:[];
    db.stockEntries=Array.isArray(db.stockEntries)?db.stockEntries:[];
    // Temporary Accounts are permanent records. Never lose locally saved
    // temporary records merely because an older PC snapshot has no tempAccounts.
    db.tempAccounts=mergeTemporaryAccounts(Array.isArray(db.tempAccounts)?db.tempAccounts:[],localTemp);
    db.customers=Array.isArray(db.customers)&&db.customers.length?db.customers:[{name:'Walk-in Customer',phone:'',address:'',outstanding:0}];
    db.products.forEach(p=>{p.createdBy=p.createdBy||'Unknown / Old Data';p.createdAt=p.createdAt||'';p.lastStockUpdatedBy=p.lastStockUpdatedBy||p.createdBy||'Unknown / Old Data';p.lastStockUpdatedAt=p.lastStockUpdatedAt||p.createdAt||''});
    db.technicianProfiles=Array.isArray(db.technicianProfiles)?db.technicianProfiles:[];db.technicianCommissions=(db.technicianCommissions&&typeof db.technicianCommissions==='object')?db.technicianCommissions:{};migrateTechnicianCommissionData();
    db.sales.forEach(x=>{x.billMadeBy=x.billMadeBy||'Unknown / Old Data';if(x.payment==='Credit'){x.creditPayments=Array.isArray(x.creditPayments)?x.creditPayments:[];x.creditPaid=Number(x.creditPaid||0);x.creditBalance=Number.isFinite(Number(x.creditBalance))?Number(x.creditBalance):Math.max(0,Number(x.total||0)-x.creditPaid);x.customerPhone=x.customerPhone||x.whatsapp||'';x.customerAddress=x.customerAddress||'';}});

    cart=[];
    if(typeof clearPosFields==='function')clearPosFields();
    try{refreshAll();}catch(e){console.warn('refreshAll after restore warning',e)}
    try{renderUsers();renderCompanies();renderCategoryOptions();updateCompanyDisplay();applyShopBranding();showPage('dashboard');}catch(e){console.warn('UI refresh after restore warning',e)}
    updatePcDataStatus(true);

    // Rewrite the main PC file with the validated restored snapshot so the primary store is current.
    pcDataFolder=handle;
    await saveFolderHandle(handle).catch(e=>console.warn('Could not remember PC folder handle',e));
    await writeSnapshotToFolder(false);
    return true;
  }catch(e){
    console.error('PC restore failed:',e);
    alert('Could not restore the PC data file. The file may be missing, invalid, or the selected folder may not be accessible.\n\nPlease select the folder that contains "SF SMART POS SYSTEM_Data.json" or its backup file.');
    return false;
  }
}
async function backupDataFile(){
  try{
    if(!window.showSaveFilePicker){alert('Your Chrome version does not support backup file saving. Please update Chrome.');return}
    // Build directly from the live application state. This includes Temporary Accounts
    // and the shop logo/details, so one backup file contains the complete database.
    const snapshot=buildPcSnapshot();
    const suggested='SF SMART POS SYSTEM_Backup_'+new Date().toISOString().slice(0,10).replaceAll('-','')+'.json';
    const fh=await window.showSaveFilePicker({suggestedName:suggested,types:[{description:'SF Smart POS Complete Backup',accept:{'application/json':['.json']}}]});
    const writable=await fh.createWritable();
    await writable.write(JSON.stringify(snapshot,null,2));
    await writable.close();
    alert('Complete backup created successfully.\n\nShop details, logo, stock, sales, customers, credit bills, payments, Temporary Accounts, users and settings are all included in this one JSON file.');
  }catch(e){if(e && e.name!=='AbortError')alert('Could not create the backup file.');}
}
async function loadOldDataFile(){
  try{
    if(!window.showOpenFilePicker){alert('Your Chrome version does not support backup loading. Please update Chrome.');return}
    const [fh]=await window.showOpenFilePicker({multiple:false,types:[{description:'SF Smart POS Complete Backup',accept:{'application/json':['.json']}}]});
    const file=await fh.getFile();
    const snap=JSON.parse(await file.text());
    if(!snap || !Array.isArray(snap.companies) || !snap.companyData)throw new Error('Invalid backup');
    if(!confirm('Load this backup into the application?\n\nThe current application data will be replaced by the selected backup.\nShop details, logo, stock, sales, customers, credit bills, payments and Temporary Accounts will also be restored.'))return;

    // Restore the complete application directly. No PC folder selection is required.
    localStorage.setItem(COMPANIES_KEY,JSON.stringify(snap.companies));
    localStorage.setItem(USERS_KEY,JSON.stringify(Array.isArray(snap.users)?snap.users:[]));
    if(Array.isArray(snap.categories)&&snap.categories.length){
      categories=[...new Set(snap.categories.map(x=>String(x||'').trim()).filter(Boolean))];
      DEFAULT_CATEGORIES.forEach(c=>{if(!categories.includes(c))categories.push(c)});
      try{localStorage.setItem(CATEGORIES_KEY,JSON.stringify(categories))}catch(e){console.warn('Browser categories cache unavailable during backup restore',e)}
    }
    const restoredShop=snap.shopSettings&&typeof snap.shopSettings==='object'?snap.shopSettings:(snap.shopProfile&&typeof snap.shopProfile==='object'?snap.shopProfile:null);
    if(restoredShop){
      shopSettings={name:restoredShop.name||'',address:restoredShop.address||'',phone:restoredShop.phone||'',footer:restoredShop.footer||'',logo:restoredShop.logo||''};
      localStorage.setItem(SHOP_SETTINGS_KEY,JSON.stringify(shopSettings));
    }
    if(snap.appSettings&&snap.appSettings.theme)try{localStorage.setItem('sf_theme_mode',snap.appSettings.theme)}catch(e){}

    // Restore every company database, including Temporary Accounts.
    Object.keys(snap.companyData).forEach(id=>{
      const incoming=JSON.parse(JSON.stringify(snap.companyData[id]||{}));
      incoming.tempAccounts=Array.isArray(incoming.tempAccounts)?incoming.tempAccounts:[];
      localStorage.setItem(COMPANY_DB_PREFIX+id,JSON.stringify(incoming));
    });
    companies=JSON.parse(JSON.stringify(snap.companies));
    users=Array.isArray(snap.users)?JSON.parse(JSON.stringify(snap.users)):users;
    db=loadCompanyData();migrateTechnicianCommissionData();
    // Ensure restored records are never lost because an old backup omitted tempAccounts.
    db.tempAccounts=Array.isArray(db.tempAccounts)?db.tempAccounts:[];
    localStorage.setItem(activeCompanyDataKey(),JSON.stringify(db));
    cart=[];
    if(typeof clearPosFields==='function')clearPosFields();
    refreshAll();renderUsers();renderCompanies();renderCategoryOptions();updateCompanyDisplay();applyShopBranding();applyThemeMode();showPage('dashboard');
    // Do not require or create a PC-folder destination. The selected backup is now
    // the application's current complete database.
    alert('Backup loaded successfully.\n\nAll data from the backup has been restored, including Temporary Accounts, shop logo and shop details.');
  }catch(e){if(e && e.name!=='AbortError'){console.error(e);alert('Could not load the selected backup. Please select a valid SF SMART POS SYSTEM backup JSON file.');}}
}
async function restoreDataFromSelectedJson(){
  try{
    if(!window.showOpenFilePicker){alert('Your Chrome version does not support file selection. Please update Chrome.');return}
    const [fh]=await window.showOpenFilePicker({multiple:false,types:[{description:'SF Smart POS Data',accept:{'application/json':['.json']}}]});
    const file=await fh.getFile();
    const snap=JSON.parse(await file.text());
    if(!snap || snap.format!=='SF Smart POS Permanent Data' || !Array.isArray(snap.companies) || !snap.companyData)throw new Error('Invalid SF Smart POS data file');
    if(!confirm('Recover this permanent database?\n\nCurrent app data will be replaced by the selected PC data file.'))return;
    localStorage.setItem(COMPANIES_KEY,JSON.stringify(snap.companies));
    localStorage.setItem(USERS_KEY,JSON.stringify(Array.isArray(snap.users)?snap.users:[]));
    if(Array.isArray(snap.categories)&&snap.categories.length){categories=[...new Set(snap.categories.map(x=>String(x||'').trim()).filter(Boolean))];DEFAULT_CATEGORIES.forEach(c=>{if(!categories.includes(c))categories.push(c)});try{localStorage.setItem(CATEGORIES_KEY,JSON.stringify(categories))}catch(e){console.warn('Browser categories cache unavailable during JSON restore',e)}}
    const restoredShop=snap.shopSettings&&typeof snap.shopSettings==='object'?snap.shopSettings:(snap.shopProfile&&typeof snap.shopProfile==='object'?snap.shopProfile:null);
    if(restoredShop){ shopSettings={name:restoredShop.name||'',address:restoredShop.address||'',phone:restoredShop.phone||'',footer:restoredShop.footer||'',logo:restoredShop.logo||''}; localStorage.setItem(SHOP_SETTINGS_KEY,JSON.stringify(shopSettings)); }
    Object.keys(snap.companyData).forEach(id=>localStorage.setItem(COMPANY_DB_PREFIX+id,JSON.stringify(snap.companyData[id])));
    companies=snap.companies; users=Array.isArray(snap.users)?snap.users:users; db=loadCompanyData();migrateTechnicianCommissionData();
    cart=[]; if(typeof clearPosFields==='function')clearPosFields(); refreshAll();renderUsers();renderCompanies();renderCategoryOptions();updateCompanyDisplay();applyShopBranding();showPage('dashboard');
    pcDataFolder=await getSavedFolderHandle();
    if(pcDataFolder && await verifyFolderPermission(pcDataFolder,false)) await writeSnapshotToFolder(false);
    alert('Database recovered successfully.\n\nFor permanent protection, keep the original JSON file safe and reconnect its PC folder if Chrome site data was cleared.');
  }catch(e){if(e && e.name!=='AbortError'){console.error(e);alert('Could not recover the selected data file. Please select a valid SF SMART POS SYSTEM_Data.json or backup JSON file.');}}
}
async function restoreDataFromFolder(){
  if(!pcDataFolder){pcDataFolder=await getSavedFolderHandle();}
  if(!pcDataFolder){alert('Please select your PC data folder first.');return}
  if(await loadSnapshotFile(pcDataFolder))alert('Data restored successfully from the PC folder.');
}
async function saveDataToFolder(showAlert=false){
  if(!pcDataFolder)pcDataFolder=await getSavedFolderHandle();
  if(!pcDataFolder){if(showAlert)alert('Please select your PC data folder first.');return}
  await writeSnapshotToFolder(showAlert);
}
function updatePcDataStatus(connected){
  const s=document.getElementById('dataStatus'),n=document.getElementById('dataFolderName');
  if(!s)return;
  s.textContent=connected?'PC Folder Connected':'Not Connected';s.className='badge '+(connected?'ok':'low');
  if(n)n.innerHTML=connected?('\u2705 <b>'+esc(pcDataFolder.name)+'</b> — automatic saving enabled<br><small>Chrome data can be cleared safely; the permanent database remains in this PC folder.</small>'):'\u26a0 No PC folder connected.<br><small>If Chrome site data is cleared, use <b>Recover From JSON File</b> or reconnect the PC data folder.</small>';
}
// Wrap the existing save functions so every normal change also writes to the selected PC folder.
const _rmSaveCurrentCompanyData=saveCurrentCompanyData;
saveCurrentCompanyData=function(){_rmSaveCurrentCompanyData();queuePcSave()};
const _rmSaveCompanies=saveCompanies;
saveCompanies=function(){_rmSaveCompanies();queuePcSave()};
const _rmSaveUsers=saveUsers;
saveUsers=function(){_rmSaveUsers();queuePcSave()};
document.getElementById('technicianProfileForm')?.addEventListener('submit',function(e){e.preventDefault();saveTechnicianProfile();});

window.addEventListener('load',async()=>{
  // Restore Temporary Accounts first so closing/reopening the web app never
  // makes those records disappear. The PC folder, when accessible, is then
  // used as the primary shared database.
  await restoreTemporaryAccountsFromLocalPermanentStore();
  pcDataFolder=await getSavedFolderHandle();
  if(pcDataFolder && await verifyFolderPermission(pcDataFolder,false)){
    updatePcDataStatus(true);
    const file=await pcDataFolder.getFileHandle(PC_DATA_FILE,{create:false}).catch(()=>null);
    if(file) await loadSnapshotFile(pcDataFolder);
  }else updatePcDataStatus(false);
});

// v3.45 — keep Reprint Bill behavior while adding persistent Bill View.
function reprintInvoice(invoice){
 const sale=db.sales.find(s=>s.invoice===invoice);
 if(!sale)return alert('Invoice not found.');
 printInvoice(sale);
}

// v19 final — repair parts can be sourced from stock with reversible inventory tracking.
const _sfOriginalSaveRepairPart = saveRepairPart;
saveRepairPart = async function(){
  const r=(db.repairs||[]).find(x=>x.token===repairDetailRef); if(!r)return;
  const editIndex=repairItemEditIndex;
  const oldItem=editIndex>=0?r.items?.[editIndex]:null;
  const oldQty=oldItem?Number(oldItem.qty||1):0;
  const oldSource=oldItem?.fromStock===true;
  const name=($('repairPartName')?.value||'').trim(),rawPrice=$('repairPartPrice')?.value??'',rawSale=$('repairPartSalePrice')?.value??'',unitPrice=rawPrice.trim()===''?0:Number(rawPrice),salePrice=rawSale.trim()===''?0:Number(rawSale),qty=Math.max(1,Number($('repairPartQty')?.value||1));
  if(!name)return alert('Enter the item / part name.');
  if(!Number.isFinite(unitPrice)||unitPrice<0)return alert('Enter a valid item cost price or leave it blank.');
  if(!Number.isFinite(salePrice)||salePrice<0)return alert('Enter a valid item sale price or leave it blank.');
  if(oldSource){
    if(name!==oldItem.name || Number(unitPrice)!==Number(oldItem.costPrice||oldItem.unitPrice||0) || Number(salePrice)!==Number(oldItem.salePrice||0)){
      return alert('This item was added from Stock. Its stock item name and prices are controlled by the stock record. Change the stock product from Stock management instead.');
    }
    if(!adjustRepairStockForEdit(oldItem,oldQty,qty,r))return;
  }
  r.items=r.items||[];
  const data={name,unitPrice,costPrice:unitPrice,costPriceEntered:rawPrice.trim()!=='',salePrice,salePriceEntered:rawSale.trim()!=='',qty,total:unitPrice*qty,saleTotal:salePrice*qty};
  if(editIndex>=0&&r.items[editIndex])r.items[editIndex]={...r.items[editIndex],...data, ...(oldSource?{fromStock:true,sourceProductId:oldItem.sourceProductId,sourceProductCode:oldItem.sourceProductCode,stockDeductedQty:qty,stockRestored:false}: {})};
  else r.items.push(data);
  r.itemCostTotal=repairItemsTotal(r);r.serviceCharge=repairServiceCharge(r);r.updatedAt=new Date().toISOString();saveCurrentCompanyData();try{await saveTemporaryIndexedDb()}catch(e){}closeRepairItemModal();openRepairDetail(r.token);renderRepairSummary();
};
const _sfOriginalDeleteRepairPart = deleteRepairPart;
deleteRepairPart = function(i){
  const r=(db.repairs||[]).find(x=>x.token===repairDetailRef);if(!r||!r.items?.[i])return;if(!confirm('Delete this repair item?'))return;
  const item=r.items[i]; const restored=restoreRepairStockForItem(item,r,'Repair part removed from repair'); r.items.splice(i,1); r.itemCostTotal=repairItemsTotal(r);r.serviceCharge=repairServiceCharge(r);r.updatedAt=new Date().toISOString();saveCurrentCompanyData();openRepairDetail(r.token);renderRepairSummary();if(restored)showToast(`${restored} stock unit${restored===1?'':'s'} returned to inventory.`,'success',3000);
};
const _sfOriginalDeleteRepairAfterSecurity = performDeleteRepairAfterSecurity;
performDeleteRepairAfterSecurity = function(token){
  const idx=(db.repairs||[]).findIndex(x=>x.token===token);if(idx<0)return;const r=db.repairs[idx];if(!confirm(`DELETE JOB ${token}?\n\nCustomer: ${(r.customerName||'Customer')}\nDevice: ${(r.deviceModel||'Device')}\n\nAny repair parts taken from Stock will be returned to Stock.\n\nThis job and its repair details will be permanently deleted. This cannot be undone.`))return;
  const restored=restoreRepairStockForRecord(r,'Repair record deleted');db.repairs.splice(idx,1);saveCurrentCompanyData();try{saveTemporaryIndexedDb()}catch(e){}if(repairDetailRef===token){$('repairDetailModal')?.classList.remove('show');repairDetailRef='';}renderRepairSummary();renderRepairPending();renderRepairHistory();renderRepairAnalysis();showToast(token+' deleted successfully.'+(restored?` ${restored} stock unit${restored===1?'':'s'} returned.`:''),'success',3500);
};
const _sfOriginalDeleteAuthorizedRepairFromDetail = deleteAuthorizedRepairFromDetail;
deleteAuthorizedRepairFromDetail = function(){
  const token=repairDetailRef;if(!token||!repairHistoryAuthorized)return;const idx=(db.repairs||[]).findIndex(x=>x.token===token);if(idx<0)return;const r=db.repairs[idx];if(!confirm(`DELETE REPAIR RECORD ${token}?\n\nCustomer: ${(r.customerName||'Customer')}\nDevice: ${(r.deviceModel||'Device')}\nStatus: ${(r.status||'Pending')}\n\nAny repair parts taken from Stock will be returned to Stock.\n\nThis repair record will be permanently deleted. This cannot be undone.`))return;
  const restored=restoreRepairStockForRecord(r,'Repair record deleted');db.repairs.splice(idx,1);saveCurrentCompanyData();try{saveTemporaryIndexedDb()}catch(e){}repairHistoryAuthorized=false;$('repairDetailModal')?.classList.remove('show');repairDetailRef='';renderRepairSummary();renderRepairPending();renderRepairHistory();renderRepairAnalysis();showToast(token+' deleted successfully.'+(restored?` ${restored} stock unit${restored===1?'':'s'} returned.`:''),'success',3500);
};
