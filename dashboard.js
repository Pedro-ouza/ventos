const FILES=['Ventos(DATA).csv','Ventos_2(DATA).csv'];
const PAGE_SIZE=50;
let allData=[],filtered=[],charts={},currentPage=1,activeCategory='all';
const PAL=['#6366f1','#818cf8','#34d399','#fb923c','#f87171','#a78bfa','#38bdf8','#fbbf24','#f472b6','#22d3ee','#4ade80','#e879f9','#facc15','#2dd4bf','#c084fc'];

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
  if(/KERRY/.test(u))return'Kerry Ingredients';
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

/* ── Simplify product names ── */
function simplifyProduct(s){
  if(!s)return'(Desconhecido)';
  let t=s.toUpperCase().trim();
  // Remove packaging/logistics noise
  t=t.replace(/INTO\s+\d*\s*PALLETS?.*/i,'').replace(/IRON DRUMS?/i,'').replace(/\(ESSENTIAL OIL\),?/ig,'')
   .replace(/\bIPC\s*\d+/ig,'').replace(/\(FOR MFG.*?\)/ig,'').replace(/\bUSP\b/g,'').replace(/\bBASF\b/g,'')
   .replace(/\bFIRMENICH\b/g,'').replace(/\bIFF\b/g,'').replace(/\bKAO\b/g,'').replace(/\d{4,}/g,'')
   .replace(/\bM EXTRA\b/g,'').replace(/,\s*$/,'').trim();
  // Known mappings
  const map={
    'MEZCLA DE SUSTANCIA ODORIFERA':'Mezcla Odorífera','MEZCLA DE SUSTANCIAS ODORIFERAS':'Mezcla Odorífera',
    'ACEITE ESENCIAL DE MENTA':'Peppermint Oil','MENTA ESENCIA':'Peppermint Oil','PEPPERMINT OIL':'Peppermint Oil',
    'ACEITE ESENCIAL DE MENTA PIPERITA':'Peppermint Oil','AC ES SPEARMINT':'Spearmint Oil',
    'PATCHOULI INDONESIA, LIGHT':'Patchouli Oil','PATCHOULI OIL, INDONESIA':'Patchouli Oil',
    'PATCHOULI OIL INDONESIA':'Patchouli Oil','PATCHOULI OIL':'Patchouli Oil',
    'PATCHOULI OIL INDONESIA LIGHT':'Patchouli Oil','PATCHOULY DECOLORIZED':'Patchouli Oil',
    'PATCHOULY LIGHT BYP':'Patchouli Oil','ACEITE ESENCIAL DE PATCHOULI':'Patchouli Oil',
    'ORANGE OIL BRAZIL':'Orange Oil','ORANGE OIL  BRAZIL':'Orange Oil','ACEITE DE NARANJA':'Orange Oil',
    'ACEITE ESENCIAL DE PINO':'Pine Oil','ACEITE ESENCIAL':'Essential Oil (Misc)',
    'MUESTRAS DE ACEITES ESENCIALES':'Muestras (Samples)','MUESTRA DE ACEITE ESENCIAL':'Muestras (Samples)',
    'COCONUT OIL':'Coconut Oil','CINNAMON BARK OIL':'Cinnamon Oil','ROSE OIL':'Rose Oil',
    'VETIVER OIL':'Vetiver Oil','NUTMEG OIL':'Nutmeg Oil','AMYRIS OIL':'Amyris Oil','MACE OIL':'Mace Oil',
    'CLARY SAGE OIL CLARY SAGE OIL':'Clary Sage Oil','CARROT SEED OIL':'Carrot Seed Oil',
    'LAVENDER OIL SPIKE':'Lavender Oil','GERANIUM OIL CHINA':'Geranium Oil',
    'CARDAMOMO OIL':'Cardamom Oil','ACEITE AJO':'Garlic Oil',
    'COMPUESTO AROMATICO WS-3':'WS-3 Cooling Agent','NON-ALCOHOLIC PERFUMERY COMPOUND':'Perfumery Compound',
    'CAPSICUM OLEORESIN 6%':'Capsicum Oleoresin','ACIDO PROPIONICO':'Propionic Acid','PROPIONIC ACID':'Propionic Acid',
    'BUTIRATO DE CIS-3-HEXENILO':'cis-3-Hexenyl Butyrate','CIS-3-HEXENYL BUTYRATE':'cis-3-Hexenyl Butyrate',
    'ALDEHIDO C-6':'Aldehyde C-6','ACETATO DE HEXILO':'Hexyl Acetate','ACETATO DE VETIVERILO':'Vetiveryl Acetate',
    'ALCOHOL BENCILICO':'Benzyl Alcohol','VAINILLIN':'Vanillin','CINAMIL NITRILO':'Cinnamyl Nitrile',
    'DAMASCONE BETA':'Damascone Beta','DAMASCONA BETA':'Damascone Beta','IONONA':'Ionone',
    'LIMONENE-D NATURAL':'d-Limonene','D-LIMONENE':'d-Limonene',
    'ESTER DE ETILENO DEL ACIDO CINAMICO (ETHYL CINNAMATE)':'Ethyl Cinnamate',
    'RESINOIDE':'Resinoid','OLIBANUM RESINOID':'Olibanum Resinoid',
    'PHENYL ETHYL PHENYL ACETATE':'Phenyl Ethyl Phenylacetate','PHENYL ETHYL PHENYLACETATE':'Phenyl Ethyl Phenylacetate',
    'SAFRANAL, FOOD GRADE':'Safranal','ACETIC ACID, NATURAL':'Acetic Acid',
    'SAMPLES WITHOUT COMMERCIAL VALUE':'Muestras (Samples)',
  };
  // Check exact match after cleanup
  for(const[k,v]of Object.entries(map)){if(t.includes(k.toUpperCase()))return v;}
  // Oil extraction pattern
  let m=t.match(/(\w[\w\s-]*?)\s*OIL\b/);
  if(m)return m[1].trim().replace(/\b\w/g,c=>c.toUpperCase())+' Oil';
  // If short enough, title-case it
  if(t.length<=40){
    return t.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\s+/g,' ').trim();
  }
  // Extract first meaningful words
  let words=t.split(/[\s,;(]+/).filter(w=>w.length>2&&!/^(THE|AND|FOR|WITH|NOT|INTO|FROM|THAN)$/i.test(w)).slice(0,3);
  if(words.length)return words.join(' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  return s.substring(0,30);
}

/* ── Product category classification ── */
function classifyCategory(productRaw, productSimplified) {
  const raw = productRaw.toUpperCase();
  const simp = productSimplified.toUpperCase();
  if (/D-LIMONENE|LIMONENE-D|LIMONENO/.test(raw) || /D-LIMONENE/.test(simp)) return 'd-limonene';
  // Everything else in the orange line = orange oil (CPO, cold press, orange, naranja, sinensal, sinensis)
  return 'orange-oil';
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
    const res=await fetch(f);
    const buf=await res.arrayBuffer();
    const text=new TextDecoder('windows-1252').decode(buf);
    const parsed=Papa.parse(text,{header:true,delimiter:';',skipEmptyLines:true});
    results.push(...parsed.data);
  }
  const sample=results[0]||{};
  const bKeys=Object.keys(sample).filter(k=>k.toLowerCase().includes('buyer'));
  const K={
    data:findKey(sample,'data'),fonte:findKey(sample,'fonte'),
    buyer:bKeys.find(k=>!k.toLowerCase().includes('country'))||'Buyer',
    buyerCountry:findKey(sample,'buyer country'),
    provedor:findKey(sample,'provedor'),paisProv:findKey(sample,'do provedor'),
    hs:findKey(sample,'digo hs')||findKey(sample,'hs'),
    produto:findKey(sample,'do produto'),qtd:findKey(sample,'quantidade'),
    unidade:findKey(sample,'unidade'),valor:findKey(sample,'valor'),
    direcao:findKey(sample,'comercial')||findKey(sample,'dire'),
    transporte:findKey(sample,'transporte'),
  };
  allData=results.map(r=>{
    const d=parseDate(r[K.data]);if(!d)return null;
    const buyer=canonBuyer(r[K.buyer]||'').toLowerCase();
    const supplier=canonSupplier(r[K.provedor]||'').toLowerCase();
    const bCountry=(r[K.buyerCountry]||'').trim().toLowerCase();
    return{date:d,dateStr:r[K.data],buyer,buyerCountry:bCountry,
      supplier,supplierCountry:(r[K.paisProv]||'').trim().toLowerCase(),
      product:simplifyProduct(r[K.produto]||'').toLowerCase(),
      productRaw:(r[K.produto]||'').trim().toLowerCase(),
      hsCode:(r[K.hs]||'').trim(),
      qty:parseNum(r[K.qtd]),unit:(r[K.unidade]||'').trim().toLowerCase(),
      value:parseNum(r[K.valor]),direction:(r[K.direcao]||'').trim().toLowerCase(),
      region:regionOf(r[K.buyerCountry]||'').toLowerCase(),
      isInternal:buyer.includes('ventos')||buyer.includes('ernesto'),
      category:classifyCategory((r[K.produto]||''), simplifyProduct(r[K.produto]||''))};
  }).filter(r => r && /ORANGE|NARANJA|LIMONENE|CPO|SINENSAL|SINENSIS/i.test(r.productRaw)).sort((a,b)=>a.date-b.date);
  populateFilters();applyFilters();
  document.getElementById('loader').classList.add('hidden');
}

