// ════════════════════════════════════════════════════════════════
// CONSTANTS & STATE
// ════════════════════════════════════════════════════════════════

// ── DEMO DATA ENGINE ──────────────────────────────────────────────
// This build runs entirely client-side with simulated market data —
// no network calls, no API keys, no live feeds. Every symbol gets a
// deterministic "seed" so the same ticker always produces the same
// numbers within a session, while still feeling realistic (price,
// P/E, 52-week range, RSI, MACD, sentiment, volume, sector, etc).

// Simple deterministic string hash → 32-bit int
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Seeded pseudo-random generator (mulberry32)
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_SECTORS = ['Technology','Banking','FMCG','Pharma','Energy','Auto','Metals','Infrastructure','Realty','Telecom','Finance','Consumer Cyclical'];

// Map known tickers to a plausible sector (falls back to hashed pick)
const SYMBOL_SECTOR_HINTS = {
  TCS:'Technology', INFOSYS:'Technology', INFY:'Technology', WIPRO:'Technology', HCLTECH:'Technology',
  TECHM:'Technology', LTIM:'Technology', MPHASIS:'Technology', PERSISTENT:'Technology', COFORGE:'Technology',
  OFSS:'Technology', LTTS:'Technology', KPITTECH:'Technology',
  HDFCBANK:'Banking', ICICIBANK:'Banking', SBIN:'Banking', KOTAKBANK:'Banking', AXISBANK:'Banking',
  INDUSINDBK:'Banking', PNB:'Banking', BANKBARODA:'Banking', FEDERALBNK:'Banking', RBLBANK:'Banking',
  IDFCFIRSTB:'Banking', BANDHANBNK:'Banking',
  HINDUNILVR:'FMCG', ITC:'FMCG', NESTLEIND:'FMCG', BRITANNIA:'FMCG', DABUR:'FMCG', MARICO:'FMCG',
  TATACONSUM:'FMCG', GODREJCP:'FMCG', UBL:'FMCG', 'MCDOWELL-N':'FMCG',
  SUNPHARMA:'Pharma', DRREDDY:'Pharma', CIPLA:'Pharma', DIVISLAB:'Pharma', LUPIN:'Pharma', BIOCON:'Pharma',
  AUROPHARMA:'Pharma', TORNTPHARM:'Pharma', GLENMARK:'Pharma', IPCALAB:'Pharma', ALKEM:'Pharma',
  ABBOTINDIA:'Pharma', PFIZER:'Pharma', LAURUSLABS:'Pharma', APOLLOHOSP:'Pharma',
  RELIANCE:'Energy', ONGC:'Energy', BPCL:'Energy', COALINDIA:'Energy', NTPC:'Energy', POWERGRID:'Energy',
  TATAPOWER:'Energy', ADANIGREEN:'Energy', ADANITRANS:'Energy', TORNTPOWER:'Energy', CESC:'Energy',
  MARUTI:'Auto', TATAMOTORS:'Auto', 'M&M':'Auto', EICHERMOT:'Auto', 'BAJAJ-AUTO':'Auto', HEROMOTOCO:'Auto',
  HEROMC:'Auto', TVSMOTOR:'Auto', ESCORTS:'Auto', BOSCHLTD:'Auto', MRF:'Auto', BALKRISIND:'Auto', MOTHERSON:'Auto',
  JSWSTEEL:'Metals', TATASTEEL:'Metals', TATASTEELBSL:'Metals', HINDALCO:'Metals', JINDALSTEL:'Metals',
  SAIL:'Metals', NATIONALUM:'Metals', VEDL:'Metals', HINDZINC:'Metals', NMDC:'Metals',
  LT:'Infrastructure', ULTRACEMCO:'Infrastructure', GRASIM:'Infrastructure', SIEMENS:'Infrastructure',
  ABB:'Infrastructure', ADANIPORTS:'Infrastructure', ADANIENT:'Infrastructure', CONCOR:'Infrastructure', MAHLOG:'Infrastructure',
  DLF:'Realty', OBEROIRLTY:'Realty', GODREJPROP:'Realty',
  BHARTIARTL:'Telecom', INDIGO:'Telecom', SPICEJET:'Telecom', ZEEL:'Telecom', PVR:'Telecom', PVRINOX:'Telecom',
  BAJFINANCE:'Finance', BAJAJFINSV:'Finance', SBILIFE:'Finance', HDFCLIFE:'Finance', MUTHOOTFIN:'Finance',
  ICICIGI:'Finance', CHOLAFIN:'Finance', SHRIRAMFIN:'Finance', HDFCAMC:'Finance', 'NAM-INDIA':'Finance',
  IIFL:'Finance', MANAPPURAM:'Finance', SUNDARMFIN:'Finance', LICI:'Finance',
  ASIANPAINT:'Consumer Cyclical', TITAN:'Consumer Cyclical', BERGEPAINT:'Consumer Cyclical', PIDILITIND:'Consumer Cyclical',
  HAVELLS:'Consumer Cyclical', TRENT:'Consumer Cyclical', NAUKRI:'Consumer Cyclical', ZOMATO:'Consumer Cyclical',
  PAYTM:'Consumer Cyclical', NYKAA:'Consumer Cyclical', DMART:'Consumer Cyclical', IRCTC:'Consumer Cyclical',
  HAL:'Infrastructure', BEL:'Infrastructure',
};

// Generate a full, internally-consistent demo dataset for a symbol
function generateDemoStock(sym, name) {
  const rng = makeRng(hashSeed(sym));

  const sector = SYMBOL_SECTOR_HINTS[sym] || DEMO_SECTORS[hashSeed(sym + '#sector') % DEMO_SECTORS.length];

  // Base price: spread across a realistic range (₹50 – ₹6000)
  const priceBand = rng();
  const cmp = parseFloat((priceBand < 0.5
    ? 50 + rng() * 950          // small/mid caps
    : priceBand < 0.85
      ? 1000 + rng() * 2500      // large caps
      : 3500 + rng() * 2500      // premium names
  ).toFixed(2));

  // Day change %
  const chgPct = parseFloat(((rng() - 0.5) * 6).toFixed(2)); // -3% .. +3%

  // 52-week range around CMP
  const hiPad = 0.05 + rng() * 0.35;   // 5–40% above current
  const loPad = 0.05 + rng() * 0.30;   // 5–35% below current
  const wk52hi = parseFloat((cmp * (1 + hiPad)).toFixed(2));
  const wk52lo = parseFloat((cmp * (1 - loPad)).toFixed(2));
  const wk52pct = parseFloat(((wk52hi - cmp) / wk52hi * 100).toFixed(2));

  // P/E ratio (sector-influenced)
  const sectorAvg = SECTOR_AVG_PE[sector] || SECTOR_AVG_PE.default;
  const pe = parseFloat((sectorAvg * (0.5 + rng() * 1.3)).toFixed(1)); // 50%–180% of sector avg

  // Volume (Lakhs) and avg-vol%
  const volumeL = parseFloat((2 + rng() * 60).toFixed(2));
  const avgvolpct = Math.round(60 + rng() * 80); // 60–140%

  // RSI 0-100, weighted toward 35-70
  const rsi = parseFloat((25 + rng() * 55).toFixed(1));

  // MACD bullish flag, weighted slightly toward 50/50 but biased by chgPct
  const macd = rng() < (0.45 + (chgPct > 0 ? 0.15 : -0.05));

  // Sentiment score 0-100, correlated with chgPct + rsi
  const sentiment = Math.max(0, Math.min(100, Math.round(50 + chgPct * 4 + (rsi - 50) * 0.5 + (rng() - 0.5) * 20)));

  return {
    sym, name, sector, cmp, wk52hi, wk52lo, wk52pct, pe,
    volumeL, avgvolpct, rsi, macd, macdR: null, sentiment, chgPct,
    closes: [], volumes: [], loaded: true, error: null
  };
}

// ── fetchStock: used by runScreen — generates demo data with a tiny artificial delay ──
async function fetchStock(w) {
  // Small randomized delay so the UI's loading/skeleton states are visible,
  // mimicking what a real network fetch would feel like.
  await new Promise(res => setTimeout(res, 80 + Math.random() * 220));
  stockData[w.sym] = generateDemoStock(w.sym, w.name);
}

// ── DEMO index values (Nifty 50, Sensex, Bank Nifty, Nifty IT) ──
// Fixed baseline values with a small per-load random drift, purely for display.
const DEMO_INDICES = [
  { id: 'nifty',  base: 24800 },
  { id: 'sensex', base: 81600 },
  { id: 'bank',   base: 52400 },
  { id: 'it',     base: 41200 },
];

