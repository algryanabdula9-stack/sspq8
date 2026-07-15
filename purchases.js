/* ==========================================================================
   SSP.Q8 — PURCHASES (نموذج أولي)
   ==========================================================================
   عمليات شراء المنتجات الجاهزة (دفعة تجريبية فورية، بدون بوابة دفع حقيقية).
   ========================================================================== */

(function () {
  'use strict';

  const PURCHASES_KEY = 'ssp_purchases';

  function getPurchases() {
    try {
      return JSON.parse(localStorage.getItem(PURCHASES_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function savePurchases(list) {
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(list));
  }

  function createPurchase({ buyerEmail, buyerName, buyerPhone, productId, productName, price }) {
    const list = getPurchases();
    const purchase = {
      id: 'pur_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      buyerEmail,
      buyerName,
      buyerPhone,
      productId,
      productName,
      price,
      paid: true,
      purchasedAt: new Date().toISOString()
    };
    list.unshift(purchase);
    savePurchases(list);
    return purchase;
  }

  function getByBuyer(email) {
    return getPurchases().filter((p) => p.buyerEmail === email);
  }

  window.SSPPurchases = {
    getPurchases,
    createPurchase,
    getByBuyer
  };
})();
