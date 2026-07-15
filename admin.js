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
  const adminProductList = document.getElementById('adminProductList');
  const adminCompanyList = document.getElementById('adminCompanyList');
  const addProductBtn = document.getElementById('addProductBtn');

  const productModalOverlay = document.getElementById('productModalOverlay');
  const productModalTitle = document.getElementById('productModalTitle');
  const closeProductModalBtn = document.getElementById('closeProductModalBtn');
  const cancelProductModalBtn = document.getElementById('cancelProductModalBtn');
  const productForm = document.getElementById('productForm');
  const productNameInput = document.getElementById('productNameInput');
  const productPriceInput = document.getElementById('productPriceInput');
  const productDescInput = document.getElementById('productDescInput');
  const productFeaturesInput = document.getElementById('productFeaturesInput');

  const toastContainer = document.getElementById('toastContainer');

  // ملفات لسا ما انرفعت نهائياً، لكل طلب أو منتج (قبل الضغط على زر الرفع)
  const pendingOrderFiles = {};
  const pendingProductFiles = {};
  let editingProductId = null; // null = إضافة منتج جديد

  const ORDER_STATUS_CLASS = {
    'قيد التنفيذ': 'status-badge--progress',
    'جاهز للتنزيل': 'status-badge--done'
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

  function renderFileChips(pendingList, removeAction, ownerId) {
    if (!pendingList.length) return '';
    const chips = pendingList.map((file, index) => `
      <div class="file-chip">
        <span class="file-chip__name">${file.name}</span>
        <span class="file-chip__size mono">${formatFileSize(file.size)}</span>
        <button type="button" class="file-chip__remove" data-action="${removeAction}" data-id="${ownerId}" data-index="${index}" aria-label="إزالة الملف">×</button>
      </div>`).join('');
    return `<div class="file-pending-list">${chips}</div>`;
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
    renderProducts();
    renderCompanies();
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
     ORDERS (طلبات النموذج الأولي)
     ------------------------------------------------------------------------ */
  function renderOrderActions(order) {
    if (order.status === 'قيد التنفيذ') {
      const pending = pendingOrderFiles[order.id] || [];
      return `
        <div style="width:100%;">
          <label class="file-drop">
            <input type="file" multiple data-action="select-order-files" data-id="${order.id}">
            <span class="file-drop__text">اضغط لاختيار ملفات النموذج والوثائق</span>
            <span class="file-drop__hint">حد أقصى تقريبي 3 ميجابايت لكل الملفات مجتمعة</span>
          </label>
          ${renderFileChips(pending, 'remove-order-file', order.id)}
          <div style="margin-top: 12px;">
            <button type="button" class="btn btn--gold btn--sm" data-action="upload-order-files" data-id="${order.id}" ${pending.length ? '' : 'disabled'}>
              رفع الملفات وتحديد "جاهز للتنزيل"
            </button>
          </div>
        </div>`;
    }

    if (order.status === 'جاهز للتنزيل') {
      const filesHtml = order.files.map((file) => file.name).join('، ');
      const downloadedText = order.downloadedAt ? 'نزّل العميل الملفات ✅' : 'العميل لسا ما نزّل الملفات';
      return `<span style="font-size:13px; color: var(--color-text-muted);">الملفات المرفوعة: ${filesHtml}<br>${downloadedText}</span>`;
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
            <div class="admin-order-card__client">العميل: ${order.ownerName} — ${order.ownerEmail}${order.ownerPhone ? ' — ' + order.ownerPhone : ''}</div>
          </div>
          <span class="status-badge ${ORDER_STATUS_CLASS[order.status] || ''}">${order.status}</span>
        </div>
        <div class="request-card__meta">
          <span>${order.tierName}</span>
          <span>${order.complexityName}</span>
          <span class="mono">${order.referenceNo || order.id}</span>
          <span class="request-card__price mono">${formatCurrency(order.totalPrice)} د.ك (مدفوع)</span>
        </div>
        <p class="request-card__desc"><strong>المشكلة:</strong> ${order.problem}</p>
        <p class="request-card__desc"><strong>طبيعة العمل:</strong> ${order.natureOfWork}</p>
        <p class="request-card__desc"><strong>الهدف:</strong> ${order.goal}</p>
        <p class="request-card__desc"><strong>الحل المتوقع:</strong> ${order.expectedSolution}</p>
        <div class="admin-order-card__actions">${renderOrderActions(order)}</div>
      </article>`).join('');
  }

  async function handleOrderFileSelect(input) {
    if (!input.files.length) return;
    const orderId = input.dataset.id;
    try {
      const readFiles = await Promise.all([...input.files].map(fileToDataUrl));
      pendingOrderFiles[orderId] = [...(pendingOrderFiles[orderId] || []), ...readFiles];
      renderOrders();
    } catch (e) {
      showToast('تعذّر قراءة أحد الملفات.');
    }
  }

  function handleUploadOrderFiles(orderId) {
    const files = pendingOrderFiles[orderId] || [];
    if (!files.length) return;

    const result = window.SSPOrders.uploadDeliverable(orderId, files);
    if (!result.success) {
      showToast(result.error || 'تعذّر رفع الملفات.');
      return;
    }
    delete pendingOrderFiles[orderId];
    showToast('تم رفع الملفات — الطلب جاهز الآن للعميل.');
    renderOrders();
  }

  /* ------------------------------------------------------------------------
     PRODUCTS (المنتجات الجاهزة)
     ------------------------------------------------------------------------ */
  function renderProducts() {
    const products = window.SSPProducts.getProducts();

    if (!products.length) {
      adminProductList.innerHTML = `<div class="empty-state">ما فيه منتجات لسا.</div>`;
      return;
    }

    adminProductList.innerHTML = products.map((product) => {
      const pending = pendingProductFiles[product.id] || [];
      const fileStatus = product.file
        ? `<span style="font-size:12.5px; color: var(--color-teal);">الملف الحالي: ${product.file.name}</span>`
        : `<span style="font-size:12.5px; color: var(--color-text-muted);">ما فيه ملف مرفوع لهذا المنتج بعد.</span>`;

      return `
        <article class="admin-order-card">
          <div class="admin-order-card__head">
            <div>
              <h3 class="request-card__title">${product.name}</h3>
              <div class="admin-order-card__client">${formatCurrency(product.price)} د.ك</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn btn--outline btn--sm" data-action="edit-product" data-id="${product.id}">تعديل</button>
              <button type="button" class="btn btn--outline btn--sm" data-action="delete-product" data-id="${product.id}" style="color:#C0392B; border-color:#C0392B;">حذف</button>
            </div>
          </div>
          <p class="request-card__desc">${product.description}</p>
          <div class="admin-order-card__actions">
            <div style="width:100%;">
              ${fileStatus}
              <label class="file-drop" style="margin-top:10px;">
                <input type="file" data-action="select-product-file" data-id="${product.id}">
                <span class="file-drop__text">اضغط لاختيار ملف المنتج (يستبدل القديم لو موجود)</span>
              </label>
              ${renderFileChips(pending, 'remove-product-file', product.id)}
              ${pending.length ? `<button type="button" class="btn btn--gold btn--sm" data-action="upload-product-file" data-id="${product.id}" style="margin-top:10px;">رفع ملف المنتج</button>` : ''}
            </div>
          </div>
        </article>`;
    }).join('');
  }

  async function handleProductFileSelect(input) {
    if (!input.files.length) return;
    const productId = input.dataset.id;
    try {
      const file = await fileToDataUrl(input.files[0]);
      pendingProductFiles[productId] = [file]; // ملف واحد بس لكل منتج
      renderProducts();
    } catch (e) {
      showToast('تعذّر قراءة الملف.');
    }
  }

  function handleUploadProductFile(productId) {
    const files = pendingProductFiles[productId] || [];
    if (!files.length) return;

    const result = window.SSPProducts.setProductFile(productId, files[0]);
    if (!result.success) {
      showToast(result.error || 'تعذّر رفع الملف.');
      return;
    }
    delete pendingProductFiles[productId];
    showToast('تم رفع ملف المنتج.');
    renderProducts();
  }

  function openProductModal(productId) {
    editingProductId = productId || null;
    productForm.reset();

    if (editingProductId) {
      const product = window.SSPProducts.getById(editingProductId);
      productModalTitle.textContent = 'تعديل المنتج';
      productNameInput.value = product.name;
      productPriceInput.value = product.price;
      productDescInput.value = product.description;
      productFeaturesInput.value = (product.features || []).join('\n');
    } else {
      productModalTitle.textContent = 'إضافة منتج جديد';
    }

    productModalOverlay.classList.add('is-open');
    productNameInput.focus();
  }

  function closeProductModal() {
    productModalOverlay.classList.remove('is-open');
    editingProductId = null;
  }

  function handleProductFormSubmit(event) {
    event.preventDefault();

    const features = productFeaturesInput.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const data = {
      name: productNameInput.value.trim(),
      price: Number(productPriceInput.value),
      description: productDescInput.value.trim(),
      features
    };

    if (editingProductId) {
      window.SSPProducts.updateProduct(editingProductId, data);
      showToast('تم تحديث المنتج.');
    } else {
      window.SSPProducts.addProduct(data);
      showToast('تم إضافة المنتج.');
    }

    closeProductModal();
    renderProducts();
  }

  function handleDeleteProduct(productId) {
    const confirmed = window.confirm('حذف هذا المنتج نهائياً؟');
    if (!confirmed) return;
    window.SSPProducts.deleteProduct(productId);
    showToast('تم حذف المنتج.');
    renderProducts();
  }

  /* ------------------------------------------------------------------------
     COMPANIES (اشتراكات الشركات)
     ------------------------------------------------------------------------ */
  function renderCompanies() {
    const companies = window.SSPAuth.getCompanies();

    if (!companies.length) {
      adminCompanyList.innerHTML = `<div class="empty-state">ما فيه شركات مسجّلة لسا.</div>`;
      return;
    }

    adminCompanyList.innerHTML = companies.map((company) => `
      <article class="admin-order-card" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 class="request-card__title">${company.companyName || company.name}</h3>
          <div class="admin-order-card__client">${company.email}${company.phone ? ' — ' + company.phone : ''}${company.companyType ? ' — ' + company.companyType : ''}</div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="subscription-badge ${company.subscriptionActive ? 'subscription-badge--active' : 'subscription-badge--inactive'}">
            ${company.subscriptionActive ? 'مفعّل' : 'غير مفعّل'}
          </span>
          <button type="button" class="btn btn--navy btn--sm" data-action="toggle-subscription" data-email="${company.email}">
            ${company.subscriptionActive ? 'إلغاء التفعيل' : 'تفعيل الاشتراك'}
          </button>
        </div>
      </article>`).join('');
  }

  function handleToggleSubscription(email) {
    const company = window.SSPAuth.getUserByEmail(email);
    const nextState = !(company && company.subscriptionActive);
    window.SSPAuth.updateSubscription(email, nextState);
    showToast(nextState ? 'تم تفعيل اشتراك الشركة.' : 'تم إلغاء تفعيل اشتراك الشركة.');
    renderCompanies();
  }

  /* ------------------------------------------------------------------------
     EVENT DELEGATION
     ------------------------------------------------------------------------ */
  function handleDashboardClick(event) {
    const uploadOrderBtn = event.target.closest('[data-action="upload-order-files"]');
    if (uploadOrderBtn) { handleUploadOrderFiles(uploadOrderBtn.dataset.id); return; }

    const removeOrderFileBtn = event.target.closest('[data-action="remove-order-file"]');
    if (removeOrderFileBtn) {
      const list = pendingOrderFiles[removeOrderFileBtn.dataset.id] || [];
      list.splice(Number(removeOrderFileBtn.dataset.index), 1);
      renderOrders();
      return;
    }

    const editProductBtn = event.target.closest('[data-action="edit-product"]');
    if (editProductBtn) { openProductModal(editProductBtn.dataset.id); return; }

    const deleteProductBtn = event.target.closest('[data-action="delete-product"]');
    if (deleteProductBtn) { handleDeleteProduct(deleteProductBtn.dataset.id); return; }

    const uploadProductBtn = event.target.closest('[data-action="upload-product-file"]');
    if (uploadProductBtn) { handleUploadProductFile(uploadProductBtn.dataset.id); return; }

    const removeProductFileBtn = event.target.closest('[data-action="remove-product-file"]');
    if (removeProductFileBtn) {
      delete pendingProductFiles[removeProductFileBtn.dataset.id];
      renderProducts();
      return;
    }

    const toggleSubBtn = event.target.closest('[data-action="toggle-subscription"]');
    if (toggleSubBtn) { handleToggleSubscription(toggleSubBtn.dataset.email); }
  }

  function handleDashboardChange(event) {
    const orderFileInput = event.target.closest('[data-action="select-order-files"]');
    if (orderFileInput) { handleOrderFileSelect(orderFileInput); return; }

    const productFileInput = event.target.closest('[data-action="select-product-file"]');
    if (productFileInput) { handleProductFileSelect(productFileInput); }
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

    adminDashboardView.addEventListener('click', handleDashboardClick);
    adminDashboardView.addEventListener('change', handleDashboardChange);

    addProductBtn.addEventListener('click', () => openProductModal(null));
    closeProductModalBtn.addEventListener('click', closeProductModal);
    cancelProductModalBtn.addEventListener('click', closeProductModal);
    productModalOverlay.addEventListener('click', (event) => {
      if (event.target === productModalOverlay) closeProductModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && productModalOverlay.classList.contains('is-open')) closeProductModal();
    });
    productForm.addEventListener('submit', handleProductFormSubmit);

    checkSession();
  }

  // يُستخدم فقط بنسخة المعاينة بملف واحد (SPA) عشان يحدّث القوائم كل ما ندخل
  // على شاشة الإدارة من جديد. لا تأثير له بالنسخة متعددة الملفات.
  window.SSPAdminRefresh = () => {
    if (!adminDashboardView.hidden) {
      renderOrders();
      renderProducts();
      renderCompanies();
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
