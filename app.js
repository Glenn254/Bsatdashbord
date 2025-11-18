/* app.js
   Behavior implemented per user spec:
   - greeting auto by time
   - airtime initial 2468, commission 4567 -> +100 on refresh or refresh button click (persisted)
   - view/hide toggle for amounts
   - All & Successful: baseline 347, +20 per 30-min interval since startOfDay (persisted startOfDay), reset at midnight
   - M-Pesa transaction list of 10 items, refresh every 3 minutes and persisted so changes remain between refreshes
*/

(() => {
  // --- helpers ---
  const $ = (sel) => document.querySelector(sel);
  const fmtNum = (n) => n.toLocaleString();

  // default values
  const DEFAULT_AIRTIME = 2468;
  const DEFAULT_COM = 4567;
  const BASE_COUNT = 347;
  const COUNT_INCREMENT = 20; // every 30 minutes
  const INTERVAL_MINUTES = 30;
  const TX_UPDATE_MS = 3 * 60 * 1000; // 3 minutes
  const MPESA_AMOUNTS = [55,20,19,49,99,47,299,699,23,50,21,51,110,249,999];

  // elements
  const greetingText = $('#greetingText');
  const airtimeEl = $('#airtimeAmount');
  const commissionEl = $('#commissionAmount');
  const toggleViewBtn = $('#toggleViewBtn');
  const refreshBtn = $('#refreshBtn');
  const allCountEl = $('#allCount');
  const successCountEl = $('#successCount');
  const transactionsEl = $('#transactions');

  // storage keys
  const LS = {
    airtime: 'dash_airtime',
    commission: 'dash_comm',
    amountsHidden: 'dash_hidden',
    startOfDayKey: 'dash_startOfDay',
    mpesaData: 'dash_mpesa',
    mpesaUpdated: 'dash_mpesa_updated'
  };

  // --- greeting ---
  function updateGreeting() {
    const h = new Date().getHours();
    let text = 'Good evening 🌙,';
    if (h >= 5 && h < 12) text = 'Good morning ☀️,';
    else if (h >= 12 && h < 17) text = 'Good afternoon ☀️,';
    greetingText.textContent = `${text}`;
  }

  // --- airtime & commission management ---
  function loadNumber(key, fallback) {
    const v = localStorage.getItem(key);
    if (v !== null) return parseInt(v,10);
    localStorage.setItem(key, String(fallback));
    return fallback;
  }

  function saveNumber(key, val) {
    localStorage.setItem(key, String(val));
  }

  function incrementOnLoad() {
    // as required: when someone refreshes the page, values change by +100
    // implement: on each load increment by 100 once
    const already = sessionStorage.getItem('dash_incremented_this_session');
    if (already) return;
    sessionStorage.setItem('dash_incremented_this_session', '1');

    let a = loadNumber(LS.airtime, DEFAULT_AIRTIME);
    let c = loadNumber(LS.commission, DEFAULT_COM);
    a += 100;
    c += 100;
    saveNumber(LS.airtime, a);
    saveNumber(LS.commission, c);
  }

  function updateAmountsUI() {
    const airt = loadNumber(LS.airtime, DEFAULT_AIRTIME);
    const comm = loadNumber(LS.commission, DEFAULT_COM);
    const hidden = localStorage.getItem(LS.amountsHidden) === '1';
    airtimeEl.textContent = hidden ? '••••' : fmtNum(airt);
    commissionEl.textContent = hidden ? '••••' : fmtNum(comm);
  }

  // --- view / hide toggle ---
  function toggleView() {
    const cur = localStorage.getItem(LS.amountsHidden) === '1';
    localStorage.setItem(LS.amountsHidden, cur ? '0' : '1');
    updateAmountsUI();
  }

  // --- refresh button behavior (increments by +100 immediately) ---
  function doRefreshIncrement() {
    let a = loadNumber(LS.airtime, DEFAULT_AIRTIME);
    let c = loadNumber(LS.commission, DEFAULT_COM);
    a += 100;
    c += 100;
    saveNumber(LS.airtime, a);
    saveNumber(LS.commission, c);
    updateAmountsUI();
  }

  // --- counts (All & Successful) logic ---
  function getStartOfDay() {
    // ensure there is a stored start-of-day (midnight) anchor. If not or if it's from previous day, set to today's midnight.
    const stored = localStorage.getItem(LS.startOfDayKey);
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (!stored) {
      localStorage.setItem(LS.startOfDayKey, String(todayMidnight));
      return todayMidnight;
    }
    const storedTs = parseInt(stored, 10);
    // if stored not equal to today's midnight => reset to today's midnight
    if (storedTs !== todayMidnight) {
      localStorage.setItem(LS.startOfDayKey, String(todayMidnight));
      return todayMidnight;
    }
    return storedTs;
  }

  function computeCount() {
    const start = getStartOfDay();
    const now = Date.now();
    const mins = Math.floor((now - start) / 60000);
    const intervals = Math.floor(mins / INTERVAL_MINUTES);
    const value = BASE_COUNT + (intervals * COUNT_INCREMENT);
    return value;
  }

  function updateCountsUI() {
    const val = computeCount();
    allCountEl.textContent = fmtNum(val);
    successCountEl.textContent = fmtNum(val);
  }

  // --- MPESA transactions generation & persistence ---
  function randFrom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
  function randChar(){
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return chars.charAt(Math.floor(Math.random()*chars.length));
  }
  function genMpesaCode() {
    // Must start with 'T' and be all uppercase. Make length ~10 (T + 9 chars)
    let s = 'T';
    for (let i=0;i<9;i++) s += randChar();
    return s;
  }
  function genPhonePartial() {
    // starts strictly with +2547 then three digits then ellipsis
    const d1 = Math.floor(100 + Math.random()*900); // 3 digits
    return `+2547${d1}...`;
  }
  function genTxEntry() {
    return {
      code: genMpesaCode(),
      amount: randFrom(MPESA_AMOUNTS),
      phone: genPhonePartial(),
      time: new Date().toLocaleString()
    };
  }

  function loadMpesa() {
    const stored = localStorage.getItem(LS.mpesaData);
    const updated = localStorage.getItem(LS.mpesaUpdated);
    if (stored && updated) {
      return { items: JSON.parse(stored), updatedAt: parseInt(updated,10) };
    }
    return null;
  }

  function saveMpesa(items) {
    localStorage.setItem(LS.mpesaData, JSON.stringify(items));
    localStorage.setItem(LS.mpesaUpdated, String(Date.now()));
  }

  function refreshMpesaIfNeeded(force=false) {
    const existing = loadMpesa();
    const now = Date.now();
    if (!existing || force) {
      const items = [];
      for (let i=0;i<10;i++) items.push(genTxEntry());
      saveMpesa(items);
      renderMpesa(items);
      return;
    }
    // otherwise check time difference
    const elapsed = now - existing.updatedAt;
    if (elapsed >= TX_UPDATE_MS) {
      const items = [];
      for (let i=0;i<10;i++) items.push(genTxEntry());
      saveMpesa(items);
      renderMpesa(items);
    } else {
      renderMpesa(existing.items);
    }
  }

  // --- rendering transactions ---
  function renderMpesa(items) {
    transactionsEl.innerHTML = '';
    items.forEach(it => {
      const div = document.createElement('div');
      div.className = 'tx';
      div.innerHTML = `
        <div class="tx-left">
          <div class="tx-title">${it.code}</div>
          <div class="tx-sub">KSh ${it.amount} • ${it.phone}</div>
        </div>
        <div class="tx-actions">
          <div class="tick">✔</div>
          <button class="icon-btn copy-btn" data-code="${it.code}" title="Copy code">📋</button>
          <div class="arrow">›</div>
        </div>
      `;
      transactionsEl.appendChild(div);
    });

    // attach copy listeners
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = btn.getAttribute('data-code');
        navigator.clipboard?.writeText(code).then(()=> {
          btn.textContent = '✓';
          setTimeout(()=> btn.textContent = '📋', 1200);
        }).catch(()=> {
          // fallback
          alert('Copy: ' + code);
        });
      });
    });
  }

  // --- init ---
  function init() {
    updateGreeting();

    // Airtime / commission initialization and refresh increment on load
    incrementOnLoad();
    updateAmountsUI();

    // counts
    updateCountsUI();

    // mpesa
    refreshMpesaIfNeeded();

    // event listeners
    toggleViewBtn.addEventListener('click', ()=> {
      toggleView();
      // toggle icon visual
      const hidden = localStorage.getItem(LS.amountsHidden) === '1';
      toggleViewBtn.textContent = hidden ? '👁️‍🗨️' : '👁';
    });

    refreshBtn.addEventListener('click', ()=> {
      doRefreshIncrement();
      // also visually update quickly
      updateAmountsUI();
    });

    // periodic checks
    setInterval(()=> {
      updateGreeting();
      updateCountsUI();
    }, 60 * 1000); // every minute

    // mpesa rotate every 3 minutes (also persisted)
    setInterval(()=> {
      refreshMpesaIfNeeded(true);
    }, TX_UPDATE_MS + 500);

    // update amounts UI periodically in case localStorage changed elsewhere
    setInterval(updateAmountsUI, 2000);
  }

  // Run
  document.addEventListener('DOMContentLoaded', init);
})();
