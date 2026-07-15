/* ==========================================================================
   SSP.Q8 — ADMIN SCRIPT
   ========================================================================== */

(() => {
  'use strict';

  const adminHeaderUser = document.getElementById('adminHeaderUser');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  const adminLoginView = document.getElementById('adminLoginView');
  const adminDashboardView = document.getElementById('adminDashboardView');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminAuthError = document.getElementById('adminAuthError');
  const adminEmailInput = document.getElementById('adminEmailInput');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const adminOrderList = document.getElementById('adminOrderList');
  const toastContainer = document.getElementById('toastContainer');

  // pending files لكل طلب لسا ما انرفعت نهائياً (تُبنى قبل الضغط على "رفع الملفات")
  const pendingFilesByOrder = {};

  const STATUS_CLASS = {
    'قيد المراجعة': 'status-badge--open',
    'قيد التنفيذ': 'status-badge--progress',
    'جاهز للدفع': 'status-badge--progress',
    'مكتمل الدفع': 'status-badge--done'
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

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' كيلوبايت';
    return (bytes / (1024 * 1024)).toFixed(1) + ' ميجابايت';
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, size: file.size, dataUrl: reader.result });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /* ------------------------------------------------------------------------
     AUTH GATE
     ------------------------------------------------------------------------ */
  function showLoginView() {
    adminLoginView.hidden = false;
    adminDashboardView.hidden = true;
    adminHeaderUser.hidden = true;
  }

  function showDashboardView() {
    adminLoginView.hidden = true;
    adminDashboardView.hidden = false;
    adminHeaderUser.hidden = false;
    renderOrders();
  }

  function checkSession() {
    const session = window.SSPAuth.getSession();
    if (session && session.role === 'admin') {
      showDashboardView();
    } else {
      showLoginView();
    }
  }

  function handleAdminLogin(event) {
    event.preventDefault();
    adminAuthError.classList.remove('is-visible');

    const result = window.SSPAuth.loginAdmin({
      email: adminEmailInput.value,
      password: adminPasswordInput.value
    });

    if (!result.success) {
      adminAuthError.textContent = result.error;
      adminAuthError.classList.add('is-visible');
      return;
    }

    adminLoginForm.reset();
    showToast('تم تسجيل الدخول.');
    showDashboardView();
  }

  /* ------------------------------------------------------------------------
     RENDERING
     ------------------------------------------------------------------------ */
  function renderOrderActions(order) {
    if (order.status === 'قيد المراجعة') {
      return `<button type="button" class="btn btn--navy btn--sm" data-action="start-work" data-id="${order.id}">بدء العمل</button>`;
    }

    if (order.status === 'قيد التنفيذ') {
      const pending = pendingFilesByOrder[order.id] || [];
      const chipsHtml = pending.map((file, index) => `
        <div class="file-chip">
          <span class="file-chip__name">${file.name}</span>
          <span class="file-chip__size mono">${formatFileSize(file.size)}</span>
          <button type="button" class="file-chip__remove" data-action="remove-pending-file" data-id="${order.id}" data-index="${index}" aria-label="إزالة الملف">×</button>
        </div>`).join('');

      return `
        <div style="width:100%;">
          <label class="file-drop">
            <input type="file" multiple data-action="select-files" data-id="${order.id}">
            <span class="file-drop__text">اضغط لاختيار ملفات النموذج والوثائق</span>
            <span class="file-drop__hint">حد أقصى تقريبي 3 ميجابايت لكل الملفات مجتمعة</span>
          </label>
          ${pending.length ? `<div class="file-pending-list">${chipsHtml}</div>` : ''}
          <div style="margin-top: 12px;">
            <button type="button" class="btn btn--gold btn--sm" data-action="upload-files" data-id="${order.id}" ${pending.length ? '' : 'disabled'}>
              رفع الملفات وتحديد "جاهز للدفع"
            </button>
          </div>
        </div>`;
    }

    if (order.status === 'جاهز للدفع') {
      const filesHtml = order.files.map((file) => `<span class="file-chip__name">${file.name}</span>`).join('، ');
      return `<span style="font-size:13px; color: var(--color-text-muted);">بانتظار دفع العميل — الملفات المرفوعة: ${filesHtml}</span>`;
    }

    if (order.status === 'مكتمل الدفع') {
      const filesHtml = order.files.map((file) => `<span class="file-chip__name">${file.name}</span>`).join('، ');
      const downloadedText = order.downloadedAt ? 'نزّل العميل الملفات ✅' : 'العميل لسا ما نزّل الملفات';
      return `<span style="font-size:13px; color: var(--color-text-muted);">تم الدفع ✅ — الملفات: ${filesHtml}<br>${downloadedText}</span>`;
    }

    return '';
  }

  function renderOrders() {
    const orders = window.SSPOrders.getAll();

    if (!orders.length) {
      adminOrderList.innerHTML = `<div class="empty-state">ما فيه طلبات نماذج أولية لسا.</div>`;
      return;
    }

    adminOrderList.innerHTML = orders.map((order) => `
      <article class="admin-order-card">
        <div class="admin-order-card__head">
          <div>
            <h3 class="request-card__title">${order.projectName}</h3>
            <div class="admin-order-card__client">العميل: ${order.ownerName} — ${order.ownerEmail}</div>
          </div>
          <span class="status-badge ${STATUS_CLASS[order.status] || ''}">${order.status}</span>
        </div>
        <div class="request-card__meta">
          <span>${order.tierName}</span>
          <span>${order.complexityName}</span>
          <span class="request-card__price mono">${formatCurrency(order.totalPrice)} د.ك</span>
        </div>
        <p class="request-card__desc">${order.description}</p>
        <div class="admin-order-card__actions">${renderOrderActions(order)}</div>
      </article>`).join('');
  }

  /* ------------------------------------------------------------------------
     EVENT HANDLERS (delegated — القائمة تُعاد رسمها بالكامل بكل تحديث)
     ------------------------------------------------------------------------ */
  function handleOrderListClick(event) {
    const startBtn = event.target.closest('[data-action="start-work"]');
    if (startBtn) {
      window.SSPOrders.startWork(startBtn.dataset.id);
      renderOrders();
      return;
    }

    const removeBtn = event.target.closest('[data-action="remove-pending-file"]');
    if (removeBtn) {
      const list = pendingFilesByOrder[removeBtn.dataset.id] || [];
      list.splice(Number(removeBtn.dataset.index), 1);
      renderOrders();
      return;
    }

    const uploadBtn = event.target.closest('[data-action="upload-files"]');
    if (uploadBtn) {
      const orderId = uploadBtn.dataset.id;
      const files = pendingFilesByOrder[orderId] || [];
      if (!files.length) return;

      const result = window.SSPOrders.uploadDeliverable(orderId, files);
      if (!result.success) {
        showToast(result.error || 'تعذّر رفع الملفات.');
        return;
      }
      delete pendingFilesByOrder[orderId];
      showToast('تم رفع الملفات — الطلب جاهز الآن ليدفع العميل.');
      renderOrders();
    }
  }

  async function handleOrderListChange(event) {
    const fileInput = event.target.closest('[data-action="select-files"]');
    if (!fileInput || !fileInput.files.length) return;

    const orderId = fileInput.dataset.id;
    try {
      const readFiles = await Promise.all([...fileInput.files].map(fileToDataUrl));
      pendingFilesByOrder[orderId] = [...(pendingFilesByOrder[orderId] || []), ...readFiles];
      renderOrders();
    } catch (e) {
      showToast('تعذّر قراءة أحد الملفات.');
    }
  }

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  function init() {
    adminLoginForm.addEventListener('submit', handleAdminLogin);
    adminLogoutBtn.addEventListener('click', () => {
      window.SSPAuth.clearSession();
      showLoginView();
    });
    adminOrderList.addEventListener('click', handleOrderListClick);
    adminOrderList.addEventListener('change', handleOrderListChange);

    checkSession();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
