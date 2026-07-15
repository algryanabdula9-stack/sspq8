/* ==========================================================================
   SSP.Q8 — MARKETPLACE (نموذج أولي)
   ==========================================================================
   يخزن كل طلبات عروض الأسعار بمتصفح المستخدم (localStorage) لأغراض العرض.
   بما إن التخزين محلي، الطلب اللي ينشئه عميل على جهازه ما يظهر تلقائياً
   عند شركة تفتح الموقع من جهاز ثاني — بالنسخة الحقيقية يكون فيه سيرفر
   وقاعدة بيانات مشتركة توصل الطلب لكل الشركات فوراً.
   ========================================================================== */

(function () {
  'use strict';

  const REQUESTS_KEY = 'ssp_requests';

  function getRequests() {
    try {
      return JSON.parse(localStorage.getItem(REQUESTS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveRequests(list) {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(list));
  }

  function createRequest(data) {
    const list = getRequests();
    const request = {
      id: 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      ownerEmail: data.ownerEmail,
      ownerName: data.ownerName,
      sourceOrderId: data.sourceOrderId || null,
      projectName: data.projectName,
      description: data.description,
      tierName: data.tierName,
      complexityName: data.complexityName,
      totalPrice: data.totalPrice,
      attachedFiles: data.attachedFiles || [],
      targetType: data.targetType || 'broadcast', // 'broadcast' | 'specific'
      targetCompanyEmail: data.targetType === 'specific' ? data.targetCompanyEmail : null,
      targetCompanyName: data.targetType === 'specific' ? data.targetCompanyName : null,
      status: 'مفتوح', // مفتوح -> قيد العمل (بعد قبول عرض) -> مكتمل
      quotes: [],
      dismissedBy: [],
      claimedByEmail: null,
      claimedByName: null,
      acceptedQuoteId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    list.unshift(request);
    saveRequests(list);
    return request;
  }

  function getByOwner(email) {
    return getRequests().filter((r) => r.ownerEmail === email);
  }

  function getBySourceOrder(orderId) {
    return getRequests().filter((r) => r.sourceOrderId === orderId);
  }

  function getOpen() {
    return getRequests().filter((r) => r.status === 'مفتوح');
  }

  /**
   * الطلبات المفتوحة اللي تخص شركة معيّنة: إما مبثوثة لكل الشركات،
   * أو موجّهة تحديداً لبريد هذي الشركة — باستثناء اللي رفضتها هذي الشركة.
   */
  function getOpenForCompany(companyEmail) {
    return getRequests().filter((r) =>
      r.status === 'مفتوح' &&
      (r.targetType === 'broadcast' || r.targetCompanyEmail === companyEmail) &&
      !(r.dismissedBy || []).includes(companyEmail)
    );
  }

  function dismissForCompany(id, companyEmail) {
    const list = getRequests();
    const request = list.find((r) => r.id === id);
    if (!request) return { success: false };

    request.dismissedBy = request.dismissedBy || [];
    if (!request.dismissedBy.includes(companyEmail)) {
      request.dismissedBy.push(companyEmail);
      saveRequests(list);
    }
    return { success: true };
  }

  function submitQuote(id, quote) {
    const list = getRequests();
    const request = list.find((r) => r.id === id);
    if (!request || request.status !== 'مفتوح') return { success: false, error: 'الطلب ما عاد مفتوحاً.' };

    if (request.quotes.some((q) => q.companyEmail === quote.companyEmail)) {
      return { success: false, error: 'أرسلت عرض سعر لهذا الطلب من قبل.' };
    }

    request.quotes.push({
      id: 'quo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      companyEmail: quote.companyEmail,
      companyName: quote.companyName,
      amount: quote.amount,
      deliveryTime: quote.deliveryTime,
      note: quote.note || '',
      createdAt: new Date().toISOString()
    });
    request.updatedAt = new Date().toISOString();
    saveRequests(list);
    return { success: true, request };
  }

  /**
   * كل عروض الأسعار اللي أرسلتها شركة معيّنة، مع حالة كل طلب (مفتوح/مقبول لشركة ثانية/تم قبول عرضها).
   */
  function getQuotesByCompany(companyEmail) {
    return getRequests()
      .filter((r) => r.quotes.some((q) => q.companyEmail === companyEmail))
      .map((r) => ({
        request: r,
        quote: r.quotes.find((q) => q.companyEmail === companyEmail),
        won: r.acceptedQuoteId && r.quotes.find((q) => q.companyEmail === companyEmail).id === r.acceptedQuoteId
      }));
  }

  function getClaimedBy(email) {
    return getRequests().filter((r) => r.claimedByEmail === email);
  }

  /**
   * العميل يقبل عرض شركة معيّنة — الطلب يُقفل تلقائياً عن باقي الشركات.
   */
  function acceptQuote(requestId, quoteId) {
    const list = getRequests();
    const request = list.find((r) => r.id === requestId);
    if (!request) return { success: false };

    const quote = request.quotes.find((q) => q.id === quoteId);
    if (!quote) return { success: false };

    request.status = 'قيد العمل';
    request.claimedByEmail = quote.companyEmail;
    request.claimedByName = quote.companyName;
    request.acceptedQuoteId = quote.id;
    request.updatedAt = new Date().toISOString();
    saveRequests(list);
    return { success: true, request };
  }

  function complete(id) {
    const list = getRequests();
    const request = list.find((r) => r.id === id);
    if (!request) return { success: false };

    request.status = 'مكتمل';
    request.updatedAt = new Date().toISOString();
    saveRequests(list);
    return { success: true, request };
  }

  window.SSPMarketplace = {
    getRequests,
    createRequest,
    getByOwner,
    getBySourceOrder,
    getOpen,
    getOpenForCompany,
    getClaimedBy,
    dismissForCompany,
    submitQuote,
    getQuotesByCompany,
    acceptQuote,
    complete
  };
})();