// ── fetchIndices: fills the top index bar with demo values ──
async function fetchIndices() {
  const statusEl = document.getElementById('proxy-status');
  if (statusEl) statusEl.textContent = '· loading demo data…';
  await new Promise(res => setTimeout(res, 300));
  DEMO_INDICES.forEach(ix => {
    const el    = document.getElementById(`idx-${ix.id}`);
    const chgEl = document.getElementById(`idx-${ix.id}-chg`);
    if (!el) return;
    const rng = makeRng(hashSeed(ix.id + Date.now().toString().slice(0, 6)));
    const chg = parseFloat(((rng() - 0.45) * 2).toFixed(2)); // mild bias toward green
    const price = ix.base * (1 + chg / 100);
    el.textContent = price.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const col = chg >= 0 ? 'var(--green)' : 'var(--red)';
    chgEl.textContent = `${chg >= 0 ? '▲' : '▼'} ${Math.abs(chg).toFixed(2)}%`;
    chgEl.style.color = col;
  });
  if (statusEl) statusEl.textContent = '· simulated data (demo mode)';
  document.getElementById('last-refresh-time').textContent =
    `Updated ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

// ── fetchYahooChart: kept for portfolio addStock() compatibility — returns demo CMP ──
async function fetchYahooChart(yfSym) {
  const sym = yfSym.replace(/\.(NS|BO)$/i, '');
  const found = NSE_SYMBOLS.find(([s]) => s === sym);
  const name  = found ? found[1] : sym;
  await new Promise(res => setTimeout(res, 80 + Math.random() * 150));
  const demo = generateDemoStock(sym, name);
  return {
    chart: {
      result: [{
        meta: {
          regularMarketPrice: demo.cmp,
          regularMarketChangePercent: demo.chgPct,
        }
      }]
    }
  };
}

let horizon = 'long';
let watchlist = []; // [{sym:'RELIANCE',nseSym:'RELIANCE.NS',name:'Reliance Industries'}]
let stockData = {}; // keyed by sym: fetched + computed data
let manualData = {}; // keyed by sym: {de, fv, future}
let lastResults = [];
let currentFilter = 'all';
let portfolio = [];
let charts = {};
let searchDebounce = null;

// Sector avg P/E used when sector is known
const SECTOR_AVG_PE = {
  Technology:30, 'Information Technology':30, Software:30,
  Finance:18, Banking:18, 'Financial Services':18,
  FMCG:55, 'Consumer Staples':55, 'Consumer Defensive':55,
  Pharma:28, Healthcare:28, Pharmaceutical:28,
  Energy:15, Oil:15, 'Basic Materials':15,
  Auto:22, Automobile:22, Automotive:22,
  Metals:12, Infrastructure:18, Realty:25, Telecom:20,
  default:25
};

// ── PARAMS ──
const PARAMS = [
  {id:'pe',        label:'P/E < sector average',          desc:'Simulated P/E vs sector avg (demo data)',         required:true,  enabled:true,  lw:1.4,sw:0.8,
    tooltip:'Price-to-Earnings ratio: share price divided by earnings per share. Shows how much investors pay per ₹1 of profit. A P/E below the sector average can suggest the stock is relatively undervalued vs its peers.'},
  {id:'de',        label:'D/E ratio < threshold',          desc:'Manual input required (Parameters tab)',          required:true,  enabled:true,  lw:1.4,sw:0.7,
    tooltip:'Debt-to-Equity ratio: total debt divided by shareholder equity. Measures financial leverage — a lower D/E generally means the company relies less on borrowed money and carries less financial risk.'},
  {id:'fv',        label:'Face value ≤ threshold',         desc:'Manual input required (Parameters tab)',          required:false, enabled:true,  lw:0.9,sw:0.5,
    tooltip:'Face value (or par value) is the nominal price of a share set by the company when issued (e.g. ₹1, ₹2, ₹5, ₹10). It\'s used for accounting/dividend calculations and differs from the market price.'},
  {id:'future',    label:'Future projects / pipeline',     desc:'Manual score 0–100 (Parameters tab)',            required:false, enabled:true,  lw:1.6,sw:0.4,
    tooltip:'A qualitative 0–100 score reflecting the strength of a company\'s upcoming projects, expansion plans, order book, or growth pipeline — entered manually based on your own research.'},
  {id:'rsi',       label:'RSI in healthy zone',            desc:'Computed from simulated price data (demo)',       required:false, enabled:true,  lw:0.7,sw:1.6,
    tooltip:'Relative Strength Index: a momentum indicator from 0–100 based on recent price changes. Above 70 typically signals "overbought," below 30 signals "oversold." A mid-range RSI (roughly 40–60) is often considered healthy.'},
  {id:'macd',      label:'MACD bullish crossover',         desc:'12/26/9 EMA computed from simulated data',        required:false, enabled:true,  lw:0.6,sw:1.7,
    tooltip:'Moving Average Convergence Divergence: a trend-following indicator comparing fast (12-day) and slow (26-day) moving averages. When the MACD line crosses above its signal line, it\'s considered a bullish (buy-leaning) signal.'},
  {id:'volume',    label:'Avg daily volume',               desc:'Simulated volume (demo data)',                   required:false, enabled:true,  lw:0.8,sw:1.4,
    tooltip:'The number of shares traded in a day (shown here in Lakhs, i.e. 1L = 100,000 shares). Higher volume generally means better liquidity — easier to buy/sell without moving the price much.'},
  {id:'sentiment', label:'Sentiment score',                desc:'1-month price momentum proxy (demo data)',        required:false, enabled:true,  lw:1.0,sw:1.0,
    tooltip:'A 0–100 score approximating market mood toward the stock, based on recent price momentum. Higher scores suggest more positive recent momentum/sentiment, lower scores suggest negative momentum.'},
  {id:'wk52',      label:'52-week high proximity',         desc:'Simulated 52W high (demo data)',                 required:false, enabled:true,  lw:0.9,sw:1.3,
    tooltip:'How far the current price is below its 52-week high. A small gap means the stock is trading near its yearly peak (often a sign of strength); a large gap means it\'s well off its highs.'},
  {id:'avgvol',    label:'Avg volume vs 3M baseline',      desc:'Current vs 3-month avg volume (demo data)',       required:false, enabled:true,  lw:0.7,sw:1.5,
    tooltip:'Today\'s trading volume as a percentage of the average daily volume over the past 3 months. Values above 100% indicate unusually high trading activity, which can signal news, breakouts, or increased interest.'},
];

// ── NSE SYMBOL DATABASE (Nifty 50 + 100 + sector indices) ──
// Format: [displaySym, fullName, yahooSuffix (.NS or .BO)]
const NSE_SYMBOLS = [
  // Nifty 50
  ['RELIANCE','Reliance Industries','.NS'],['TCS','Tata Consultancy Services','.NS'],
  ['HDFCBANK','HDFC Bank','.NS'],['BHARTIARTL','Bharti Airtel','.NS'],['ICICIBANK','ICICI Bank','.NS'],
  ['INFOSYS','Infosys','.NS'],['INFY','Infosys','.NS'],['SBIN','State Bank of India','.NS'],
  ['LICI','LIC India','.NS'],['HINDUNILVR','Hindustan Unilever','.NS'],
  ['ITC','ITC Limited','.NS'],['KOTAKBANK','Kotak Mahindra Bank','.NS'],
  ['LT','Larsen & Toubro','.NS'],['BAJFINANCE','Bajaj Finance','.NS'],
  ['HCLTECH','HCL Technologies','.NS'],['MARUTI','Maruti Suzuki','.NS'],
  ['SUNPHARMA','Sun Pharmaceutical','.NS'],['ADANIENT','Adani Enterprises','.NS'],
  ['ADANIPORTS','Adani Ports','.NS'],['TITAN','Titan Company','.NS'],
  ['ULTRACEMCO','UltraTech Cement','.NS'],['WIPRO','Wipro','.NS'],
  ['ASIANPAINT','Asian Paints','.NS'],['NTPC','NTPC Limited','.NS'],
  ['POWERGRID','Power Grid Corporation','.NS'],['M&M','Mahindra & Mahindra','.NS'],
  ['NESTLEIND','Nestle India','.NS'],['JSWSTEEL','JSW Steel','.NS'],
  ['TATAMOTORS','Tata Motors','.NS'],['TATACONSUM','Tata Consumer Products','.NS'],
  ['COALINDIA','Coal India','.NS'],['BAJAJFINSV','Bajaj Finserv','.NS'],
  ['ONGC','ONGC','.NS'],['AXISBANK','Axis Bank','.NS'],
  ['DRREDDY','Dr. Reddy\'s Laboratories','.NS'],['CIPLA','Cipla','.NS'],
  ['HINDALCO','Hindalco Industries','.NS'],['INDUSINDBK','IndusInd Bank','.NS'],
  ['EICHERMOT','Eicher Motors','.NS'],['BPCL','BPCL','.NS'],
  ['GRASIM','Grasim Industries','.NS'],['TECHM','Tech Mahindra','.NS'],
  ['TATASTEELBSL','Tata Steel','.NS'],['TATASTEEL','Tata Steel','.NS'],
  ['SBILIFE','SBI Life Insurance','.NS'],['HDFCLIFE','HDFC Life Insurance','.NS'],
  ['APOLLOHOSP','Apollo Hospitals','.NS'],['BRITANNIA','Britannia Industries','.NS'],
  ['DIVISLAB','Divi\'s Laboratories','.NS'],['BAJAJ-AUTO','Bajaj Auto','.NS'],
  // Nifty Next 50 / 100
  ['PIDILITIND','Pidilite Industries','.NS'],['SIEMENS','Siemens India','.NS'],
  ['HAVELLS','Havells India','.NS'],['DABUR','Dabur India','.NS'],
  ['MARICO','Marico','.NS'],['BERGEPAINT','Berger Paints','.NS'],
  ['GODREJCP','Godrej Consumer Products','.NS'],['MUTHOOTFIN','Muthoot Finance','.NS'],
  ['TORNTPHARM','Torrent Pharmaceuticals','.NS'],['LUPIN','Lupin','.NS'],
  ['BIOCON','Biocon','.NS'],['AUROPHARMA','Aurobindo Pharma','.NS'],
  ['DLF','DLF Limited','.NS'],['OBEROIRLTY','Oberoi Realty','.NS'],
  ['GODREJPROP','Godrej Properties','.NS'],['MCDOWELL-N','United Spirits','.NS'],
  ['UBL','United Breweries','.NS'],['TRENT','Trent','.NS'],
  ['NAUKRI','Info Edge (Naukri)','.NS'],['ZOMATO','Zomato','.NS'],
  ['PAYTM','Paytm (One97)','.NS'],['NYKAA','FSN E-Commerce (Nykaa)','.NS'],
  ['DMART','Avenue Supermarts','.NS'],['IRCTC','IRCTC','.NS'],
  ['HAL','Hindustan Aeronautics','.NS'],['BEL','Bharat Electronics','.NS'],
  ['MOTHERSON','Samvardhana Motherson','.NS'],['BALKRISIND','Balkrishna Industries','.NS'],
  ['MRF','MRF','.NS'],['BOSCHLTD','Bosch India','.NS'],
  ['ABB','ABB India','.NS'],['HEROMC','Hero MotoCorp','.NS'],
  ['HEROMOTOCO','Hero MotoCorp','.NS'],['ESCORTS','Escorts Kubota','.NS'],
  ['TVSMOTOR','TVS Motor Company','.NS'],['PNB','Punjab National Bank','.NS'],
  ['BANKBARODA','Bank of Baroda','.NS'],['CANBK','Canara Bank','.NS'],
  ['FEDERALBNK','Federal Bank','.NS'],['RBLBANK','RBL Bank','.NS'],
  ['IDFCFIRSTB','IDFC First Bank','.NS'],['BANDHANBNK','Bandhan Bank','.NS'],
  ['LTIM','LTIMindtree','.NS'],['MPHASIS','Mphasis','.NS'],
  ['PERSISTENT','Persistent Systems','.NS'],['COFORGE','Coforge','.NS'],
  ['OFSS','Oracle Financial Services','.NS'],['LTTS','L&T Technology Services','.NS'],
  ['KPITTECH','KPIT Technologies','.NS'],['TATAPOWER','Tata Power','.NS'],
  ['ADANIGREEN','Adani Green Energy','.NS'],['ADANITRANS','Adani Transmission','.NS'],
  ['CESC','CESC Limited','.NS'],['TORNTPOWER','Torrent Power','.NS'],
  ['JINDALSTEL','Jindal Steel & Power','.NS'],['SAIL','SAIL','.NS'],
  ['NATIONALUM','National Aluminium','.NS'],['VEDL','Vedanta','.NS'],
  ['HINDZINC','Hindustan Zinc','.NS'],['NMDC','NMDC','.NS'],
  ['GLENMARK','Glenmark Pharmaceuticals','.NS'],['IPCALAB','IPCA Laboratories','.NS'],
  ['ALKEM','Alkem Laboratories','.NS'],['ABBOTINDIA','Abbott India','.NS'],
  ['PFIZER','Pfizer India','.NS'],['LAURUSLABS','Laurus Labs','.NS'],
  ['ICICIGI','ICICI Lombard','.NS'],['CHOLAFIN','Cholamandalam Investment','.NS'],
  ['SHRIRAMFIN','Shriram Finance','.NS'],['HDFCAMC','HDFC AMC','.NS'],
  ['NAM-INDIA','Nippon India Mutual Fund','.NS'],['IIFL','IIFL Finance','.NS'],
  ['MANAPPURAM','Manappuram Finance','.NS'],['SUNDARMFIN','Sundaram Finance','.NS'],
  ['INDIGO','IndiGo (InterGlobe Aviation)','.NS'],['SPICEJET','SpiceJet','.NS'],
  ['CONCOR','Container Corporation','.NS'],['MAHLOG','Mahindra Logistics','.NS'],
  ['ZEEL','Zee Entertainment','.NS'],['PVR','PVR Inox','.NS'],
  ['PVRINOX','PVR Inox','.NS'],
];

// Preset indices (NSE symbols)
const PRESETS = {
  nifty50: ['RELIANCE','TCS','HDFCBANK','BHARTIARTL','ICICIBANK','INFOSYS','SBIN','HINDUNILVR','ITC','KOTAKBANK','LT','BAJFINANCE','HCLTECH','MARUTI','SUNPHARMA','ADANIENT','ADANIPORTS','TITAN','ULTRACEMCO','WIPRO','ASIANPAINT','NTPC','POWERGRID','NESTLEIND','JSWSTEEL','TATAMOTORS','COALINDIA','BAJAJFINSV','ONGC','AXISBANK','DRREDDY','CIPLA','HINDALCO','INDUSINDBK','EICHERMOT','BPCL','GRASIM','TECHM','TATASTEEL','SBILIFE','HDFCLIFE','APOLLOHOSP','BRITANNIA','DIVISLAB','BAJAJ-AUTO'],
  nifty100: ['RELIANCE','TCS','HDFCBANK','BHARTIARTL','ICICIBANK','INFOSYS','SBIN','HINDUNILVR','ITC','KOTAKBANK','LT','BAJFINANCE','HCLTECH','MARUTI','SUNPHARMA','TITAN','WIPRO','NTPC','NESTLEIND','JSWSTEEL','TATAMOTORS','AXISBANK','DRREDDY','CIPLA','TECHM','TATASTEEL','APOLLOHOSP','BRITANNIA','DIVISLAB','PIDILITIND','SIEMENS','HAVELLS','DABUR','MARICO','MUTHOOTFIN','TORNTPHARM','LUPIN','DLF','ZOMATO','DMART','IRCTC','HAL','BEL','TVSMOTOR','PNB','BANKBARODA','LTIM','MPHASIS','PERSISTENT','TATAPOWER'],
  niftyIT: ['TCS','INFOSYS','HCLTECH','WIPRO','TECHM','LTIM','MPHASIS','PERSISTENT','COFORGE','OFSS','LTTS','KPITTECH'],
  niftyBank: ['HDFCBANK','ICICIBANK','SBIN','KOTAKBANK','AXISBANK','INDUSINDBK','PNB','BANKBARODA','FEDERALBNK','IDFCFIRSTB','BANDHANBNK','RBLBANK'],
  niftyPharma: ['SUNPHARMA','DRREDDY','CIPLA','DIVISLAB','LUPIN','BIOCON','AUROPHARMA','TORNTPHARM','GLENMARK','IPCALAB','ALKEM','LAURUSLABS'],
};

// ════════════════════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id === 'p1' ? 'tab-p1' : 'tab-p2').classList.add('active');
}
function navToScreener() {
  if (document.getElementById('p2').classList.contains('active')) {
    const bad = PARAMS.filter(p => p.required && !p.enabled);
    if (bad.length) {
      document.getElementById('modal-params-list').innerHTML = bad.map(p => `<span style="color:var(--red);font-weight:600">⚠ ${p.label}</span>`).join('<br>');
      document.getElementById('req-modal').classList.add('show');
      return;
    }
  }
  showPage('p1');
}
function tryShowPage2() { showPage('p2'); }

function setHorizon(h) {
  horizon = h;
  document.getElementById('ht-long').classList.toggle('active', h==='long');
  document.getElementById('ht-short').classList.toggle('active', h==='short');
  runScreen();
}

// ════════════════════════════════════════════════════════════════
// SEARCH & AUTOCOMPLETE
// ════════════════════════════════════════════════════════════════
function onSearchInput(val) {
  clearTimeout(searchDebounce);
  if (!val.trim()) { closeAutocomplete(); return; }
  searchDebounce = setTimeout(() => showAutocomplete(val.trim().toUpperCase()), 180);
}
function showAutocomplete(q) {
  const matches = NSE_SYMBOLS.filter(([sym,,name]) =>
    sym.startsWith(q) || (typeof name === 'string' && name.toUpperCase().includes(q))
  ).slice(0,10);
  // NSE_SYMBOLS is [sym, name, suffix]
  const matchesProperly = NSE_SYMBOLS.filter(([sym,name]) =>
    sym.startsWith(q) || name.toUpperCase().includes(q)
  ).slice(0,10);

  const dd = document.getElementById('autocomplete');
  if (!matchesProperly.length) { dd.style.display='none'; return; }
  dd.innerHTML = matchesProperly.map(([sym,name]) =>
    `<div class="autocomplete-item" onclick="addToWatchlist('${sym}','${name.replace(/'/g,"\\'")}')">
      <span class="sym">${sym}</span><span class="nm">${name}</span>
    </div>`
  ).join('');
  dd.style.display = 'block';
}
function onSearchKey(e) {
  if (e.key === 'Enter') {
    const v = document.getElementById('stock-search').value.trim().toUpperCase();
    if (v) addToWatchlist(v, v);
    closeAutocomplete();
  }
  if (e.key === 'Escape') closeAutocomplete();
}
function closeAutocomplete() {
  document.getElementById('autocomplete').style.display = 'none';
}
document.addEventListener('click', e => {
  if (!e.target.closest('.search-box-wrap')) closeAutocomplete();
});

// ════════════════════════════════════════════════════════════════
// WATCHLIST
// ════════════════════════════════════════════════════════════════
function addToWatchlist(sym, name) {
  sym = sym.toUpperCase();
  if (watchlist.find(w => w.sym === sym)) { closeAutocomplete(); return; }
  // Find yahoo suffix
  const found = NSE_SYMBOLS.find(([s]) => s === sym);
  const suffix = found ? found[2] : '.NS';
  const displayName = found ? found[1] : name;
  watchlist.push({ sym, name: displayName, yfSym: sym + suffix });
  document.getElementById('stock-search').value = '';
  closeAutocomplete();
  renderWatchlistChips();
  renderManualFundamentals();
  document.getElementById('m-total').textContent = watchlist.length;
}
function removeFromWatchlist(sym) {
  watchlist = watchlist.filter(w => w.sym !== sym);
  delete stockData[sym];
  renderWatchlistChips();
  renderManualFundamentals();
  document.getElementById('m-total').textContent = watchlist.length;
  runScreen();
}
function clearWatchlist() {
  watchlist = []; stockData = {};
  renderWatchlistChips();
  renderManualFundamentals();
  document.getElementById('m-total').textContent = 0;
  document.getElementById('stock-list').innerHTML = '<div class="empty"><p>Watchlist cleared</p></div>';
  updateMetrics([]);
}
function loadPreset(key) {
  const syms = PRESETS[key] || [];
  syms.forEach(sym => {
    if (!watchlist.find(w => w.sym === sym)) {
      const found = NSE_SYMBOLS.find(([s]) => s === sym);
      const suffix = found ? found[2] : '.NS';
      const name = found ? found[1] : sym;
      watchlist.push({ sym, name, yfSym: sym + suffix });
    }
  });
  renderWatchlistChips();
  renderManualFundamentals();
  document.getElementById('m-total').textContent = watchlist.length;
}
function renderWatchlistChips() {
  const el = document.getElementById('watchlist-chips');
  if (!watchlist.length) { el.innerHTML = '<span style="font-size:12px;color:var(--text3)">No stocks added yet</span>'; return; }
  el.innerHTML = watchlist.map(w => `
    <span class="watchlist-chip">
      ${w.sym}
      <span class="rm" onclick="event.stopPropagation();removeFromWatchlist('${w.sym}')">✕</span>
    </span>`
  ).join('');
}

// ════════════════════════════════════════════════════════════════
// MANUAL FUNDAMENTALS
// ════════════════════════════════════════════════════════════════
function renderManualFundamentals() {
  const el = document.getElementById('manual-fundamentals-list');
  if (!watchlist.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text3)">Add stocks to watchlist first.</div>'; return; }
  el.innerHTML = watchlist.map(w => {
    const m = manualData[w.sym] || {};
    return `<div style="margin-bottom:10px;padding:10px;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border)">
      <div style="font-size:12px;font-weight:700;font-family:monospace;color:var(--accent);margin-bottom:6px">${w.sym} <span style="font-size:10px;font-weight:400;color:var(--text3)">${w.name}</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px">
        <div><label class="field-label">D/E ratio</label><input type="number" step="0.01" value="${m.de||''}" placeholder="e.g. 0.3" oninput="updateManual('${w.sym}','de',this.value)" style="font-size:12px;padding:5px 8px"></div>
        <div><label class="field-label">Face value (₹)</label><input type="number" value="${m.fv||''}" placeholder="e.g. 5" oninput="updateManual('${w.sym}','fv',this.value)" style="font-size:12px;padding:5px 8px"></div>
        <div><label class="field-label">Future score (0–100)</label><input type="number" value="${m.future||''}" placeholder="e.g. 75" oninput="updateManual('${w.sym}','future',this.value)" style="font-size:12px;padding:5px 8px"></div>
      </div>
    </div>`;
  }).join('');
}
function updateManual(sym, field, val) {
  if (!manualData[sym]) manualData[sym] = {};
  manualData[sym][field] = parseFloat(val) || null;
  runScreen();
}

// ════════════════════════════════════════════════════════════════
// DATA FETCHING  (demo data generator — see constants section above)
// ════════════════════════════════════════════════════════════════

// RSI (14-day Wilder's)
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
}

// EMA
function calcEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data[0];
  const emas = [ema];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    emas.push(ema);
  }
  return emas;
}

// MACD bullish crossover (last bar)
function calcMACD(closes) {
  if (closes.length < 27) return null;
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]).slice(25);
  const signal = calcEMA(macdLine, 9);
  const idx = macdLine.length - 1;
  if (idx < 1) return null;
  const bullish = macdLine[idx] > signal[idx] && macdLine[idx - 1] <= signal[idx - 1];
  const aboveSignal = macdLine[idx] > signal[idx];
  return { bullish, aboveSignal, macdVal: macdLine[idx], signalVal: signal[idx] };
}

// Sentiment: 1-month vs 3-month price change
function calcSentiment(closes) {
  if (closes.length < 20) return 50;
  const c = closes[closes.length - 1];
  const m1 = closes[Math.max(0, closes.length - 21)];
  const m3 = closes[0];
  const ret1m = (c - m1) / m1 * 100;
  const ret3m = (c - m3) / m3 * 100;
  // Map: +10% 1m → 80 score; -10% → 20 score
  const score = 50 + ret1m * 2.5 + ret3m * 0.5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Parse Yahoo chart response
function parseChartData(json, sym, name) {
  const res = json?.chart?.result?.[0];
  if (!res) throw new Error('No chart result');
  const meta   = res.meta || {};
  const quotes = res.indicators?.quote?.[0] || {};
  const closes = (res.timestamp || []).map((t, i) => quotes.close?.[i]).filter(v => v != null);
  const volumes = (res.timestamp || []).map((t, i) => quotes.volume?.[i]).filter(v => v != null);

  const cmp       = meta.regularMarketPrice || closes[closes.length - 1] || 0;
  const wk52hi    = meta.fiftyTwoWeekHigh || 0;
  const wk52lo    = meta.fiftyTwoWeekLow  || 0;
  const wk52pct   = wk52hi > 0 ? parseFloat(((wk52hi - cmp) / wk52hi * 100).toFixed(2)) : 0;
  const pe        = meta.trailingPE || null;
  const sector    = meta.sector || '';
  const longName  = meta.longName || name;
  const chgPct    = meta.regularMarketChangePercent || 0;

  // Volume
  const avgVol3M  = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;
  const curVol    = volumes[volumes.length - 1] || 0;
  const avgvolpct = avgVol3M > 0 ? Math.round((curVol / avgVol3M) * 100) : 100;
  const volumeL   = parseFloat((curVol / 100000).toFixed(2)); // in Lakhs

  // Technicals
  const rsi    = calcRSI(closes);
  const macdR  = calcMACD(closes);
  const macd   = macdR ? macdR.aboveSignal : false;
  const sentiment = calcSentiment(closes);

  return { sym, name: longName, sector, cmp, wk52hi, wk52lo, wk52pct, pe,
           volumeL, avgvolpct, rsi: rsi || 50, macd, macdR, sentiment,
           chgPct, closes, volumes };
}

// fetchStock defined in constants block above

// ── fetchStock is defined in constants block above ──

// ════════════════════════════════════════════════════════════════
// SCREENER LOGIC
// ════════════════════════════════════════════════════════════════
function getThresholds() {
  return {
    peOffset: parseFloat(document.getElementById('th-pe').value)     || 0,
    de:       parseFloat(document.getElementById('th-de').value)     || 0.5,
    rsiL:     parseFloat(document.getElementById('th-rsi-l').value)  || 30,
    rsiH:     parseFloat(document.getElementById('th-rsi-h').value)  || 70,
    sent:     parseFloat(document.getElementById('th-sent').value)   || 50,
    vol:      parseFloat(document.getElementById('th-vol').value)    || 2,
    wk52:     parseFloat(document.getElementById('th-wk52').value)   || 20,
    avgvol:   parseFloat(document.getElementById('th-avgvol').value) || 80,
    future:   parseFloat(document.getElementById('th-future').value) || 60,
    fv:       parseFloat(document.getElementById('th-fv').value)     || 10,
  };
}

function getSectorAvgPE(sector) {
  if (!sector) return 25;
  for (const [key, val] of Object.entries(SECTOR_AVG_PE)) {
    if (sector.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return SECTOR_AVG_PE.default;
}

function checkStock(d, th) {
  const m = manualData[d.sym] || {};
  const sAvgPE = getSectorAvgPE(d.sector);
  const maxPE  = sAvgPE + th.peOffset;
  const de     = m.de    != null ? m.de    : 999;
  const fv     = m.fv    != null ? m.fv    : 5;   // default 5 if not entered
  const future = m.future != null ? m.future : 65; // default 65
  const pe     = d.pe != null ? d.pe : 999;
  return {
    pe:        pe < maxPE,
    de:        de < th.de,
    fv:        fv <= th.fv,
    future:    future >= th.future,
    rsi:       d.rsi != null && d.rsi >= th.rsiL && d.rsi <= th.rsiH,
    macd:      !!d.macd,
    volume:    (d.volumeL || 0) >= th.vol,
    sentiment: (d.sentiment || 0) >= th.sent,
    wk52:      (d.wk52pct || 0) <= th.wk52,
    avgvol:    (d.avgvolpct || 100) >= th.avgvol,
  };
}

function scoreStock(d, th) {
  const checks = checkStock(d, th);
  let score = 0, total = 0;
  PARAMS.forEach(p => {
    if (!p.enabled) return;
    const w = 10 * (horizon === 'long' ? p.lw : p.sw);
    total += w;
    if (checks[p.id]) score += w;
  });
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  let passesReq = true;
  PARAMS.forEach(p => { if (p.required && p.enabled && !checks[p.id]) passesReq = false; });
  return { score: pct, passes: passesReq, checks };
}

async function runScreen() {
  if (!watchlist.length) {
    document.getElementById('stock-list').innerHTML = '<div class="empty"><p>Add stocks to your watchlist first</p></div>';
    updateMetrics([]);
    return;
  }

  // Show loading state
  document.getElementById('run-btn').disabled = true;
  document.getElementById('run-btn').textContent = 'Generating demo data…';
  document.getElementById('stock-list').innerHTML = watchlist.map(w =>
    `<div class="stock-row" style="pointer-events:none">
      <div><div class="stock-ticker">${w.sym}</div><div class="stock-name">${w.name}</div></div>
      <div class="score-wrap"><div class="skeleton" style="width:${40+Math.random()*50}%"></div><div class="skeleton" style="width:30%;margin-top:4px"></div></div>
      <div><span class="fetching-spinner"></span></div>
    </div>`
  ).join('');

  // Generate demo data one stock at a time (sequential) so the UI shows progressive loading
  for (let i = 0; i < watchlist.length; i++) {
    const w = watchlist[i];
    document.getElementById('run-btn').textContent = `Fetching ${w.sym} (${i+1}/${watchlist.length})…`;
    await fetchStock(w);
  }

  document.getElementById('run-btn').disabled = false;
  document.getElementById('run-btn').textContent = '▶ Fetch & Run Screen';

  // Score
  const th = getThresholds();
  lastResults = watchlist.map(w => {
    const d = stockData[w.sym];
    if (!d || !d.loaded) return { sym: w.sym, name: w.name, loaded: false, error: d?.error, score: 0, passes: false, checks: {} };
    return { ...d, ...scoreStock(d, th) };
  });
  lastResults.sort((a, b) => b.score - a.score);

  updateMetrics(lastResults.filter(s => s.loaded));
  renderStockList(applyFilter(lastResults));
  renderSectorLeaders(lastResults.filter(s => s.loaded));
  document.getElementById('m-fetched').textContent = lastResults.filter(s => s.loaded).length;

  // Reset the AI report so it reflects fresh results when regenerated
  const reportBody = document.getElementById('ai-report-body');
  const reportBtn = document.getElementById('ai-report-btn');
  if (reportBody && reportBtn) {
    reportBtn.textContent = 'Generate report';
    reportBody.innerHTML = `<div class="ai-report-empty"><p style="font-size:12px">Click <b style="color:var(--text2)">"Generate report"</b> for an AI-style summary of these ${lastResults.filter(s=>s.loaded).length} results.</p></div>`;
  }
}

function updateMetrics(loaded) {
  const passed = loaded.filter(s => s.passes);
  const avg = passed.length ? Math.round(passed.reduce((a, b) => a + b.score, 0) / passed.length) : 0;
  document.getElementById('m-passed').textContent = passed.length || '—';
  document.getElementById('m-avg').textContent = avg || '—';
  document.getElementById('m-params').textContent = PARAMS.filter(p => p.enabled).length;
}

function applyFilter(list) {
  if (currentFilter === 'passed') return list.filter(s => s.passes && s.loaded);
  if (currentFilter === 'strong') return list.filter(s => s.score >= 75 && s.loaded);
  if (currentFilter === 'consider') return list.filter(s => s.score >= 55 && s.loaded);
  return list;
}
function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderStockList(applyFilter(lastResults));
}

function scoreColor(s) {
  if (s >= 75) return 'var(--green)';
  if (s >= 55) return 'var(--accent)';
  if (s >= 35) return 'var(--amber)';
  return 'var(--red)';
}
function scoreTag(s) {
  if (s >= 75) return ['Strong buy', 'badge-green'];
  if (s >= 55) return ['Consider',   'badge-blue'];
  if (s >= 35) return ['Watchlist',  'badge-amber'];
  return ['Avoid', 'badge-red'];
}
const labelMap = {pe:'P/E',de:'D/E',fv:'FV',future:'Pipeline',rsi:'RSI',macd:'MACD',volume:'Vol',sentiment:'Sent',wk52:'52W',avgvol:'AvgVol'};

function renderStockList(list) {
  const el = document.getElementById('stock-list');
  document.getElementById('result-count').textContent = list.length ? `· ${list.length} stock${list.length!==1?'s':''}` : '';
  if (!list.length) {
    el.innerHTML = '<div class="empty"><p>No stocks match this filter</p></div>';
    return;
  }
  el.innerHTML = list.map((s, idx) => {
    if (!s.loaded) return `
      <div class="stock-row" style="opacity:0.5;pointer-events:none">
        <div><div class="stock-ticker">${s.sym}</div><div class="stock-name" style="color:var(--red)">Error: ${(s.error||'').slice(0,30)}</div></div>
        <div style="font-size:11px;color:var(--red);flex:1">Could not load data</div>
      </div>`;
    const col = scoreColor(s.score);
    const [tag, cls] = scoreTag(s.score);
    const passedKeys = Object.entries(s.checks).filter(([,v])=>v).map(([k])=>k);
    const failedKeys = Object.entries(s.checks).filter(([,v])=>!v).map(([k])=>k);
    const dimmed = !s.passes ? 'opacity:0.45;' : '';
    const chgCol = (s.chgPct||0) >= 0 ? 'var(--green)' : 'var(--red)';
    return `
      <div class="stock-row" style="${dimmed}" onclick="showDetail(${idx})">
        <div style="min-width:70px">
          <div class="stock-ticker">${s.sym}</div>
          <div class="stock-name">${s.name}</div>
          ${s.cmp ? `<div style="font-size:10px;color:${chgCol}">${(s.chgPct>=0?'▲':'▼')}${Math.abs(s.chgPct||0).toFixed(2)}%</div>` : ''}
          ${!s.passes ? '<div style="font-size:9px;color:var(--red);font-weight:600">REQ FAIL</div>' : ''}
        </div>
        <div class="score-wrap">
          <div style="font-size:11px;color:var(--text2);margin-bottom:3px">₹${s.cmp?.toLocaleString('en-IN',{maximumFractionDigits:2}) || '—'}</div>
          <div class="score-track"><div class="score-fill" style="width:${s.score}%;background:${col}"></div></div>
          <div class="score-checks">
            ${passedKeys.slice(0,4).map(k=>`<span class="chk">${labelMap[k]||k}</span>`).join('')}
            ${failedKeys.slice(0,3).map(k=>`<span class="chk chk-fail">${labelMap[k]||k}</span>`).join('')}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="score-chip" style="color:${col}">${s.score}</div>
          <span class="badge ${cls}" style="margin-top:3px;display:inline-block">${tag}</span>
        </div>
      </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════════════
