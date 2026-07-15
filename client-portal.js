/* ==========================================================================
   SSP.Q8 — CLIENT PORTAL SCRIPT
   ========================================================================== */

(() => {
  'use strict';

  const session = window.SSPAuth.requireRole('client', 'portal.html?role=client');
  if (!session) return;

  const userNameEl = document.getElementById('clientUserName');
  const logoutBtn = document.getElementById('clientLogoutBtn');

  const pendingPurchaseBox = document.getElementById('pendingPurchaseBox');
  const pendingPurchaseName = document.getElementById('pendingPurchaseName');
  const pendingPurchasePrice = document.getElementById('pendingPurchasePrice');
  const pendingPurchasePayBtn = document.getElementById('pendingPurchasePayBtn');

  const orderList = document.getElementById('orderList');
  const quoteRequestList = document.getElementById('quoteRequestList');
  const purchaseList = document.getElementById('purchaseList');
  const newOrderBtn = document.getElementById('newOrderBtn');

  const newOrderModalOverlay = document.getElementById('newOrderModalOverlay');
  const closeNewOrderModalBtn = document.getElementById('closeNewOrderModalBtn');
  const cancelNewOrderBtn = document.getElementById('cancelNewOrderBtn');
  const newOrderForm = document.getElementById('newOrderForm');
  const projectNameInput = document.getElementById('projectNameInput');
  const problemInput = document.getElementById('problemInput');
  const natureOfWorkInput = document.getElementById('natureOfWorkInput');
  const goalInput = document.getElementById('goalInput');
  const expectedSolutionInput = document.getElementById('expectedSolutionInput');
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

  const ORDER_STATUS_CLASS = {
    'قيد التنفيذ': 'status-badge--progress',
    'جاهز للتنزيل': 'status-badge--done'
  };
  const ORDER_STATUS_STEP = { 'قيد التنفيذ': 1, 'جاهز للتنزيل': 2 };

  const REQUEST_STATUS_CLASS = {
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

  /* ------------------------------------------------------------------------
     PENDING PURCHASE / ORDER (قادمة من زر بالصفحة الرئيسية)
     ------------------------------------------------------------------------ */
  function checkPendingPurchase() {
    let pending;
    try {
      pending = JSON.parse(localStorage.getItem('ssp_pending_purchase'));
    } catch (e) {
      pending = null;
    }
    if (!pending) {
      pendingPurchaseBox.hidden = true;
      return;
    }
    pendingPurchaseName.textContent = pending.productName;
    pendingPurchasePrice.textContent = formatCurrency(pending.price);
    pendingPurchaseBox.hidden = false;

    pendingPurchasePayBtn.onclick = () => {
      const confirmed = window.confirm('هذا دفع تجريبي بدون بوابة دفع حقيقية — نكمل؟');
      if (!confirmed) return;

      window.SSPPurchases.createPurchase({
        buyerEmail: session.email,
        buyerName: session.name,
        buyerPhone: session.phone,
        productId: pending.productId,
        productName: pending.productName,
        price: pending.price
      });

      localStorage.removeItem('ssp_pending_purchase');
      pendingPurchaseBox.hidden = true;
      showToast('تم الدفع — منتجك جاهز بالأسفل.');
      renderPurchases();
    };
  }

  let pendingOrderSelection = null;
  function readPendingOrderSelection() {
    try {
      pendingOrderSelection = JSON.parse(localStorage.getItem('ssp_pending_order'));
    } catch (e) {
      pendingOrderSelection = null;
    }
    localStorage.removeItem('ssp_pending_order');
  }

  /* ------------------------------------------------------------------------
     ORDERS (طلبات النموذج الأولي)
     ------------------------------------------------------------------------ */
  function renderProgress(order) {
    const step = ORDER_STATUS_STEP[order.status] || 1;
    let bars = '';
    for (let i = 1; i <= 2; i += 1) {
      bars += `<span class="order-progress__step ${i <= step ? 'is-done' : ''}"></span>`;
    }
    return `<div class="order-progress">${bars}</div>`;
  }

  function renderOrderActions(order) {
    if (order.status === 'قيد التنفيذ') {
      return `<span style="font-size:13px; color: var(--color-text-muted);">فريق SSP.Q8 يشتغل على نموذجك الآن.</span>`;
    }

    if (order.status === 'جاهز للتنزيل') {
      const downloadsHtml = order.files.map((file) => `
        <a class="download-chip" download="${file.name}" href="${file.dataUrl}" data-action="download-file" data-order-id="${order.id}">
          تنزيل: ${file.name}
        </a>`).join('');

      const forwardHtml = order.downloadedAt
        ? `<button type="button" class="btn btn--navy btn--sm forward-btn" data-id="${order.id}" style="margin-top:10px;">أرسل هذه الحزمة لعرض سعر</button>`
        : `<p style="font-size:12.5px; color: var(--color-text-muted); margin-top:10px;">نزّل ملف واحد على الأقل عشان تقدر ترسل الحزمة لعرض سعر.</p>`;

      const forwardedCount = window.SSPMarketplace.getBySourceOrder(order.id).length;
      const forwardedNote = forwardedCount
        ? `<p style="font-size:12px; color: var(--color-teal); margin-top:6px;">تم إرسالها لعرض سعر (${forwardedCount}) — شوف قسم "طلبات عروض الأسعار" بالأسفل.</p>`
        : '';

      return `<div>${downloadsHtml}</div>${forwardHtml}${forwardedNote}`;
    }

    return '';
  }

  function renderOrderList() {
    const orders = window.SSPOrders.getByOwner(session.email);

    if (!orders.length) {
      orderList.innerHTML = `<div class="empty-state">ما عندك طلبات لسا. اضغط "طلب نموذج أولي جديد" عشان ترسل أول فكرة لك.</div>`;
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
            <p class="request-card__desc"><strong>المشكلة:</strong> ${order.problem}</p>
            <p class="request-card__desc"><strong>طبيعة العمل:</strong> ${order.natureOfWork}</p>
            <p class="request-card__desc"><strong>الهدف:</strong> ${order.goal}</p>
          </div>
          <span class="status-badge ${ORDER_STATUS_CLASS[order.status] || ''}">${order.status}</span>
        </div>
        ${renderProgress(order)}
        <div>${renderOrderActions(order)}</div>
      </article>`).join('');
  }

  /* ------------------------------------------------------------------------
     QUOTE REQUESTS (المُرسلة لشركات البرمجة) + مقارنة العروض
     ------------------------------------------------------------------------ */
  function renderQuoteCard(quote, request) {
    const isAccepted = request.acceptedQuoteId === quote.id;
    return `
      <div class="file-chip" style="align-items:flex-start; flex-direction:column; gap:6px; padding:12px;">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
          <span class="file-chip__name">${quote.companyName}</span>
          <span class="mono" style="color: var(--color-navy); font-weight:600;">${formatCurrency(quote.amount)} د.ك</span>
        </div>
        <span style="font-size:12.5px; color: var(--color-text-muted);">مدة التسليم المتوقعة: ${quote.deliveryTime}</span>
        ${quote.note ? `<span style="font-size:12.5px; color: var(--color-text-muted);">${quote.note}</span>` : ''}
        ${request.status === 'مفتوح'
          ? `<button type="button" class="btn btn--gold btn--sm accept-quote-btn" data-request-id="${request.id}" data-quote-id="${quote.id}" style="margin-top:6px;">قبول هذا العرض</button>`
          : isAccepted
            ? `<span class="status-badge status-badge--done" style="margin-top:6px;">تم القبول</span>`
            : ''}
      </div>`;
  }

  function renderQuoteRequestList() {
    const requests = window.SSPMarketplace.getByOwner(session.email);

    if (!requests.length) {
      quoteRequestList.innerHTML = `<div class="empty-state">ما أرسلت أي طلب لعرض سعر لسا. نزّل ملفات طلب مكتمل من الأعلى عشان تقدر ترسله.</div>`;
      return;
    }

    quoteRequestList.innerHTML = requests.map((request) => {
      const quotesHtml = request.quotes.length
        ? `<div class="file-pending-list">${request.quotes.map((q) => renderQuoteCard(q, request)).join('')}</div>`
        : `<p style="font-size:12.5px; color: var(--color-text-muted); margin-top:8px;">ما وصلت عروض أسعار لسا.</p>`;

      return `
        <article class="request-card" style="flex-direction:column; align-items:stretch;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div class="request-card__main">
              <h3 class="request-card__title">${request.projectName}</h3>
              <div class="request-card__meta">
                <span>${request.targetType === 'specific' ? 'شركة: ' + (request.targetCompanyName || '') : 'مبثوث لكل الشركات'}</span>
              </div>
            </div>
            <span class="status-badge ${REQUEST_STATUS_CLASS[request.status] || ''}">${request.status}</span>
          </div>
          ${quotesHtml}
        </article>`;
    }).join('');
  }

  function handleAcceptQuote(requestId, quoteId) {
    const confirmed = window.confirm('راح يُقفل الطلب عن باقي الشركات بعد ما توافق على هذا العرض. تأكيد؟');
    if (!confirmed) return;

    window.SSPMarketplace.acceptQuote(requestId, quoteId);
    renderQuoteRequestList();
    showToast('تم قبول العرض — الطلب صار مع هذي الشركة الآن.');
  }

  /* ------------------------------------------------------------------------
     PURCHASED PRODUCTS (منتجاتي المشتراة)
     ------------------------------------------------------------------------ */
  function renderPurchases() {
    const purchases = window.SSPPurchases.getByBuyer(session.email);

    if (!purchases.length) {
      purchaseList.innerHTML = `<div class="empty-state">ما اشتريت أي منتج جاهز لسا.</div>`;
      return;
    }

    purchaseList.innerHTML = purchases.map((purchase) => {
      const product = window.SSPProducts.getById(purchase.productId);
      const fileHtml = (product && product.file)
        ? `<a class="download-chip" download="${product.file.name}" href="${product.file.dataUrl}">تنزيل: ${product.file.name}</a>`
        : `<span style="font-size:12.5px; color: var(--color-text-muted);">لسا ما رفعت الإدارة ملف هذا المنتج.</span>`;

      return `
        <article class="request-card">
          <div class="request-card__main">
            <h3 class="request-card__title">${purchase.productName}</h3>
            <div class="request-card__meta">
              <span class="request-card__price mono">${formatCurrency(purchase.price)} د.ك</span>
            </div>
            <div style="margin-top:10px;">${fileHtml}</div>
          </div>
        </article>`;
    }).join('');
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

    if (pendingOrderSelection) {
      const tierIndex = SITE_CONTENT.tiers.findIndex((t) => t.name === pendingOrderSelection.tierName);
      const complexityIndex = SITE_CONTENT.complexityLevels.findIndex((c) => c.name === pendingOrderSelection.complexityName);
      if (tierIndex >= 0) tierSelect.value = String(tierIndex);
      if (complexityIndex >= 0) complexitySelect.value = String(complexityIndex);
    }

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

    const confirmed = window.confirm('هذا دفع تجريبي بدون بوابة دفع حقيقية — نكمل؟');
    if (!confirmed) return;

    const tier = SITE_CONTENT.tiers[Number(tierSelect.value)];
    const level = SITE_CONTENT.complexityLevels[Number(complexitySelect.value)];

    const result = window.SSPOrders.createOrder({
      ownerEmail: session.email,
      ownerName: session.name,
      ownerPhone: session.phone,
      projectName: projectNameInput.value.trim(),
      problem: problemInput.value.trim(),
      natureOfWork: natureOfWorkInput.value.trim(),
      goal: goalInput.value.trim(),
      expectedSolution: expectedSolutionInput.value.trim(),
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
    showToast('تم الدفع وإرسال طلبك لفريق SSP.Q8.');
  }

  /* ------------------------------------------------------------------------
     DOWNLOAD TRACKING
     ------------------------------------------------------------------------ */
  function handleDownloadClick(orderId) {
    window.SSPOrders.markDownloaded(orderId);
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
      description: `${order.problem} — الهدف: ${order.goal}`,
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
    renderQuoteRequestList();
    showToast(targetType === 'specific' ? `تم إرسال الطلب لـ${targetCompanyName}.` : 'تم إرسال الطلب لكل الشركات المشتركة.');
  }

  /* ------------------------------------------------------------------------
     EVENT DELEGATION
     ------------------------------------------------------------------------ */
  function handleOrderListClick(event) {
    const forwardBtn = event.target.closest('.forward-btn');
    if (forwardBtn) { openForwardModal(forwardBtn.dataset.id); return; }

    const downloadLink = event.target.closest('[data-action="download-file"]');
    if (downloadLink) { handleDownloadClick(downloadLink.dataset.orderId); }
  }

  function handleQuoteListClick(event) {
    const acceptBtn = event.target.closest('.accept-quote-btn');
    if (acceptBtn) { handleAcceptQuote(acceptBtn.dataset.requestId, acceptBtn.dataset.quoteId); }
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

    readPendingOrderSelection();
    checkPendingPurchase();

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
    quoteRequestList.addEventListener('click', handleQuoteListClick);

    populateSelectOptions();
    renderOrderList();
    renderQuoteRequestList();
    renderPurchases();

    if (pendingOrderSelection) openNewOrderModal();
  }

  init();
})();
