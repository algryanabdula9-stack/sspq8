(function(){
  'use strict';
  const STATUS=[
    {id:'received',label:'تم استلام الطلب',className:'status-new'},
    {id:'review',label:'قيد المراجعة',className:'status-review'},
    {id:'needs_info',label:'يحتاج معلومات إضافية',className:'status-info'},
    {id:'working',label:'قيد العمل',className:'status-work'},
    {id:'ready',label:'جاهز للتسليم',className:'status-ready'},
    {id:'delivered',label:'تم التسليم',className:'status-delivered'}
  ];
  const DEFAULT_PACKAGES=[
    {id:'pkg_docs',name:'دراسة وملفات وصفية',shortDescription:'تحليل الفكرة وتحويلها إلى متطلبات ووصف منظم يساعدك قبل التطوير.',price:0,duration:'',revisions:0,published:false,featured:false,includes:['تحليل المشكلة والهدف','وصف الصفحات والوظائف','سير العمل المقترح','ملفات وصفية قابلة للتنزيل'],excludes:['تصميم واجهات','نموذج تفاعلي','نظام نهائي أو برمجة خلفية'],sortOrder:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
    {id:'pkg_ui',name:'تصميم الواجهات',shortDescription:'تصور مرئي للصفحات والشاشات مع تنقل للعرض فقط دون وظائف فعلية.',price:0,duration:'',revisions:0,published:false,featured:false,includes:['تصميم الصفحات الرئيسية','تدفق وتنقل مرئي','ملفات صور أو عرض للواجهات','ملف وصف مختصر'],excludes:['تفاعل برمجي فعلي','حفظ بيانات','قاعدة بيانات أو خادم'],sortOrder:2,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
    {id:'pkg_interactive',name:'نموذج أولي تفاعلي',shortDescription:'نموذج يعمل في المتصفح باستخدام HTML وCSS وJavaScript لتجربة الفكرة.',price:0,duration:'',revisions:0,published:false,featured:true,includes:['نموذج HTML تفاعلي','تصميم متجاوب','الأزرار والنوافذ والتنقل','ملفات الوصف والتصميم'],excludes:['قاعدة بيانات فعلية','تسجيل دخول حقيقي','استضافة أو تشغيل تجاري'],sortOrder:3,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
    {id:'pkg_dbdesign',name:'نموذج تفاعلي + تصميم قاعدة البيانات',shortDescription:'نموذج تفاعلي متكامل مع مخطط مقترح للجداول والحقول والعلاقات.',price:0,duration:'',revisions:0,published:false,featured:false,includes:['كل مخرجات النموذج التفاعلي','مخطط ERD مبدئي','الجداول والحقول والعلاقات','وصف المستخدمين والصلاحيات','ملفات المتطلبات والتصميم'],excludes:['إنشاء قاعدة بيانات فعلية','خادم أو API','ربط مباشر بالموقع','ضمان اعتماد التصميم النهائي دون مراجعة المبرمج'],sortOrder:4,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
  ];
  const DEFAULT_SETTINGS={
    key:'general',brandName:'SSP.Q8',contactEmail:'',contactPhone:'',
    acknowledgement:'أقر بأنني قرأت تفاصيل الباقة وفهمت محتوياتها وحدودها، وأعلم أن الخدمة المقدمة هي تحليل وتصميم أو نموذج أولي فقط، ولا تشمل برمجة نظام نهائي أو إنشاء وربط قاعدة بيانات فعلية.',
    productsEnabled:false,companiesEnabled:false,updatedAt:new Date().toISOString()
  };
  function uid(prefix){return prefix+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)}
  function normalizeEmail(v){return String(v||'').trim().toLowerCase()}
  function normalizePhone(v){return String(v||'').replace(/\s+/g,'').trim()}
  function fmtMoney(n){return Number(n||0).toFixed(3)+' د.ك'}
  function fmtDate(v){if(!v)return '—';return new Intl.DateTimeFormat('ar-KW',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}
  function escapeHTML(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function orderReference(){const d=new Date();const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `SSP-${y}${m}${day}-${Math.random().toString(36).slice(2,7).toUpperCase()}`}
  async function hash(text){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  async function ensureSeed(){await SSPDB.openDB();const packages=await SSPDB.getAll('packages');if(!packages.length){for(const p of DEFAULT_PACKAGES) await SSPDB.put('packages',p)}const settings=await SSPDB.get('settings','general');if(!settings) await SSPDB.put('settings',DEFAULT_SETTINGS)}
  function setSession(data){localStorage.setItem('sspq8_session',JSON.stringify(data))}
  function getSession(){try{return JSON.parse(localStorage.getItem('sspq8_session'))}catch{return null}}
  function clearSession(){localStorage.removeItem('sspq8_session')}
  function requireSession(role,redirect='login.html'){const s=getSession();if(!s||s.role!==role){location.href=redirect;return null}return s}
  function toast(message,type='normal'){let box=document.getElementById('toastBox');if(!box){box=document.createElement('div');box.id='toastBox';box.style.cssText='position:fixed;bottom:20px;left:20px;z-index:200;display:grid;gap:8px';document.body.appendChild(box)}const t=document.createElement('div');t.textContent=message;t.style.cssText=`background:${type==='error'?'#7a1b14':'#162b4d'};color:white;padding:11px 15px;border-radius:8px;box-shadow:0 12px 35px rgba(0,0,0,.18);font-size:13px;border-right:4px solid ${type==='error'?'#ff8a80':'#c9a227'}`;box.appendChild(t);setTimeout(()=>t.remove(),3200)}
  function downloadText(filename,content,type='text/plain;charset=utf-8'){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function statusInfo(id){return STATUS.find(s=>s.id===id)||STATUS[0]}
  window.SSP={STATUS,DEFAULT_PACKAGES,DEFAULT_SETTINGS,uid,normalizeEmail,normalizePhone,fmtMoney,fmtDate,escapeHTML,orderReference,hash,ensureSeed,setSession,getSession,clearSession,requireSession,toast,downloadText,statusInfo};
})();
