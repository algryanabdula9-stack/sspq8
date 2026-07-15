/* ==========================================================================
   SSP.Q8 — COMPANY PORTAL SCRIPT
   ========================================================================== */

(() => {
  'use strict';

  const session = window.SSPAuth.requireRole('company', 'portal.html?role=company');
  if (!session) return;

  const userNameEl = document.getElementById('userName');
  const logoutBtn = document.getElementById('logoutBtn');

  const subscriptionText = document.getElementById('subscriptionText');
  const subscriptionBadge = document.getElementById('subscriptionBadge');

  const openRequestList = document.getElementById('openRequestList');
  const myQuotesList = document.getElementById('myQuotesList');
  const myRequestList = document.getElementById('myRequestList');
  const toastContainer = document.getElementById('toastContainer');

  const quoteModalOverlay = document.getElementById('quoteModalOverlay');
  const closeQuoteModalBtn = document.getElementById('closeQuoteModalBtn');
  const cancelQuoteModalBtn = document.getElementById('cancelQuoteModalBtn');
  const quoteForm = document.getElementById('quoteForm');
  const quoteAmountInput = document.getElementById('quoteAmountInput');
  const quoteDeliveryInput = document.getElementById('quoteDeliveryInput');
  const quoteNoteInput = document.getElementById('quoteNoteInput');

  let quotingRequestId = null;

  const STATUS_CLASS = {
    'مفتوح': 'status-badge--open',
    'قيد العمل': 'status-badge--progress',
    'مكتمل': 'status-badge--done'
  };

  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    toastContainer.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, 3000);
  }

  function formatCurrency(amount) {
    return Number(amount).toFixed(3);
  }

  function getCompanyName() {
    return session.companyName || session.name;
  }

  function isSubscribed() {
    const user = window.SSPAuth.getUserByEmail(session.email);
    return !!(user && user.subscriptionActive);
  }

  function renderSubscriptionBox() {
    const active = isSubscribed();
    subscriptionText.textContent = active ? 'نشط' : 'غير مفعّل';
    subscriptionBadge.textContent = active ? 'مفعّل' : 'غير مفعّل';
    subscriptionBadge.className = 'subscription-badge ' + (active ? 'subscription-badge--active' : 'subscription-badge--inactive');
  }

  function renderAttachedFiles(files) {
    if (!files || !files.length) return '';
    const chips = files.map((file) =>
      `<a class="download-chip" download="${file.name}" href="${file.dataUrl}">تنزيل: ${file.name}</a>`
    ).join('');
    return `<div style="margin-top:10px;">${chips}</div>`;
  }

  /* ------------------------------------------------------------------------
     طلبات مفتوحة — رفض أو تقديم عرض سعر
     ------------------------------------------------------------------------ */
  function renderOpenRequests() {
    const requests = window.SSPMarketplace.getOpenForCompany(session.email);
    const active = isSubscribed();

    if (!requests.length) {
      openRequestList.innerHTML = `<div class="empty-state">ما فيه طلبات مفتوحة حالياً.</div>`;
      return;
    }

    openRequestList.innerHTML = requests.map((request) => `
      <article class="request-card">
        <div class="request-card__main">
          <h3 class="request-card__title">${request.projectName}</h3>
          <div class="request-card__meta">
            <span>${request.tierName}</span>
            <span>${request.complexityName}</span>
            <span class="request-card__price mono">سعر SSP.Q8 الأساسي: ${formatCurrency(request.totalPrice)} د.ك</span>
            ${request.targetType === 'specific' ? '<span>موجّه لك تحديداً</span>' : '<span>مبثوث لكل الشركات</span>'}
          </div>
          <p class="request-card__desc">${request.description}</p>
          ${renderAttachedFiles(request.attachedFiles)}
        </div>
        <div class="request-card__side">
          <span class="status-badge ${STATUS_CLASS[request.status] || ''}">${request.status}</span>
          ${active
            ? `<div style="display:flex; gap:8px;">
                 <button type="button" class="btn btn--outline btn--sm reject-btn" data-id="${request.id}">رفض</button>
                 <button type="button" class="btn btn--gold btn--sm quote-btn" data-id="${request.id}">تقديم عرض سعر</button>
               </div>`
            : `<span style="font-size:12.5px; color: var(--color-text-muted);">لازم يفعّل فريق SSP.Q8 اشتراكك عشان تقدر ترسل عروض</span>`}
        </div>
      </article>`).join('');

    openRequestList.querySelectorAll('.reject-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleReject(btn.dataset.id));
    });
    openRequestList.querySelectorAll('.quote-btn').forEach((btn) => {
      btn.addEventListener('click', () => openQuoteModal(btn.dataset.id));
    });
  }

  function handleReject(id) {
    window.SSPMarketplace.dismissForCompany(id, session.email);
    showToast('تم إخفاء الطلب من قائمتك.');
    renderOpenRequests();
  }

  /* ------------------------------------------------------------------------
     نافذة تقديم عرض سعر
     ------------------------------------------------------------------------ */
  function openQuoteModal(requestId) {
    quotingRequestId = requestId;
    quoteForm.reset();
    quoteModalOverlay.classList.add('is-open');
    quoteAmountInput.focus();
  }
  function closeQuoteModal() {
    quoteModalOverlay.classList.remove('is-open');
    quotingRequestId = null;
  }

  function handleQuoteSubmit(event) {
    event.preventDefault();
    if (!quotingRequestId) return;

    const result = window.SSPMarketplace.submitQuote(quotingRequestId, {
      companyEmail: session.email,
      companyName: getCompanyName(),
      amount: Number(quoteAmountInput.value),
      deliveryTime: quoteDeliveryInput.value.trim(),
      note: quoteNoteInput.value.trim()
    });

    if (!result.success) {
      showToast(result.error || 'تعذّر إرسال العرض.');
      return;
    }

    closeQuoteModal();
    showToast('تم إرسال عرض سعرك للعميل.');
    renderAll();
  }

  /* ------------------------------------------------------------------------
     عروضي المرسلة
     ------------------------------------------------------------------------ */
  function renderMyQuotes() {
    const entries = window.SSPMarketplace.getQuotesByCompany(session.email);

    if (!entries.length) {
      myQuotesList.innerHTML = `<div class="empty-state">ما أرسلت أي عرض سعر لسا.</div>`;
      return;
    }

    myQuotesList.innerHTML = entries.map(({ request, quote, won }) => {
      let statusLabel = 'بانتظار رد العميل';
      let statusClass = 'status-badge--open';
      if (request.status === 'قيد العمل' || request.status === 'مكتمل') {
        statusLabel = won ? 'تم قبول عرضك' : 'اختار العميل شركة ثانية';
        statusClass = won ? 'status-badge--done' : 'status-badge--progress';
      }

      return `
        <article class="request-card">
          <div class="request-card__main">
            <h3 class="request-card__title">${request.projectName}</h3>
            <div class="request-card__meta">
              <span class="request-card__price mono">عرضك: ${formatCurrency(quote.amount)} د.ك</span>
              <span>مدة التسليم: ${quote.deliveryTime}</span>
            </div>
          </div>
          <div class="request-card__side">
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </div>
        </article>`;
    }).join('');
  }

  /* ------------------------------------------------------------------------
     طلبات جاري تنفيذها (تم قبول عرضي فيها)
     ------------------------------------------------------------------------ */
  function renderMyRequests() {
    const requests = window.SSPMarketplace.getClaimedBy(session.email);

    if (!requests.length) {
      myRequestList.innerHTML = `<div class="empty-state">ما عندك طلبات جاري تنفيذها حالياً.</div>`;
      return;
    }

    myRequestList.innerHTML = requests.map((request) => `
      <article class="request-card">
        <div class="request-card__main">
          <h3 class="request-card__title">${request.projectName}</h3>
          <div class="request-card__meta">
            <span class="request-card__price mono">${formatCurrency(request.totalPrice)} د.ك</span>
            <span>تواصل مع العميل: ${request.ownerEmail}</span>
          </div>
          <p class="request-card__desc">${request.description}</p>
          ${renderAttachedFiles(request.attachedFiles)}
        </div>
        <div class="request-card__side">
          <span class="status-badge ${STATUS_CLASS[request.status] || ''}">${request.status}</span>
          ${request.status === 'قيد العمل'
            ? `<button type="button" class="btn btn--outline btn--sm complete-btn" data-id="${request.id}">تحديد كمكتمل</button>`
            : ''}
        </div>
      </article>`).join('');

    myRequestList.querySelectorAll('.complete-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleComplete(btn.dataset.id));
    });
  }

  function handleComplete(id) {
    window.SSPMarketplace.complete(id);
    showToast('تم تحديد الطلب كمكتمل.');
    renderAll();
  }

  function renderAll() {
    renderSubscriptionBox();
    renderOpenRequests();
    renderMyQuotes();
    renderMyRequests();
  }

  function init() {
    userNameEl.textContent = getCompanyName();

    logoutBtn.addEventListener('click', () => {
      window.SSPAuth.clearSession();
      window.location.href = 'portal.html';
    });

    closeQuoteModalBtn.addEventListener('click', closeQuoteModal);
    cancelQuoteModalBtn.addEventListener('click', closeQuoteModal);
    quoteModalOverlay.addEventListener('click', (event) => {
      if (event.target === quoteModalOverlay) closeQuoteModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && quoteModalOverlay.classList.contains('is-open')) closeQuoteModal();
    });
    quoteForm.addEventListener('submit', handleQuoteSubmit);

    renderAll();
  }

  init();
})();