// DETAIL PANEL
// ════════════════════════════════════════════════════════════════
function showDetail(idx) {
  const s = applyFilter(lastResults)[idx];
  if (!s || !s.loaded) return;
  const th = getThresholds();
  const m = manualData[s.sym] || {};
  const col = scoreColor(s.score);
  const [tag, cls] = scoreTag(s.score);
  const sAvgPE = getSectorAvgPE(s.sector);

  const rows = [
    { l:'Current Price (CMP)', v:`₹${s.cmp?.toLocaleString('en-IN',{maximumFractionDigits:2})||'—'}`, p:undefined },
    { l:'Day change', v:`${(s.chgPct>=0?'▲':'▼')}${Math.abs(s.chgPct||0).toFixed(2)}%`, col:(s.chgPct||0)>=0?'var(--green)':'var(--red)', p:undefined },
    { l:`P/E ratio (sector avg: ${sAvgPE})`, v: s.pe != null ? s.pe.toFixed(1) : 'N/A', p: s.checks.pe },
    { l:'D/E ratio', v: m.de != null ? m.de : 'Not set (manual)', p: s.checks.de },
    { l:'Face value (₹)', v: m.fv != null ? '₹'+m.fv : 'Not set (manual)', p: s.checks.fv },
    { l:'Future/Pipeline score', v: m.future != null ? m.future+'/100' : 'Not set (manual)', p: s.checks.future },
    { l:'RSI (14-day)', v: s.rsi != null ? s.rsi.toFixed(1) : 'N/A', p: s.checks.rsi },
    { l:'MACD signal', v: s.macd ? '✓ Above signal (bullish)' : '✕ Below signal (bearish)', p: s.checks.macd },
    { l:'Daily volume', v: s.volumeL ? s.volumeL.toFixed(2)+'L' : 'N/A', p: s.checks.volume },
    { l:'Sentiment (momentum proxy)', v: s.sentiment != null ? s.sentiment+'/100' : 'N/A', p: s.checks.sentiment },
    { l:'52W high proximity', v: s.wk52hi ? `₹${s.wk52hi.toLocaleString('en-IN')} (${s.wk52pct}% below)` : 'N/A', p: s.checks.wk52 },
    { l:'Vol vs 3M avg', v: s.avgvolpct != null ? s.avgvolpct+'%' : 'N/A', p: s.checks.avgvol },
  ];

  document.getElementById('detail-content').innerHTML = `
    <div style="margin-bottom:14px">
      <button class="detail-close" onclick="closeDetail()">✕</button>
      <div style="font-size:11px;color:var(--text3)">${s.sector || 'NSE'}</div>
      <div style="font-size:18px;font-weight:800;font-family:monospace;margin-top:2px">${s.sym}</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:10px">${s.name}</div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:34px;font-weight:800;color:${col}">${s.score}</div>
        <div>
          <span class="badge ${cls}" style="display:block;margin-bottom:4px">${tag}</span>
          ${s.passes ? '<span style="font-size:10px;color:var(--green)">✓ Passes all required</span>' : '<span style="font-size:10px;color:var(--red)">✕ Fails a required param</span>'}
        </div>
      </div>
    </div>
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--text3);margin-bottom:8px">Demo Data</div>
    ${rows.map(r => `
      <div class="detail-metric">
        <span class="detail-metric-label" style="font-size:12px">${r.l}</span>
        <span class="detail-metric-val" style="${r.col ? 'color:'+r.col : r.p===undefined?'':r.p?'color:var(--green)':'color:var(--red)'}">${r.v}</span>
      </div>`).join('')}
    <div style="margin-top:12px;padding:10px;background:var(--surface2);border-radius:var(--radius-sm);font-size:10px;color:var(--text3)">
      🧪 Simulated data for demo purposes — not real market prices.<br>
      D/E, FV &amp; Future score entered manually in Parameters tab. Not financial advice.
    </div>
    ${buildAIInsightHTML(s, th, sAvgPE)}
  `;
  document.getElementById('detail-panel').style.display = 'block';
  document.getElementById('detail-overlay').classList.add('show');
}
function closeDetail() {
  document.getElementById('detail-panel').style.display = 'none';
  document.getElementById('detail-overlay').classList.remove('show');
}