function populateFilters(){
  const fill=(id,key)=>{const sel=document.getElementById(id);
    [...new Set(allData.map(r=>r[key]).filter(Boolean))].sort().forEach(v=>{
      const o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o);});};
  fill('filterBuyerCountry','buyerCountry');fill('filterSupplierCountry','supplierCountry');
  fill('filterBuyer','buyer');fill('filterSupplier','supplier');fill('filterDirection','direction');
}

function applyFilters(){
  const gv=id=>document.getElementById(id).value;
  const from=gv('filterDateFrom'),to=gv('filterDateTo'),bc=gv('filterBuyerCountry'),
    sc=gv('filterSupplierCountry'),bu=gv('filterBuyer'),su=gv('filterSupplier'),di=gv('filterDirection');
  filtered=allData.filter(r=>{
    if(activeCategory!=='all'&&r.category!==activeCategory)return false;
    if(from&&r.date<new Date(from))return false;
    if(to&&r.date>new Date(to+'T23:59:59'))return false;
    if(bc&&r.buyerCountry!==bc)return false;if(sc&&r.supplierCountry!==sc)return false;
    if(bu&&r.buyer!==bu)return false;if(su&&r.supplier!==su)return false;
    if(di&&r.direction!==di)return false;return true;
  });
  currentPage=1;updateKPIs();updateCharts();updateInsights();updateTable();updateHeaderMeta();
}

