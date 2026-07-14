const defaultData = {
  settings:{storeName:"Mi Negocio",currency:"$",tax:0,minStock:5,address:"",phone:"",ticketFooter:"Gracias por su compra"},
  users:[{id:1,username:"admin",password:"1234",name:"Administrador",role:"admin",active:true},{id:2,username:"cajero",password:"1234",name:"Cajero",role:"cashier",active:true}],
  products:[
    {id:1,name:"Café Premium",sku:"CAF-001",category:"Bebidas",price:2500,stock:24,min:5,emoji:"☕"},
    {id:2,name:"Agua Mineral",sku:"AGU-001",category:"Bebidas",price:1200,stock:40,min:8,emoji:"💧"},
    {id:3,name:"Sándwich Mixto",sku:"SAN-001",category:"Comida",price:4200,stock:16,min:4,emoji:"🥪"},
    {id:4,name:"Galletas",sku:"GAL-001",category:"Snacks",price:1800,stock:30,min:6,emoji:"🍪"},
    {id:5,name:"Jugo Natural",sku:"JUG-001",category:"Bebidas",price:3000,stock:18,min:5,emoji:"🧃"},
    {id:6,name:"Ensalada",sku:"ENS-001",category:"Comida",price:5200,stock:9,min:3,emoji:"🥗"},
    {id:7,name:"Chocolate",sku:"CHO-001",category:"Snacks",price:2200,stock:20,min:5,emoji:"🍫"},
    {id:8,name:"Empanada",sku:"EMP-001",category:"Comida",price:2000,stock:22,min:6,emoji:"🥟"}
  ],
  clients:[
    {id:1,name:"Cliente general",phone:"",email:"",spent:0},
    {id:2,name:"María González",phone:"+56 9 1111 2222",email:"maria@email.com",spent:18500}
  ],
  sales:[],
  cash:{open:false,opening:0,expenses:[],movements:[]}
};
let data = JSON.parse(localStorage.getItem("novapos_data")) || structuredClone(defaultData);
data.settings={...defaultData.settings,...(data.settings||{})};
data.users=(data.users&&data.users.length)?data.users:structuredClone(defaultData.users);
let cart = [];
let session = JSON.parse(sessionStorage.getItem("novapos_session") || "null");
let deferredPrompt;

const $ = id => document.getElementById(id);
const money = n => `${data.settings.currency}${Number(n||0).toLocaleString("es-CL")}`;
function save(){localStorage.setItem("novapos_data",JSON.stringify(data))}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function today(){return new Date().toLocaleString("es-CL")}

function login(){
  const u=$("loginUser").value.trim(),p=$("loginPass").value;
  const user=(data.users||[]).find(x=>x.username===u&&x.password===p&&x.active!==false);
  if(user){session={user:user.username,name:user.name,role:user.role,userId:user.id};sessionStorage.setItem("novapos_session",JSON.stringify(session));boot()}else toast("Usuario o contraseña incorrectos")
}
function logout(){sessionStorage.removeItem("novapos_session");location.reload()}
function boot(){
  $("loginView").classList.add("hidden");$("appView").classList.remove("hidden");
  $("sessionUser").textContent=(session.name||session.user)+" · "+(session.role==="admin"?"Administrador":"Cajero");
  document.querySelectorAll(".admin-only").forEach(e=>e.style.display=session.role==="admin"?"":"none");
  $("dateNow").textContent=today();$("storeNameSide").textContent=data.settings.storeName;
  bindNav();renderAll();
}
if(session) boot();

function bindNav(){
  document.querySelectorAll(".nav-btn").forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
    $("view-"+btn.dataset.view).classList.add("active");
    $("viewTitle").textContent=btn.querySelector("span").textContent;
    renderAll();toggleSidebar(false);
  });
}
function toggleSidebar(force){$("sidebar").classList.toggle("open",force===undefined?undefined:force)}

