const FILES=['Ventos(DATA).csv','Ventos_2(DATA).csv'];
const PAGE_SIZE=50;
let allData=[],filtered=[],charts={},currentPage=1;
let activeTab='limonene'; // 'limonene' | 'orange'

const PAL=['#6366f1','#818cf8','#34d399','#fb923c','#f87171','#a78bfa','#38bdf8','#fbbf24','#f472b6','#22d3ee','#4ade80','#e879f9','#facc15','#2dd4bf','#c084fc'];
const PAL_ORANGE=['#fb923c','#fbbf24','#f97316','#fde68a','#fdba74','#f59e0b','#fcd34d','#ea580c','#d97706','#fef08a','#c2410c','#fef3c7','#92400e','#fffbeb','#78350f'];

// ── Classification helpers ──
const LIMONENE_RE = /LIMONENE|LIMONEN|D-LIMONEN|CPO|COLD\s*PRESS/i;
const ORANGE_RE   = /ORANGE|NARANJA|SINENSAL|SINENSIS|CITRUS\s*SIN|ACEITE.*NARAN|NARAN.*ACEITE/i;

function classifyProduct(raw) {
  if (!raw) return null;
  const u = raw.toUpperCase();
  if (LIMONENE_RE.test(u)) return 'limonene';
  if (ORANGE_RE.test(u))   return 'orange';
  return null;
}

function parseNum(s){if(!s)return 0;s=s.toString().trim().replace(/\./g,'').replace(',','.');const n=parseFloat(s);return isNaN(n)?0:n;}
function parseDate(s){if(!s)return null;const p=s.trim().split('/');return p.length===3?new Date(+p[2],+p[1]-1,+p[0]):null;}
function fmtNum(n,d=0){return n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});}
function findKey(o,sub){const s=sub.toLowerCase();for(const k of Object.keys(o))if(k.toLowerCase().includes(s))return k;return null;}

/* ── Canonical company names ── */
function canonBuyer(s){
  const u=s.toUpperCase().trim();
  if(/VENTOS.*(ESENCIA|QUIMICO|SA DE CV)/.test(u)||u==='VENTOS ERNESTO VENTOS')return'Ventos México';
  if(/VENTOS COLOMBIA/.test(u))return'Ventos Colombia';
  if(/VENTOS INDIA|VENTOS VOS/.test(u))return'Ventos India';
  if(/PT VENTOS/.test(u))return'Ventos Indonesia';
  if(/ERNESTO VENTOS/.test(u)||/CUALDE.*ERNESTO/.test(u))return'Ernesto Ventos (HQ)';
  if(/FLORASINTESIS/.test(u))return'Florasíntesis';
  if(/INNOVATIVE/.test(u))return'Innovative Pvt Ltd';
  if(/PRODUCTORA NACIONAL/.test(u))return'Pronarom';
  if(/CALLIZO/.test(u))return'Callizo Aromas';
  if(/LA TOUR/.test(u))return'La Tour S.A.';
  if(/STANDARD PVT/.test(u))return'Standard Pvt';
  if(/AROMA UKRAINE/.test(u))return'Aroma Ukraine';
  if(/MAGIC FLAVORS/.test(u))return'Magic Flavors';
  if(/SHONU/.test(u))return'Shonu va Beklar';
  if(/TRAFALGAR/.test(u))return'Trafalgar SRL';
  if(/FRANSCENT/.test(u))return'Franscent Pvt Ltd';
  if(/KERRY/.test(u))return'Kerry Ingredients India';
  if(/EXTRACTOS ANDINOS/.test(u))return'Extractos Andinos';
  if(/INTERNATIONAL FRAGRANCE/.test(u))return'Intl Fragrance Factory';
  if(/JOINT UKRAINIAN/.test(u))return'JV Ukrainian-German';
  if(/SYNAROME/.test(u))return'Synarome';
  if(/SENSULA/.test(u))return'Sensula Fragrance';
  if(/B A ENTERPRISE/.test(u)||/B\.A\. ENTERPRISE/.test(u))return'B A Enterprise';
  if(/NATURAROM/.test(u))return'Naturarom';
  if(/SENSIENT/.test(u))return'Sensient India';
  if(/M\.M ENTER/.test(u)||u==='M.M ENTERPRISES')return'M.M Enterprises';
  if(/AROMCOLOR/.test(u))return'Aromcolor';
  if(/BELL MORE/.test(u))return'Bell More Aeromatics';
  if(/PIFFANY/.test(u))return'Piffany Co.';
  if(/SOLAR NATURE/.test(u))return'Solar Nature';
  if(/CORNISH/.test(u))return'Cornish Food Industries';
  return s.trim();
}
function canonSupplier(s){
  const u=s.toUpperCase().trim();
  if(/ERNESTO VENTOS|^VENTOS$/.test(u.replace(/[^A-Z ]/g,' ').trim())||/ERNESTO VENTOS/.test(u))return'Ernesto Ventos';
  if(/VENTOS INDIA|VENTOS VOS/.test(u))return'Ventos India';
  if(/INDESSO/.test(u))return'Indesso Aroma';
  if(/NANKAI/.test(u))return'Nankai Indonesia';
  if(/ETERNIS/.test(u))return'Eternis Fine Chemicals';
  if(/VAN AROMA/.test(u))return'Van Aroma';
  if(/PRIVI/.test(u))return'Privi Speciality Chemicals';
  if(/RADOIN/.test(u))return'Radoin JSC';
  if(/SOM EXTRACTS/.test(u))return'Som Extracts';
  if(/AARAV/.test(u))return'Aarav Fragrances';
  if(/KLJ ORGANIC/.test(u))return'KLJ Organic';
  if(/AROMATICOS QUIMICOS/.test(u))return'Aromáticos Químicos Potosinos';
  if(/AROMA ATSIRI/.test(u))return'Aroma Atsiri Indonesia';
  if(/WENZHOU/.test(u))return'Wenzhou Yahua';
  if(/NOT DECLARED/.test(u))return'(Não declarado)';
  return s.trim();
}

