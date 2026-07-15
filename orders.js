/* SSP.Q8 — طلبات التحليل والنماذج الأولية (تخزين محلي تجريبي) */
(function () {
  'use strict';
  const ORDERS_KEY = 'ssp_orders';
  const MAX_TOTAL_FILES_BYTES = 3 * 1024 * 1024;

  function getOrders() {
    try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveOrders(list) {
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); return { success: true }; }
    catch (e) { return { success: false, error: 'تعذّر الحفظ؛ قد يكون حجم الملفات تجاوز سعة التخزين التجريبي.' }; }
  }
  function buildReference() {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    return `SSP-${stamp}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  }
  function createOrder(data) {
    const list = getOrders();
    const now = new Date().toISOString();
    const order = {
      id: 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      referenceNo: buildReference(),
      projectName: data.projectName,
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
      paidAt: now,
      downloadedAt: null,
      createdAt: now,
      updatedAt: now
    };
    list.unshift(order);
    const result = saveOrders(list);
    return result.success ? { success: true, order } : result;
  }
  function getByOwner(email) { return getOrders().filter((o) => o.ownerEmail === email); }
  function getAll() { return getOrders(); }
  function getById(id) { return getOrders().find((o) => o.id === id) || null; }
  function totalBytes(files) { return files.reduce((sum, file) => sum + (file.size || 0), 0); }
  function uploadDeliverable(id, files) {
    if (!files || !files.length) return { success: false, error: 'اختر ملفاً واحداً على الأقل.' };
    if (totalBytes(files) > MAX_TOTAL_FILES_BYTES) return { success: false, error: 'حجم الملفات يتجاوز 3 ميجابايت تقريباً في النسخة التجريبية.' };
    const list = getOrders();
    const order = list.find((o) => o.id === id);
    if (!order) return { success: false, error: 'الطلب غير موجود.' };
    order.files = files;
    order.status = 'جاهز للتنزيل';
    order.updatedAt = new Date().toISOString();
    const result = saveOrders(list);
    return result.success ? { success: true, order } : result;
  }
  function markDownloaded(id) {
    const list = getOrders();
    const order = list.find((o) => o.id === id);
    if (!order) return { success: false };
    if (!order.downloadedAt) order.downloadedAt = new Date().toISOString();
    saveOrders(list);
    return { success: true, order };
  }
  window.SSPOrders = { getByOwner, getAll, getById, createOrder, uploadDeliverable, markDownloaded, MAX_TOTAL_FILES_BYTES };
})();
