/* ==========================================================================
   SSP.Q8 — PRODUCTS (نموذج أولي)
   ==========================================================================
   كتالوج المنتجات الجاهزة، يديره الأدمن من لوحة الإدارة مباشرة (إضافة/تعديل/
   حذف + رفع ملف كل منتج) بدل تعديل الكود يدوياً. تُخزَّن هنا بمتصفحك فقط.
   ========================================================================== */

(function () {
  'use strict';

  const PRODUCTS_KEY = 'ssp_products';

  const DEFAULT_PRODUCTS = [
    {
      id: 'prod_ledger',
      name: 'دفتر اليومية للمشاريع الصغيرة',
      price: 10,
      description: 'يجاوبك على 3 أسئلة: مين يدين لك، وين راحت فلوسك، وكم رصيدك الحقيقي الحين.',
      features: ['يحسب مديونية العملاء تلقائياً', 'فاتورة جاهزة للطباعة', 'لوحة تحكم برسم بياني شهري'],
      icon: 'ledger',
      file: null
    },
    {
      id: 'prod_inventory',
      name: 'دفتر المخزون للمشاريع الصغيرة',
      price: 10,
      description: 'يحسب رصيد كل صنف تلقائياً من حركات الوارد والصادر، وينبهك أحمر لما أي صنف يقرب يخلص.',
      features: ['رصيد الأصناف تلقائي 100%', 'تنبيه لوني للمخزون المنخفض', 'بدون أكواد معقدة'],
      icon: 'inventory',
      file: null
    }
  ];

  function getProducts() {
    try {
      const stored = JSON.parse(localStorage.getItem(PRODUCTS_KEY));
      if (stored && stored.length) return stored;
    } catch (e) {
      /* تجاهل وارجع للقيم الافتراضية */
    }
    saveProducts(DEFAULT_PRODUCTS);
    return DEFAULT_PRODUCTS;
  }

  function saveProducts(list) {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(list));
      return { success: true };
    } catch (e) {
      return { success: false, error: 'تعذّر الحفظ — الأغلب إن ملف المنتج كبير على التخزين التجريبي.' };
    }
  }

  function getById(id) {
    return getProducts().find((p) => p.id === id) || null;
  }

  function addProduct(data) {
    const list = getProducts();
    const product = {
      id: 'prod_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: data.name,
      price: data.price,
      description: data.description,
      features: data.features || [],
      icon: data.icon || 'default',
      file: null
    };
    list.push(product);
    const result = saveProducts(list);
    return result.success ? { success: true, product } : result;
  }

  function updateProduct(id, data) {
    const list = getProducts();
    const product = list.find((p) => p.id === id);
    if (!product) return { success: false };
    Object.assign(product, data);
    const result = saveProducts(list);
    return result.success ? { success: true, product } : result;
  }

  function deleteProduct(id) {
    const list = getProducts().filter((p) => p.id !== id);
    saveProducts(list);
    return { success: true };
  }

  function setProductFile(id, file) {
    return updateProduct(id, { file });
  }

  window.SSPProducts = {
    getProducts,
    getById,
    addProduct,
    updateProduct,
    deleteProduct,
    setProductFile
  };
})();
