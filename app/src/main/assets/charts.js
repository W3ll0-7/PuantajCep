function drawChart(canvas,labels,series,opts={}){
  const c=canvas,rect=c.getBoundingClientRect(),ratio=Math.max(1,window.devicePixelRatio||1),w=Math.max(320,Math.floor(rect.width||600)),h=Number(c.getAttribute('height')||240);c.width=w*ratio;c.height=h*ratio;const ctx=c.getContext('2d');ctx.scale(ratio,ratio);ctx.clearRect(0,0,w,h);ctx.fillStyle='#0c1626';ctx.fillRect(0,0,w,h);
  const pad={l:42,r:14,t:18,b:38},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b,vals=series.flatMap(s=>s.values),max=Math.max(1,...vals.map(Number)),grid=4;
  ctx.strokeStyle='#243248';ctx.fillStyle='#8293aa';ctx.font='11px system-ui';ctx.textAlign='right';for(let i=0;i<=grid;i++){const y=pad.t+ph*i/grid;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(num(max*(1-i/grid)),pad.l-7,y+4)}
  const count=Math.max(1,labels.length),xFor=i=>pad.l+(count===1?pw/2:i*pw/(count-1));
  const colors=['#22c55e','#60a5fa','#f59e0b','#a78bfa'];series.forEach((s,si)=>{ctx.strokeStyle=colors[si%colors.length];ctx.fillStyle=colors[si%colors.length];ctx.lineWidth=2;ctx.beginPath();s.values.forEach((v,i)=>{const x=xFor(i),y=pad.t+ph-(Number(v)/max)*ph;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();s.values.forEach((v,i)=>{const x=xFor(i),y=pad.t+ph-(Number(v)/max)*ph;ctx.beginPath();ctx.arc(x,y,2.6,0,Math.PI*2);ctx.fill()})});
  ctx.fillStyle='#8293aa';ctx.textAlign='center';const step=Math.max(1,Math.ceil(labels.length/6));labels.forEach((l,i)=>{if(i%step===0||i===labels.length-1)ctx.fillText(String(l).slice(5),xFor(i),h-14)});
  if(!labels.length){ctx.fillStyle='#9fb0c7';ctx.textAlign='center';ctx.font='13px system-ui';ctx.fillText('Grafik için henüz veri yok',w/2,h/2)}
}
function datesRange(days){const arr=[],end=parseDate(today());for(let i=days-1;i>=0;i--){const d=new Date(end);d.setDate(d.getDate()-i);arr.push(dateISO(d))}return arr}
function drawGlobalChart(){const dates=datesRange(30),values=dates.map(d=>db.attendance.filter(a=>a.date===d&&['Geldi','Yarım Gün'].includes(a.status)).reduce((s,a)=>s+dayEquivalent(a.status),0));drawChart($('globalChart'),dates,[{name:'Adam/Gün',values}])}
function renderCharts(){
  const range=$('chartRange').value;let dates;if(range==='all'){const ds=siteAtt(currentSiteId).map(a=>a.date).sort();if(ds.length){dates=[];let d=parseDate(ds[0]),end=parseDate(today());while(d<=end){dates.push(dateISO(d));d.setDate(d.getDate()+1)}}else dates=[]}else dates=datesRange(Number(range));
  const values=dates.map(d=>siteAtt(currentSiteId).filter(a=>a.date===d).reduce((s,a)=>s+dayEquivalent(a.status),0));drawChart($('siteWorkChart'),dates,[{name:'Çalışan',values}]);
  const months=[...new Set(siteAtt(currentSiteId).map(a=>a.date.slice(0,7)))].sort(),mvals=months.map(m=>personDays(currentSiteId,m));drawChart($('siteMonthChart'),months.map(m=>m+'-01'),[{name:'Adam/Gün',values:mvals}])
}
function drawWorkerFinanceChart(){const wid=$('financeWorkerDetail').value,w=workerById(wid),months=wid?allMonthsForWorker(wid):[];if(!w){drawChart($('workerFinanceChart'),[],[{values:[]}]);return}const gross=months.map(m=>workerAccrued(w,m)),adv=months.map(m=>workerAdvances(w,m));drawChart($('workerFinanceChart'),months.map(m=>m+'-01'),[{name:'Hakediş',values:gross},{name:'Avans',values:adv}])}

function openSiteDialog(id=''){
  const s=id?siteById(id):null;$('siteId').value=s?.id||'';$('siteName').value=s?.name||'';$('siteStart').value=s?.startDate||today();$('siteStatus').value=s?.status||'Devam Ediyor';$('siteLocation').value=s?.location||'';$('siteDialogTitle').textContent=s?'Şantiyeyi Düzenle':'Yeni Şantiye';$('deleteSiteBtn').style.display=s?'block':'none';$('siteDialog').showModal()
}
window.openSiteDialog=openSiteDialog;
function closeSiteDialog(){$('siteDialog').close()}

function dl(name,content,type){if(window.Android&&Android.saveText){Android.saveText(name,content,type);toast('Dosya İndirilenler/PuantajCep klasörüne kaydedildi');return}const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function csvQuote(v){return `"${String(v??'').replaceAll('"','""')}"`}
function exportCsv(siteId=''){const rows=[['Şantiye','Tarih','İşçi','Durum','Giriş','Paydos','Mola dk','Saat','Gün','Yevmiye','Gün Hakedişi','Not']];db.attendance.filter(a=>!siteId||a.siteId===siteId).sort((a,b)=>a.date.localeCompare(b.date)).forEach(a=>{const s=siteById(a.siteId),w=workerById(a.workerId),de=dayEquivalent(a.status);rows.push([s?.name||'',a.date,w?.name||'',a.status,a.start,a.end,a.breakMin,a.hours,de,w?.wage||0,(w?.wage||0)*de,a.note])});dl((siteId?'santiye_':'tum_santiyeler_')+today()+'.csv','\ufeff'+rows.map(r=>r.map(csvQuote).join(';')).join('\n'),'text/csv;charset=utf-8')}
