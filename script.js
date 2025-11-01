
const Store = {
  key: 'icc25_pledges_v5',
  all(){ return JSON.parse(localStorage.getItem(this.key)||'[]'); },
  add(p){ const all = this.all(); all.push(p); localStorage.setItem(this.key, JSON.stringify(all)); },
  get(id){ return this.all().find(x=>x.id===id); }
};

const CAT_COLORS = {'Energy':'#ffb703','Mobility':'#3b82f6','Waste & Circularity':'#a855f7','Water':'#06b6d4','Ecology & Planting':'#22c55e','Lifestyle':'#f97316','General':'#e5e7eb'};
let nodes=[], worldMode=false, ws=null;
const $=(s,r=document)=>r.querySelector(s); const $all=(s,r=document)=>[...r.querySelectorAll(s)];
const initials = n => (n||'').trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('');

function setupVisual(){
  const wrap=$('.visual'); const canvas=document.createElement('canvas');
  canvas.width=wrap.clientWidth; canvas.height=wrap.clientHeight; canvas.style.position='absolute'; canvas.style.left=0; canvas.style.top=0; canvas.style.pointerEvents='none'; canvas.id='net';
  wrap.innerHTML=""; wrap.appendChild(canvas);
  const tooltip=document.createElement('div'); tooltip.className='tooltip'; tooltip.id='tooltip'; wrap.appendChild(tooltip);
  const pledges=Store.all(); const w=wrap.clientWidth, h=wrap.clientHeight;
  nodes = pledges.map(p=>spawnNode(p, Math.random()*w, Math.random()*h));
  animate();
}
function spawnNode(p,x,y){
  const wrap=$('.visual'); const el=document.createElement('div'); el.className='dot';
  const primary=(p.categories&&p.categories[0])||'General'; const color=CAT_COLORS[primary]||CAT_COLORS['General'];
  el.style.background=color; el.style.filter=`drop-shadow(0 0 10px ${color}aa)`; el.style.left=x+'px'; el.style.top=y+'px'; wrap.appendChild(el);
  const label=document.createElement('div'); label.className='label'; const cc=(p.nationality||'').toUpperCase().slice(0,2);
  label.textContent=`${initials(p.name)}${cc?' / '+cc:''}`; label.style.left=(x+12)+'px'; label.style.top=(y-2)+'px'; wrap.appendChild(label);
  const showTip=(evt)=>{ const t=$('#tooltip'); t.style.display='block'; t.textContent=`${p.pledge||'(no pledge)'} — ${p.city||''}, ${p.state||''} ${p.nationality? '('+p.nationality+')':''}`;
    const rect=wrap.getBoundingClientRect(); t.style.left=(evt.clientX-rect.left+14)+'px'; t.style.top=(evt.clientY-rect.top+14)+'px'; };
  const hideTip=()=>$('#tooltip').style.display='none'; el.addEventListener('mousemove',showTip); label.addEventListener('mousemove',showTip); el.addEventListener('mouseleave',hideTip); label.addEventListener('mouseleave',hideTip);
  const vx=(Math.random()*2-1)*0.25, vy=(Math.random()*2-1)*0.25;
  return {id:p.id,p,x,y,vx,vy,el,label,targetX:null,targetY:null,pulse:0};
}
function animate(){
  const wrap=$('.visual'); const canvas=$('#net'); if(!canvas) return; const ctx=canvas.getContext('2d');
  const w=canvas.width=wrap.clientWidth, h=canvas.height=wrap.clientHeight;
  nodes.forEach(n=>{
    if(n.targetX!=null){ n.vx+=(n.targetX-n.x)*0.0008; n.vy+=(n.targetY-n.y)*0.0008; }
    n.x+=n.vx; n.y+=n.vy;
    if(n.x<6||n.x>w-6) n.vx*=-1; if(n.y<6||n.y>h-6) n.vy*=-1;
    n.vx*=0.995; n.vy*=0.995; n.vx+=(Math.random()*2-1)*0.005; n.vy+=(Math.random()*2-1)*0.005;
    n.el.style.left=n.x+'px'; n.el.style.top=n.y+'px'; n.label.style.left=(n.x+12)+'px'; n.label.style.top=(n.y-2)+'px';
  });
  ctx.clearRect(0,0,w,h);
  nodes.forEach((a,i)=>{ for(let j=i+1;j<nodes.length;j++){ const b=nodes[j], dx=a.x-b.x, dy=a.y-b.y, d=Math.hypot(dx,dy);
    if(d<140){ const apha=1-(d/140); ctx.strokeStyle=`rgba(165,180,252,${apha*0.6})`; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); } } });
  requestAnimationFrame(animate);
}
function updateKPIs(){
  const pledges=Store.all(); const total=pledges.length; let today=0; const cat={}; const todayStr=new Date().toISOString().slice(0,10);
  pledges.forEach(p=>{ (p.categories||[]).forEach(c=>cat[c]=(cat[c]||0)+1); if((p.created_at||'').slice(0,10)===todayStr) today++; });
  $('.kpi-total .big').textContent=total; $('.kpi-today .big').textContent=today;
  const top=Object.entries(cat).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k,v])=>`${k}: ${v}`).join(' • ')||'—';
  $('.kpi-topcat .big').textContent=top;
}
function uuid(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&0x3)|0x8;return v.toString(16)}) }
function onSubmit(e){
  e.preventDefault();
  const f=e.target;
  const data={ id:uuid(), name:f.name.value.trim(), email:f.email.value.trim(), phone:f.phone.value.trim(), org:f.org.value.trim(),
    designation:f.designation.value.trim(), city:f.city.value.trim(), state:f.state.value.trim(), nationality:f.nationality.value.trim(),
    categories:$all('input[name="categories"]:checked',f).map(i=>i.value), pledge:f.pledge.value.trim(), intensity:f.intensity.value, consent:f.consent.checked, created_at:new Date().toISOString() };
  if(!data.name||!data.pledge||!data.consent){ alert('Please fill Name, Pledge and Consent.'); return; }
  Store.add(data); updateKPIs(); nodes.push(spawnNode(data, 40+Math.random()*300, 60+Math.random()*200)); f.reset();
  showCertificate(data);
  if(ws && ws.readyState===1){ ws.send(JSON.stringify({type:'pledge', data})); }
}
function certURL(id){
  try{ return new URL('certificate.html?id='+encodeURIComponent(id), location.href).href; }catch(e){ return 'certificate.html?id='+encodeURIComponent(id); }
}
function showCertificate(p){
  const box=$('#certificate'); box.style.display='block';
  $('#c-name').textContent=p.name||'Participant';
  $('#c-meta').textContent=`${p.city||''}${p.state?', '+p.state:''}${p.nationality?' • '+p.nationality:''}`;
  $('#c-pledge').textContent=p.pledge||'';
  $('#c-date').textContent = (p.created_at||'').replace('T',' ').slice(0,16);
  const url=certURL(p.id); $('#c-link').setAttribute('href',url);
  TinyQR($('#qrCanvas'), url);
}
function connectWS(){
  if(ws && ws.readyState===1) return;
  const url=$('#wsUrl').value || 'ws://localhost:8080';
  $('#wsLabel').textContent=url;
  ws=new WebSocket(url);
  ws.onopen=()=>{$('#wsBtn').classList.add('active');};
  ws.onclose=()=>{$('#wsBtn').classList.remove('active');};
  ws.onmessage=(evt)=>{ try{ const m=JSON.parse(evt.data); if(m.type==='pledge'){ Store.add(m.data); updateKPIs(); nodes.push(spawnNode(m.data, 80+Math.random()*300,80+Math.random()*200)); } }catch(e){} };
}
document.addEventListener('DOMContentLoaded',()=>{
  updateKPIs();
  $('#pledge-form').addEventListener('submit', onSubmit);
  $('#wsBtn').addEventListener('click', connectWS);
  setupVisual();
});
