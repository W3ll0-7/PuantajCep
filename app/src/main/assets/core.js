const $=id=>document.getElementById(id);
const KEY='puantajCep_v2';
const LEGACY_KEY='puantajCep_v1';
const today=()=>new Date().toISOString().slice(0,10);
const monthNow=()=>today().slice(0,7);
const uid=()=>Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
const money=n=>Number(n||0).toLocaleString('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2});
const num=n=>Number(n||0).toLocaleString('tr-TR',{maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const parseDate=s=>{const [y,m,d]=(s||today()).split('-').map(Number);return new Date(y,m-1,d)};
const dateISO=d=>{const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)};
const monthLabel=m=>{if(!m)return '-';const [y,mo]=m.split('-').map(Number);return new Intl.DateTimeFormat('tr-TR',{month:'long',year:'numeric'}).format(new Date(y,mo-1,1))};
const dayDiff=(a,b)=>Math.max(0,Math.floor((parseDate(b)-parseDate(a))/86400000));

let db=loadDb();
let currentSiteId=null;
let currentTab='attendance';
let toastTimer=null;

function blankDb(){return {version:2,sites:[],workers:[],attendance:[],advances:[]}}
function loadDb(){
  try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&raw.version===2)return normalize(raw)}catch(e){}
  const fresh=blankDb();
  try{
    const legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'[]');
    if(Array.isArray(legacy)&&legacy.length){
      const dates=legacy.map(x=>x.date).filter(Boolean).sort();
      const sid=uid();fresh.sites.push({id:sid,name:'Eski Puantaj',startDate:dates[0]||today(),status:'Devam Ediyor',location:'Otomatik aktarıldı'});
      const workerMap=new Map();
      legacy.forEach(r=>{
        let wid=workerMap.get(r.employee);
        if(!wid){wid=uid();workerMap.set(r.employee,wid);fresh.workers.push({id:wid,siteId:sid,name:r.employee||'İsimsiz',wage:0,startDate:dates[0]||today(),phone:'',role:'',note:'Eski sürümden aktarıldı'})}
        fresh.attendance.push({id:r.id||uid(),siteId:sid,workerId:wid,date:r.date||today(),status:r.status==='Çalıştı'?'Geldi':(r.status||'Geldi'),start:r.start||'08:00',end:r.end||'17:00',breakMin:Number(r.breakMin||0),hours:Number(r.hours||0),note:r.note||''});
      });
      localStorage.setItem(KEY,JSON.stringify(fresh));
    }
  }catch(e){}
  return fresh;
}
function normalize(x){return {version:2,sites:Array.isArray(x.sites)?x.sites:[],workers:Array.isArray(x.workers)?x.workers:[],attendance:Array.isArray(x.attendance)?x.attendance:[],advances:Array.isArray(x.advances)?x.advances:[]}}
function saveDb(){localStorage.setItem(KEY,JSON.stringify(db));renderAll()}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1800)}
function siteById(id){return db.sites.find(s=>s.id===id)}
function workerById(id){return db.workers.find(w=>w.id===id)}
function siteWorkers(id){return db.workers.filter(w=>w.siteId===id).sort((a,b)=>a.name.localeCompare(b.name,'tr'))}
function siteAtt(id){return db.attendance.filter(a=>a.siteId===id)}
function siteAdv(id){return db.advances.filter(a=>a.siteId===id)}
function dayEquivalent(status){return status==='Geldi'?1:status==='Yarım Gün'?.5:0}
function calcHours(start,end,breakMin,status){
  if(!['Geldi','Yarım Gün'].includes(status)||!start||!end)return 0;
  const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);let m=eh*60+em-(sh*60+sm);if(m<0)m+=1440;m-=Number(breakMin||0);return Math.max(0,m/60)
}
function daysSinceStart(site){const end=site.status==='Tamamlandı'?(site.endDate||today()):today();return dayDiff(site.startDate||today(),end)+1}
function workerAccrued(w,month=''){return db.attendance.filter(a=>a.workerId===w.id&&(!month||a.date.startsWith(month))).reduce((s,a)=>s+dayEquivalent(a.status)*Number(w.wage||0),0)}
function workerAdvances(w,month=''){return db.advances.filter(a=>a.workerId===w.id&&(!month||a.date.startsWith(month))).reduce((s,a)=>s+Number(a.amount||0),0)}
function personDays(siteId,month=''){return siteAtt(siteId).filter(a=>!month||a.date.startsWith(month)).reduce((s,a)=>s+dayEquivalent(a.status),0)}
function absentDays(siteId,month=''){return siteAtt(siteId).filter(a=>(!month||a.date.startsWith(month))&&a.status==='Gelmedi').length}

function summaryCard(label,value,detail=''){return `<div class="summary-card"><small>${esc(label)}</small><b>${esc(value)}</b>${detail?`<div class="delta">${esc(detail)}</div>`:''}</div>`}
function statusClass(s){return s==='Devam Ediyor'?'running':s==='Tamamlandı'?'done':'wait'}
function attPill(s){return s==='Geldi'?'present':s==='Yarım Gün'?'half':s==='Gelmedi'?'absent':''}