function updateKPIs(){
  const tv=filtered.reduce((s,r)=>s+r.value,0);
  const tq=filtered.reduce((s,r)=>s+r.qty,0);
  document.getElementById('kpiTotalValue').textContent='$ '+fmtNum(tv,2);
  document.getElementById('kpiTotalTx').textContent=fmtNum(filtered.length);
  document.getElementById('kpiTotalQty').textContent=fmtNum(tq,0);
  document.getElementById('kpiAvgPrice').textContent='$ '+fmtNum(tq>0?tv/tq:0,2);
  document.getElementById('kpiBuyerCountries').textContent=new Set(filtered.map(r=>r.buyerCountry).filter(Boolean)).size;
  
  const uniqueSuppliers = new Set(
    filtered.map(r=>r.supplier)
      .filter(Boolean)
      .map(s=>(s.includes('ventos')||s.includes('ernesto')) ? 'grupo ventos' : s)
  ).size;
  document.getElementById('kpiSuppliers').textContent=uniqueSuppliers;
}
function updateHeaderMeta(){
  document.getElementById('totalRecords').textContent=fmtNum(filtered.length)+' registros';
  if(filtered.length){document.getElementById('dateRange').textContent=filtered[0].dateStr+' → '+filtered[filtered.length-1].dateStr;}
}

function topN(arr,key,vk,n){const m={};arr.forEach(r=>{const k=r[key];if(k)m[k]=(m[k]||0)+r[vk];});
  return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,n);}
