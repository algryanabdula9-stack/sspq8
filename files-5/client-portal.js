/* ==========================================================================
   SSP.Q8 — CLIENT PORTAL SCRIPT
   ========================================================================== */

(() => {
  'use strict';

  const session = window.SSPAuth.requireRole('client', 'portal.html?role=client');
  if (!session) return; // requireRole يعيد التوجيه تلقائياً إذا ما فيه جلسة صالحة

  const userNameEl = document.getElementById('userName');
  const logoutBtn = document.getElementById('logoutBtn');
  const requestList = document.getElementById('requestList');
  const newRequestBtn = document.getElementById('newRequestBtn');

  const modalOverlay = document.getElementById('requestModalOverlay');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const requestForm = document.getElementById('requestForm');
  const projectNameInput = document.getElementById('projectNameInput');
  const projectDescInput = document.getElementById('projectDescInput');
  const tierSelect = document.getElementById('tierSelect');
  const complexitySelect = document.getElementById('complexitySelect');
  const modalPricePreview = document.getElementById('modalPricePreview');

  const toastContainer = document.getElementById('toastContainer');

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

  function renderRequestList() {
    const requests = window.SSPMarketplace.getByOwner(session.email);

    if (!requests.length) {
      requestList.innerHTML = `
        <div class="empty-state">
          ما عندك طلبات لسا. اضغط "طلب عرض سعر جديد" عشان ترسل أول فكرة لك.
        </div>`;
      return;
    }

    requestList.innerHTML = requests.map((request) => `
      <article class="request-card">
        <div class="request-card__main">
          <h3 class="request-card__title">${request.projectName}</h3>
          <div class="request-card__meta">
            <span>${request.tierName}</span>
            <span>${request.complexityName}</span>
            <span class="request-card__price mono">${formatCurrency(request.totalPrice)} د.ك</span>
            ${request.claimedByName ? `<span>الشركة: ${request.claimedByName}</span>` : ''}
          </div>
          <p class="request-card__desc">${request.description}</p>
        </div>
        <div class="request-card__side">
          <span class="status-badge ${STATUS_CLASS[request.status] || ''}">${request.status}</span>
        </div>
      </article>`).join('');
  }

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
    const total = tier.price * level.multiplier;
    modalPricePreview.textContent = `${formatCurrency(total)} د.ك`;
  }

  function openModal() {
    modalOverlay.classList.add('is-open');
    projectNameInput.focus();
  }

  function closeModal() {
    modalOverlay.classList.remove('is-open');
    requestForm.reset();
    populateSelectOptions();
  }

  function handleRequestSubmit(event) {
    event.preventDefault();

    const tier = SITE_CONTENT.tiers[Number(tierSelect.value)];
    const level = SITE_CONTENT.complexityLevels[Number(complexitySelect.value)];
    const total = tier.price * level.multiplier;

    window.SSPMarketplace.createRequest({
      ownerEmail: session.email,
      ownerName: session.name,
      projectName: projectNameInput.value.trim(),
      description: projectDescInput.value.trim(),
      tierName: tier.name,
      complexityName: level.name,
      totalPrice: total
    });

    closeModal();
    renderRequestList();
    showToast('تم إرسال طلبك للشركات المشتركة.');
  }

  function init() {
    userNameEl.textContent = session.name;

    logoutBtn.addEventListener('click', () => {
      window.SSPAuth.clearSession();
      window.location.href = 'portal.html';
    });

    newRequestBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (event) => {
      if (event.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modalOverlay.classList.contains('is-open')) closeModal();
    });

    tierSelect.addEventListener('change', updatePricePreview);
    complexitySelect.addEventListener('change', updatePricePreview);
    requestForm.addEventListener('submit', handleRequestSubmit);

    populateSelectOptions();
    renderRequestList();
  }

  init();
})();