/* ── Variant label: preserves meaningful distinctions within each group ── */
function variantLabel(raw, tab) {
  if (!raw) return '(Desconhecido)';
  let t = raw.toUpperCase().trim();
  // Strip packaging noise
  t = t.replace(/INTO\s+\d*\s*PALLETS?.*/i,'')
       .replace(/IRON DRUMS?/ig,'')
       .replace(/\(ESSENTIAL OIL\),?/ig,'')
       .replace(/\bIPC\s*\d+/ig,'')
       .replace(/\(FOR MFG.*?\)/ig,'')
       .replace(/\b(USP|BASF|FIRMENICH|IFF|KAO)\b/g,'')
       .replace(/\d{5,}/g,'')
       .replace(/,\s*$/,'').trim();

  if (tab === 'limonene') {
    // Distinguish: Natural vs Synthetic, food grade, origin
    if (/NATURAL/.test(t))    return 'd-Limonene Natural';
    if (/FOOD\s*GRADE/.test(t)) return 'd-Limonene Food Grade';
    if (/SYNTHETIC/.test(t))  return 'd-Limonene Synthetic';
    if (/CPO|COLD\s*PRESS/.test(t)) return 'CPO (Cold Pressed Orange)';
    if (/BRAZIL|BRASIL/.test(t))  return 'd-Limonene (Brazil)';
    if (/CHINA/.test(t))          return 'd-Limonene (China)';
    if (/INDIA/.test(t))          return 'd-Limonene (India)';
    if (/ARGENTINA/.test(t))      return 'd-Limonene (Argentina)';
    return 'd-Limonene';
  }

  if (tab === 'orange') {
    // Distinguish: fold/5-fold/10-fold, Brazil, cold pressed, terpeneless
    if (/TERPENELESS|TERPENE\s*LESS/.test(t)) return 'Orange Oil Terpeneless';
    if (/10\s*FOLD|TEN\s*FOLD/.test(t))   return 'Orange Oil 10-Fold';
    if (/5\s*FOLD|FIVE\s*FOLD/.test(t))   return 'Orange Oil 5-Fold';
    if (/COLD\s*PRESS/.test(t))           return 'Orange Oil Cold Pressed';
    if (/BRAZIL|BRASIL/.test(t))          return 'Orange Oil (Brazil)';
    if (/ARGENTINA/.test(t))              return 'Orange Oil (Argentina)';
    if (/MEXICO|MÉXI/.test(t))            return 'Orange Oil (Mexico)';
    if (/CHINA/.test(t))                  return 'Orange Oil (China)';
    if (/SINENSAL|SINENSIS/.test(t))      return 'Citrus Sinensis Oil';
    if (/ACEITE.*NARAN|NARAN.*ACEITE|ACEITE DE NARAN/.test(t)) return 'Aceite de Naranja';
    return 'Orange Oil';
  }

  return t.length <= 40
    ? t.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    : t.split(/[\s,;(]+/).filter(w => w.length > 2).slice(0, 3).join(' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/* ── Region grouping ── */
function regionOf(country){
  if(!country)return'Outros';
  const c=country.toUpperCase();
  if(['MEXICO'].includes(c))return'México';
  if(['COLOMBIA'].includes(c))return'Colômbia';
  if(['ECUADOR'].includes(c))return'Equador';
  if(['PARAGUAY'].includes(c))return'Paraguai';
  if(['INDIA','SRI LANKA','BANGLADESH'].includes(c))return'Sul da Ásia';
  if(['PAKISTAN'].includes(c))return'Paquistão';
  if(['UZBEKISTAN','KAZAKHSTAN'].includes(c))return'Ásia Central';
  if(['UKRAINE','RUSSIAN FEDERATION'].includes(c))return'Europa Oriental';
  if(['SPAIN','GERMANY','FRANCE','ITALY','UNITED KINGDOM','NETHERLANDS','BELGIUM','SWITZERLAND','AUSTRIA','IRELAND','ROMANIA','BULGARIA'].some(x=>c.includes(x)))return'Europa Ocidental';
  if(c.includes('UNITED STATES')||c==='USA')return'América do Norte';
  if(['INDONESIA','VIET NAM','MALAYSIA','THAILAND','SINGAPORE'].includes(c))return'Sudeste Asiático';
  if(['CHINA','JAPAN','HONG KONG','TAIWAN'].some(x=>c.includes(x)))return'Leste Asiático';
  if(['BRAZIL','ARGENTINA','PERU','URUGUAY','CHILE'].includes(c))return'Brasil & Cone Sul';
  if(['UGANDA','NIGERIA','SOUTH AFRICA','MOROCCO','EGYPT','MADAGASCAR','SOMALIA','MALI'].some(x=>c.includes(x)))return'África';
  if(['ISRAEL'].includes(c))return'Oriente Médio';
  if(c.includes('GUATEMALA')||c.includes('EL SALVADOR')||c.includes('HONDURAS')||c.includes('DOMINICA'))return'América Central';
  return'Outros';
}

/* ── Load data ── */
async function loadData(){
  const results=[];
  for(const f of FILES){
    try {
      const res = await fetch(f);
      if (!res.ok) throw new Error(`HTTP ${res.status} ao carregar ${f}`);
      const buf = await res.arrayBuffer();
      const text = new TextDecoder('windows-1252').decode(buf);
      const parsed = Papa.parse(text,{header:true,delimiter:';',skipEmptyLines:true});
      results.push(...parsed.data);
    } catch(e) {
      console.error('Erro ao carregar', f, e);
    }
  }

  if (!results.length) {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('insightsContent').innerHTML = '<p style="color:#f87171">Erro ao carregar os arquivos CSV. Verifique o deploy.</p>';
    return;
  }

  const sample = results[0] || {};
  const bKeys = Object.keys(sample).filter(k => k.toLowerCase().includes('buyer'));
  const K = {
    data:    findKey(sample,'data'),
    buyer:   bKeys.find(k => !k.toLowerCase().includes('country')) || 'Buyer',
    buyerCountry: findKey(sample,'buyer country'),
    provedor:  findKey(sample,'provedor'),
    paisProv:  findKey(sample,'do provedor'),
    hs:        findKey(sample,'digo hs') || findKey(sample,'hs'),
    produto:   findKey(sample,'do produto'),
    qtd:       findKey(sample,'quantidade'),
    unidade:   findKey(sample,'unidade'),
    valor:     findKey(sample,'valor'),
    direcao:   findKey(sample,'comercial') || findKey(sample,'dire'),
  };

  allData = results.map(r => {
    const d = parseDate(r[K.data]); if (!d) return null;
    const rawProduct = (r[K.produto] || '').trim();
    const tab = classifyProduct(rawProduct);
    if (!tab) return null; // skip rows not matching either product
    const buyer    = canonBuyer(r[K.buyer] || '');
    const supplier = canonSupplier(r[K.provedor] || '');
    const bCountry = (r[K.buyerCountry] || '').trim();
    return {
      date:    d,
      dateStr: r[K.data],
      buyer,
      buyerCountry: bCountry,
      supplier,
      supplierCountry: (r[K.paisProv] || '').trim(),
      productRaw: rawProduct,
      tab,   // 'limonene' | 'orange'
      // variant is computed per-tab on demand
      hsCode:    (r[K.hs] || '').trim(),
      qty:       parseNum(r[K.qtd]),
      unit:      (r[K.unidade] || '').trim(),
      value:     parseNum(r[K.valor]),
      direction: (r[K.direcao] || '').trim(),
      region:    regionOf(bCountry),
      isInternal: buyer.toLowerCase().includes('ventos') || buyer.toLowerCase().includes('ernesto'),
    };
  }).filter(Boolean).sort((a,b) => a.date - b.date);

  // Pre-compute variant labels
  allData.forEach(r => { r.product = variantLabel(r.productRaw, r.tab); });

  populateFilters();
  applyFilters();
  document.getElementById('loader').classList.add('hidden');
}

/* ── Tab switching ── */
function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  // Recolour KPI gradient accent
  document.documentElement.style.setProperty(
    '--tab-accent', tab === 'limonene' ? '#6366f1' : '#fb923c'
  );
  document.documentElement.style.setProperty(
    '--tab-accent2', tab === 'limonene' ? '#818cf8' : '#fbbf24'
  );
  // Update chart titles
  document.getElementById('chartTimelineTitle').textContent =
    tab === 'limonene' ? '📈 Faturamento d-Limonene por Mês' : '📈 Faturamento Orange Oil por Mês';
  document.getElementById('chartProductsTitle').textContent =
    tab === 'limonene' ? '🧪 Top 15 Variantes d-Limonene (Valor)' : '🍊 Top 15 Variantes Orange Oil (Valor)';
  // Reset filters and repopulate
  document.querySelectorAll('.filters-bar select').forEach(s => s.value = '');
  document.querySelectorAll('.filters-bar input').forEach(i => i.value = '');
  // Clear old filter options (keep first "Todos")
  ['filterBuyerCountry','filterSupplierCountry','filterBuyer','filterSupplier','filterDirection'].forEach(id => {
    const sel = document.getElementById(id);
    while (sel.options.length > 1) sel.remove(1);
  });
  populateFilters();
  applyFilters();
}

function tabData() {
  return allData.filter(r => r.tab === activeTab);
}

function populateFilters(){
  const data = tabData();
  const fill = (id, key) => {
    const sel = document.getElementById(id);
    [...new Set(data.map(r => r[key]).filter(Boolean))].sort().forEach(v => {
      const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o);
    });
  };
  fill('filterBuyerCountry','buyerCountry');
  fill('filterSupplierCountry','supplierCountry');
  fill('filterBuyer','buyer');
  fill('filterSupplier','supplier');
  fill('filterDirection','direction');
}

function applyFilters(){
  const gv = id => document.getElementById(id).value;
  const from = gv('filterDateFrom'), to = gv('filterDateTo'),
        bc = gv('filterBuyerCountry'), sc = gv('filterSupplierCountry'),
        bu = gv('filterBuyer'),        su = gv('filterSupplier'),
        di = gv('filterDirection');
  filtered = tabData().filter(r => {
    if (from && r.date < new Date(from)) return false;
    if (to   && r.date > new Date(to + 'T23:59:59')) return false;
    if (bc && r.buyerCountry    !== bc) return false;
    if (sc && r.supplierCountry !== sc) return false;
    if (bu && r.buyer           !== bu) return false;
    if (su && r.supplier        !== su) return false;
    if (di && r.direction       !== di) return false;
    return true;
  });
  currentPage = 1;
  updateKPIs(); updateCharts(); updateInsights(); updateTable(); updateHeaderMeta();
}

function updateKPIs(){
  const tv = filtered.reduce((s,r) => s + r.value, 0);
  const tq = filtered.reduce((s,r) => s + r.qty,   0);
  document.getElementById('kpiTotalValue').textContent = '$ ' + fmtNum(tv, 2);
  document.getElementById('kpiTotalTx').textContent    = fmtNum(filtered.length);
  document.getElementById('kpiTotalQty').textContent   = fmtNum(tq, 0);
  document.getElementById('kpiAvgPrice').textContent   = '$ ' + fmtNum(tq > 0 ? tv / tq : 0, 2);
  document.getElementById('kpiBuyerCountries').textContent =
    new Set(filtered.map(r => r.buyerCountry).filter(Boolean)).size;
  const uniqueSuppliers = new Set(
    filtered.map(r => r.supplier).filter(Boolean)
      .map(s => (s.toLowerCase().includes('ventos') || s.toLowerCase().includes('ernesto')) ? 'Grupo Ventos' : s)
  ).size;
  document.getElementById('kpiSuppliers').textContent = uniqueSuppliers;
}

function updateHeaderMeta(){
  document.getElementById('totalRecords').textContent = fmtNum(filtered.length) + ' registros';
  if (filtered.length) {
    document.getElementById('dateRange').textContent =
      filtered[0].dateStr + ' → ' + filtered[filtered.length - 1].dateStr;
  }
}

function topN(arr,key,vk,n){const m={};arr.forEach(r=>{const k=r[key];if(k)m[k]=(m[k]||0)+r[vk];});
  return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n);}