function destroyChart(n){if(charts[n]){charts[n].destroy();delete charts[n];}}

if(typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

const cDef={responsive:true,maintainAspectRatio:false,
  plugins:{
    datalabels: {
      color: '#e2e8f0',
      font: { size: 10, weight: '600' },
      anchor: 'end', align: 'start', offset: 4,
      formatter: v => {
        let val = typeof v === 'object' ? (v.x || v.y || 0) : v;
        if(val >= 1000000) return '$' + (val/1000000).toFixed(1) + 'M';
        if(val >= 1000) return '$' + Math.round(val/1000) + 'k';
        return '$' + Math.round(val);
      }
    },
    legend:{display:false},
    tooltip:{backgroundColor:'#1a2035',borderColor:'#232a3f',borderWidth:1,titleColor:'#e2e8f0',bodyColor:'#94a3b8',
      callbacks:{label:ctx=>'$ '+fmtNum(ctx.parsed.x||ctx.parsed.y||ctx.parsed||0,2)}}
  },
  scales:{x:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'#1e293b'}},
    y:{ticks:{color:'#64748b',font:{size:10},callback:v=>'$ '+fmtNum(v)},grid:{color:'#1e293b'}}}};
const hBar=(id,data,name)=>{destroyChart(name);
  charts[name]=new Chart(document.getElementById(id),{type:'bar',
    data:{labels:data.map(d=>d[0].substring(0,30)),datasets:[{data:data.map(d=>d[1]),backgroundColor:PAL.slice(0,data.length),borderRadius:6}]},
    options:{...cDef,indexAxis:'y',scales:{
      x:{ticks:{color:'#64748b',font:{size:10},callback:v=>'$ '+fmtNum(v)},grid:{color:'#1e293b'}},
      y:{ticks:{color:'#94a3b8',font:{size:9}},grid:{display:false}}}}});};

