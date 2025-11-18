(() => {
  const $ = (sel) => document.querySelector(sel);
  const fmtNum = (n) => n.toLocaleString();

  const DEFAULT_AIRTIME = 2468;
  const DEFAULT_COM = 4567;
  const BASE_COUNT = 347;
  const COUNT_INCREMENT = 20;
  const INTERVAL_MINUTES = 30;
  const TX_UPDATE_MS = 3*60*1000;
  const MPESA_AMOUNTS = [55,20,19,49,99,47,299,699,23,50,21,51,110,249,999];

  const greetingText = $('#greetingText');
  const airtimeEl = $('#airtimeAmount');
  const commissionEl = $('#commissionAmount');
  const toggleViewBtn = $('#toggleViewBtn');
  const refreshBtn = $('#refreshBtn');
  const allCountEl = $('#allCount');
  const successCountEl = $('#successCount');
  const transactionsEl = $('#transactions');

  const LS = {
    airtime:'dash_airtime',
    commission:'dash_comm',
    amountsHidden:'dash_hidden',
    startOfDayKey:'dash_startOfDay',
    mpesaData:'dash_mpesa',
    mpesaUpdated:'dash_mpesa_updated'
  };

  /* Greeting */
  function updateGreeting(){
    const h=new Date().getHours();
    let text='Good evening 🌙';
    if(h>=5 && h<12) text='Good morning ☀️';
    else if(h>=12 && h<17) text='Good afternoon ☀️';
    greetingText.textContent=text;
  }

  /* Amounts */
  const loadNum=(k,f)=>{const v=localStorage.getItem(k);if(v!==null)return parseInt(v,10);localStorage.setItem(k,String(f));return f;}
  const saveNum=(k,v)=>localStorage.setItem(k,String(v));

  function incrementOnLoad(){
    if(sessionStorage.getItem('dash_incremented_this_session'))return;
    sessionStorage.setItem('dash_incremented_this_session','1');
    let a=loadNum(LS.airtime,DEFAULT_AIRTIME)+100;
    let c=loadNum(LS.commission,DEFAULT_COM)+100;
    saveNum(LS.airtime,a);
    saveNum(LS.commission,c);
  }

  function updateAmountsUI(){
    const airt=loadNum(LS.airtime,DEFAULT_AIRTIME);
    const comm=loadNum(LS.commission,DEFAULT_COM);
    const hidden=localStorage.getItem(LS.amountsHidden)==='1';
    airtimeEl.textContent=hidden?'••••':fmtNum(airt);
    commissionEl.textContent=hidden?'••••':fmtNum(comm);
    toggleViewBtn.textContent=hidden?'👁️‍🗨️':'👁';
  }

  function toggleView(){
    const now=localStorage.getItem(LS.amountsHidden)==='1'?'0':'1';
    localStorage.setItem(LS.amountsHidden,now);
    updateAmountsUI();
  }

  function manualRefresh(){
    let a=loadNum(LS.airtime,DEFAULT_AIRTIME)+100;
    let c=loadNum(LS.commission,DEFAULT_COM)+100;
    saveNum(LS.airtime,a);
    saveNum(LS.commission,c);
    updateAmountsUI();
  }

  /* Counts */
  function getStartOfDay(){
    const now=new Date();
    const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    const stored=localStorage.getItem(LS.startOfDayKey);
    if(!stored||parseInt(stored,10)!==midnight){localStorage.setItem(LS.startOfDayKey,String(midnight));return midnight;}
    return parseInt(stored,10);
  }

  function computeCount(){
    const start=getStartOfDay();
    const mins=Math.floor((Date.now()-start)/60000);
    const intervals=Math.floor(mins/INTERVAL_MINUTES);
    return BASE_COUNT+intervals*COUNT_INCREMENT;
  }

  function updateCountsUI(){
    const v=computeCount();
    allCountEl.textContent=fmtNum(v);
    successCountEl.textContent=fmtNum(v);
  }

  /* MPESA Transactions */
  const randFrom=(arr)=>arr[Math.floor(Math.random()*arr.length)];
  const randChar=()=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random()*36)];
  const genMpesaCode=()=>{let s='T';for(let i=0;i<9;i++)s+=randChar();return s;}
  const genPhonePartial=()=>`+2547${Math.floor(100+Math.random()*900)}...`;
  const genTx=()=>({code:genMpesaCode(),amount:randFrom(MPESA_AMOUNTS),phone:genPhonePartial(),time:new Date().toLocaleString()});
  
  function loadMpesa(){
    const data=localStorage.getItem(LS.mpesaData);
    const updated=localStorage.getItem(LS.mpesaUpdated);
    if(data&&updated)return {items:JSON.parse(data),updatedAt:parseInt(updated,10)};
    return null;
  }
  
  function saveMpesa(items){
    localStorage.setItem(LS.mpesaData,JSON.stringify(items));
    localStorage.setItem(LS.mpesaUpdated,String(Date.now()));
  }

  function refreshMpesa(force=false){
    const existing=loadMpesa();
    const now=Date.now();
    if(!existing||force||(now-existing.updatedAt>=TX_UPDATE_MS)){
      const items=Array.from({length:10},genTx);
      saveMpesa(items);
      renderMpesa(items);
    } else renderMpesa(existing.items);
  }

  function renderMpesa(items){
    transactionsEl.innerHTML='';
    items.forEach(it=>{
      const row=document.createElement('div');
      row.className='tx';
      row.innerHTML=`
        <div class="tx-left">
          <div class="tx-title">${it.code}</div>
          <div class="tx-sub">KSh ${it.amount} • ${it.phone}</div>
        </div>
        <div class="tx-actions">
          <div class="tick">✔</div>
          <button class="icon-btn copy-btn" data-code="${it.code}">📋</button>
          <div class="arrow">›</div>
        </div>`;
      transactionsEl.appendChild(row);
    });
    document.querySelectorAll('.copy-btn').forEach(btn=>{
      btn.onclick=()=>{navigator.clipboard.writeText(btn.dataset.code).then(()=>{btn.textContent='✓';setTimeout(()=>btn.textContent='📋',900);});};
    });
  }

  /* Init */
  function init(){
    updateGreeting();
    incrementOnLoad();
    updateAmountsUI();
    updateCountsUI();
    refreshMpesa();
    toggleViewBtn.onclick=toggleView;
    refreshBtn.onclick=manualRefresh;
    setInterval(updateGreeting,60000);
    setInterval(updateCountsUI,60000);
    setInterval(()=>refreshMpesa(true),TX_UPDATE_MS+500);
    setInterval(updateAmountsUI,2000);
  }

  document.addEventListener('DOMContentLoaded',init);
})();