function destroyChart(n){if(charts[n]){charts[n].destroy();delete charts[n];}}

if(typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

function getPal() { return activeTab === 'limonene' ? PAL : PAL_ORANGE; }
function getAccent() { return activeTab === 'limonene' ? 'rgba(99,102,241,.5)' : 'rgba(251,146,60,.5)'; }
function getAccentBorder() { return activeTab === 'limonene' ? '#6366f1' : '#fb923c'; }
function getProductsAccent() { return activeTab === 'limonene' ? 'rgba(99,102,241,.5)' : 'rgba(251,146,60,.5)'; }
function getProductsBorder() { return activeTab === 'limonene' ? '#818cf8' : '#fbbf24'; }

const cDef = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    datalabels: {
      color: '#e2e8f0', font: { size: 10, weight: '600' },
      anchor: 'end', align: 'start', offset: 4,
      formatter: v => {
        let val = typeof v === 'object' ? (v.x || v.y || 0) : v;
        if (val >= 1000000) return '$' + (val/1000000).toFixed(1) + 'M';
        if (val >= 1000)    return '$' + Math.round(val/1000) + 'k';
        return '$' + Math.round(val);
      }
    },
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a2035', borderColor: '#232a3f', borderWidth: 1,
      titleColor: '#e2e8f0', bodyColor: '#94a3b8',
      callbacks: { label: ctx => '$ ' + fmtNum(ctx.parsed.x || ctx.parsed.y || ctx.parsed || 0, 2) }
    }
  },
  scales: {
    x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1e293b' } },
    y: { ticks: { color: '#64748b', font: { size: 10 }, callback: v => '$ ' + fmtNum(v) }, grid: { color: '#1e293b' } }
  }
};