function updateCharts(){
  // 1 Timeline
  const mo={};filtered.forEach(r=>{const k=r.date.getFullYear()+'-'+String(r.date.getMonth()+1).padStart(2,'0');mo[k]=(mo[k]||0)+r.value;});
  const mk=Object.keys(mo).sort();destroyChart('timeline');
  charts.timeline=new Chart(document.getElementById('chartTimeline'),{type:'bar',
    data:{labels:mk,datasets:[{data:mk.map(k=>mo[k]),backgroundColor:'rgba(99,102,241,.5)',borderColor:'#6366f1',borderWidth:1,borderRadius:6}]},
    options:{...cDef}});

  // 2 Buyer Country
  hBar('chartBuyerCountry',topN(filtered,'buyerCountry','value',10),'buyerCountry');

  // 3 Top Buyers (External only)
  const extData=filtered.filter(r=>!r.isInternal);
  const buyData=topN(extData,'buyer','value',10);
  hBar('chartBuyers',buyData,'buyers');

  // 4 Top Suppliers
  hBar('chartSuppliers',topN(filtered,'supplier','value',10),'suppliers');

  // 5 Supplier Country doughnut
  const scD=topN(filtered,'supplierCountry','value',10);destroyChart('supplierCountry');
  charts.supplierCountry=new Chart(document.getElementById('chartSupplierCountry'),{type:'doughnut',
    data:{labels:scD.map(d=>d[0]),datasets:[{data:scD.map(d=>d[1]),backgroundColor:PAL,borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'55%',
      plugins:{
        datalabels:{display:false},
        legend:{position:'right',labels:{color:'#94a3b8',font:{size:10},padding:8}},
        tooltip:{backgroundColor:'#1a2035',borderColor:'#232a3f',borderWidth:1,
          callbacks:{label:ctx=>ctx.label+': $ '+fmtNum(ctx.parsed,2)}}}}});

  // 6 Top Products
  const pd=topN(filtered,'product','value',15);destroyChart('products');
  charts.products=new Chart(document.getElementById('chartProducts'),{type:'bar',
    data:{labels:pd.map(d=>d[0].substring(0,35)),datasets:[{data:pd.map(d=>d[1]),backgroundColor:'rgba(52,211,153,.5)',borderColor:'#34d399',borderWidth:1,borderRadius:4}]},
    options:{...cDef,scales:{x:{ticks:{color:'#64748b',font:{size:8},maxRotation:45},grid:{display:false}},
      y:{ticks:{color:'#64748b',font:{size:10},callback:v=>'$ '+fmtNum(v)},grid:{color:'#1e293b'}}}}});

  // 7 Top 10 Routes
  const routeVal = {};
  const routeQty = {};
  filtered.forEach(r => {
    if (r.qty > 0) {
      const sc = r.supplierCountry || 'origem indefinida';
      const bc = r.buyerCountry || 'destino indefinido';
      const k = `${sc} > ${bc}`;
      routeVal[k] = (routeVal[k] || 0) + r.value;
      routeQty[k] = (routeQty[k] || 0) + r.qty;
    }
  });
  
  const topRoutes = Object.entries(routeVal)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
    
  const routeLabels = topRoutes.map(d => d[0].substring(0,40));
  const routeValues = topRoutes.map(d => d[1]);
  const routeAvgPrices = topRoutes.map(d => routeQty[d[0]] > 0 ? d[1] / routeQty[d[0]] : 0);

  destroyChart('routes');
  charts.routes = new Chart(document.getElementById('chartRoutes'), {
    type: 'bar',
    data: {
      labels: routeLabels,
      datasets: [{
        data: routeValues,
        backgroundColor: PAL.slice(0, 10),
        borderRadius: 4
      }]
    },
    options: {
      ...cDef,
      indexAxis: 'y',
      plugins: {
        ...cDef.plugins,
        tooltip: {
          backgroundColor: '#1a2035', borderColor: '#232a3f', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8',
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed.x;
              const idx = ctx.dataIndex;
              const avg = routeAvgPrices[idx];
              return [
                'Valor Total: $ ' + fmtNum(val, 2),
                'Preço Médio: $ ' + fmtNum(avg, 2) + '/kg'
              ];
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 }, callback: v => '$ ' + fmtNum(v) }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { display: false } }
      }
    }
  });

  // 8 Avg Price per Product per Region (HEATMAP-style grouped bar)
  updatePriceChart();
}

function updatePriceChart(){
  // Get top 8 products by total VALUE
  const prodVal={};
  filtered.forEach(r=>{if(r.product&&r.qty>0){prodVal[r.product]=(prodVal[r.product]||0)+r.value;}});
  const topProds=Object.entries(prodVal).sort((a,b)=>b[1]-a[1]).slice(0,8).map(e=>e[0]);
  
  // Get top 5 regions for these products
  const regVal={};
  filtered.forEach(r=>{
    if(r.region&&r.qty>0&&topProds.includes(r.product)){
      regVal[r.region]=(regVal[r.region]||0)+r.value;
    }
  });
  const topRegs=Object.entries(regVal).sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>e[0]);

  const matrix={};
  filtered.forEach(r=>{
    if(!topProds.includes(r.product)||r.qty<=0||!topRegs.includes(r.region))return;
    const reg=r.region;
    if(!matrix[reg])matrix[reg]={};
    if(!matrix[reg][r.product])matrix[reg][r.product]={val:0,qty:0};
    matrix[reg][r.product].val+=r.value;matrix[reg][r.product].qty+=r.qty;
  });
  
  const datasets=topRegs.map((reg,i)=>({
    label:reg,
    data:topProds.map(p=>matrix[reg]&&matrix[reg][p]?+(matrix[reg][p].val/matrix[reg][p].qty).toFixed(2):0),
    backgroundColor:PAL[i%PAL.length],
    borderRadius:4
  }));
  
  destroyChart('priceRegion');
  charts.priceRegion=new Chart(document.getElementById('chartPriceRegion'),{type:'bar',
    data:{labels:topProds.map(p=>p.substring(0,25)),datasets},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{
        datalabels:{
          color:'#e2e8f0',font:{size:9},anchor:'end',align:'start',offset:2,
          formatter:v=>v>0?'$'+v.toFixed(1):''
        },
        legend:{position:'top',labels:{color:'#94a3b8',font:{size:9},padding:6}},
        tooltip:{backgroundColor:'#1a2035',borderColor:'#232a3f',borderWidth:1,titleColor:'#e2e8f0',bodyColor:'#94a3b8',
          callbacks:{label:ctx=>ctx.dataset.label+': $ '+fmtNum(ctx.parsed.y,2)+'/kg'}}},
      scales:{x:{ticks:{color:'#64748b',font:{size:8},maxRotation:35},grid:{display:false}},
        y:{title:{display:true,text:'USD / kg',color:'#64748b',font:{size:10}},
          ticks:{color:'#64748b',font:{size:10},callback:v=>'$ '+fmtNum(v,2)},grid:{color:'#1e293b'}}}}});
}

