/* SSP.Q8 — لوحة العميل */
(() => {
  'use strict';
  const session = window.SSPAuth.requireRole('client', 'portal.html?role=client');
  if (!session) return;

  const $ = (id) => document.getElementById(id);
  const userNameEl = $('clientUserName');
  const logoutBtn = $('clientLogoutBtn');
  const pendingPurchaseBox = $('pendingPurchaseBox');
  const pendingPurchaseName = $('pendingPurchaseName');
  const pendingPurchasePrice = $('pendingPurchasePrice');
  const pendingPurchasePayBtn = $('pendingPurchasePayBtn');
  const orderList = $('orderList');
  const quoteRequestList = $('quoteRequestList');
  const purchaseList = $('purchaseList');
  const newOrderBtn = $('newOrderBtn');
  const newOrderModalOverlay = $('newOrderModalOverlay');
  const closeNewOrderModalBtn = $('closeNewOrderModalBtn');
  const cancelNewOrderBtn = $('cancelNewOrderBtn');
  const newOrderForm = $('newOrderForm');
  const projectNameInput = $('projectNameInput');
  const problemInput = $('problemInput');
  const natureOfWorkInput = $('natureOfWorkInput');
  const goalInput = $('goalInput');
  const expectedSolutionInput = $('expectedSolutionInput');
  const tierSelect = $('tierSelect');
  const complexitySelect = $('complexitySelect');
  const modalPricePreview = $('modalPricePreview');
  const forwardModalOverlay = $('forwardModalOverlay');
  const closeForwardModalBtn = $('closeForwardModalBtn');
  const cancelForwardBtn = $('cancelForwardBtn');
  const forwardForm = $('forwardForm');
  const companySelectGroup = $('companySelectGroup');
  const companySelect = $('companySelect');
  const companyTypeSelectGroup = $('companyTypeSelectGroup');
  const companyTypeSelect = $('companyTypeSelect');
  const toastContainer = $('toastContainer');
  let forwardingOrderId = null;
  let pendingOrderSelection = null;

  const ORDER_STATUS_CLASS = { 'قيد التنفيذ':'status-badge--progress', 'جاهز للتنزيل':'status-badge--done' };
  const REQUEST_STATUS_CLASS = { 'بانتظار العروض':'status-badge--open', 'تم اختيار عرض':'status-badge--done' };
  const fmt = (n) => Number(n).toFixed(3);
  const targetInputs = () => [...forwardForm.querySelectorAll('input[name="targetType"]')];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function showToast(message) {
    const t = document.createElement('div'); t.className='toast'; t.textContent=message; toastContainer.appendChild(t); setTimeout(()=>t.remove(),3000);
  }
  function formatDate(iso) { return iso ? new Date(iso).toLocaleString('ar-KW') : '—'; }

  function checkPendingPurchase() {
    let pending = null; try { pending = JSON.parse(localStorage.getItem('ssp_pending_purchase')); } catch(e) {}
    if (!pending) { pendingPurchaseBox.hidden = true; return; }
    pendingPurchaseName.textContent = pending.productName; pendingPurchasePrice.textContent = fmt(pending.price); pendingPurchaseBox.hidden = false;
    pendingPurchasePayBtn.onclick = () => {
      if (!confirm('دفع تجريبي فقط. هل تريد إكمال التجربة؟')) return;
      window.SSPPurchases.createPurchase({ buyerEmail:session.email, buyerName:session.name, buyerPhone:session.phone, productId:pending.productId, productName:pending.productName, price:pending.price });
      localStorage.removeItem('ssp_pending_purchase'); pendingPurchaseBox.hidden=true; renderPurchases(); showToast('تم تسجيل الشراء التجريبي.');
    };
  }
  function readPendingOrderSelection() {
    try { pendingOrderSelection = JSON.parse(localStorage.getItem('ssp_pending_order')); } catch(e) { pendingOrderSelection=null; }
    localStorage.removeItem('ssp_pending_order');
  }

  function downloadDocumentation(order) {
    const lines = [
      'وثيقة إثبات طلب وتسليم — SSP.Q8',
      `رقم التوثيق: ${order.referenceNo || order.id}`,
      `المشروع: ${order.projectName}`,
      `صاحب الطلب: ${order.ownerEmail} — ${order.ownerPhone || ''}`,
      `تاريخ الطلب: ${formatDate(order.createdAt)}`,
      `الخدمة: ${order.tierName} — ${order.complexityName}`,
      `المشكلة: ${order.problem}`,
      `الهدف: ${order.goal}`,
      `ملفات التسليم: ${(order.files || []).map((f)=>f.name).join('، ') || 'لا توجد'}`,
      '',
      'هذه الوثيقة تثبت تسجيل الطلب وتسليم ملفاته داخل النموذج التجريبي للمنصة، ولا تمثل حكماً قانونياً نهائياً على الملكية الفكرية.'
    ];
    const blob = new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${order.referenceNo || order.id}-documentation.txt`; a.click(); URL.revokeObjectURL(url);
  }

  function renderOrderActions(order) {
    if (order.status === 'قيد التنفيذ') return '<span style="font-size:13px;color:var(--color-text-muted)">يجري الآن إعداد الدراسة أو النموذج الأولي. لا يشمل ذلك برمجة النظام النهائي.</span>';
    const downloads = (order.files || []).map((file) => `<a class="download-chip" download="${escapeHtml(file.name)}" href="${file.dataUrl}" data-action="download-file" data-order-id="${order.id}">تنزيل: ${escapeHtml(file.name)}</a>`).join('');
    const forwardedCount = window.SSPMarketplace.getBySourceOrder(order.id).length;
    return `<div>${downloads}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button type="button" class="btn btn--outline btn--sm documentation-btn" data-id="${order.id}">تنزيل وثيقة التوثيق</button>
        <button type="button" class="btn btn--navy btn--sm forward-btn" data-id="${order.id}">إرسال الحزمة لشركات</button>
      </div>
      <p style="font-size:12px;color:var(--color-text-muted);margin-top:8px">بعد التسليم يمكنك التعاقد مع أي شركة خارج المنصة، أو طلب عروض من الشركات المشتركة. SSP.Q8 ليس طرفاً في عقد التنفيذ النهائي.</p>
      ${forwardedCount ? `<p style="font-size:12px;color:var(--color-teal);margin-top:5px">تم إرسال الحزمة ${forwardedCount} مرة لطلب عروض.</p>` : ''}`;
  }

  function renderOrderList() {
    const orders = window.SSPOrders.getByOwner(session.email);
    if (!orders.length) { orderList.innerHTML='<div class="empty-state">ما عندك طلبات حتى الآن.</div>'; return; }
    orderList.innerHTML = orders.map((o)=>`<article class="request-card" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div class="request-card__main">
          <h3 class="request-card__title">${escapeHtml(o.projectName)}</h3>
          <div class="request-card__meta"><span>${escapeHtml(o.tierName)}</span><span>${escapeHtml(o.complexityName)}</span><span class="mono">${escapeHtml(o.referenceNo || o.id)}</span><span class="request-card__price mono">${fmt(o.totalPrice)} د.ك</span></div>
          <p class="request-card__desc"><strong>المشكلة:</strong> ${escapeHtml(o.problem)}</p>
          <p class="request-card__desc"><strong>طبيعة العمل:</strong> ${escapeHtml(o.natureOfWork)}</p>
          <p class="request-card__desc"><strong>الهدف:</strong> ${escapeHtml(o.goal)}</p>
        </div><span class="status-badge ${ORDER_STATUS_CLASS[o.status]||''}">${o.status}</span>
      </div><div>${renderOrderActions(o)}</div></article>`).join('');
  }

  function targetLabel(r) {
    if (r.targetType === 'type') return `نوع الشركة: ${escapeHtml(r.targetCompanyType)}`;
    if (r.targetType === 'selected') return `شركات محددة: ${escapeHtml((r.targetCompanyNames||[]).join('، '))}`;
    return 'جميع الشركات المشتركة';
  }
  function renderQuoteCard(q, r) {
    const accepted = r.acceptedQuoteId === q.id;
    const contact = accepted ? `<div style="font-size:12.5px;color:var(--color-teal)">بيانات الشركة: ${escapeHtml(q.companyEmail)}${q.companyPhone ? ' — '+escapeHtml(q.companyPhone) : ''}</div>` : '';
    return `<div class="file-chip" style="align-items:flex-start;flex-direction:column;gap:6px;padding:12px">
      <div style="display:flex;justify-content:space-between;width:100%;gap:10px"><span class="file-chip__name">${escapeHtml(q.companyName)}</span><span class="mono" style="font-weight:600">${fmt(q.amount)} د.ك</span></div>
      ${q.companyType ? `<span style="font-size:12px">${escapeHtml(q.companyType)}</span>`:''}<span style="font-size:12.5px">مدة تقديرية: ${escapeHtml(q.deliveryTime)}</span>${q.note?`<span style="font-size:12.5px">${escapeHtml(q.note)}</span>`:''}
      ${r.status === 'بانتظار العروض' ? `<button type="button" class="btn btn--gold btn--sm accept-quote-btn" data-request-id="${r.id}" data-quote-id="${q.id}">اختيار هذا العرض</button>` : accepted ? '<span class="status-badge status-badge--done">تم اختيار العرض</span>' : '<span style="font-size:12px">تم اختيار شركة أخرى</span>'}
      ${contact}</div>`;
  }
  function renderQuoteRequests() {
    const requests = window.SSPMarketplace.getByOwner(session.email);
    if (!requests.length) { quoteRequestList.innerHTML='<div class="empty-state">ما أرسلت أي حزمة للشركات حتى الآن.</div>'; return; }
    quoteRequestList.innerHTML = requests.map((r)=>`<article class="request-card" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between;gap:12px"><div><h3 class="request-card__title">${escapeHtml(r.projectName)}</h3><div class="request-card__meta"><span>${targetLabel(r)}</span><span class="mono">${escapeHtml(r.sourceReferenceNo||'')}</span></div></div><span class="status-badge ${REQUEST_STATUS_CLASS[r.status]||''}">${r.status}</span></div>
      ${r.quotes.length ? `<div class="file-pending-list">${r.quotes.map((q)=>renderQuoteCard(q,r)).join('')}</div>` : '<p style="font-size:12.5px;color:var(--color-text-muted);margin-top:8px">لم تصل عروض بعد.</p>'}
      ${r.status === 'تم اختيار عرض' ? '<p style="font-size:12.5px;color:var(--color-text-muted);margin-top:8px">من هذه اللحظة يكون التعاقد والدفع والتنفيذ مباشرة بينك وبين الشركة، وخارج مسؤولية SSP.Q8.</p>' : ''}
    </article>`).join('');
  }
  function renderPurchases() {
    const items=window.SSPPurchases.getByBuyer(session.email);
    if(!items.length){purchaseList.innerHTML='<div class="empty-state">ما اشتريت أي منتج جاهز حتى الآن.</div>';return;}
    purchaseList.innerHTML=items.map((p)=>{const product=window.SSPProducts.getById(p.productId); const file=(product&&product.file)?`<a class="download-chip" download="${escapeHtml(product.file.name)}" href="${product.file.dataUrl}">تنزيل: ${escapeHtml(product.file.name)}</a>`:'<span style="font-size:12.5px">ملف المنتج لم يُرفع بعد.</span>'; return `<article class="request-card"><div><h3 class="request-card__title">${escapeHtml(p.productName)}</h3><div class="request-card__meta"><span class="mono">${fmt(p.price)} د.ك</span></div>${file}</div><span class="status-badge status-badge--done">مدفوع</span></article>`;}).join('');
  }

  function populateSelectOptions(){
    tierSelect.innerHTML=SITE_CONTENT.tiers.map((t,i)=>`<option value="${i}">${t.name} — ${t.price} د.ك</option>`).join('');
    complexitySelect.innerHTML=SITE_CONTENT.complexityLevels.map((c,i)=>`<option value="${i}">${c.name} (×${c.multiplier})</option>`).join('');
    if(pendingOrderSelection){const ti=SITE_CONTENT.tiers.findIndex(t=>t.name===pendingOrderSelection.tierName);const ci=SITE_CONTENT.complexityLevels.findIndex(c=>c.name===pendingOrderSelection.complexityName);if(ti>=0)tierSelect.value=ti;if(ci>=0)complexitySelect.value=ci;}
    updatePrice();
  }
  function updatePrice(){const t=SITE_CONTENT.tiers[Number(tierSelect.value)];const c=SITE_CONTENT.complexityLevels[Number(complexitySelect.value)];modalPricePreview.textContent=`${fmt(t.price*c.multiplier)} د.ك`;}
  function openNew(){newOrderModalOverlay.classList.add('is-open');projectNameInput.focus();}
  function closeNew(){newOrderModalOverlay.classList.remove('is-open');newOrderForm.reset();populateSelectOptions();}
  function submitNew(event){event.preventDefault(); if(!confirm('الدفع هنا تجريبي. هل تريد إنشاء الطلب؟'))return; const t=SITE_CONTENT.tiers[Number(tierSelect.value)],c=SITE_CONTENT.complexityLevels[Number(complexitySelect.value)]; const result=window.SSPOrders.createOrder({ownerEmail:session.email,ownerName:session.name,ownerPhone:session.phone,projectName:projectNameInput.value.trim(),problem:problemInput.value.trim(),natureOfWork:natureOfWorkInput.value.trim(),goal:goalInput.value.trim(),expectedSolution:expectedSolutionInput.value.trim(),tierName:t.name,complexityName:c.name,totalPrice:t.price*c.multiplier}); if(!result.success)return showToast(result.error||'تعذر إنشاء الطلب'); closeNew();renderOrderList();showToast('تم تسجيل الدفع والطلب.');}

  function populateTargets(){
    const companies=window.SSPAuth.getCompanies().filter(c=>c.subscriptionActive);
    companySelect.innerHTML=companies.length?companies.map(c=>`<option value="${c.email}">${escapeHtml(c.companyName||c.name)} — ${escapeHtml(c.companyType||'غير محدد')}</option>`).join(''):'<option disabled>لا توجد شركات مفعّلة حالياً</option>';
    companyTypeSelect.innerHTML=SITE_CONTENT.companyTypes.map(t=>`<option value="${t}">${t}</option>`).join('');
  }
  function updateTargetVisibility(){const v=(targetInputs().find(i=>i.checked)||{}).value; companySelectGroup.classList.toggle('form-hidden',v!=='selected');companyTypeSelectGroup.classList.toggle('form-hidden',v!=='type');}
  function openForward(id){forwardingOrderId=id;populateTargets();targetInputs().forEach(i=>i.checked=i.value==='broadcast');updateTargetVisibility();forwardModalOverlay.classList.add('is-open');}
  function closeForward(){forwardModalOverlay.classList.remove('is-open');forwardingOrderId=null;}
  function submitForward(event){event.preventDefault();const order=window.SSPOrders.getById(forwardingOrderId);if(!order)return;const targetType=(targetInputs().find(i=>i.checked)||{}).value||'broadcast';let targetCompanyType=null,targetCompanyEmails=[],targetCompanyNames=[];
    if(targetType==='type') targetCompanyType=companyTypeSelect.value;
    if(targetType==='selected'){const opts=[...companySelect.selectedOptions];if(!opts.length)return showToast('اختر شركة واحدة على الأقل.');targetCompanyEmails=opts.map(o=>o.value);targetCompanyNames=opts.map(o=>o.textContent.split(' — ')[0]);}
    window.SSPMarketplace.createRequest({ownerEmail:order.ownerEmail,ownerPhone:order.ownerPhone,ownerName:order.ownerName,sourceOrderId:order.id,sourceReferenceNo:order.referenceNo,projectName:order.projectName,description:`${order.problem} — الهدف: ${order.goal}`,tierName:order.tierName,complexityName:order.complexityName,attachedFiles:order.files,targetType,targetCompanyType,targetCompanyEmails,targetCompanyNames}); closeForward();renderOrderList();renderQuoteRequests();showToast('تم إرسال الحزمة لطلب عروض أسعار.');}

  function init(){
    userNameEl.textContent=session.email;
    logoutBtn.addEventListener('click',()=>{window.SSPAuth.clearSession();location.href='portal.html';});
    readPendingOrderSelection();populateSelectOptions();checkPendingPurchase();renderOrderList();renderQuoteRequests();renderPurchases();
    newOrderBtn.addEventListener('click',openNew);closeNewOrderModalBtn.addEventListener('click',closeNew);cancelNewOrderBtn.addEventListener('click',closeNew);newOrderForm.addEventListener('submit',submitNew);tierSelect.addEventListener('change',updatePrice);complexitySelect.addEventListener('change',updatePrice);
    closeForwardModalBtn.addEventListener('click',closeForward);cancelForwardBtn.addEventListener('click',closeForward);forwardForm.addEventListener('submit',submitForward);targetInputs().forEach(i=>i.addEventListener('change',updateTargetVisibility));
    orderList.addEventListener('click',(e)=>{const f=e.target.closest('.forward-btn');if(f)return openForward(f.dataset.id);const d=e.target.closest('[data-action="download-file"]');if(d)window.SSPOrders.markDownloaded(d.dataset.orderId);const cert=e.target.closest('.documentation-btn');if(cert){const order=window.SSPOrders.getById(cert.dataset.id);if(order)downloadDocumentation(order);}});
    quoteRequestList.addEventListener('click',(e)=>{const b=e.target.closest('.accept-quote-btn');if(!b)return;if(!confirm('بعد الاختيار يصبح التعاقد والتنفيذ مباشرة مع الشركة وخارج مسؤولية SSP.Q8. تأكيد؟'))return;const res=window.SSPMarketplace.acceptQuote(b.dataset.requestId,b.dataset.quoteId);if(!res.success)return showToast(res.error||'تعذر اختيار العرض');renderQuoteRequests();showToast('تم اختيار العرض وإظهار بيانات التواصل.');});
  }
  init();
})();