const hBar = (id, data, name) => {
  destroyChart(name);
  charts[name] = new Chart(document.getElementById(id), {
    type: 'bar',
    data: {
      labels: data.map(d => d[0].substring(0, 30)),
      datasets: [{ data: data.map(d => d[1]), backgroundColor: getPal().slice(0, data.length), borderRadius: 6 }]
    },
    options: {
      ...cDef, indexAxis: 'y',
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 }, callback: v => '$ ' + fmtNum(v) }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { display: false } }
      }
    }
  });
};

function updateCharts(){
  // 1 Timeline
  const mo = {};
  filtered.forEach(r => {
    const k = r.date.getFullYear() + '-' + String(r.date.getMonth()+1).padStart(2,'0');
    mo[k] = (mo[k] || 0) + r.value;
  });
  const mk = Object.keys(mo).sort();
  destroyChart('timeline');
  charts.timeline = new Chart(document.getElementById('chartTimeline'), {
    type: 'bar',
    data: { labels: mk, datasets: [{ data: mk.map(k => mo[k]), backgroundColor: getAccent(), borderColor: getAccentBorder(), borderWidth: 1, borderRadius: 6 }] },
    options: { ...cDef }
  });

  // 2 Buyer Country
  hBar('chartBuyerCountry', topN(filtered,'buyerCountry','value',10), 'buyerCountry');

  // 3 Top Buyers (External only)
  hBar('chartBuyers', topN(filtered.filter(r => !r.isInternal),'buyer','value',10), 'buyers');

  // 4 Top Suppliers
  hBar('chartSuppliers', topN(filtered,'supplier','value',10), 'suppliers');

  // 5 Supplier Country doughnut
  const scD = topN(filtered,'supplierCountry','value',10);
  destroyChart('supplierCountry');
  charts.supplierCountry = new Chart(document.getElementById('chartSupplierCountry'), {
    type: 'doughnut',
    data: { labels: scD.map(d => d[0]), datasets: [{ data: scD.map(d => d[1]), backgroundColor: getPal(), borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '55%',
      plugins: {
        datalabels: { display: false },
        legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 }, padding: 8 } },
        tooltip: {
          backgroundColor: '#1a2035', borderColor: '#232a3f', borderWidth: 1,
          callbacks: { label: ctx => ctx.label + ': $ ' + fmtNum(ctx.parsed, 2) }
        }
      }
    }
  });

  // 6 Top Variants
  const pd = topN(filtered,'product','value',15);
  destroyChart('products');
  charts.products = new Chart(document.getElementById('chartProducts'), {
    type: 'bar',
    data: {
      labels: pd.map(d => d[0].substring(0, 35)),
      datasets: [{ data: pd.map(d => d[1]), backgroundColor: getProductsAccent(), borderColor: getProductsBorder(), borderWidth: 1, borderRadius: 4 }]
    },
    options: {
      ...cDef,
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 8 }, maxRotation: 45 }, grid: { display: false } },
        y: { ticks: { color: '#64748b', font: { size: 10 }, callback: v => '$ ' + fmtNum(v) }, grid: { color: '#1e293b' } }
      }
    }
  });

  // 7 Avg Price per Variant per Region
  updatePriceChart();
}