// ════════════════════════════════════════════════════════════════
// PARAMETERS PANEL
// ════════════════════════════════════════════════════════════════
function renderParams() {
  const el = document.getElementById('param-list');
  el.innerHTML = PARAMS.map((p, i) => `
    <div class="toggle-wrap">
      <div class="toggle-info">
        <div class="toggle-name">
          ${p.label}
          ${p.tooltip ? `<span class="info-icon" tabindex="0">ⓘ<span class="info-tooltip">${p.tooltip}</span></span>` : ''}
        </div>
        <div class="toggle-desc">${p.desc}</div>
      </div>
      <div class="toggle-controls">
        <span class="param-tag ${p.required?'req':''}" onclick="toggleReq(${i})">${p.required ? '🔒 Required' : 'Optional'}</span>
        <label class="switch"><input type="checkbox" ${p.enabled?'checked':''} onchange="toggleParam(${i},this.checked)"><span class="switch-track"></span></label>
      </div>
    </div>`).join('');
  updateReqBar();
  document.getElementById('m-params').textContent = PARAMS.filter(p => p.enabled).length;
}
function updateReqBar() {
  const bad = PARAMS.filter(p => p.required && !p.enabled);
  const bar = document.getElementById('req-status-bar');
  bar.className = `status-bar ${bad.length ? 'warn' : 'ok'}`;
  document.getElementById('req-status-icon').textContent = bad.length ? '⚠️' : '✓';
  document.getElementById('req-status-text').textContent = bad.length
    ? `${bad.length} Required param${bad.length>1?'s are':' is'} disabled — enable or mark Optional`
    : `${PARAMS.filter(p=>p.required&&p.enabled).length} required params active`;
}
function toggleParam(i, v) { PARAMS[i].enabled = v; renderParams(); runScreen(); }
function toggleReq(i) { PARAMS[i].required = !PARAMS[i].required; renderParams(); runScreen(); }

