const KEY_ACTIVE='tempmail_email',KEY_SAVED='tempmail_saved_v1',KEY_PAGE='tempmail_page',MAX_SAVED=30;
let currentEmail=localStorage.getItem(KEY_ACTIVE)||'',currentPage=localStorage.getItem(KEY_PAGE)||'generate',pollTimer=null,expandedId=null,lastMessages=[];
const el={
  email:document.getElementById('emailDisplay'),
  btnGen:document.getElementById('btnGen'),
  btnCopy:document.getElementById('btnCopy'),
  btnRefreshGen:document.getElementById('btnRefreshGen'),
  btnRefreshSaved:document.getElementById('btnRefreshSaved'),
  inboxGen:document.getElementById('inboxGen'),
  inboxSaved:document.getElementById('inboxSaved'),
  msgCountGen:document.getElementById('msgCountGen'),
  msgCountSaved:document.getElementById('msgCountSaved'),
  status:document.getElementById('statusLine'),
  error:document.getElementById('error'),
  toast:document.getElementById('toast'),
  savedList:document.getElementById('savedList'),
  savedCount:document.getElementById('savedCount'),
  searchInput:document.getElementById('searchInput'),
  pageTag:document.getElementById('pageTag'),
  amEmail:document.getElementById('amEmail'),
  amLink:document.getElementById('amLink'),
  amResult:document.getElementById('amResult'),
  btnSend:document.getElementById('btnSend'),
  btnVerify:document.getElementById('btnVerify'),
};
function toast(m){el.toast.textContent=m;el.toast.classList.add('show');setTimeout(()=>el.toast.classList.remove('show'),2200)}
function setError(m){if(!m){el.error.style.display='none';el.error.textContent='';return}el.error.style.display='block';el.error.textContent=m}
function setStatus(mode,t){el.status.innerHTML='<span class="dot '+(mode||'')+'"></span>'+t}
function switchPage(page){
  currentPage=page;localStorage.setItem(KEY_PAGE,page);
  ['generate','saved','am'].forEach(p=>{
    document.getElementById('page-'+p).classList.toggle('active',p===page);
    document.getElementById('nav-'+p).classList.toggle('active',p===page);
  });
  el.pageTag.textContent=page==='generate'?'Generate email sementara':page==='saved'?'Search email · Saved · Inbox':'Send magic link · Verify account';
  renderInbox(lastMessages);updateRefreshButtons();
}
function loadSaved(){try{const r=localStorage.getItem(KEY_SAVED);const l=r?JSON.parse(r):[];return Array.isArray(l)?l:[]}catch(e){return[]}}
function writeSaved(list){localStorage.setItem(KEY_SAVED,JSON.stringify(list.slice(0,MAX_SAVED)))}
function autoSaveEmail(address){if(!address)return;let list=loadSaved().filter(x=>x.email!==address);list.unshift({email:address,savedAt:Date.now()});writeSaved(list);renderSaved()}
function removeSaved(address,ev){if(ev)ev.stopPropagation();writeSaved(loadSaved().filter(x=>x.email!==address));renderSaved();toast('Email dihapus')}
function clearSaved(){if(!loadSaved().length)return;if(!confirm('Hapus semua saved email?'))return;writeSaved([]);renderSaved();toast('Saved dibersihkan')}
function formatTime(ts){if(!ts)return'';const d=new Date(ts),n=new Date();if(d.toDateString()===n.toDateString())return d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'})}
function renderSaved(){
  const list=loadSaved();el.savedCount.textContent=list.length?'('+list.length+')':'';
  if(!list.length){el.savedList.innerHTML='<div class="empty">Belum ada email tersimpan.</div>';return}
  el.savedList.innerHTML=list.map(item=>{
    const active=item.email===currentEmail?' active':'';
    return '<div class="saved-item'+active+'" onclick="selectSaved(\''+escapeAttr(item.email)+'\')"><div class="saved-email">'+escapeHtml(item.email)+'</div><span class="saved-meta">'+formatTime(item.savedAt)+'</span><button class="btn btn-danger" onclick="removeSaved(\''+escapeAttr(item.email)+'\', event)">Hapus</button></div>';
  }).join('');
}
function selectSaved(address){
  currentEmail=address;localStorage.setItem(KEY_ACTIVE,currentEmail);
  el.searchInput.value=address;
  updateEmailUI();renderSaved();expandedId=null;
  toast('Inbox: '+address);refreshInbox(true);startPolling();
}
function updateEmailUI(){
  if(currentEmail){el.email.textContent=currentEmail;el.email.classList.remove('empty');el.btnCopy.disabled=false;localStorage.setItem(KEY_ACTIVE,currentEmail)}
  else{el.email.textContent='Belum ada email — klik Generate';el.email.classList.add('empty');el.btnCopy.disabled=true}
  updateRefreshButtons();
}
function updateRefreshButtons(){const has=!!currentEmail;el.btnRefreshGen.disabled=!has;el.btnRefreshSaved.disabled=!has}
function copyEmail(){if(!currentEmail)return;navigator.clipboard.writeText(currentEmail).then(()=>toast('Email disalin'))}
async function generateEmail(){
  setError('');el.btnGen.disabled=true;el.btnGen.textContent='Generating...';setStatus('busy','Membuat email...');
  try{
    const res=await fetch('/api/create');const data=await res.json();
    if(!res.ok||!data.status||!data.result||!data.result.email)throw new Error(data.message||'Gagal generate email');
    currentEmail=data.result.email;expandedId=null;autoSaveEmail(currentEmail);
    el.searchInput.value=currentEmail;
    updateEmailUI();renderSaved();
    toast('Email baru + auto-saved');await refreshInbox(true);startPolling();
  }catch(err){setError(err.message||'Error generate');setStatus('','Error')}
  finally{el.btnGen.disabled=false;el.btnGen.textContent='Generate'}
}
function searchByEmail(){
  const raw=(el.searchInput.value||'').trim().toLowerCase();
  if(!raw){setError('Masukkan alamat email dulu');return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)){setError('Format email tidak valid');return}
  setError('');currentEmail=raw;autoSaveEmail(currentEmail);localStorage.setItem(KEY_ACTIVE,currentEmail);
  updateEmailUI();renderSaved();expandedId=null;toast('Search inbox: '+raw);refreshInbox(true);startPolling();
}
el.searchInput.addEventListener('keydown',e=>{if(e.key==='Enter')searchByEmail()});
function startPolling(){stopPolling();if(!currentEmail)return;pollTimer=setInterval(()=>refreshInbox(false),8000)}
function stopPolling(){if(pollTimer){clearInterval(pollTimer);pollTimer=null}}
async function refreshInbox(manual){
  if(!currentEmail)return;
  if(manual){el.btnRefreshGen.disabled=true;el.btnRefreshSaved.disabled=true;setStatus('busy','Cek inbox...')}
  try{
    const res=await fetch('/api/inbox?email='+encodeURIComponent(currentEmail));const data=await res.json();
    if(!res.ok||!data.status)throw new Error(data.message||'Gagal ambil inbox');
    lastMessages=(data.result&&data.result.messages)||[];renderInbox(lastMessages);
    setStatus('live','Listening · '+currentEmail.split('@')[1]);setError('');
  }catch(err){if(manual)setError(err.message||'Error inbox');setStatus('','Gagal refresh')}
  finally{updateRefreshButtons()}
}
function pickField(obj,keys,fallback){if(fallback===undefined)fallback='';for(let i=0;i<keys.length;i++){const k=keys[i];if(obj&&obj[k]!=null&&obj[k]!=='')return obj[k]}return fallback}
function extractLinks(text){if(!text)return[];const plain=String(text).replace(/&/g,'&').replace(/href=["']([^"']+)["']/gi,' $1 ').replace(/<[^>]+>/g,' ');const found=plain.match(/https?:\/\/[^\s<>"')\]]+/gi)||[];return Array.from(new Set(found.map(u=>u.replace(/[.,;:!?)>\]]+$/g,''))))}
function pickMagic(links){if(!links.length)return null;const scored=links.map(url=>{const u=url.toLowerCase();let s=0;if(/alight|alightcreative|alightmotion/.test(u))s+=5;if(/magic|signin|sign-in|login|auth|verify|verification|confirm|token|otp|link/.test(u))s+=4;if(/firebaseapp|firebase|auth\.|oauth|sso/.test(u))s+=3;if(/unsubscribe|mailto:|pixel|track/.test(u))s-=5;return{url,score:s}});scored.sort((a,b)=>b.score-a.score);return scored[0].score>0?scored[0].url:links[0]}
function classify(subject,body,from){const text=((subject||'')+' '+(body||'')+' '+(from||'')).toLowerCase();const isAlight=/alight\s*creative|alightcreative|alight\s*motion/.test(text);const login=/login\s+ke\s+alight|log\s*in\s+to\s+alight|approve\s+(this\s+)?login|setujui\s+(untuk\s+)?login|new\s+login|login\s+request|login\s+attempt/.test(text);const verify=/sign\s*in\s+to\s+alight|verify\s+(your\s+)?(email|account)|verification|verifikasi|confirm\s+(your\s+)?email|magic\s+link/.test(text);if(login)return'login';if(verify)return'verify';if(isAlight){if(/sign\s*in|signin/.test(text))return'verify';if(/login|log\s*in/.test(text))return'login';return'verify'}if(/login|log\s*in|approve/.test(text))return'login';if(/verify|verification|confirm|sign\s*in/.test(text))return'verify';return'generic'}
function escapeHtml(s){return String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"')}
function escapeAttr(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
function renderInbox(messages){
  const count=messages.length?'('+messages.length+')':'';
  el.msgCountGen.textContent=count;el.msgCountSaved.textContent=count;
  let html;
  if(!messages.length){html='<div class="empty">Inbox kosong'+(currentEmail?' untuk <b style="color:var(--accent)">'+escapeHtml(currentEmail)+'</b>':'')+'</div>'}
  else{
    html=messages.map((m,i)=>{
      const id=String(pickField(m,['id','messageId','_id'],String(i)));
      const from=pickField(m,['from','sender','from_email','mail_from'],'Unknown');
      const subject=pickField(m,['subject','title'],'(no subject)');
      const time=pickField(m,['date','time','created_at','timestamp'],'');
      const body=pickField(m,['body','text','content','message','html'],'');
      const open=expandedId===id;
      const magic=pickMagic(extractLinks(body+' '+subject));
      const kind=classify(subject,body,from);
      const tc=magic?(' '+(kind==='login'?'login-type':kind==='verify'?'verify-type':'generic-type')):'';
      let h='<div class="msg'+tc+'"><div class="msg-top" onclick="toggleMsg(\''+escapeAttr(id)+'\')"><div class="from">'+escapeHtml(String(from))+'</div><div class="subj">'+escapeHtml(String(subject))+'</div>'+(time?'<div class="time">'+escapeHtml(String(time))+'</div>':'')+'</div>';
      if(magic){
        if(kind==='login'){h+='<div class="magic login"><div class="ml login">🔐 Login ke Alight Creative terdeteksi</div><div class="ma"><button class="btn btn-link" onclick="event.stopPropagation();copyLink(\''+escapeAttr(magic)+'\',\'Link login disalin\')">Copy link login</button><button class="btn btn-login" onclick="event.stopPropagation();openLink(\''+escapeAttr(magic)+'\')">Setujui untuk login</button></div><div class="mu">'+escapeHtml(magic)+'</div></div>'}
        else if(kind==='verify'){h+='<div class="magic verify"><div class="ml verify">✉️ Sign in / verifikasi terdeteksi</div><div class="ma"><button class="btn btn-link" onclick="event.stopPropagation();copyLink(\''+escapeAttr(magic)+'\',\'Link verifikasi disalin\')">Copy link verifikasi</button><button class="btn primary" onclick="event.stopPropagation();openLink(\''+escapeAttr(magic)+'\')">Buka link</button></div><div class="mu">'+escapeHtml(magic)+'</div></div>'}
        else{h+='<div class="magic"><div class="ml" style="color:var(--accent)">🔗 Link terdeteksi</div><div class="ma"><button class="btn btn-link" onclick="event.stopPropagation();copyLink(\''+escapeAttr(magic)+'\',\'Link disalin\')">Copy link</button><button class="btn primary" onclick="event.stopPropagation();openLink(\''+escapeAttr(magic)+'\')">Buka link</button></div><div class="mu">'+escapeHtml(magic)+'</div></div>'}
      }
      if(open)h+='<div class="body">'+(escapeHtml(String(body))||'<em style="color:var(--muted)">(empty)</em>')+'</div>';
      h+='</div>';return h;
    }).join('');
  }
  el.inboxGen.innerHTML=html;el.inboxSaved.innerHTML=html;
}
function toggleMsg(id){expandedId=expandedId===String(id)?null:String(id);renderInbox(lastMessages)}
function copyLink(url,msg){navigator.clipboard.writeText(url).then(()=>toast(msg||'Link disalin'))}
function openLink(url){window.open(url,'_blank','noopener,noreferrer');toast('Membuka link...')}
async function sendMagicLink(){
  const email=(el.amEmail.value||'').trim();
  if(!email){setError('Isi email dulu');return}
  setError('');el.btnSend.disabled=true;el.btnSend.textContent='Sending...';
  el.amResult.innerHTML='<div class="result">Mengirim magic link...</div>';
  try{
    const res=await fetch('/api/am-send?email='+encodeURIComponent(email));
    const data=await res.json();
    const ok=data.status===true||data.success===true||data.result?.success===true;
    el.amResult.innerHTML='<div class="result '+(ok?'ok':'err')+'">'+escapeHtml(JSON.stringify(data,null,2))+'</div>';
    toast(ok?'Magic link terkirim':'Respons diterima');
  }catch(err){
    el.amResult.innerHTML='<div class="result err">'+escapeHtml(err.message||'Error')+'</div>';
    setError(err.message||'Gagal kirim');
  }finally{el.btnSend.disabled=false;el.btnSend.textContent='Send magic link'}
}
async function verifyAccount(){
  const email=(el.amEmail.value||'').trim();
  const link=(el.amLink.value||'').trim();
  if(!email){setError('Isi email dulu');return}
  if(!link){setError('Isi verification link dulu');return}
  setError('');el.btnVerify.disabled=true;el.btnVerify.textContent='Verifying...';
  el.amResult.innerHTML='<div class="result">Memverifikasi account...</div>';
  try{
    const res=await fetch('/api/am-verif?email='+encodeURIComponent(email)+'&link='+encodeURIComponent(link));
    const data=await res.json();
    const ok=data.status===true||data.success===true||data.result?.success===true;
    el.amResult.innerHTML='<div class="result '+(ok?'ok':'err')+'">'+escapeHtml(JSON.stringify(data,null,2))+'</div>';
    toast(ok?'Verify berhasil':'Respons diterima');
  }catch(err){
    el.amResult.innerHTML='<div class="result err">'+escapeHtml(err.message||'Error')+'</div>';
    setError(err.message||'Gagal verify');
  }finally{el.btnVerify.disabled=false;el.btnVerify.textContent='Verify account'}
}
updateEmailUI();renderSaved();switchPage(currentPage==='saved'?'saved':currentPage==='am'?'am':'generate');
if(currentEmail){el.searchInput.value=currentEmail;autoSaveEmail(currentEmail);refreshInbox(true);startPolling()}
