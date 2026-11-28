(() => {
  if (window.SD_AUDIO) return;
  const KEY="sd_audio_settings_v1", defaults={enabled:true,voice:true,effects:true,volume:.55,voiceURI:""};
  let cfg={...defaults}; try{cfg={...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")};}catch{}
  let ctx,panel;
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cfg));}catch{}};
  function tone(freq=660,duration=.1,type="sine",offset=0){
    if(!cfg.enabled||!cfg.effects)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    if(!ctx)ctx=new AC();if(ctx.state==="suspended")ctx.resume().catch(()=>{});
    const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+offset;o.type=type;o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,cfg.volume*.12),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+duration+.02);
  }
  const sounds={click(){tone(520,.045);},success(){tone(660,.1);tone(880,.16,"sine",.11);},warning(){tone(440,.12,"triangle");tone(330,.18,"triangle",.14);},error(){tone(260,.22,"square");}};
  const arabicVoices=()=>((window.speechSynthesis?.getVoices?.()||[]).filter(v=>/^ar([_-]|$)/i.test(v.lang||"")));
  function speak(text){
    if(!cfg.enabled||!cfg.voice||!("speechSynthesis"in window)||!text)return false;
    try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="ar";u.rate=.94;u.pitch=.88;u.volume=Math.max(.1,Math.min(1,cfg.volume));
      const vs=arabicVoices(),v=vs.find(x=>x.voiceURI===cfg.voiceURI)||vs.find(x=>/male|masculin|ذكر/i.test(x.name))||vs[0];if(v){u.voice=v;u.lang=v.lang;}window.speechSynthesis.speak(u);return true;
    }catch{return false;}
  }
  function announce(text,kind="success"){if(!cfg.enabled)return;(sounds[kind]||sounds.success)();if(text)setTimeout(()=>speak(text),180);}
  function buildUI(){
    if(!document.body||document.getElementById("sd-audio-fab"))return;
    const st=document.createElement("style");st.id="sd-audio-style";
    st.textContent='#sd-audio-fab{position:fixed;z-index:2147483000;right:14px;bottom:18px;width:48px;height:48px;border:0;border-radius:50%;background:#17232d;color:#fff;box-shadow:0 3px 14px #0004;font-size:21px}#sd-audio-panel{position:fixed;z-index:2147483001;right:12px;bottom:74px;width:min(310px,calc(100vw - 24px));background:#fff;color:#17232d;border:1px solid #d8dee5;border-radius:16px;padding:16px;box-shadow:0 8px 30px #0003;font:14px system-ui,sans-serif;direction:rtl}#sd-audio-panel[hidden]{display:none}#sd-audio-panel h3{margin:0 0 12px;font-size:17px}#sd-audio-panel label{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0}#sd-audio-panel select{max-width:150px}#sd-audio-panel button{border:0;border-radius:10px;padding:9px 12px;background:#168ac0;color:white}#sd-audio-panel .sd-row{display:flex;gap:8px;justify-content:space-between;align-items:center}#sd-audio-panel small{display:block;color:#687684;line-height:1.5;margin-top:10px}';
    document.head.appendChild(st);
    const fab=document.createElement("button");fab.id="sd-audio-fab";fab.type="button";fab.title="إعدادات الصوت";fab.textContent="🔊";
    const p=document.createElement("section");p.id="sd-audio-panel";p.hidden=true;p.dir="rtl";
    p.innerHTML='<h3>STEEL DESIGN AUDIO</h3><label>تشغيل النظام <input id="sd-a-enabled" type="checkbox"></label><label>الصوت البشري <input id="sd-a-voice" type="checkbox"></label><label>المؤثرات الصوتية <input id="sd-a-effects" type="checkbox"></label><label>مستوى الصوت <input id="sd-a-volume" type="range" min="0" max="1" step=".05"></label><label>الصوت العربي <select id="sd-a-voices"><option value="">الصوت الافتراضي للهاتف</option></select></label><div class="sd-row"><button id="sd-a-test" type="button">تجربة الصوت</button><button id="sd-a-close" type="button">إغلاق</button></div><small>يعتمد النطق العربي على محرك تحويل النص إلى كلام المثبّت في الهاتف. قد يتطلب تنزيل صوت عربي من إعدادات تحويل النص إلى كلام في Android.</small>';
    document.body.append(fab,p);panel=p;
    const en=p.querySelector("#sd-a-enabled"),vo=p.querySelector("#sd-a-voice"),ef=p.querySelector("#sd-a-effects"),vol=p.querySelector("#sd-a-volume"),sel=p.querySelector("#sd-a-voices");
    const sync=()=>{en.checked=cfg.enabled;vo.checked=cfg.voice;ef.checked=cfg.effects;vol.value=cfg.volume;fab.textContent=cfg.enabled?"🔊":"🔇";};
    const refresh=()=>{sel.innerHTML='<option value="">الصوت الافتراضي للهاتف</option>';arabicVoices().forEach(v=>{const o=document.createElement("option");o.value=v.voiceURI;o.textContent=v.name+" ("+v.lang+")";sel.append(o);});sel.value=cfg.voiceURI;};
    fab.addEventListener("click",()=>{p.hidden=!p.hidden;if(!p.hidden){refresh();sync();}});
    p.querySelector("#sd-a-close").addEventListener("click",()=>p.hidden=true);
    en.addEventListener("change",()=>{cfg.enabled=en.checked;save();sync();});vo.addEventListener("change",()=>{cfg.voice=vo.checked;save();});ef.addEventListener("change",()=>{cfg.effects=ef.checked;save();});vol.addEventListener("input",()=>{cfg.volume=Number(vol.value);save();});sel.addEventListener("change",()=>{cfg.voiceURI=sel.value;save();});
    p.querySelector("#sd-a-test").addEventListener("click",()=>{if(!cfg.enabled){cfg.enabled=true;save();sync();}announce("مرحباً بك في نظام ستيل ديزاين. تم تشغيل النظام الصوتي بنجاح.","success");});
    if(window.speechSynthesis)window.speechSynthesis.onvoiceschanged=refresh;sync();
  }
  const ok=/تم الحفظ|حفظ بنجاح|تمت الإضافة|أضيف بنجاح|تم التسجيل|تم الدفع|تم التسديد|تم إنهاء|اكتمل الإنتاج|جاهز للتسليم|تمت العملية بنجاح/i;
  const bad=/حدث خطأ|تعذر|فشل|غير صحيح|مطلوب إدخال|يرجى إدخال/i,warn=/تنبيه|متأخر|ناقص|غير مكتمل/i;
  function watch(){const ob=new MutationObserver(rs=>{for(const r of rs)for(const n of r.addedNodes){if(n.nodeType!==1)continue;const t=(n.innerText||n.textContent||"").trim();if(!t||t.length>180)continue;if(ok.test(t)){announce(t.slice(0,150),"success");return;}if(bad.test(t)){announce(t.slice(0,130),"error");return;}if(warn.test(t)){announce(t.slice(0,130),"warning");return;}}});ob.observe(document.body,{childList:true,subtree:true});}
  document.addEventListener("click",e=>{const b=e.target.closest("button,[role=button],input[type=submit]");if(b&&!b.closest("#sd-audio-panel")&&b.id!=="sd-audio-fab")sounds.click();},true);
  window.SD_AUDIO={speak,announce,success:()=>announce("تمت العملية بنجاح","success"),warning:()=>announce("تنبيه، يرجى الانتباه","warning"),error:()=>announce("حدث خطأ، يرجى المحاولة مرة أخرى","error"),settings:()=>{buildUI();panel.hidden=false;}};
  const init=()=>{buildUI();watch();};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();