// ════════════════════════════════════════════════════════════════
// CALCULATORS
// ════════════════════════════════════════════════════════════════
function setCalcTab(n) {
  [0,1,2,3].forEach(i => {
    document.getElementById('ct'+i).classList.toggle('active', i===n);
    document.getElementById('calc-'+i).style.display = i===n ? '' : 'none';
  });
  if (n===0) calcLump();
  if (n===1) calcSIP();
  if (n===2) calcFair();
  if (n===3) calcCAGR();
}
function fmtINR(n) {
  if (n >= 1e7) return '₹'+(n/1e7).toFixed(2)+'Cr';
  if (n >= 1e5) return '₹'+(n/1e5).toFixed(2)+'L';
  return '₹'+Math.round(n).toLocaleString('en-IN');
}
function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }
const chartOpts = (stacked=false) => ({
  responsive:true, maintainAspectRatio:false,
  plugins:{ legend:{ display:true, labels:{ color:'#9aa0aa', boxWidth:9, font:{size:11} } } },
  scales:{
    x:{ stacked, ticks:{color:'#5f6672',font:{size:10}}, grid:{color:'rgba(255,255,255,0.04)'} },
    y:{ stacked, ticks:{color:'#5f6672',font:{size:10},callback:v=>fmtINR(v)}, grid:{color:'rgba(255,255,255,0.04)'} }
  }
});
function calcLump() {
  const amt=parseFloat(document.getElementById('c0-amt').value)||100000;
  const rate=parseFloat(document.getElementById('c0-rate').value)/100;
  const yrs=parseInt(document.getElementById('c0-yrs').value)||5;
  const fin=amt*Math.pow(1+rate,yrs); const gain=fin-amt;
  document.getElementById('c0-result').textContent=fmtINR(fin);
  document.getElementById('c0-gain').textContent='+'+fmtINR(gain)+' ('+((gain/amt)*100).toFixed(1)+'%)';
  const labs=[],p=[],g=[];
  for(let y=0;y<=yrs;y++){labs.push('Y'+y);p.push(amt);g.push(Math.round(amt*Math.pow(1+rate,y)-amt));}
  destroyChart('chart-lump');
  charts['chart-lump']=new Chart(document.getElementById('chart-lump'),{type:'bar',data:{labels:labs,datasets:[{label:'Principal',data:p,backgroundColor:'rgba(79,142,247,0.25)',borderColor:'rgba(79,142,247,0.6)',borderWidth:1},{label:'Gain',data:g,backgroundColor:'rgba(52,211,153,0.25)',borderColor:'rgba(52,211,153,0.6)',borderWidth:1}]},options:chartOpts(true)});
}
function calcSIP() {
  const m=parseFloat(document.getElementById('c1-monthly').value)||5000;
  const r=parseFloat(document.getElementById('c1-rate').value)/100/12;
  const y=parseInt(document.getElementById('c1-yrs').value)||10;
  const n=y*12; const corp=m*((Math.pow(1+r,n)-1)/r)*(1+r); const inv=m*n; const gain=corp-inv;
  document.getElementById('c1-invested').textContent=fmtINR(inv);
  document.getElementById('c1-corpus').textContent=fmtINR(corp);
  document.getElementById('c1-gain').textContent=fmtINR(gain);
  const labs=[],ia=[],ca=[];
  for(let i=1;i<=y;i++){const ni=i*12;const c=m*((Math.pow(1+r,ni)-1)/r)*(1+r);labs.push('Y'+i);ia.push(Math.round(m*ni));ca.push(Math.round(c));}
  destroyChart('chart-sip');
  charts['chart-sip']=new Chart(document.getElementById('chart-sip'),{type:'line',data:{labels:labs,datasets:[{label:'Invested',data:ia,borderColor:'rgba(79,142,247,0.8)',backgroundColor:'rgba(79,142,247,0.08)',fill:true,tension:0.3,pointRadius:2},{label:'Corpus',data:ca,borderColor:'rgba(52,211,153,0.9)',backgroundColor:'rgba(52,211,153,0.08)',fill:true,tension:0.3,pointRadius:2}]},options:chartOpts()});
}
function calcFair() {
  const eps=parseFloat(document.getElementById('c2-eps').value)||50;
  const g=parseFloat(document.getElementById('c2-growth').value)||15;
  const d=parseFloat(document.getElementById('c2-discount').value)||10;
  const cmp=parseFloat(document.getElementById('c2-cmp').value)||900;
  const fv=eps*(8.5+2*g)*4.4/d; const mos=((fv-cmp)/fv)*100;
  document.getElementById('c2-fv').textContent=fmtINR(fv);
  document.getElementById('c2-mos').textContent=(mos>0?'+':'')+mos.toFixed(1)+'%';
  document.getElementById('c2-mos').style.color=mos>0?'var(--green)':'var(--red)';
  const v=document.getElementById('c2-verdict'); v.style.display='block';
  if(mos>20){v.className='verdict verdict-green';v.textContent='✓ Potentially undervalued';}
  else if(mos>0){v.className='verdict verdict-amber';v.textContent='~ Near fair value';}
  else{v.className='verdict verdict-red';v.textContent='✕ Appears overvalued';}
}
function calcCAGR() {
  const ini=parseFloat(document.getElementById('c3-initial').value)||100000;
  const fin=parseFloat(document.getElementById('c3-final').value)||250000;
  const y=parseFloat(document.getElementById('c3-yrs').value)||5;
  const bench=parseFloat(document.getElementById('c3-bench').value)||12;
  if(ini<=0||fin<=0||y<=0)return;
  const cagr=(Math.pow(fin/ini,1/y)-1)*100; const diff=cagr-bench;
  document.getElementById('c3-cagr').textContent=cagr.toFixed(2)+'%';
  document.getElementById('c3-cagr').style.color=cagr>=bench?'var(--green)':'var(--red)';
  document.getElementById('c3-diff').textContent=(diff>=0?'+':'')+diff.toFixed(2)+'%';
  document.getElementById('c3-diff').style.color=diff>=0?'var(--green)':'var(--red)';
  const v=document.getElementById('c3-verdict'); v.style.display='block';
  if(diff>5){v.className='verdict verdict-green';v.textContent=`✓ Outperforming benchmark by ${diff.toFixed(1)}%`;}
  else if(diff>=0){v.className='verdict verdict-amber';v.textContent=`~ Marginally ahead (+${diff.toFixed(1)}%)`;}
  else{v.className='verdict verdict-red';v.textContent=`✕ Underperforming by ${Math.abs(diff).toFixed(1)}%`;}
}

// ════════════════════════════════════════════════════════════════
// SECTOR LEADERS
// ════════════════════════════════════════════════════════════════
let sectorSort = 'score';

function setSectorSort(by) {
  sectorSort = by;
  document.getElementById('sl-sort-score').style.cssText = by === 'score'
    ? 'background:var(--accent-dim);color:var(--accent);border-color:rgba(79,142,247,0.3)' : '';
  document.getElementById('sl-sort-chg').style.cssText = by === 'chg'
    ? 'background:var(--accent-dim);color:var(--accent);border-color:rgba(79,142,247,0.3)' : '';
  renderSectorLeaders(lastResults.filter(s => s.loaded));
}

