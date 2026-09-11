function renderAll(){renderNav();renderHome();if(currentSiteId&&siteById(currentSiteId))renderSite();else if(currentSiteId){currentSiteId=null;showHome()}}
function renderNav(){
  const nav=$('siteNav');
  nav.innerHTML=`<button class="nav-chip ${!currentSiteId?'active':''}" onclick="showHome()">🏠 Ana Sayfa</button>`+db.sites.map(s=>`<button class="nav-chip ${currentSiteId===s.id?'active':''}" onclick="openSite('${s.id}')">🏗️ ${esc(s.name)}</button>`).join('')+`<button class="nav-chip" onclick="openSiteDialog()">＋ Yeni</button>`;
}
function renderHome(){
  const sites=db.sites,allAtt=db.attendance,totalPD=allAtt.reduce((s,a)=>s+dayEquivalent(a.status),0),abs=allAtt.filter(a=>a.status==='Gelmedi').length;
  const totalDue=db.workers.reduce((s,w)=>s+workerAccrued(w)-workerAdvances(w),0);
  $('globalSummary').innerHTML=[
    summaryCard('Şantiye',sites.length,`${sites.filter(s=>s.status==='Devam Ediyor').length} aktif`),
    summaryCard('Toplam Adam/Gün',num(totalPD),`${db.workers.length} kayıtlı işçi`),
    summaryCard('Gelmedi',num(abs),'toplam kişi-gün'),
    summaryCard('Toplam Kalan Alacak',money(totalDue),'tüm işçiler')
  ].join('');
  $('siteCards').innerHTML=sites.length?sites.map(s=>{
    const ws=siteWorkers(s.id),pd=personDays(s.id),abs=absentDays(s.id),due=ws.reduce((a,w)=>a+workerAccrued(w)-workerAdvances(w),0);
    return `<article class="site-card" onclick="openSite('${s.id}')"><div class="site-card-head"><div><h3>${esc(s.name)}</h3><div class="muted">${esc(s.location||'Konum girilmedi')}</div></div><span class="status-badge ${statusClass(s.status)}">${esc(s.status)}</span></div><div class="metrics"><div class="mini-metric"><small>İşçi</small><b>${ws.length}</b></div><div class="mini-metric"><small>Adam/Gün</small><b>${num(pd)}</b></div><div class="mini-metric"><small>Gelmedi</small><b>${abs}</b></div><div class="mini-metric"><small>Süre</small><b>${daysSinceStart(s)} gün</b></div></div><div class="muted" style="margin-top:9px">Kalan alacak: <b style="color:#f8fafc">${money(due)}</b></div></article>`
  }).join(''):`<div class="panel empty">Henüz şantiye yok. “Şantiye Ekle” ile başlayabilirsin.</div>`;
  drawGlobalChart();
}
function showHome(){currentSiteId=null;$('homeView').classList.add('active');$('siteView').classList.remove('active');renderAll();scrollTo({top:0,behavior:'smooth'})}
function openSite(id){currentSiteId=id;$('homeView').classList.remove('active');$('siteView').classList.add('active');currentTab='attendance';setTab('attendance');renderAll();scrollTo({top:0,behavior:'smooth'})}

