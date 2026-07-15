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
  const subscriptionToggleBtn = document.getElementById('subscriptionToggleBtn');

  const openRequestList = document.getElementById('openRequestList');
  const myRequestList = document.getElementById('myRequestList');
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
    subscriptionToggleBtn.textContent = active ? 'إلغاء التفعيل (تجريبي)' : 'تفعيل الاشتراك (تجريبي)';
  }

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
            <span class="request-card__price mono">${formatCurrency(request.totalPrice)} د.ك</span>
            ${request.targetType === 'specific' ? '<span>موجّه لك تحديداً</span>' : '<span>مبثوث لكل الشركات</span>'}
          </div>
          <p class="request-card__desc">${request.description}</p>
          ${renderAttachedFiles(request.attachedFiles)}
        </div>
        <div class="request-card__side">
          <span class="status-badge ${STATUS_CLASS[request.status] || ''}">${request.status}</span>
          ${active
            ? `<button type="button" class="btn btn--navy btn--sm claim-btn" data-id="${request.id}">استلام الطلب</button>`
            : `<span style="font-size:12.5px; color: var(--color-text-muted);">فعّل الاشتراك لتستلم الطلبات</span>`}
        </div>
      </article>`).join('');

    openRequestList.querySelectorAll('.claim-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleClaim(btn.dataset.id));
    });
  }

  function renderAttachedFiles(files) {
    if (!files || !files.length) return '';
    const chips = files.map((file) =>
      `<a class="download-chip" download="${file.name}" href="${file.dataUrl}">تنزيل: ${file.name}</a>`
    ).join('');
    return `<div style="margin-top:10px;">${chips}</div>`;
  }

  function renderMyRequests() {
    const requests = window.SSPMarketplace.getClaimedBy(session.email);

    if (!requests.length) {
      myRequestList.innerHTML = `<div class="empty-state">ما استلمت أي طلب لسا.</div>`;
      return;
    }

    myRequestList.innerHTML = requests.map((request) => `
      <article class="request-card">
        <div class="request-card__main">
          <h3 class="request-card__title">${request.projectName}</h3>
          <div class="request-card__meta">
            <span>${request.tierName}</span>
            <span>${request.complexityName}</span>
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

  function renderAll() {
    renderSubscriptionBox();
    renderOpenRequests();
    renderMyRequests();
  }

  function handleClaim(id) {
    if (!isSubscribed()) {
      showToast('فعّل الاشتراك أولاً عشان تقدر تستلم الطلبات.');
      return;
    }
    const result = window.SSPMarketplace.claim(id, session.email, getCompanyName());
    if (result.success) {
      showToast('تم استلام الطلب — تقدر تتواصل مع العميل الآن.');
      renderAll();
    }
  }

  function handleComplete(id) {
    window.SSPMarketplace.complete(id);
    showToast('تم تحديد الطلب كمكتمل.');
    renderAll();
  }

  function handleSubscriptionToggle() {
    const nextState = !isSubscribed();
    window.SSPAuth.updateSubscription(session.email, nextState);
    showToast(nextState ? 'تم تفعيل الاشتراك (تجريبي).' : 'تم إلغاء تفعيل الاشتراك.');
    renderAll();
  }

  function init() {
    userNameEl.textContent = getCompanyName();

    logoutBtn.addEventListener('click', () => {
      window.SSPAuth.clearSession();
      window.location.href = 'portal.html';
    });

    subscriptionToggleBtn.addEventListener('click', handleSubscriptionToggle);

    renderAll();
  }

  init();
})();
