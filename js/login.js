'use strict';
(async function initLoginPage(){
  const error=document.getElementById('loginError'),button=document.getElementById('loginBtn');let role='admin';
  const hints={admin:['admin@repflow.com','Admin@123'],staff:['staff@repflow.com','Staff@123'],technician:['technician@repflow.com','Tech@123']};
  const showError=e=>{error.textContent=e.message||String(e);error.style.display='block';};
  document.querySelectorAll('#roleTabs button').forEach(b=>b.onclick=()=>{role=b.dataset.role;document.querySelectorAll('#roleTabs button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b);});document.getElementById('demoHint').textContent=hints[role].join(' / ');error.style.display='none';});
  document.getElementById('fillDemo').onclick=()=>{document.getElementById('email').value=hints[role][0];document.getElementById('password').value=hints[role][1];document.getElementById('email').focus();};
  document.getElementById('showPassword').onchange=e=>{document.getElementById('password').type=e.target.checked?'text':'password';};
  try {
    if(location.protocol==='file:')throw new Error('Run the folder with a local static server, then open http://localhost:8000. Direct file opening does not reliably share localStorage between pages. See README.md.');
    await seedInitialData();if(Auth.isLoggedIn()){location.replace('dashboard.html');return;}button.disabled=false;button.textContent='Sign in';
  }catch(e){showError(e);button.textContent='Workspace unavailable';return;}
  document.getElementById('loginForm').onsubmit=async e=>{e.preventDefault();button.disabled=true;button.textContent='Signing in…';error.style.display='none';try{await Auth.login(document.getElementById('email').value,document.getElementById('password').value,role);location.href='dashboard.html';}catch(err){showError(err);}finally{button.disabled=false;button.textContent='Sign in';}};
})();