function updateInsights() {
  const container = document.getElementById('insightsContent');
  if (filtered.length === 0) {
    container.innerHTML = '<p>Não há dados suficientes no período selecionado para gerar insights.</p>';
    return;
  }

  const totalValue = filtered.reduce((s, r) => s + r.value, 0);
  const extData = filtered.filter(r => !r.isInternal);
  const extValue = extData.reduce((s, r) => s + r.value, 0);
  const intValue = totalValue - extValue;

  const pct = (val, base = totalValue) => base > 0 ? ((val / base) * 100).toFixed(1) + '%' : '0%';

  const topBuyer = topN(extData, 'buyer', 'value', 1)[0];
  const topReg = topN(filtered, 'region', 'value', 1)[0];
  const topSup = topN(filtered, 'supplier', 'value', 1)[0];

  const productFlows = {};
  filtered.forEach(r => {
    if (!r.product || r.qty <= 0) return;
    if (!productFlows[r.product]) {
      productFlows[r.product] = { totalValue: 0, totalQty: 0, routes: {} };
    }
    const flow = productFlows[r.product];
    flow.totalValue += r.value;
    flow.totalQty += r.qty;
    
    const sc = r.supplierCountry || 'Origem Indefinida';
    const bc = r.buyerCountry || 'Destino Indefinido';
    const routeKey = `${sc} ➔ ${bc}`;
    if (!flow.routes[routeKey]) flow.routes[routeKey] = { value: 0, qty: 0 };
    flow.routes[routeKey].value += r.value;
    flow.routes[routeKey].qty += r.qty;
  });

  const topProductsDetailed = Object.entries(productFlows)
    .sort((a, b) => b[1].totalValue - a[1].totalValue)
    .slice(0, 3);

  const intData = filtered.filter(r => r.isInternal);
  const biggestExt = extData.reduce((max, r) => r.value > (max ? max.value : 0) ? r : max, null);
  const biggestInt = intData.reduce((max, r) => r.value > (max ? max.value : 0) ? r : max, null);

  let html = `<p>Com base nos filtros, analisamos <strong>${fmtNum(filtered.length)} transações</strong> movimentando <strong>$ ${fmtNum(totalValue, 2)}</strong>. Desse montante, <strong>${pct(extValue)} ($ ${fmtNum(extValue, 2)})</strong> são vendas externas e <strong>${pct(intValue)} ($ ${fmtNum(intValue, 2)})</strong> são transferências internas (entre filiais Ventos).</p><ul>`;
  
  if (biggestExt) {
    const pKg = biggestExt.qty > 0 ? biggestExt.value / biggestExt.qty : 0;
    html += `<li><strong>Maior Venda Externa:</strong> <strong>${biggestExt.product}</strong> enviado de <em>${biggestExt.supplierCountry}</em> para <em>${biggestExt.buyer} (${biggestExt.buyerCountry})</em> no valor de <strong>$ ${fmtNum(biggestExt.value, 2)}</strong> (Preço médio: $ ${fmtNum(pKg, 2)}/kg).</li>`;
  }
  if (biggestInt) {
    const pKg = biggestInt.qty > 0 ? biggestInt.value / biggestInt.qty : 0;
    html += `<li><strong>Maior Transferência Interna:</strong> <strong>${biggestInt.product}</strong> enviado de <em>${biggestInt.supplierCountry}</em> para <em>${biggestInt.buyer} (${biggestInt.buyerCountry})</em> no valor de <strong>$ ${fmtNum(biggestInt.value, 2)}</strong> (Preço médio: $ ${fmtNum(pKg, 2)}/kg).</li>`;
  }
  if (topProductsDetailed.length > 0) {
    html += `<li><strong>Padrões de Movimentação (Top Produtos):</strong><ul style="margin-top:6px; margin-bottom:8px;">`;
    topProductsDetailed.forEach(([pName, pData]) => {
      const topRoute = Object.entries(pData.routes).sort((a, b) => b[1].value - a[1].value)[0];
      const pPrice = pData.totalQty > 0 ? pData.totalValue / pData.totalQty : 0;
      const rPrice = topRoute[1].qty > 0 ? topRoute[1].value / topRoute[1].qty : 0;
      const rPct = (topRoute[1].value / pData.totalValue * 100).toFixed(1) + '%';
      
      html += `<li style="padding-left:15px; margin-top:4px; font-size:0.85rem; list-style-type:circle;">O <strong>${pName}</strong> teve um preço médio global de $ ${fmtNum(pPrice, 2)}/kg. Seu fluxo mais forte seguiu o padrão <strong>${topRoute[0]}</strong>, representando ${rPct} do volume deste produto (negociados a $ ${fmtNum(rPrice, 2)}/kg).</li>`;
    });
    html += `</ul></li>`;
  }
  if (topSup) {
    html += `<li><strong>Fornecedor Líder:</strong> A maior origem agregada de insumos veio através de <strong>${topSup[0]}</strong>, com transações totais de <strong>$ ${fmtNum(topSup[1], 2)}</strong>.</li>`;
  }
  
  html += `</ul>`;
  container.innerHTML = html;
}

