/* ==========================================================================
   SSP.Q8 — CLIENT PORTAL SCRIPT
   ========================================================================== */

(() => {
  'use strict';

  const session = window.SSPAuth.requireRole('client', 'portal.html?role=client');
  if (!session) return; // requireRole يعيد التوجيه تلقائياً إذا ما فيه جلسة صالحة

  const userNameEl = document.getElementById('clientUserName');
  const logoutBtn = document.getElementById('clientLogoutBtn');
  const orderList = document.getElementById('orderList');
  const newOrderBtn = document.getElementById('newOrderBtn');

  const newOrderModalOverlay = document.getElementById('newOrderModalOverlay');
  const closeNewOrderModalBtn = document.getElementById('closeNewOrderModalBtn');
  const cancelNewOrderBtn = document.getElementById('cancelNewOrderBtn');
  const newOrderForm = document.getElementById('newOrderForm');
  const projectNameInput = document.getElementById('projectNameInput');
  const projectDescInput = document.getElementById('projectDescInput');
  const tierSelect = document.getElementById('tierSelect');
  const complexitySelect = document.getElementById('complexitySelect');
  const modalPricePreview = document.getElementById('modalPricePreview');

  const forwardModalOverlay = document.getElementById('forwardModalOverlay');
  const closeForwardModalBtn = document.getElementById('closeForwardModalBtn');
  const cancelForwardBtn = document.getElementById('cancelForwardBtn');
  const forwardForm = document.getElementById('forwardForm');
  const targetTypeInputs = () => [...forwardForm.querySelectorAll('input[name="targetType"]')];
  const companySelectGroup = document.getElementById('companySelectGroup');
  const companySelect = document.getElementById('companySelect');

  const toastContainer = document.getElementById('toastContainer');

  let forwardingOrderId = null;

  const STATUS_CLASS = {
    'قيد المراجعة': 'status-badge--open',
    'قيد التنفيذ': 'status-badge--progress',
    'جاهز للدفع': 'status-badge--progress',
    'مكتمل الدفع': 'status-badge--done'
  };

  const STATUS_STEP = {
    'قيد المراجعة': 1,
    'قيد التنفيذ': 2,
    'جاهز للدفع': 3,
    'مكتمل الدفع': 4
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

  /* ------------------------------------------------------------------------
     RENDER ORDER LIST
     ------------------------------------------------------------------------ */
  function renderProgress(order) {
    const step = STATUS_STEP[order.status] || 1;
    let bars = '';
    for (let i = 1; i <= 4; i += 1) {
      bars += `<span class="order-progress__step ${i <= step ? 'is-done' : ''}"></span>`;
    }
    return `<div class="order-progress">${bars}</div>`;
  }

  function renderOrderActions(order) {
    if (order.status === 'جاهز للدفع') {
      return `<button type="button" class="btn btn--gold btn--sm pay-btn" data-id="${order.id}">ادفع الآن (${formatCurrency(order.totalPrice)} د.ك — تجريبي)</button>`;
    }

    if (order.status === 'مكتمل الدفع') {
      const downloadsHtml = order.files.map((file, index) => `
        <a class="download-chip" download="${file.name}" href="${file.dataUrl}" data-action="download-file" data-order-id="${order.id}">
          تنزيل: ${file.name}
        </a>`).join('');

      const forwardHtml = order.downloadedAt
        ? `<button type="button" class="btn btn--navy btn--sm forward-btn" data-id="${order.id}" style="margin-top:10px;">أرسل هذه الحزمة لعرض سعر</button>`
        : `<p style="font-size:12.5px; color: var(--color-text-muted); margin-top:10px;">نزّل ملف واحد على الأقل عشان تقدر ترسل الحزمة لعرض سعر.</p>`;

      const forwardedCount = window.SSPMarketplace.getBySourceOrder(order.id).length;
      const forwardedNote = forwardedCount
        ? `<p style="font-size:12px; color: var(--color-teal); margin-top:6px;">تم إرسالها لعرض سعر (${forwardedCount}).</p>`
        : '';

      return `<div>${downloadsHtml}</div>${forwardHtml}${forwardedNote}`;
    }

    if (order.status === 'قيد المراجعة') {
      return `<span style="font-size:13px; color: var(--color-text-muted);">بانتظار فريق SSP.Q8 يبدأ العمل على طلبك.</span>`;
    }

    if (order.status === 'قيد التنفيذ') {
      return `<span style="font-size:13px; color: var(--color-text-muted);">فريق SSP.Q8 يشتغل على نموذجك الآن.</span>`;
    }

    return '';
  }

  function renderOrderList() {
    const orders = window.SSPOrders.getByOwner(session.email);

    if (!orders.length) {
      orderList.innerHTML = `
        <div class="empty-state">
          ما عندك طلبات لسا. اضغط "طلب نموذج أولي جديد" عشان ترسل أول فكرة لك.
        </div>`;
      return;
    }

    orderList.innerHTML = orders.map((order) => `
      <article class="request-card" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div class="request-card__main">
            <h3 class="request-card__title">${order.projectName}</h3>
            <div class="request-card__meta">
              <span>${order.tierName}</span>
              <span>${order.complexityName}</span>
              <span class="request-card__price mono">${formatCurrency(order.totalPrice)} د.ك</span>
            </div>
            <p class="request-card__desc">${order.description}</p>
          </div>
          <span class="status-badge ${STATUS_CLASS[order.status] || ''}">${order.status}</span>
        </div>
        ${renderProgress(order)}
        <div>${renderOrderActions(order)}</div>
      </article>`).join('');
  }

  /* ------------------------------------------------------------------------
     NEW ORDER MODAL
     ------------------------------------------------------------------------ */
  function populateSelectOptions() {
    tierSelect.innerHTML = SITE_CONTENT.tiers.map((tier, index) =>
      `<option value="${index}">${tier.name} — من ${tier.price} د.ك</option>`
    ).join('');
    complexitySelect.innerHTML = SITE_CONTENT.complexityLevels.map((level, index) =>
      `<option value="${index}">${level.name} (×${level.multiplier})</option>`
    ).join('');
    updatePricePreview();
  }

  function updatePricePreview() {
    const tier = SITE_CONTENT.tiers[Number(tierSelect.value)];
    const level = SITE_CONTENT.complexityLevels[Number(complexitySelect.value)];
    modalPricePreview.textContent = `${formatCurrency(tier.price * level.multiplier)} د.ك`;
  }

  function openNewOrderModal() {
    newOrderModalOverlay.classList.add('is-open');
    projectNameInput.focus();
  }
  function closeNewOrderModal() {
    newOrderModalOverlay.classList.remove('is-open');
    newOrderForm.reset();
    populateSelectOptions();
  }

  function handleNewOrderSubmit(event) {
    event.preventDefault();

    const tier = SITE_CONTENT.tiers[Number(tierSelect.value)];
    const level = SITE_CONTENT.complexityLevels[Number(complexitySelect.value)];

    const result = window.SSPOrders.createOrder({
      ownerEmail: session.email,
      ownerName: session.name,
      projectName: projectNameInput.value.trim(),
      description: projectDescInput.value.trim(),
      tierName: tier.name,
      complexityName: level.name,
      totalPrice: tier.price * level.multiplier
    });

    if (!result.success) {
      showToast(result.error || 'تعذّر إرسال الطلب.');
      return;
    }

    closeNewOrderModal();
    renderOrderList();
    showToast('تم إرسال طلبك لفريق SSP.Q8.');
  }

  /* ------------------------------------------------------------------------
     PAYMENT (تجريبي) + DOWNLOAD TRACKING
     ------------------------------------------------------------------------ */
  function handlePayClick(orderId) {
    const confirmed = window.confirm('هذا دفع تجريبي بدون بوابة دفع حقيقية — نكمل؟');
    if (!confirmed) return;

    window.SSPOrders.markPaid(orderId);
    renderOrderList();
    showToast('تم الدفع (تجريبي) — تقدر تنزّل ملفاتك الآن.');
  }

  function handleDownloadClick(orderId) {
    window.SSPOrders.markDownloaded(orderId);
    // نأخر إعادة الرسم شوي عشان ما نقاطع بدء التنزيل نفسه
    window.setTimeout(renderOrderList, 300);
  }

  /* ------------------------------------------------------------------------
     FORWARD TO COMPANIES MODAL
     ------------------------------------------------------------------------ */
  function populateCompanySelect() {
    const companies = window.SSPAuth.getCompanies();
    if (!companies.length) {
      companySelect.innerHTML = `<option value="">ما فيه شركات مسجّلة لسا</option>`;
      return;
    }
    companySelect.innerHTML = companies.map((c) =>
      `<option value="${c.email}">${c.companyName || c.name}</option>`
    ).join('');
  }

  function updateForwardTargetVisibility() {
    const selected = targetTypeInputs().find((input) => input.checked);
    const isSpecific = selected && selected.value === 'specific';
    companySelectGroup.classList.toggle('form-hidden', !isSpecific);
    companySelect.required = isSpecific;
  }

  function openForwardModal(orderId) {
    forwardingOrderId = orderId;
    populateCompanySelect();
    targetTypeInputs().forEach((input) => { input.checked = input.value === 'broadcast'; });
    updateForwardTargetVisibility();
    forwardModalOverlay.classList.add('is-open');
  }

  function closeForwardModal() {
    forwardModalOverlay.classList.remove('is-open');
    forwardingOrderId = null;
  }

  function handleForwardSubmit(event) {
    event.preventDefault();
    if (!forwardingOrderId) return;

    const order = window.SSPOrders.getById(forwardingOrderId);
    if (!order) return;

    const selected = targetTypeInputs().find((input) => input.checked);
    const targetType = selected ? selected.value : 'broadcast';

    let targetCompanyEmail = null;
    let targetCompanyName = null;
    if (targetType === 'specific') {
      if (!companySelect.value) { showToast('اختر شركة أولاً.'); return; }
      const company = window.SSPAuth.getUserByEmail(companySelect.value);
      targetCompanyEmail = companySelect.value;
      targetCompanyName = company ? (company.companyName || company.name) : companySelect.value;
    }

    window.SSPMarketplace.createRequest({
      ownerEmail: order.ownerEmail,
      ownerName: order.ownerName,
      sourceOrderId: order.id,
      projectName: order.projectName,
      description: order.description,
      tierName: order.tierName,
      complexityName: order.complexityName,
      totalPrice: order.totalPrice,
      attachedFiles: order.files,
      targetType,
      targetCompanyEmail,
      targetCompanyName
    });

    closeForwardModal();
    renderOrderList();
    showToast(targetType === 'specific' ? `تم إرسال الطلب لـ${targetCompanyName}.` : 'تم إرسال الطلب لكل الشركات المشتركة.');
  }

  /* ------------------------------------------------------------------------
     EVENT DELEGATION (للأزرار المتغيّرة داخل قائمة الطلبات)
     ------------------------------------------------------------------------ */
  function handleOrderListClick(event) {
    const payBtn = event.target.closest('.pay-btn');
    if (payBtn) { handlePayClick(payBtn.dataset.id); return; }

    const forwardBtn = event.target.closest('.forward-btn');
    if (forwardBtn) { openForwardModal(forwardBtn.dataset.id); return; }

    const downloadLink = event.target.closest('[data-action="download-file"]');
    if (downloadLink) { handleDownloadClick(downloadLink.dataset.orderId); }
  }

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  function init() {
    userNameEl.textContent = session.name;

    logoutBtn.addEventListener('click', () => {
      window.SSPAuth.clearSession();
      window.location.href = 'portal.html';
    });

    newOrderBtn.addEventListener('click', openNewOrderModal);
    closeNewOrderModalBtn.addEventListener('click', closeNewOrderModal);
    cancelNewOrderBtn.addEventListener('click', closeNewOrderModal);
    newOrderModalOverlay.addEventListener('click', (event) => {
      if (event.target === newOrderModalOverlay) closeNewOrderModal();
    });
    tierSelect.addEventListener('change', updatePricePreview);
    complexitySelect.addEventListener('change', updatePricePreview);
    newOrderForm.addEventListener('submit', handleNewOrderSubmit);

    closeForwardModalBtn.addEventListener('click', closeForwardModal);
    cancelForwardBtn.addEventListener('click', closeForwardModal);
    forwardModalOverlay.addEventListener('click', (event) => {
      if (event.target === forwardModalOverlay) closeForwardModal();
    });
    targetTypeInputs().forEach((input) => input.addEventListener('change', updateForwardTargetVisibility));
    forwardForm.addEventListener('submit', handleForwardSubmit);

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (newOrderModalOverlay.classList.contains('is-open')) closeNewOrderModal();
      if (forwardModalOverlay.classList.contains('is-open')) closeForwardModal();
    });

    orderList.addEventListener('click', handleOrderListClick);

    populateSelectOptions();
    renderOrderList();
  }

  init();
})();