function renderAll(){
  renderCategories();renderProductGrid();renderCart();renderProductsTable();renderInventory();
  renderClients();renderCash();renderReports();renderSettings();
}
function renderCategories(){
  const cats=["Todas",...new Set(data.products.map(p=>p.category))];
  $("categoryFilter").innerHTML=cats.map(c=>`<option>${c}</option>`).join("");
  $("saleClient").innerHTML=data.clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
}
function renderProductGrid(){
  if(!$("productGrid"))return;
  const q=$("productSearch").value.toLowerCase(),cat=$("categoryFilter").value||"Todas";
  const list=data.products.filter(p=>(p.name.toLowerCase().includes(q)||p.sku.toLowerCase().includes(q))&&(cat==="Todas"||p.category===cat));
  $("productGrid").innerHTML=list.map(p=>`<div class="product-card" onclick="addToCart(${p.id})">
    <div class="emoji">${p.emoji||"📦"}</div><h4>${p.name}</h4><p>${p.category} · ${p.sku}</p>
    <div class="price"><span>${money(p.price)}</span><small>Stock ${p.stock}</small></div></div>`).join("")||"<p>No se encontraron productos.</p>";
}
function addToCart(id){
  const p=data.products.find(x=>x.id===id); if(!p||p.stock<=0)return toast("Producto sin stock");
  const item=cart.find(x=>x.id===id);
  if(item){if(item.qty>=p.stock)return toast("No hay más stock");item.qty++}else cart.push({...p,qty:1});
  renderCart();
}
function changeQty(id,d){
  const i=cart.find(x=>x.id===id),p=data.products.find(x=>x.id===id);if(!i)return;
  i.qty=Math.max(0,Math.min(i.qty+d,p.stock));if(i.qty===0)cart=cart.filter(x=>x.id!==id);renderCart();
}
function clearCart(){cart=[];renderCart()}
function renderCart(){
  $("cartItems").innerHTML=cart.map(i=>`<div class="cart-item"><div><strong>${i.name}</strong><div>${money(i.price)} c/u</div></div>
  <div class="qty-control"><button onclick="changeQty(${i.id},-1)">−</button><strong>${i.qty}</strong><button onclick="changeQty(${i.id},1)">+</button></div></div>`).join("")||"<p style='color:#6b7280'>Agrega productos para iniciar la venta.</p>";
  const sub=cart.reduce((a,b)=>a+b.price*b.qty,0),disc=Number($("discount").value||0),total=Math.max(0,sub-disc);
  $("subtotal").textContent=money(sub);$("total").textContent=money(total);
}
function completeSale(){
  if(!cart.length)return toast("La venta está vacía");
  if(!data.cash.open)return toast("Primero debes abrir la caja");
  const sub=cart.reduce((a,b)=>a+b.price*b.qty,0),disc=Number($("discount").value||0),total=Math.max(0,sub-disc);
  cart.forEach(i=>{const p=data.products.find(x=>x.id===i.id);p.stock-=i.qty});
  const sale={id:Date.now(),ticket:"T-"+String(data.sales.length+1).padStart(5,"0"),date:new Date().toISOString(),clientId:Number($("saleClient").value),payment:$("paymentMethod").value,subtotal:sub,discount:disc,total,items:cart.map(i=>({id:i.id,name:i.name,qty:i.qty,price:i.price}))};
  data.sales.unshift(sale); const cl=data.clients.find(c=>c.id===sale.clientId);if(cl)cl.spent+=total;
  data.cash.movements.unshift({date:today(),type:"Venta",amount:total,note:sale.ticket});
  save();cart=[];$("discount").value=0;renderAll();toast("Venta completada: "+sale.ticket);showReceiptOptions(sale.id);
}
function renderProductsTable(){
  $("productsTable").innerHTML=data.products.map(p=>`<tr><td>${p.emoji||"📦"} ${p.name}</td><td>${p.sku}</td><td>${p.category}</td><td>${money(p.price)}</td><td>${p.stock}</td>
  <td class="table-actions">${session.role==="admin"?`<button onclick="openProductModal(${p.id})">Editar</button><button onclick="deleteProduct(${p.id})">Eliminar</button>`:"—"}</td></tr>`).join("");
}
function openProductModal(id){
  const p=id?data.products.find(x=>x.id===id):{name:"",sku:"",category:"General",price:0,stock:0,min:data.settings.minStock,emoji:"📦"};
  $("modalContent").innerHTML=`<h3>${id?"Editar":"Nuevo"} producto</h3><div class="modal-form">
  <input id="mName" placeholder="Nombre" value="${p.name}"><input id="mSku" placeholder="SKU" value="${p.sku}">
  <input id="mCategory" placeholder="Categoría" value="${p.category}"><input id="mEmoji" placeholder="Emoji" value="${p.emoji}">
  <input id="mPrice" type="number" placeholder="Precio" value="${p.price}"><input id="mStock" type="number" placeholder="Stock" value="${p.stock}">
  <input id="mMin" type="number" placeholder="Stock mínimo" value="${p.min}">
  <button class="primary-btn" onclick="saveProduct(${id||"null"})">Guardar</button></div>`;$("modal").classList.remove("hidden");
}
function saveProduct(id){
  const obj={id:id||Date.now(),name:$("mName").value,sku:$("mSku").value,category:$("mCategory").value,emoji:$("mEmoji").value||"📦",price:Number($("mPrice").value),stock:Number($("mStock").value),min:Number($("mMin").value)};
  if(!obj.name||!obj.sku)return toast("Completa nombre y SKU");
  if(id){Object.assign(data.products.find(x=>x.id===id),obj)}else data.products.push(obj);
  save();closeModal();renderAll();toast("Producto guardado");
}
function deleteProduct(id){if(confirm("¿Eliminar producto?")){data.products=data.products.filter(x=>x.id!==id);save();renderAll()}}
function renderInventory(){
  const low=data.products.filter(p=>p.stock<=p.min).length,value=data.products.reduce((a,p)=>a+p.stock*p.price,0),units=data.products.reduce((a,p)=>a+p.stock,0);
  $("inventoryKpis").innerHTML=kpis([["Productos",data.products.length],["Unidades",units],["Stock bajo",low],["Valor inventario",money(value)]]);
  $("inventoryTable").innerHTML=data.products.map(p=>`<tr><td>${p.name}</td><td>${p.stock}</td><td>${p.min}</td><td><span class="badge ${p.stock<=p.min?"low":"ok"}">${p.stock<=p.min?"Reponer":"Disponible"}</span></td>
  <td><button onclick="adjustStock(${p.id})">Ajustar</button></td></tr>`).join("");
}
function adjustStock(id){const p=data.products.find(x=>x.id===id),n=prompt("Nuevo stock para "+p.name,p.stock);if(n!==null){p.stock=Number(n);save();renderAll()}}
function renderClients(){
  $("clientsGrid").innerHTML=data.clients.map(c=>`<div class="client-card"><h4>${c.name}</h4><p>${c.phone||"Sin teléfono"}</p><p>${c.email||"Sin correo"}</p><strong>Compras: ${money(c.spent)}</strong></div>`).join("");
}
function openClientModal(){
  $("modalContent").innerHTML=`<h3>Nuevo cliente</h3><div class="modal-form"><input id="cName" placeholder="Nombre"><input id="cPhone" placeholder="Teléfono"><input id="cEmail" placeholder="Correo"><button class="primary-btn" onclick="saveClient()">Guardar</button></div>`;$("modal").classList.remove("hidden");
}
function saveClient(){if(!$("cName").value)return toast("Escribe el nombre");data.clients.push({id:Date.now(),name:$("cName").value,phone:$("cPhone").value,email:$("cEmail").value,spent:0});save();closeModal();renderAll()}
function openCash(){
  if(data.cash.open)return toast("La caja ya está abierta");data.cash.open=true;data.cash.opening=Number($("openingAmount").value||0);data.cash.movements.unshift({date:today(),type:"Apertura",amount:data.cash.opening,note:"Inicio de turno"});save();renderCash();toast("Caja abierta");
}
function addExpense(){
  if(!data.cash.open)return toast("Abre la caja primero");const a=Number($("expenseAmount").value||0);if(a<=0)return toast("Monto inválido");
  const e={date:today(),amount:a,note:$("expenseNote").value||"Gasto"};data.cash.expenses.unshift(e);data.cash.movements.unshift({date:e.date,type:"Gasto",amount:-a,note:e.note});save();renderCash();
}
function closeCash(){if(!data.cash.open)return toast("La caja está cerrada");data.cash.open=false;data.cash.movements.unshift({date:today(),type:"Cierre",amount:cashBalance(),note:"Cierre de turno"});save();renderCash();toast("Caja cerrada")}
function cashBalance(){const sales=data.sales.reduce((a,s)=>a+s.total,0),exp=data.cash.expenses.reduce((a,e)=>a+e.amount,0);return data.cash.opening+sales-exp}
function renderCash(){
  const sales=data.sales.reduce((a,s)=>a+s.total,0),exp=data.cash.expenses.reduce((a,e)=>a+e.amount,0);
  $("cashKpis").innerHTML=kpis([["Estado",data.cash.open?"Abierta":"Cerrada"],["Apertura",money(data.cash.opening)],["Ventas",money(sales)],["Saldo",money(cashBalance())]]);
  $("cashMovements").innerHTML=data.cash.movements.slice(0,10).map(m=>`<div class="timeline-item"><strong>${m.type} · ${money(m.amount)}</strong><div>${m.note}</div><small>${m.date}</small></div>`).join("")||"<p>Sin movimientos.</p>";
}
function renderReports(){
  const total=data.sales.reduce((a,s)=>a+s.total,0),avg=data.sales.length?total/data.sales.length:0;
  $("reportKpis").innerHTML=kpis([["Ventas",data.sales.length],["Ingresos",money(total)],["Ticket promedio",money(avg)],["Clientes",data.clients.length]]);
  const methods={};data.sales.forEach(s=>methods[s.payment]=(methods[s.payment]||0)+s.total);const max=Math.max(1,...Object.values(methods));
  $("paymentBars").innerHTML=Object.entries(methods).map(([k,v])=>`<div><div class="bar-label"><span>${k}</span><strong>${money(v)}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div></div>`).join("")||"<p>Sin ventas.</p>";
  const prod={};data.sales.forEach(s=>s.items.forEach(i=>prod[i.name]=(prod[i.name]||0)+i.qty));
  $("topProducts").innerHTML=Object.entries(prod).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,q],i)=>`<div class="rank-item"><span>${i+1}. ${n}</span><strong>${q} u.</strong></div>`).join("")||"<p>Sin datos.</p>";
  $("salesTable").innerHTML=data.sales.map(s=>{const c=data.clients.find(x=>x.id===s.clientId);return `<tr><td>${new Date(s.date).toLocaleString("es-CL")}</td><td>${s.ticket}</td><td>${c?.name||"General"}</td><td>${s.payment}</td><td>${money(s.total)}</td><td><button onclick="printReceipt(${s.id})">Imprimir</button></td></tr>`}).join("");
}
function kpis(items){return items.map(([l,v])=>`<div class="kpi"><span>${l}</span><strong>${v}</strong></div>`).join("")}
function renderSettings(){
  $("settingsStoreName").value=data.settings.storeName||"";$("settingsAddress").value=data.settings.address||"";$("settingsPhone").value=data.settings.phone||"";$("settingsCurrency").value=data.settings.currency||"$";$("settingsTax").value=data.settings.tax||0;$("settingsMinStock").value=data.settings.minStock||5;$("settingsTicketFooter").value=data.settings.ticketFooter||"Gracias por su compra";renderUsers();
}
function saveSettings(){data.settings={...data.settings,storeName:$("settingsStoreName").value,address:$("settingsAddress").value,phone:$("settingsPhone").value,currency:$("settingsCurrency").value||"$",tax:Number($("settingsTax").value),minStock:Number($("settingsMinStock").value),ticketFooter:$("settingsTicketFooter").value};save();renderAll();toast("Configuración guardada")}
function renderUsers(){if(!$("usersList"))return;$("usersList").innerHTML=(data.users||[]).map(u=>`<div class="user-card"><div><strong>${u.name}</strong><span>${u.username} · ${u.role==="admin"?"Administrador":"Cajero"} · ${u.active!==false?"Activo":"Inactivo"}</span></div><div class="table-actions"><button onclick="openUserModal(${u.id})">Editar</button>${u.id!==session.userId?`<button onclick="deleteUser(${u.id})">Eliminar</button>`:""}</div></div>`).join("")}
function openUserModal(id){const u=id?(data.users||[]).find(x=>x.id===id):{name:"",username:"",password:"",role:"cashier",active:true};$("modalContent").innerHTML=`<h3>${id?"Editar":"Nuevo"} usuario</h3><div class="modal-form"><input id="uName" placeholder="Nombre" value="${u.name||""}"><input id="uUsername" placeholder="Usuario" value="${u.username||""}"><input id="uPassword" type="password" placeholder="Contraseña" value="${u.password||""}"><select id="uRole"><option value="admin" ${u.role==="admin"?"selected":""}>Administrador</option><option value="cashier" ${u.role==="cashier"?"selected":""}>Cajero</option></select><select id="uActive"><option value="true" ${u.active!==false?"selected":""}>Activo</option><option value="false" ${u.active===false?"selected":""}>Inactivo</option></select><button class="primary-btn" onclick="saveUser(${id||"null"})">Guardar</button></div>`;$("modal").classList.remove("hidden")}
function saveUser(id){const name=$("uName").value.trim(),username=$("uUsername").value.trim(),password=$("uPassword").value;if(!name||!username||!password)return toast("Completa todos los datos");if((data.users||[]).some(u=>u.username===username&&u.id!==id))return toast("Ese usuario ya existe");const obj={id:id||Date.now(),name,username,password,role:$("uRole").value,active:$("uActive").value==="true"};if(id){Object.assign(data.users.find(x=>x.id===id),obj)}else data.users.push(obj);save();closeModal();renderAll();toast("Usuario guardado")}
function deleteUser(id){const t=data.users.find(u=>u.id===id),admins=data.users.filter(u=>u.role==="admin");if(t?.role==="admin"&&admins.length<=1)return toast("Debe existir al menos un administrador");if(confirm("¿Eliminar usuario?")){data.users=data.users.filter(u=>u.id!==id);save();renderAll()}}
function showReceiptOptions(id){$("modalContent").innerHTML=`<h3>Venta completada</h3><button class="primary-btn" onclick="printReceipt(${id})">Imprimir ticket</button>`;$("modal").classList.remove("hidden")}
function printReceipt(id){const s=data.sales.find(x=>x.id===id);if(!s)return;const c=data.clients.find(x=>x.id===s.clientId);$("printReceipt").innerHTML=`<div class="receipt-inner"><h2>${data.settings.storeName}</h2><p>${data.settings.address||""}</p><p>${data.settings.phone||""}</p><hr><p>Ticket: ${s.ticket}</p><p>Fecha: ${new Date(s.date).toLocaleString("es-CL")}</p><p>Cliente: ${c?.name||"General"}</p><hr><table>${s.items.map(i=>`<tr><td>${i.qty} x ${i.name}</td><td>${money(i.qty*i.price)}</td></tr>`).join("")}</table><hr><p class="receipt-line"><span>Total</span><strong>${money(s.total)}</strong></p><p>Pago: ${s.payment}</p><hr><p class="receipt-footer">${data.settings.ticketFooter||"Gracias por su compra"}</p></div>`;closeModal();setTimeout(()=>window.print(),100)}
function closeModal(){$("modal").classList.add("hidden")}
function exportData(){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="novapos_respaldo.json";a.click()}
function importData(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{data=JSON.parse(r.result);save();renderAll();toast("Respaldo importado")}catch{toast("Archivo inválido")}};r.readAsText(f)}
function resetDemo(){if(confirm("¿Restablecer todos los datos?")){data=structuredClone(defaultData);save();renderAll()}}
window.addEventListener("online",()=>{$("onlineText").textContent="En línea";document.querySelector(".status-dot").style.background="#16a34a"});
window.addEventListener("offline",()=>{$("onlineText").textContent="Sin conexión";document.querySelector(".status-dot").style.background="#dc2626"});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e});
async function installApp(){if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}else toast("En Android usa: menú del navegador → Instalar aplicación")}
if("serviceWorker" in navigator)navigator.serviceWorker.register("service-worker.js");