function updatePriceChart(){
  const prodVal = {};
  filtered.forEach(r => { if (r.product && r.qty > 0) prodVal[r.product] = (prodVal[r.product] || 0) + r.value; });
  const topProds = Object.entries(prodVal).sort((a,b) => b[1]-a[1]).slice(0,8).map(e => e[0]);

  const regVal = {};
  filtered.forEach(r => {
    if (r.region && r.qty > 0 && topProds.includes(r.product))
      regVal[r.region] = (regVal[r.region] || 0) + r.value;
  });
  const topRegs = Object.entries(regVal).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0]);

  const matrix = {};
  filtered.forEach(r => {
    if (!topProds.includes(r.product) || r.qty <= 0 || !topRegs.includes(r.region)) return;
    if (!matrix[r.region]) matrix[r.region] = {};
    if (!matrix[r.region][r.product]) matrix[r.region][r.product] = { val: 0, qty: 0 };
    matrix[r.region][r.product].val += r.value;
    matrix[r.region][r.product].qty += r.qty;
  });

  const pal = getPal();
  const datasets = topRegs.map((reg, i) => ({
    label: reg,
    data: topProds.map(p => matrix[reg] && matrix[reg][p] ? +(matrix[reg][p].val / matrix[reg][p].qty).toFixed(2) : 0),
    backgroundColor: pal[i % pal.length],
    borderRadius: 4
  }));

  destroyChart('priceRegion');
  charts.priceRegion = new Chart(document.getElementById('chartPriceRegion'), {
    type: 'bar',
    data: { labels: topProds.map(p => p.substring(0, 25)), datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        datalabels: { color: '#e2e8f0', font: { size: 9 }, anchor: 'end', align: 'start', offset: 2, formatter: v => v > 0 ? '$' + v.toFixed(1) : '' },
        legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 9 }, padding: 6 } },
        tooltip: {
          backgroundColor: '#1a2035', borderColor: '#232a3f', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8',
          callbacks: { label: ctx => ctx.dataset.label + ': $ ' + fmtNum(ctx.parsed.y, 2) + '/kg' }
        }
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 8 }, maxRotation: 35 }, grid: { display: false } },
        y: {
          title: { display: true, text: 'USD / kg', color: '#64748b', font: { size: 10 } },
          ticks: { color: '#64748b', font: { size: 10 }, callback: v => '$ ' + fmtNum(v, 2) },
          grid: { color: '#1e293b' }
        }
      }
    }
  });
}