function updateTable(){
  const tbody=document.getElementById('dataBody');
  const start=(currentPage-1)*PAGE_SIZE;const page=filtered.slice(start,start+PAGE_SIZE);
  document.getElementById('tableCount').textContent=`(${fmtNum(filtered.length)} registros)`;
  tbody.innerHTML=page.map(r=>`<tr>
    <td>${r.dateStr}</td><td title="${r.buyer}">${r.buyer.substring(0,35)}</td><td>${r.buyerCountry}</td>
    <td title="${r.supplier}">${r.supplier.substring(0,30)}</td><td>${r.supplierCountry}</td>
    <td title="${r.productRaw}">${r.product.substring(0,40)}</td><td style="text-align:right">${fmtNum(r.qty,2)}</td>
    <td>${r.unit}</td><td style="text-align:right">$ ${fmtNum(r.value,2)}</td><td>${r.direction}</td></tr>`).join('');
  const tp=Math.ceil(filtered.length/PAGE_SIZE),pg=document.getElementById('pagination');
  if(tp<=1){pg.innerHTML='';return;}
  let h='';if(currentPage>1)h+=`<button onclick="goPage(${currentPage-1})">← Ant</button>`;
  let s=Math.max(1,currentPage-3),e=Math.min(tp,currentPage+3);
  if(s>1)h+=`<button onclick="goPage(1)">1</button><button disabled>…</button>`;
  for(let i=s;i<=e;i++)h+=`<button class="${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
  if(e<tp)h+=`<button disabled>…</button><button onclick="goPage(${tp})">${tp}</button>`;
  if(currentPage<tp)h+=`<button onclick="goPage(${currentPage+1})">Próx →</button>`;
  pg.innerHTML=h;
}
function goPage(p){currentPage=p;updateTable();document.querySelector('.table-section').scrollIntoView({behavior:'smooth'});}

document.querySelectorAll('.filters-bar select, .filters-bar input').forEach(el=>el.addEventListener('change',applyFilters));
document.getElementById('btnClear').addEventListener('click',()=>{
  document.querySelectorAll('.filters-bar select').forEach(s=>s.value='');
  document.querySelectorAll('.filters-bar input').forEach(i=>i.value='');applyFilters();});

/* ── Product Category Tabs ── */
document.querySelectorAll('.product-tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.product-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory=btn.dataset.category;
    applyFilters();
  });
});

loadData();
