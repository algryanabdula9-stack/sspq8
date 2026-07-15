/* ==========================================================================
   SSP.Q8 — ORDERS (نموذج أولي)
   ==========================================================================
   دورة حياة "طلب النموذج الأولي": العميل يختار باقة بسعر محدد مسبقاً ويدفع
   فوراً (دفع تجريبي)، بعدها إدارة SSP.Q8 تشتغل عليه وترفع ملفات التسليم،
   والعميل ينزّلها من صفحته.

   تنبيه: الملفات تُخزَّن كنص Base64 داخل localStorage، وله سقف تخزين محدود
   (عادة 5-10 ميجابايت لكل المتصفح). النسخة الحقيقية تحتاج تخزين سحابي فعلي.
   ========================================================================== */

(function () {
  'use strict';

  const ORDERS_KEY = 'ssp_orders';
  const MAX_TOTAL_FILES_BYTES = 3 * 1024 * 1024; // حد تقريبي آمن لتخزين تجريبي بالمتصفح

  function getOrders() {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveOrders(list) {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
      return { success: true };
    } catch (e) {
      return { success: false, error: 'تعذّر الحفظ — الأغلب إن حجم الملفات تجاوز سعة التخزين التجريبي بالمتصفح.' };
    }
  }

  /**
   * ينشئ الطلب مدفوعاً فوراً (الدفع يصير عند اختيار الباقة، قبل ما تبدأ الإدارة العمل).
   */
  function createOrder(data) {
    const list = getOrders();
    const order = {
      id: 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      ownerEmail: data.ownerEmail,
      ownerName: data.ownerName,
      ownerPhone: data.ownerPhone || null,
      problem: data.problem,
      natureOfWork: data.natureOfWork,
      goal: data.goal,
      expectedSolution: data.expectedSolution,
      tierName: data.tierName,
      complexityName: data.complexityName,
      totalPrice: data.totalPrice,
      status: 'قيد التنفيذ',
      files: [],
      paid: true,
      paidAt: new Date().toISOString(),
      downloadedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    list.unshift(order);
    const result = saveOrders(list);
    return result.success ? { success: true, order } : result;
  }

  function getByOwner(email) {
    return getOrders().filter((o) => o.ownerEmail === email);
  }

  function getAll() {
    return getOrders();
  }

  function getById(id) {
    return getOrders().find((o) => o.id === id) || null;
  }

  function totalBytes(files) {
    return files.reduce((sum, file) => sum + (file.size || 0), 0);
  }

  /**
   * الإدارة ترفع ملفات التسليم — يحوّل حالة الطلب مباشرة لـ"جاهز للتنزيل".
   */
  function uploadDeliverable(id, files) {
    if (totalBytes(files) > MAX_TOTAL_FILES_BYTES) {
      return { success: false, error: 'حجم الملفات كبير على التخزين التجريبي بالمتصفح — جرّب ملفات أصغر (المجموع حالياً أكثر من 3 ميجابايت تقريباً).' };
    }

    const list = getOrders();
    const order = list.find((o) => o.id === id);
    if (!order) return { success: false };

    order.files = files;
    order.status = 'جاهز للتنزيل';
    order.updatedAt = new Date().toISOString();
    const result = saveOrders(list);
    return result.success ? { success: true, order } : result;
  }

  function markDownloaded(id) {
    const list = getOrders();
    const order = list.find((o) => o.id === id);
    if (!order || order.downloadedAt) return { success: false };
    order.downloadedAt = new Date().toISOString();
    saveOrders(list);
    return { success: true, order };
  }

  window.SSPOrders = {
    getByOwner,
    getAll,
    getById,
    createOrder,
    uploadDeliverable,
    markDownloaded,
    MAX_TOTAL_FILES_BYTES
  };
})();