function updateInsights() {
  const container = document.getElementById('insightsContent');
  if (filtered.length === 0) {
    container.innerHTML = '<p>Não há dados suficientes no período selecionado para gerar insights.</p>';
    return;
  }

  const label = activeTab === 'limonene' ? 'd-Limonene' : 'Orange Oil';
  const totalValue = filtered.reduce((s,r) => s + r.value, 0);
  const extData    = filtered.filter(r => !r.isInternal);
  const intData    = filtered.filter(r =>  r.isInternal);
  const extValue   = extData.reduce((s,r) => s + r.value, 0);
  const intValue   = intData.reduce((s,r) => s + r.value, 0);
  const pct = (val, base = totalValue) => base > 0 ? ((val / base) * 100).toFixed(1) + '%' : '0%';

  const topProd = topN(filtered, 'product',  'value', 1)[0];
  const topSup  = topN(filtered, 'supplier', 'value', 1)[0];
  const topReg  = topN(filtered, 'region',   'value', 1)[0];
  const biggestExt = extData.reduce((max,r) => r.value > (max ? max.value : 0) ? r : max, null);
  const biggestInt = intData.reduce((max,r) => r.value > (max ? max.value : 0) ? r : max, null);

  // Price trend: compare first half vs second half
  const half = Math.floor(filtered.length / 2);
  const avgPriceFirst = half > 0 ? filtered.slice(0, half).reduce((s,r) => s + (r.qty > 0 ? r.value/r.qty : 0), 0) / half : 0;
  const avgPriceLast  = half > 0 ? filtered.slice(half).reduce((s,r) => s + (r.qty > 0 ? r.value/r.qty : 0), 0) / (filtered.length - half) : 0;
  const priceTrend = avgPriceFirst > 0 ? ((avgPriceLast - avgPriceFirst) / avgPriceFirst * 100).toFixed(1) : null;

  let html = `<p>Visão <strong>${label}</strong>: analisadas <strong>${fmtNum(filtered.length)} transações</strong> totalizando <strong>$ ${fmtNum(totalValue, 2)}</strong>. 
    Vendas externas: <strong>${pct(extValue)} ($ ${fmtNum(extValue, 2)})</strong> · 
    Transferências internas: <strong>${pct(intValue)} ($ ${fmtNum(intValue, 2)})</strong>.</p><ul>`;

  if (topProd) {
    html += `<li><strong>Variante Dominante:</strong> <strong>${topProd[0]}</strong> representou <strong>${pct(topProd[1])}</strong> do valor total desta visão.</li>`;
  }
  if (topReg) {
    html += `<li><strong>Região Destino #1:</strong> <strong>${topReg[0]}</strong> foi o principal mercado consumidor, com <strong>$ ${fmtNum(topReg[1], 2)}</strong> movimentados.</li>`;
  }
  if (biggestExt) {
    const pKg = biggestExt.qty > 0 ? biggestExt.value / biggestExt.qty : 0;
    html += `<li><strong>Maior Venda Externa:</strong> <strong>${biggestExt.product}</strong> de <em>${biggestExt.supplierCountry}</em> → <em>${biggestExt.buyer} (${biggestExt.buyerCountry})</em> · <strong>$ ${fmtNum(biggestExt.value, 2)}</strong> · $ ${fmtNum(pKg, 2)}/kg.</li>`;
  }
  if (biggestInt) {
    const pKg = biggestInt.qty > 0 ? biggestInt.value / biggestInt.qty : 0;
    html += `<li><strong>Maior Transferência Interna:</strong> <strong>${biggestInt.product}</strong> de <em>${biggestInt.supplierCountry}</em> → <em>${biggestInt.buyer} (${biggestInt.buyerCountry})</em> · <strong>$ ${fmtNum(biggestInt.value, 2)}</strong> · $ ${fmtNum(pKg, 2)}/kg.</li>`;
  }
  if (topSup) {
    html += `<li><strong>Fornecedor Líder:</strong> <strong>${topSup[0]}</strong> com <strong>$ ${fmtNum(topSup[1], 2)}</strong> em transações totais.</li>`;
  }
  if (priceTrend !== null) {
    const dir = parseFloat(priceTrend) >= 0 ? '📈 subiu' : '📉 caiu';
    html += `<li><strong>Tendência de Preço:</strong> o preço médio por kg ${dir} <strong>${Math.abs(priceTrend)}%</strong> comparando a primeira e a segunda metade do período filtrado.</li>`;
  }

  html += '</ul>';
  container.innerHTML = html;
}