function getSectorLabel(sector) {
  if (!sector) return 'Other';
  const map = {
    'Technology':'Technology','Information Technology':'Technology','Software':'Technology',
    'Finance':'Finance','Banking':'Finance','Financial Services':'Finance',
    'FMCG':'FMCG','Consumer Staples':'FMCG','Consumer Defensive':'FMCG',
    'Pharma':'Pharma','Healthcare':'Pharma','Pharmaceutical':'Pharma',
    'Energy':'Energy','Oil':'Energy','Basic Materials':'Energy',
    'Auto':'Auto','Automobile':'Auto','Automotive':'Auto',
    'Metals':'Metals','Infrastructure':'Infrastructure','Realty':'Realty','Telecom':'Telecom',
    'Consumer Cyclical':'Consumer','Consumer Discretionary':'Consumer',
    'Industrials':'Industrials','Utilities':'Utilities','Communication Services':'Telecom',
  };
  for (const [key, val] of Object.entries(map)) {
    if (sector.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return sector.split(' ').slice(0,2).join(' ');
}

const SECTOR_ICONS = {
  Technology:'💻', Finance:'🏦', FMCG:'🛒', Pharma:'💊', Energy:'⚡',
  Auto:'🚗', Metals:'🔩', Infrastructure:'🏗️', Realty:'🏢', Telecom:'📡',
  Consumer:'🎯', Industrials:'🏭', Utilities:'💡', Other:'📦'
};

function renderSectorLeaders(loaded) {
  const el = document.getElementById('sector-leaders-body');
  if (!loaded || !loaded.length) {
    el.innerHTML = '<div class="empty" style="padding:24px 0"><p style="font-size:12px">Run the screener to see sector leaders</p></div>';
    return;
  }

  // Group by sector
  const groups = {};
  loaded.forEach(s => {
    const sec = getSectorLabel(s.sector);
    if (!groups[sec]) groups[sec] = [];
    groups[sec].push(s);
  });

  // Sort each group internally
  Object.keys(groups).forEach(sec => {
    groups[sec].sort((a, b) =>
      sectorSort === 'chg'
        ? (b.chgPct || 0) - (a.chgPct || 0)
        : b.score - a.score
    );
  });

  // Sort sector blocks by their top stock's score
  const sortedSectors = Object.entries(groups).sort(([, a], [, b]) => {
    const topA = a[0];
    const topB = b[0];
    return sectorSort === 'chg'
      ? (topB.chgPct || 0) - (topA.chgPct || 0)
      : topB.score - topA.score;
  });

  el.innerHTML = sortedSectors.map(([sec, stocks]) => {
    const icon = SECTOR_ICONS[sec] || '📦';
    const topRows = stocks.slice(0, 3).map((s, i) => {
      const col = scoreColor(s.score);
      const chgCol = (s.chgPct || 0) >= 0 ? 'var(--green)' : 'var(--red)';
      const rankCls = i === 0 ? 'sl-rank-1' : i === 1 ? 'sl-rank-2' : 'sl-rank-3';
      const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      const [tag, cls] = scoreTag(s.score);
      return `
        <div class="sector-leader-row" onclick="showDetailBySym('${s.sym}')" style="cursor:pointer;transition:background .1s" onmouseenter="this.style.background='var(--surface3)'" onmouseleave="this.style.background=''">
          <div class="sl-rank ${rankCls}">${rankEmoji}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:baseline;gap:6px">
              <span class="sl-ticker">${s.sym}</span>
              <span class="sl-name">${s.name || ''}</span>
            </div>
            <div class="sl-bar-wrap" style="margin-top:4px">
              <div class="sl-bar-track"><div class="sl-bar-fill" style="width:${s.score}%;background:${col}"></div></div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
                <span class="sl-cmp">₹${s.cmp?.toLocaleString('en-IN',{maximumFractionDigits:1}) || '—'}</span>
                <span class="badge ${cls}" style="font-size:9px;padding:1px 5px">${tag}</span>
              </div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="sl-score" style="color:${col}">${s.score}</div>
            <div class="sl-chg" style="color:${chgCol}">${(s.chgPct||0) >= 0 ? '▲' : '▼'}${Math.abs(s.chgPct||0).toFixed(2)}%</div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="sector-block">
        <div class="sector-block-header">
          <span class="sector-block-name">${icon} ${sec}</span>
          <span class="sector-block-count">${stocks.length} stock${stocks.length!==1?'s':''}</span>
        </div>
        ${topRows}
        ${stocks.length > 3 ? `<div class="sector-empty">+${stocks.length-3} more in this sector</div>` : ''}
      </div>`;
  }).join('');
}

function showDetailBySym(sym) {
  const idx = applyFilter(lastResults).findIndex(s => s.sym === sym);
  if (idx >= 0) showDetail(idx);
}

// ════════════════════════════════════════════════════════════════
// AI INSIGHTS ENGINE
// ════════════════════════════════════════════════════════════════
// A lightweight, fully client-side "AI analyst" layer. It doesn't call
// any external LLM — instead it synthesizes natural-language commentary
// from the same computed metrics that drive the screener's scoring
// engine, giving the UI an AI-product feel without needing a backend.

// ── Per-stock AI insight (shown in the detail panel) ──
function buildAIInsightHTML(s, th, sAvgPE) {
  const m = manualData[s.sym] || {};
  const lines = [];
  const tags = [];

  // Overall framing
  if (s.score >= 75) {
    lines.push(`<b>${s.sym}</b> screens as a <b style="color:var(--green)">strong candidate</b> for a ${horizon === 'long' ? 'long-term' : 'short-term'} allocation, clearing most of the parameters you've enabled.`);
  } else if (s.score >= 55) {
    lines.push(`<b>${s.sym}</b> is <b style="color:var(--accent)">worth considering</b> — it clears a majority of checks, though a few areas could use closer review before sizing a position.`);
  } else if (s.score >= 35) {
    lines.push(`<b>${s.sym}</b> currently sits in a <b style="color:var(--amber)">watch-only</b> zone — several parameters are unfavourable, so it may be best to track rather than act for now.`);
  } else {
    lines.push(`<b>${s.sym}</b> is flagged as <b style="color:var(--red)">avoid</b> under your current settings — most parameters are working against it.`);
  }

  // Valuation
  if (s.pe != null) {
    const maxPE = sAvgPE + th.peOffset;
    if (s.pe < maxPE) {
      lines.push(`Its P/E of <b>${s.pe.toFixed(1)}</b> is below the ${s.sector || 'sector'} average of <b>${sAvgPE}</b>, suggesting it's relatively reasonably valued versus peers.`);
      tags.push({t:'Valuation: favourable', cls:'pos'});
    } else {
      lines.push(`Its P/E of <b>${s.pe.toFixed(1)}</b> runs above the ${s.sector || 'sector'} average of <b>${sAvgPE}</b>, implying the market is pricing in higher growth or optimism than peers.`);
      tags.push({t:'Valuation: rich', cls:'neg'});
    }
  }

  // Technicals: RSI + MACD
  if (s.rsi != null) {
    if (s.rsi >= th.rsiL && s.rsi <= th.rsiH) {
      lines.push(`The RSI of <b>${s.rsi.toFixed(1)}</b> sits in a healthy range — neither overbought nor oversold.`);
      tags.push({t:'RSI: balanced', cls:'pos'});
    } else if (s.rsi > th.rsiH) {
      lines.push(`At an RSI of <b>${s.rsi.toFixed(1)}</b>, the stock looks <b>overbought</b> — a short-term pullback or consolidation wouldn't be unusual.`);
      tags.push({t:'RSI: overbought', cls:'neg'});
    } else {
      lines.push(`At an RSI of <b>${s.rsi.toFixed(1)}</b>, the stock looks <b>oversold</b>, which can either signal a buying opportunity or an ongoing downtrend depending on the broader picture.`);
      tags.push({t:'RSI: oversold', cls:'neu'});
    }
  }
  if (s.macd) {
    lines.push(`MACD is trading <b>above its signal line</b>, a bullish momentum cue for the ${horizon === 'short' ? 'short term' : 'near term'}.`);
    tags.push({t:'MACD: bullish', cls:'pos'});
  } else {
    lines.push(`MACD is <b>below its signal line</b>, pointing to weak or negative near-term momentum.`);
    tags.push({t:'MACD: bearish', cls:'neg'});
  }

  // Volume / liquidity
  if (s.avgvolpct != null) {
    if (s.avgvolpct >= 100) {
      lines.push(`Trading activity is running at <b>${s.avgvolpct}%</b> of its 3-month average — elevated interest that's often worth a closer look.`);
      tags.push({t:'Activity: elevated', cls:'pos'});
    } else {
      lines.push(`Trading activity is at <b>${s.avgvolpct}%</b> of its 3-month average — relatively quiet, with no unusual volume signal right now.`);
      tags.push({t:'Activity: normal', cls:'neu'});
    }
  }

  // 52-week proximity
  if (s.wk52pct != null) {
    if (s.wk52pct <= th.wk52) {
      lines.push(`At <b>${s.wk52pct}%</b> below its 52-week high, the stock is trading close to its recent peak — often read as a sign of underlying strength.`);
      tags.push({t:'Near 52W high', cls:'pos'});
    } else if (s.wk52pct >= 35) {
      lines.push(`The stock is <b>${s.wk52pct}%</b> off its 52-week high — a meaningful pullback from its recent peak.`);
      tags.push({t:'Well off 52W high', cls:'neg'});
    }
  }

  // Sentiment
  if (s.sentiment != null) {
    if (s.sentiment >= th.sent) {
      lines.push(`Momentum-based sentiment of <b>${s.sentiment}/100</b> leans positive, broadly aligning with the recent price action.`);
    } else {
      lines.push(`Momentum-based sentiment of <b>${s.sentiment}/100</b> leans cautious, reflecting softer recent price action.`);
    }
  }

  // Manual fundamentals nudge
  const manualMissing = [];
  if (m.de == null) manualMissing.push('D/E ratio');
  if (m.fv == null) manualMissing.push('face value');
  if (m.future == null) manualMissing.push('future/pipeline score');
  if (manualMissing.length) {
    lines.push(`Note: ${manualMissing.join(', ')} ${manualMissing.length > 1 ? "haven't" : "hasn't"} been entered yet — adding ${manualMissing.length > 1 ? 'these' : 'it'} in the Parameters tab would sharpen this read.`);
  }

  // Required-param fail callout
  if (!s.passes) {
    const failedReq = PARAMS.filter(p => p.required && p.enabled && !s.checks[p.id]).map(p => labelMap[p.id] || p.id);
    if (failedReq.length) {
      lines.push(`This stock fails ${failedReq.length > 1 ? 'the required parameters' : 'a required parameter'}: <b style="color:var(--red)">${failedReq.join(', ')}</b> — which is why it's excluded from "Passed" results.`);
    }
  }

  return `
    <div class="ai-insight-box">
      <div class="ai-insight-head"><span class="ai-spark">✨</span> AI Insight</div>
      <div class="ai-insight-body">${lines.map(l => `<p style="margin-bottom:6px">${l}</p>`).join('')}</div>
      ${tags.length ? `<div class="ai-tag-row">${tags.map(t => `<span class="ai-tag ${t.cls}">${t.t}</span>`).join('')}</div>` : ''}
      <div style="margin-top:10px;font-size:9px;color:var(--text3)">Generated locally from simulated data &amp; your active parameters — not investment advice.</div>
    </div>`;
}

// ── AI Portfolio Health Report ──
async function generateAIReport() {
  const body = document.getElementById('ai-report-body');
  const loaded = lastResults.filter(s => s.loaded);

  if (!loaded.length) {
    body.innerHTML = `<div class="ai-report-empty"><p style="font-size:12px">Add stocks and run the screener first — the AI report needs results to analyze.</p></div>`;
    return;
  }

  const btn = document.getElementById('ai-report-btn');
  btn.disabled = true;
  btn.textContent = 'Analyzing…';
  body.innerHTML = `<div class="ai-report-empty"><div class="ai-typing"><span></span><span></span><span></span></div><p style="font-size:11px;margin-top:8px">Synthesizing portfolio insights…</p></div>`;

  // Simulated "thinking" delay for an AI-product feel
  await new Promise(res => setTimeout(res, 700 + Math.random() * 500));

  const passed = loaded.filter(s => s.passes);
  const avgScore = Math.round(loaded.reduce((a, b) => a + b.score, 0) / loaded.length);
  const strong = loaded.filter(s => s.score >= 75);
  const avoid = loaded.filter(s => s.score < 35);

  // Sector concentration
  const sectorCounts = {};
  loaded.forEach(s => {
    const sec = getSectorLabel(s.sector);
    sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
  });
  const sortedSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]);
  const topSector = sortedSectors[0];
  const topSectorPct = Math.round((topSector[1] / loaded.length) * 100);

  // Technical posture
  const bullishMACD = loaded.filter(s => s.macd).length;
  const overbought = loaded.filter(s => s.rsi != null && s.rsi > 70).length;
  const oversold = loaded.filter(s => s.rsi != null && s.rsi < 30).length;
  const avgRSI = Math.round(loaded.reduce((a, b) => a + (b.rsi || 50), 0) / loaded.length);

  // Top picks (by score) and biggest laggards
  const ranked = [...loaded].sort((a, b) => b.score - a.score);
  const topPicks = ranked.slice(0, 3);
  const laggards = [...ranked].reverse().slice(0, 3).filter(s => s.score < 55);

  // Risk callouts
  const risks = [];
  if (topSectorPct >= 40) {
    risks.push(`Sector concentration risk: <b>${topSectorPct}%</b> of your watchlist sits in <b>${topSector[0]}</b>. A sector-specific downturn would disproportionately affect this portfolio.`);
  }
  if (overbought > loaded.length * 0.3) {
    risks.push(`<b>${overbought}</b> stock${overbought>1?'s':''} (${Math.round(overbought/loaded.length*100)}%) show RSI above 70 — a meaningful share of the list looks overbought and could be due for consolidation.`);
  }
  const reqFails = loaded.filter(s => !s.passes).length;
  if (reqFails) {
    risks.push(`<b>${reqFails}</b> of ${loaded.length} stocks fail at least one required parameter and are excluded from "Passed" — worth reviewing whether those requirements are too strict for this list.`);
  }
  const missingManual = loaded.filter(s => {
    const mm = manualData[s.sym] || {};
    return mm.de == null || mm.fv == null || mm.future == null;
  }).length;
  if (missingManual) {
    risks.push(`<b>${missingManual}</b> stock${missingManual>1?'s':''} ${missingManual>1?'are':'is'} missing manual fundamentals (D/E, face value, or pipeline score), so their composite scores rely on defaults rather than your inputs.`);
  }
  if (!risks.length) {
    risks.push(`No major structural risks detected in this watchlist based on the active parameters — diversification and technical posture both look reasonable.`);
  }

  // Build HTML
  const html = `
    <div class="ai-report-stat-row">
      <div class="ai-report-stat"><div class="v" style="color:var(--accent)">${loaded.length}</div><div class="l">Analyzed</div></div>
      <div class="ai-report-stat"><div class="v" style="color:var(--green)">${passed.length}</div><div class="l">Passed</div></div>
      <div class="ai-report-stat"><div class="v" style="color:var(--amber)">${avgScore}</div><div class="l">Avg Score</div></div>
      <div class="ai-report-stat"><div class="v" style="color:var(--purple)">${avgRSI}</div><div class="l">Avg RSI</div></div>
    </div>
    <div class="ai-report-body">
      <h4>Summary</h4>
      <p>Across <b>${loaded.length}</b> screened stock${loaded.length>1?'s':''}, the average composite score is <b>${avgScore}/100</b> under a <b>${horizon === 'long' ? 'long-term' : 'short-term'}</b> horizon.
      ${strong.length ? `<b>${strong.length}</b> stock${strong.length>1?'s':''} rate as Strong Buy (75+)` : 'No stocks currently rate as Strong Buy (75+)'}${avoid.length ? `, while <b>${avoid.length}</b> fall${avoid.length===1?'s':''} into the Avoid range (&lt;35).` : '.'}
      Bullish MACD signals appear in <b>${bullishMACD}</b> of ${loaded.length} names${oversold ? `, and <b>${oversold}</b> look oversold (RSI &lt; 30) which some investors watch for entry opportunities` : ''}.</p>

      <h4>Top picks</h4>
      <ul class="ai-report-list">
        ${topPicks.map(s => `<li><b>${s.sym}</b> — score ${s.score}, ${scoreTag(s.score)[0]}${s.sector ? `, ${getSectorLabel(s.sector)}` : ''}</li>`).join('')}
      </ul>

      ${laggards.length ? `<h4>Worth reviewing</h4>
      <ul class="ai-report-list">
        ${laggards.map(s => `<li><b>${s.sym}</b> — score ${s.score}, ${scoreTag(s.score)[0]}${!s.passes ? ' (fails a required parameter)' : ''}</li>`).join('')}
      </ul>` : ''}

      <h4>Sector mix</h4>
      <ul class="ai-report-list">
        ${sortedSectors.slice(0, 5).map(([sec, count]) => `<li>${sec}: <b>${count}</b> stock${count>1?'s':''} (${Math.round(count/loaded.length*100)}%)</li>`).join('')}
      </ul>

      <h4>Risk callouts</h4>
      <ul class="ai-report-list">
        ${risks.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
    <div style="margin-top:10px;font-size:9px;color:var(--text3)">Generated locally from simulated data — for demonstration purposes only, not investment advice.</div>
  `;

  body.innerHTML = html;
  btn.disabled = false;
  btn.textContent = '↻ Regenerate';
}

// ════════════════════════════════════════════════════════════════
// AI CHAT ASSISTANT
// ════════════════════════════════════════════════════════════════
let aiChatOpen = false;
let aiChatGreeted = false;

function toggleAIChat() {
  aiChatOpen = !aiChatOpen;
  const win = document.getElementById('ai-chat-window');
  win.classList.toggle('show', aiChatOpen);
  if (aiChatOpen && !aiChatGreeted) {
    aiChatGreeted = true;
    addAIChatMessage('bot', `Hi! I'm the StockSense AI Assistant. I can answer questions about your screened stocks — try asking why a stock is rated a certain way, what RSI or MACD means, or how the score is calculated. <br><br><i style="color:var(--text3)">(This runs entirely in your browser using rule-based responses over your screener data — no external AI calls.)</i>`);
    renderAIChatSuggestions();
  }
  if (aiChatOpen) document.getElementById('ai-chat-input').focus();
}

function onAIChatKey(e) {
  if (e.key === 'Enter') sendAIChatMessage();
}

function addAIChatMessage(who, html) {
  const wrap = document.getElementById('ai-chat-messages');
  const div = document.createElement('div');
  div.className = `ai-msg ${who}`;
  div.innerHTML = html;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function renderAIChatSuggestions() {
  const sugWrap = document.getElementById('ai-chat-suggestions');
  const suggestions = [];
  if (lastResults.filter(s => s.loaded).length) {
    const top = [...lastResults].filter(s=>s.loaded).sort((a,b)=>b.score-a.score)[0];
    const bottom = [...lastResults].filter(s=>s.loaded).sort((a,b)=>a.score-b.score)[0];
    if (top) suggestions.push(`Why is ${top.sym} rated ${scoreTag(top.score)[0]}?`);
    if (bottom && bottom.sym !== top?.sym) suggestions.push(`Why is ${bottom.sym} rated ${scoreTag(bottom.score)[0]}?`);
    suggestions.push('Which stock should I look at first?');
  }
  suggestions.push('What does RSI mean?', 'How is the score calculated?', 'What does MACD mean?');
  sugWrap.innerHTML = suggestions.slice(0, 4).map(s =>
    `<span class="ai-chat-chip" onclick="askAIChatPreset('${s.replace(/'/g, "\\'")}')">${s}</span>`
  ).join('');
}

function askAIChatPreset(text) {
  document.getElementById('ai-chat-input').value = text;
  sendAIChatMessage();
}

function sendAIChatMessage() {
  const input = document.getElementById('ai-chat-input');
  const text = input.value.trim();
  if (!text) return;
  addAIChatMessage('user', escapeHTML(text));
  input.value = '';
  document.getElementById('ai-chat-suggestions').innerHTML = '';

  // Simulated "thinking" delay
  const wrap = document.getElementById('ai-chat-messages');
  const thinking = document.createElement('div');
  thinking.className = 'ai-msg bot';
  thinking.innerHTML = `<div class="ai-typing"><span></span><span></span><span></span></div>`;
  wrap.appendChild(thinking);
  wrap.scrollTop = wrap.scrollHeight;

  setTimeout(() => {
    thinking.remove();
    addAIChatMessage('bot', answerAIChatQuestion(text));
    renderAIChatSuggestions();
  }, 450 + Math.random() * 450);
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Rule-based "AI" question answering over screener state ──
function answerAIChatQuestion(q) {
  const ql = q.toLowerCase();
  const th = getThresholds();

  // Try to find a referenced symbol from the watchlist
  const mentioned = watchlist.find(w => ql.includes(w.sym.toLowerCase()));

  // "Why is X rated ...?"
  if (mentioned && (ql.includes('why') || ql.includes('rated') || ql.includes('score') || ql.includes('avoid') || ql.includes('strong') || ql.includes('consider'))) {
    const s = lastResults.find(r => r.sym === mentioned.sym);
    if (!s || !s.loaded) {
      return `I don't have data for <b>${mentioned.sym}</b> yet — click "▶ Fetch &amp; Run Screen" first, then ask again.`;
    }
    const sAvgPE = getSectorAvgPE(s.sector);
    const [tag] = scoreTag(s.score);
    const passedKeys = Object.entries(s.checks).filter(([,v])=>v).map(([k])=>labelMap[k]||k);
    const failedKeys = Object.entries(s.checks).filter(([,v])=>!v).map(([k])=>labelMap[k]||k);
    return `<b>${s.sym}</b> scores <b>${s.score}/100</b> (${tag}) under the ${horizon === 'long' ? 'long-term' : 'short-term'} horizon.<br><br>
      ✅ Passing: ${passedKeys.length ? passedKeys.join(', ') : 'none'}<br>
      ❌ Failing: ${failedKeys.length ? failedKeys.join(', ') : 'none'}<br><br>
      ${!s.passes ? `It's excluded from "Passed" because it fails a <b>required</b> parameter.` : `It passes all required parameters, so it counts toward "Passed".`}
      Click the <b>${s.sym}</b> row for a full AI Insight breakdown.`;
  }

  // "Which stock should I look at first / best stock"
  if (ql.includes('which stock') || ql.includes('best stock') || ql.includes('top stock') || ql.includes('look at first') || ql.includes('recommend')) {
    const loaded = lastResults.filter(s => s.loaded);
    if (!loaded.length) return `Add some stocks to your watchlist and run the screener first — then I can point you to the top-ranked names.`;
    const top = [...loaded].sort((a,b)=>b.score-a.score)[0];
    const [tag] = scoreTag(top.score);
    return `Based on the current results, <b>${top.sym}</b> (${top.name || ''}) has the highest composite score at <b>${top.score}/100</b> (${tag}). That said, this reflects the parameters and weights you've configured — adjust them in the Parameters tab if your priorities differ. Click the stock for a full AI Insight.`;
  }

  // RSI explanation
  if (ql.includes('rsi')) {
    return `<b>RSI (Relative Strength Index)</b> is a momentum indicator from 0–100 based on recent price changes.<br><br>
      • Above <b>70</b>: often considered "overbought" — price may be due for a pullback.<br>
      • Below <b>30</b>: often considered "oversold" — price may be due for a bounce.<br>
      • Your current healthy-zone thresholds are set to <b>${th.rsiL}–${th.rsiH}</b> in the Parameters tab.`;
  }

  // MACD explanation
  if (ql.includes('macd')) {
    return `<b>MACD (Moving Average Convergence Divergence)</b> compares a fast (12-day) and slow (26-day) moving average of price.<br><br>
      When the MACD line crosses <b>above</b> its signal line (9-day EMA of MACD), it's read as a <b style="color:var(--green)">bullish</b> signal. When it's below, it's read as <b style="color:var(--red)">bearish</b>. In this screener, "MACD bullish crossover" is one of your configurable parameters.`;
  }

  // P/E explanation
  if (ql.includes('p/e') || ql.includes('pe ratio') || ql.includes('price to earnings') || ql.includes('price-to-earnings')) {
    return `<b>P/E (Price-to-Earnings) ratio</b> = share price ÷ earnings per share. It shows how much investors are paying per ₹1 of profit.<br><br>
      A P/E <b>below</b> the sector average can suggest relative undervaluation; <b>above</b> average can suggest the market expects stronger growth (or that the stock is pricier vs peers). The "P/E &lt; sector average" parameter checks this directly, with an optional offset you can tune.`;
  }

  // D/E explanation
  if (ql.includes('d/e') || ql.includes('debt')) {
    return `<b>D/E (Debt-to-Equity) ratio</b> = total debt ÷ shareholder equity. It measures financial leverage — lower values generally mean less reliance on borrowed money and lower financial risk. This is a manual input (Parameters tab) since it isn't part of the simulated live dataset.`;
  }

  // Sentiment explanation
  if (ql.includes('sentiment')) {
    return `<b>Sentiment score</b> here is a 0–100 proxy for market mood, derived from recent price momentum. Higher = more positive recent momentum, lower = more negative. It's an approximation, not a measure of news or social sentiment.`;
  }

  // Score / scoring explanation
  if (ql.includes('how') && (ql.includes('score') || ql.includes('calculat') || ql.includes('work'))) {
    return `Each enabled parameter contributes a weight toward the composite score (0–100). Weights shift based on <b>Horizon</b>: ${horizon === 'long' ? '<b>Long-term</b> (currently selected) favours fundamentals like P/E, D/E and future pipeline' : '<b>Short-term</b> (currently selected) favours technicals like RSI, MACD and volume'}.<br><br>
      <b>Required</b> parameters act as hard gates — failing one excludes the stock from "Passed" even if its overall score is decent. <b>Optional</b> parameters only affect the score itself. You can toggle and reweight all of this in the Parameters tab.`;
  }

  // Horizon explanation
  if (ql.includes('horizon') || ql.includes('long term') || ql.includes('short term') || ql.includes('long-term') || ql.includes('short-term')) {
    return `<b>Horizon</b> changes how parameters are weighted. <b>Long-term</b> emphasizes fundamentals (P/E, D/E, future pipeline). <b>Short-term</b> emphasizes technicals (RSI, MACD, volume). You're currently on <b>${horizon === 'long' ? 'Long-term' : 'Short-term'}</b> — toggle it from the top-right of the nav bar.`;
  }

  // Volume / liquidity
  if (ql.includes('volume') || ql.includes('liquid')) {
    return `<b>Volume</b> is the number of shares traded (shown in Lakhs, where 1L = 100,000 shares). Higher volume usually means better liquidity. The "Avg volume vs 3M baseline" parameter compares today's volume to the 3-month average — values above 100% indicate unusually high activity.`;
  }

  // 52-week
  if (ql.includes('52') || ql.includes('52-week') || ql.includes('52 week')) {
    return `The <b>52-week high/low</b> shows the highest and lowest prices over the past year. "52-week high proximity" measures how far the current price is below its 52-week high — a small gap can suggest the stock is near recent strength.`;
  }

  // Demo / data source
  if (ql.includes('real') || ql.includes('live') || ql.includes('demo') || ql.includes('data source') || ql.includes('accurate')) {
    return `This build runs in <b>demo mode</b> — all market data (CMP, P/E, RSI, MACD, sentiment, etc.) is generated by a deterministic simulation engine in your browser, not pulled from a live feed. The same ticker will always produce the same numbers within a session. It's built to showcase the screener's UX and scoring logic, not for real trading decisions.`;
  }

  // Greeting / fallback
  if (ql.includes('hi') || ql.includes('hello') || ql.includes('hey')) {
    return `Hello! Ask me about any stock in your watchlist (e.g. "Why is RELIANCE rated Strong Buy?"), or about indicators like RSI, MACD, P/E, or how the scoring works.`;
  }

  return `I can help with questions about your screened stocks (e.g. "Why is ${watchlist[0]?.sym || 'TCS'} rated this way?"), or explain indicators like RSI, MACD, P/E, D/E, sentiment, volume, and 52-week range — just ask!`;
}

// ════════════════════════════════════════════════════════════════
// PORTFOLIO
// ════════════════════════════════════════════════════════════════
function toggleAddForm() {
  const f=document.getElementById('add-form');
  f.style.display=f.style.display==='none'||!f.style.display?'block':'none';
}
async function addStock() {
  const sym=(document.getElementById('pf-ticker').value||'').trim().toUpperCase();
  const qty=parseFloat(document.getElementById('pf-qty').value)||0;
  const buy=parseFloat(document.getElementById('pf-buy').value)||0;
  const target=parseFloat(document.getElementById('pf-target').value)||0;
  if(!sym||!qty||!buy){alert('Fill Ticker, Quantity & Buy price');return;}
  // Fetch current price
  const found=NSE_SYMBOLS.find(([s])=>s===sym);
  const yfSym=found?sym+found[2]:sym+'.NS';
  let cmp=buy;
  try {
    const j=await fetchYahooChart(yfSym);
    const meta=j?.chart?.result?.[0]?.meta||{};
    cmp=meta.regularMarketPrice||buy;
  } catch(e){}
  portfolio.push({sym,qty,buy,cmp,target,yfSym});
  ['pf-ticker','pf-qty','pf-buy','pf-target'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('add-form').style.display='none';
  renderPortfolio();
}
async function refreshPortfolioPrices() {
  if (!portfolio.length) return;
  await Promise.allSettled(portfolio.map(async (s, i) => {
    try {
      const j=await fetchYahooChart(s.yfSym);
      const meta=j?.chart?.result?.[0]?.meta||{};
      portfolio[i].cmp=meta.regularMarketPrice||s.cmp;
    } catch(e){}
  }));
  renderPortfolio();
}
function removeStock(i){portfolio.splice(i,1);renderPortfolio();}
function renderPortfolio() {
  if(!portfolio.length){
    document.getElementById('pf-summary-cards').innerHTML='';
    document.getElementById('pf-table-wrap').innerHTML='<div class="empty"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M7 6V4h10v2M19 6l-1 14H6L5 6"/></svg><p>No holdings yet</p></div>';
    document.getElementById('pf-chart-card').style.display='none';
    document.getElementById('pf-sector-card').style.display='none';
    return;
  }
  const inv=portfolio.reduce((a,s)=>a+s.qty*s.buy,0);
  const cur=portfolio.reduce((a,s)=>a+s.qty*s.cmp,0);
  const pnl=cur-inv; const pct=inv?((pnl/inv)*100).toFixed(2):0;
  document.getElementById('pf-summary-cards').innerHTML=`
    <div class="metric"><div class="metric-label">Invested</div><div class="metric-val" style="font-size:16px">${fmtINR(inv)}</div></div>
    <div class="metric"><div class="metric-label">Current</div><div class="metric-val" style="font-size:16px">${fmtINR(cur)}</div></div>
    <div class="metric"><div class="metric-label">P&amp;L</div><div class="metric-val" style="font-size:16px;color:${pnl>=0?'var(--green)':'var(--red)'}">${pnl>=0?'+':''}${fmtINR(Math.abs(pnl))}</div><div class="metric-sub">${pnl>=0?'+':''}${pct}%</div></div>
  `;
  document.getElementById('pf-table-wrap').innerHTML=`<div style="overflow-x:auto"><table class="pf-table">
    <thead><tr><th>Stock</th><th>Qty</th><th>Avg</th><th>CMP (live)</th><th>Target</th><th>P&amp;L</th><th>Upside</th><th></th></tr></thead>
    <tbody>${portfolio.map((s,i)=>{
      const pl=(s.cmp-s.buy)*s.qty; const plp=((s.cmp-s.buy)/s.buy*100).toFixed(1);
      const col=pl>=0?'var(--green)':'var(--red)';
      const up=s.target?((s.target-s.cmp)/s.cmp*100).toFixed(1)+'%':'—';
      const ucol=s.target&&s.target>s.cmp?'var(--green)':'var(--text3)';
      return `<tr><td><div style="font-weight:700;font-family:monospace">${s.sym}</div></td>
        <td>${s.qty}</td><td>₹${s.buy.toLocaleString('en-IN')}</td>
        <td style="color:var(--accent)">₹${s.cmp.toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
        <td style="color:var(--text3)">${s.target?'₹'+s.target.toLocaleString('en-IN'):'—'}</td>
        <td style="color:${col};font-weight:600">${pl>=0?'+':''}${fmtINR(Math.abs(pl))}<br><span style="font-size:10px">${pl>=0?'+':''}${plp}%</span></td>
        <td style="color:${ucol};font-weight:600">${up}</td>
        <td><button class="btn btn-danger btn-icon btn-sm" onclick="removeStock(${i})">✕</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
  renderPFCharts();
}
const PIE_COLORS=['#4f8ef7','#34d399','#fbbf24','#f87171','#a78bfa','#38bdf8','#fb923c','#4ade80','#e879f9','#facc15'];
function renderPFCharts() {
  document.getElementById('pf-chart-card').style.display='block';
  document.getElementById('pf-sector-card').style.display='block';
  destroyChart('pf-pie');
  const pd=portfolio.map(s=>s.qty*s.cmp); const pl2=portfolio.map(s=>s.sym);
  charts['pf-pie']=new Chart(document.getElementById('pf-pie'),{type:'doughnut',data:{labels:pl2,datasets:[{data:pd,backgroundColor:PIE_COLORS.slice(0,portfolio.length),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:false}}}});
  const tot=pd.reduce((a,b)=>a+b,0);
  document.getElementById('pf-legend').innerHTML=portfolio.map((s,i)=>{
    const p=tot?((pd[i]/tot)*100).toFixed(1):0;
    return `<div style="display:flex;align-items:center;gap:7px;margin-bottom:7px"><span style="width:9px;height:9px;border-radius:2px;background:${PIE_COLORS[i]||'#888'};flex-shrink:0"></span><span style="font-weight:700;font-family:monospace">${s.sym}</span><span style="color:var(--text3);margin-left:auto">${p}%</span></div>`;
  }).join('');
  destroyChart('pf-bar');
  const plArr=portfolio.map(s=>parseFloat(((s.cmp-s.buy)/s.buy*100).toFixed(1)));
  const plCol=plArr.map(v=>v>=0?'rgba(52,211,153,0.7)':'rgba(248,113,113,0.7)');
  charts['pf-bar']=new Chart(document.getElementById('pf-bar'),{type:'bar',data:{labels:portfolio.map(s=>s.sym),datasets:[{label:'P&L %',data:plArr,backgroundColor:plCol,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#5f6672',font:{size:11}},grid:{color:'rgba(255,255,255,0.04)'}},y:{ticks:{color:'#5f6672',font:{size:10},callback:v=>v+'%'},grid:{color:'rgba(255,255,255,0.04)'}}}}});
}

// ════════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  renderParams();
  renderWatchlistChips();
  renderManualFundamentals();
  calcLump(); calcSIP(); calcFair(); calcCAGR();
  fetchIndices();
  // Auto-refresh indices every 60s
  setInterval(fetchIndices, 60000);
});
