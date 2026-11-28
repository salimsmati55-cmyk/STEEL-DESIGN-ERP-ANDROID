/* STEEL DESIGN AUDIO SYSTEM — V2
 * Arabic speech uses the device's installed Android TTS voice.
 * UI sounds are generated locally with Web Audio; no network or microphone.
 */
(() => {
  "use strict";
  if (window.SD_AUDIO?.version === "2.0") return;
  const KEY = "sd_audio_settings_v2";
  const defaults = { enabled:true, speech:true, effects:true, volume:0.62, rate:0.92, pitch:0.82, voiceURI:"", announceActions:true };
  let cfg = {...defaults};
  try { cfg = {...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}")}; } catch {}
  let audioContext = null, panel = null, lastAnnouncement = "", lastAt = 0, voices = [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {} };
  const arabicVoices = () => (window.speechSynthesis?.getVoices?.() || []).filter(v => /^ar([_-]|$)/i.test(v.lang || ""));
  function ctx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioContext) audioContext = new AC();
    if (audioContext.state === "suspended") audioContext.resume().catch(()=>{});
    return audioContext;
  }
  function note(freq, start, duration, wave="sine", peak=0.10) {
    if (!cfg.enabled || !cfg.effects) return;
    const c=ctx(); if(!c) return;
    const o=c.createOscillator(), g=c.createGain(), t=c.currentTime+start;
    o.type=wave; o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001,peak*cfg.volume),t+0.018);
    g.gain.exponentialRampToValueAtTime(0.0001,t+duration);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+duration+0.025);
  }
  const effects = {
    click:()=>note(620,0,.045,"sine",.035),
    save:()=>{note(660,0,.10);note(880,.12,.16);},
    success:()=>{note(523,0,.11);note(659,.12,.11);note(784,.24,.22);},
    warning:()=>{note(660,0,.12,"triangle");note(520,.17,.16,"triangle");},
    error:()=>{note(310,0,.16,"sawtooth",.075);note(230,.18,.22,"sawtooth",.075);},
    delivery:()=>{note(587,0,.10);note(740,.12,.10);note(880,.24,.25);},
    production:()=>{note(440,0,.10);note(554,.12,.10);note(659,.24,.20);}
  };
  function chooseVoice() {
    voices = arabicVoices();
    return voices.find(v=>v.voiceURI===cfg.voiceURI) ||
      voices.find(v=>/male|masculine|ذكر|رجل/i.test(v.name+" "+v.voiceURI)) || voices[0] || null;
  }
  function speak(message) {
    if(!cfg.enabled || !cfg.speech || !("speechSynthesis" in window) || !message) return false;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(message).slice(0,220));
      const voice=chooseVoice();
      utterance.lang=voice?.lang || "ar-SA";
      if(voice) utterance.voice=voice;
      utterance.rate=cfg.rate; utterance.pitch=cfg.pitch; utterance.volume=Math.max(.05,Math.min(1,cfg.volume));
      window.speechSynthesis.speak(utterance);
      return true;
    } catch { return false; }
  }
  function announce(message, kind="success", spokenText) {
    if(!cfg.enabled) return;
    (effects[kind] || effects.success)();
    if(spokenText || message) window.setTimeout(()=>speak(spokenText || message),180);
  }
  function classify(text) {
    if(/خطأ|فشل|تعذر|غير صحيح|لم يتم|مرفوض/i.test(text)) return "error";
    if(/تنبيه|تحذير|ناقص|متأخر|غير مكتمل/i.test(text)) return "warning";
    if(/تسليم|جاهز للتسليم|تم التسليم/i.test(text)) return "delivery";
    if(/إنتاج|الانتاج|اكتمل الإنتاج|إنهاء الإنتاج/i.test(text)) return "production";
    if(/حفظ|تمت الإضافة|أضيف|تم التسجيل|تم الدفع|تم التسديد|تم إنهاء|نجاح|اكتمل/i.test(text)) return "success";
    return null;
  }
  function maybeAnnounce(text) {
    text=String(text||"").replace(/\s+/g," ").trim();
    if(!text || text.length>180) return;
    const kind=classify(text); if(!kind) return;
    const now=Date.now();
    if(text===lastAnnouncement && now-lastAt<2200) return;
    lastAnnouncement=text; lastAt=now;
    announce(text,kind);
  }
  function buildPanel() {
    if(!document.body || document.getElementById("sd-audio-fab")) return;
    const style=document.createElement("style"); style.id="sd-audio-style";
    style.textContent=`
      #sd-audio-fab{position:fixed;z-index:2147483000;right:14px;bottom:18px;width:50px;height:50px;border:0;border-radius:50%;background:#142b3b;color:#fff;box-shadow:0 5px 18px #0003;font-size:21px}
      #sd-audio-panel{position:fixed;z-index:2147483001;right:12px;bottom:78px;width:min(330px,calc(100vw - 24px));max-height:78vh;overflow:auto;background:#fff;color:#182633;border:1px solid #dce4ea;border-radius:18px;padding:16px;box-shadow:0 12px 36px #0004;font:14px system-ui,sans-serif;direction:rtl}
      #sd-audio-panel[hidden]{display:none}#sd-audio-panel h3{margin:0 0 4px;font-size:17px}#sd-audio-panel .sub{color:#647584;font-size:11px;margin-bottom:12px}
      #sd-audio-panel label{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0}
      #sd-audio-panel input[type=range]{width:125px}#sd-audio-panel select{max-width:165px;padding:7px;border:1px solid #ccd6df;border-radius:8px}
      #sd-audio-panel button{border:0;border-radius:10px;padding:10px 13px;background:#087eaa;color:white;font-weight:600}
      #sd-audio-panel .sd-row{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:12px}
      #sd-audio-panel small{display:block;color:#687684;line-height:1.6;margin-top:10px}
    `;
    document.head.appendChild(style);
    const fab=document.createElement("button"); fab.id="sd-audio-fab"; fab.type="button"; fab.title="إعدادات الصوت"; fab.setAttribute("aria-label","إعدادات الصوت"); fab.textContent="🔊";
    const p=document.createElement("section"); p.id="sd-audio-panel"; p.hidden=true; p.dir="rtl";
    p.innerHTML=`<h3>STEEL DESIGN AUDIO</h3><div class="sub">نظام التنبيهات الصوتية للورشة</div>
      <label>تشغيل النظام <input id="sd-enabled" type="checkbox"></label>
      <label>النطق العربي <input id="sd-speech" type="checkbox"></label>
      <label>المؤثرات الصوتية <input id="sd-effects" type="checkbox"></label>
      <label>الإعلان عند نجاح العمليات <input id="sd-actions" type="checkbox"></label>
      <label>مستوى الصوت <input id="sd-volume" type="range" min="0.05" max="1" step="0.05"></label>
      <label>سرعة النطق <input id="sd-rate" type="range" min="0.75" max="1.15" step="0.05"></label>
      <label>الصوت العربي <select id="sd-voices"><option value="">الصوت الافتراضي للهاتف</option></select></label>
      <div class="sd-row"><button id="sd-test" type="button">اختبار الصوت</button><button id="sd-close" type="button">إغلاق</button></div>
      <small id="sd-note">الصوت الرجالي يتوقف على الأصوات العربية المثبتة في Android. إذا لم يظهر صوت مناسب، نزّل صوتاً عربياً من إعدادات تحويل النص إلى كلام في الهاتف.</small>`;
    document.body.append(fab,p); panel=p;
    const $=id=>p.querySelector("#"+id);
    const sync=()=>{$("sd-enabled").checked=cfg.enabled;$("sd-speech").checked=cfg.speech;$("sd-effects").checked=cfg.effects;$("sd-actions").checked=cfg.announceActions;$("sd-volume").value=cfg.volume;$("sd-rate").value=cfg.rate;fab.textContent=cfg.enabled?"🔊":"🔇";};
    const refresh=()=>{const s=$("sd-voices");s.innerHTML='<option value="">الصوت الافتراضي للهاتف</option>';voices=arabicVoices();voices.forEach(v=>{const o=document.createElement("option");o.value=v.voiceURI;o.textContent=v.name+" — "+v.lang;s.append(o);});s.value=cfg.voiceURI;};
    fab.addEventListener("click",()=>{p.hidden=!p.hidden;if(!p.hidden){refresh();sync();}});
    $("sd-close").addEventListener("click",()=>p.hidden=true);
    $("sd-enabled").addEventListener("change",e=>{cfg.enabled=e.target.checked;save();sync();});
    $("sd-speech").addEventListener("change",e=>{cfg.speech=e.target.checked;save();});
    $("sd-effects").addEventListener("change",e=>{cfg.effects=e.target.checked;save();});
    $("sd-actions").addEventListener("change",e=>{cfg.announceActions=e.target.checked;save();});
    $("sd-volume").addEventListener("input",e=>{cfg.volume=+e.target.value;save();});
    $("sd-rate").addEventListener("input",e=>{cfg.rate=+e.target.value;save();});
    $("sd-voices").addEventListener("change",e=>{cfg.voiceURI=e.target.value;save();});
    $("sd-test").addEventListener("click",()=>{if(!cfg.enabled)cfg.enabled=true;cfg.speech=true;cfg.effects=true;save();sync();announce("مرحباً بك في نظام ستيل ديزاين. الصوت والتنبيهات جاهزة للعمل.","success");});
    sync(); refresh();
  }
  function observeMessages() {
    const observer=new MutationObserver(records=>{
      for(const record of records) {
        const el=record.target.nodeType===1?record.target:record.target.parentElement;
        if(!el) continue;
        const live=el.closest?.('[role="alert"],[role="status"],[aria-live],.toast,.notification,.alert,.snackbar');
        if(live) { maybeAnnounce(live.innerText||live.textContent); continue; }
        for(const node of record.addedNodes||[]) if(node.nodeType===1) {
          const candidate=node.matches?.('[role="alert"],[role="status"],[aria-live],.toast,.notification,.alert,.snackbar')?node:node.querySelector?.('[role="alert"],[role="status"],[aria-live],.toast,.notification,.alert,.snackbar');
          if(candidate) maybeAnnounce(candidate.innerText||candidate.textContent);
        }
      }
    });
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  document.addEventListener("click",e=>{
    const b=e.target.closest?.("button,[role=button],input[type=submit]");
    if(!b || b.closest("#sd-audio-panel") || b.id==="sd-audio-fab") return;
    if(cfg.enabled && cfg.effects) effects.click();
    if(cfg.announceActions) {
      const label=(b.innerText||b.getAttribute("aria-label")||b.value||"").trim();
      if(/حفظ|تأكيد|تسليم|إنهاء|طباعة|دفع|تسجيل/i.test(label)) {
        // The click itself is not treated as success; actual status messages are announced by the observer.
      }
    }
  },true);
  window.addEventListener("sd:audio",e=>{
    const d=e.detail||{}; announce(d.message||"",d.kind||"success",d.speech);
  });
  window.SD_AUDIO={
    version:"2.0", speak, announce,
    success:message=>announce(message||"تمت العملية بنجاح","success"),
    saved:message=>announce(message||"تم الحفظ بنجاح","save"),
    warning:message=>announce(message||"تنبيه، يرجى الانتباه","warning"),
    error:message=>announce(message||"حدث خطأ، يرجى المحاولة مرة أخرى","error"),
    production:message=>announce(message||"اكتمل الإنتاج","production"),
    delivery:message=>announce(message||"الطلبية جاهزة للتسليم","delivery"),
    settings:()=>{buildPanel();panel.hidden=false;},
    setEnabled:value=>{cfg.enabled=!!value;save();if(panel)panel.querySelector("#sd-enabled").checked=cfg.enabled;}
  };
  const init=()=>{buildPanel();observeMessages();};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
  if(window.speechSynthesis) window.speechSynthesis.addEventListener?.("voiceschanged",()=>{voices=arabicVoices();});
})();