function updateTable(){
  const tbody = document.getElementById('dataBody');
  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filtered.slice(start, start + PAGE_SIZE);
  document.getElementById('tableCount').textContent = `(${fmtNum(filtered.length)} registros)`;
  tbody.innerHTML = page.map(r => `<tr>
    <td>${r.dateStr}</td>
    <td title="${r.buyer}">${r.buyer.substring(0,35)}</td>
    <td>${r.buyerCountry}</td>
    <td title="${r.supplier}">${r.supplier.substring(0,30)}</td>
    <td>${r.supplierCountry}</td>
    <td title="${r.productRaw}">${r.product.substring(0,40)}</td>
    <td style="text-align:right">${fmtNum(r.qty,2)}</td>
    <td>${r.unit}</td>
    <td style="text-align:right">$ ${fmtNum(r.value,2)}</td>
    <td>${r.direction}</td>
  </tr>`).join('');

  const tp = Math.ceil(filtered.length / PAGE_SIZE);
  const pg = document.getElementById('pagination');
  if (tp <= 1) { pg.innerHTML = ''; return; }
  let h = '';
  if (currentPage > 1) h += `<button onclick="goPage(${currentPage-1})">← Ant</button>`;
  let s = Math.max(1, currentPage-3), e = Math.min(tp, currentPage+3);
  if (s > 1) h += `<button onclick="goPage(1)">1</button><button disabled>…</button>`;
  for (let i = s; i <= e; i++) h += `<button class="${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
  if (e < tp) h += `<button disabled>…</button><button onclick="goPage(${tp})">${tp}</button>`;
  if (currentPage < tp) h += `<button onclick="goPage(${currentPage+1})">Próx →</button>`;
  pg.innerHTML = h;
}
function goPage(p) { currentPage = p; updateTable(); document.querySelector('.table-section').scrollIntoView({behavior:'smooth'}); }

// Event listeners
document.querySelectorAll('.filters-bar select, .filters-bar input').forEach(el => el.addEventListener('change', applyFilters));
document.getElementById('btnClear').addEventListener('click', () => {
  document.querySelectorAll('.filters-bar select').forEach(s => s.value = '');
  document.querySelectorAll('.filters-bar input').forEach(i => i.value = '');
  applyFilters();
});
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
});

loadData();