function renderSite(){
  const s=siteById(currentSiteId);if(!s)return;
  const ws=siteWorkers(s.id),att=siteAtt(s.id),adv=siteAdv(s.id),pd=personDays(s.id),abs=absentDays(s.id),accrued=ws.reduce((x,w)=>x+workerAccrued(w),0),advTotal=adv.reduce((x,a)=>x+Number(a.amount||0),0);
  $('siteTitle').textContent=s.name;$('siteMeta').textContent=`${s.location||'Konum yok'} • ${s.startDate||'-'} • ${s.status}`;
  $('siteSummary').innerHTML=[summaryCard('İş Devam Süresi',daysSinceStart(s)+' gün',s.startDate?'başlangıç '+s.startDate:''),summaryCard('Toplam Adam/Gün',num(pd),`${ws.length} işçi`),summaryCard('Gelmedi',abs+' gün','kişi-gün'),summaryCard('Kalan Alacak',money(accrued-advTotal),`Avans ${money(advTotal)}`)].join('');
  populateWorkerSelects();renderAttendanceDay();renderHistory();renderFinance();renderWorkers();if(currentTab==='charts')requestAnimationFrame(renderCharts);
}
function setTab(tab){currentTab=tab;document.querySelectorAll('#siteTabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+tab));if(tab==='charts')requestAnimationFrame(renderCharts);if(tab==='finance')requestAnimationFrame(drawWorkerFinanceChart)}

function getAttRecord(siteId,workerId,date){return db.attendance.find(a=>a.siteId===siteId&&a.workerId===workerId&&a.date===date)}
function renderAttendanceDay(){
  if(!$('attendanceDate').value)$('attendanceDate').value=today();const d=$('attendanceDate').value,ws=siteWorkers(currentSiteId);$('attendanceEmpty').style.display=ws.length?'none':'block';
  $('attendanceRows').innerHTML=ws.map(w=>{const r=getAttRecord(currentSiteId,w.id,d)||{status:'Geldi',start:'08:00',end:'17:00',breakMin:60,note:''};const h=calcHours(r.start,r.end,r.breakMin,r.status);return `<tr data-worker="${w.id}"><td><b>${esc(w.name)}</b><div class="muted">${money(w.wage)}/gün</div></td><td><select class="a-status" onchange="previewHours(this)"><option ${r.status==='Geldi'?'selected':''}>Geldi</option><option ${r.status==='Yarım Gün'?'selected':''}>Yarım Gün</option><option ${r.status==='İzinli'?'selected':''}>İzinli</option><option ${r.status==='Raporlu'?'selected':''}>Raporlu</option><option ${r.status==='Gelmedi'?'selected':''}>Gelmedi</option></select></td><td><input class="a-start" type="time" value="${esc(r.start||'08:00')}" oninput="previewHours(this)"></td><td><input class="a-end" type="time" value="${esc(r.end||'17:00')}" oninput="previewHours(this)"></td><td><input class="a-break" type="number" min="0" step="5" value="${Number(r.breakMin??60)}" oninput="previewHours(this)"></td><td class="a-hours">${num(h)} s</td><td><input class="a-note note-input" value="${esc(r.note||'')}" placeholder="Not"></td><td><button class="primary compact" onclick="saveAttendanceRow('${w.id}')">Kaydet</button></td></tr>`}).join('')
}
window.previewHours=el=>{const tr=el.closest('tr'),h=calcHours(tr.querySelector('.a-start').value,tr.querySelector('.a-end').value,tr.querySelector('.a-break').value,tr.querySelector('.a-status').value);tr.querySelector('.a-hours').textContent=num(h)+' s'};
window.saveAttendanceRow=workerId=>{
  const tr=document.querySelector(`tr[data-worker="${workerId}"]`),date=$('attendanceDate').value,status=tr.querySelector('.a-status').value,start=tr.querySelector('.a-start').value,end=tr.querySelector('.a-end').value,breakMin=Number(tr.querySelector('.a-break').value||0),note=tr.querySelector('.a-note').value.trim(),hours=calcHours(start,end,breakMin,status);let r=getAttRecord(currentSiteId,workerId,date);
  if(r)Object.assign(r,{status,start,end,breakMin,note,hours});else db.attendance.push({id:uid(),siteId:currentSiteId,workerId,date,status,start,end,breakMin,note,hours});saveDb();toast('Puantaj kaydedildi')
};
function renderHistory(){
  if(!$('attMonthFilter').value)$('attMonthFilter').value=monthNow();const mo=$('attMonthFilter').value,wf=$('attWorkerFilter').value,sf=$('attStatusFilter').value,q=$('attSearch').value.trim().toLocaleLowerCase('tr-TR');
  const rows=siteAtt(currentSiteId).filter(a=>(!mo||a.date.startsWith(mo))&&(!wf||a.workerId===wf)&&(!sf||a.status===sf)&&(!q||(a.note||'').toLocaleLowerCase('tr-TR').includes(q))).sort((a,b)=>b.date.localeCompare(a.date)||((workerById(a.workerId)?.name||'').localeCompare(workerById(b.workerId)?.name||'','tr')));
  $('historyRows').innerHTML=rows.length?rows.map(a=>`<tr><td>${a.date}</td><td>${esc(workerById(a.workerId)?.name||'Silinmiş işçi')}</td><td><span class="pill ${attPill(a.status)}">${esc(a.status)}</span></td><td>${esc(a.start||'-')}</td><td>${esc(a.end||'-')}</td><td>${num(a.hours)} s</td><td>${num(dayEquivalent(a.status))}</td><td>${esc(a.note||'-')}</td><td><button class="danger compact" onclick="deleteAttendance('${a.id}')">Sil</button></td></tr>`).join(''):`<tr><td colspan="9" class="empty">Bu filtrelerde kayıt yok.</td></tr>`
}
window.deleteAttendance=id=>{if(confirm('Bu puantaj kaydı silinsin mi?')){db.attendance=db.attendance.filter(a=>a.id!==id);saveDb();toast('Kayıt silindi')}};

function populateWorkerSelects(){
  const ws=siteWorkers(currentSiteId),opts=ws.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('');
  const keepA=$('advanceWorker').value,keepF=$('financeWorkerDetail').value,keepH=$('attWorkerFilter').value;
  $('advanceWorker').innerHTML=`<option value="">İşçi seç</option>`+opts;$('financeWorkerDetail').innerHTML=ws.length?opts:`<option value="">İşçi yok</option>`;$('attWorkerFilter').innerHTML=`<option value="">Tüm işçiler</option>`+opts;
  if(ws.some(w=>w.id===keepA))$('advanceWorker').value=keepA;if(ws.some(w=>w.id===keepF))$('financeWorkerDetail').value=keepF;if(ws.some(w=>w.id===keepH))$('attWorkerFilter').value=keepH;
  if(!keepF&&ws[0])$('financeWorkerDetail').value=ws[0].id
}
function renderFinance(){
  if(!$('financeMonth').value)$('financeMonth').value=monthNow();const mo=$('financeMonth').value,ws=siteWorkers(currentSiteId);
  $('financeRows').innerHTML=ws.length?ws.map(w=>{const days=db.attendance.filter(a=>a.workerId===w.id&&a.date.startsWith(mo)).reduce((s,a)=>s+dayEquivalent(a.status),0),gross=workerAccrued(w,mo),adv=workerAdvances(w,mo),total=workerAccrued(w)-workerAdvances(w);return `<tr><td><b>${esc(w.name)}</b></td><td>${money(w.wage)}</td><td>${num(days)}</td><td>${money(gross)}</td><td>${money(adv)}</td><td><b>${money(gross-adv)}</b></td><td><b>${money(total)}</b></td></tr>`}).join(''):`<tr><td colspan="7" class="empty">İşçi yok.</td></tr>`;
  const advs=siteAdv(currentSiteId).sort((a,b)=>b.date.localeCompare(a.date));$('advanceRows').innerHTML=advs.length?advs.map(a=>`<tr><td>${a.date}</td><td>${esc(workerById(a.workerId)?.name||'Silinmiş işçi')}</td><td><b>${money(a.amount)}</b></td><td>${esc(a.note||'-')}</td><td><div class="row-actions"><button onclick="editAdvance('${a.id}')">Düzenle</button><button class="danger" onclick="deleteAdvance('${a.id}')">Sil</button></div></td></tr>`).join(''):`<tr><td colspan="5" class="empty">Avans kaydı yok.</td></tr>`;
  renderWorkerMonthDetail();requestAnimationFrame(drawWorkerFinanceChart)
}
function allMonthsForWorker(wid){const set=new Set();db.attendance.filter(a=>a.workerId===wid).forEach(a=>set.add(a.date.slice(0,7)));db.advances.filter(a=>a.workerId===wid).forEach(a=>set.add(a.date.slice(0,7)));return [...set].sort()}
function renderWorkerMonthDetail(){
  const wid=$('financeWorkerDetail').value,w=workerById(wid);if(!w){$('workerMonthRows').innerHTML='<tr><td colspan="5" class="empty">İşçi seçilmedi.</td></tr>';return}const months=allMonthsForWorker(wid);
  $('workerMonthRows').innerHTML=months.length?months.map(m=>{const days=db.attendance.filter(a=>a.workerId===wid&&a.date.startsWith(m)).reduce((s,a)=>s+dayEquivalent(a.status),0),gross=workerAccrued(w,m),adv=workerAdvances(w,m);return `<tr><td>${esc(monthLabel(m))}</td><td>${num(days)}</td><td>${money(gross)}</td><td>${money(adv)}</td><td><b>${money(gross-adv)}</b></td></tr>`}).join(''):`<tr><td colspan="5" class="empty">Henüz çalışma/avans kaydı yok.</td></tr>`
}

function renderWorkers(){const ws=siteWorkers(currentSiteId);$('workerCards').innerHTML=ws.length?ws.map(w=>{const d=db.attendance.filter(a=>a.workerId===w.id).reduce((s,a)=>s+dayEquivalent(a.status),0),due=workerAccrued(w)-workerAdvances(w);return `<div class="worker-card"><div class="worker-top"><div><h4>${esc(w.name)}</h4><div class="muted">${esc(w.role||'Görev girilmedi')}</div></div><div class="row-actions"><button onclick="editWorker('${w.id}')">Düzenle</button><button class="danger" onclick="deleteWorker('${w.id}')">Sil</button></div></div><div class="worker-meta"><span>Yevmiye <b>${money(w.wage)}</b></span><span>Çalışma <b>${num(d)} gün</b></span><span>Kalan <b>${money(due)}</b></span>${w.phone?`<span>Tel ${esc(w.phone)}</span>`:''}</div></div>`}).join(''):`<div class="empty">Henüz işçi eklenmedi.</div>`}
