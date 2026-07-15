/* SSP.Q8 — إحالة حزم المتطلبات للشركات وعروض الأسعار (نموذج محلي) */
(function () {
  'use strict';
  const REQUESTS_KEY = 'ssp_requests';

  function getRequests() {
    try { return JSON.parse(localStorage.getItem(REQUESTS_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveRequests(list) { localStorage.setItem(REQUESTS_KEY, JSON.stringify(list)); }

  function createRequest(data) {
    const list = getRequests();
    const request = {
      id: 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      ownerEmail: data.ownerEmail,
      ownerPhone: data.ownerPhone || null,
      ownerName: data.ownerName,
      sourceOrderId: data.sourceOrderId || null,
      sourceReferenceNo: data.sourceReferenceNo || null,
      projectName: data.projectName,
      description: data.description,
      tierName: data.tierName,
      complexityName: data.complexityName,
      attachedFiles: data.attachedFiles || [],
      targetType: data.targetType || 'broadcast', // broadcast | type | selected
      targetCompanyType: data.targetCompanyType || null,
      targetCompanyEmails: data.targetCompanyEmails || [],
      targetCompanyNames: data.targetCompanyNames || [],
      status: 'بانتظار العروض',
      quotes: [],
      dismissedBy: [],
      selectedCompanyEmail: null,
      selectedCompanyName: null,
      acceptedQuoteId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    list.unshift(request);
    saveRequests(list);
    return request;
  }

  function getByOwner(email) { return getRequests().filter((r) => r.ownerEmail === email); }
  function getBySourceOrder(orderId) { return getRequests().filter((r) => r.sourceOrderId === orderId); }

  function isTargetedTo(request, company) {
    if (request.targetType === 'broadcast') return true;
    if (request.targetType === 'type') return company.companyType === request.targetCompanyType;
    if (request.targetType === 'selected') return (request.targetCompanyEmails || []).includes(company.email);
    return false;
  }

  function getOpenForCompany(companyEmail) {
    const company = window.SSPAuth.getUserByEmail(companyEmail);
    if (!company) return [];
    return getRequests().filter((r) =>
      r.status === 'بانتظار العروض' &&
      isTargetedTo(r, company) &&
      !(r.dismissedBy || []).includes(companyEmail)
    );
  }

  function dismissForCompany(id, companyEmail) {
    const list = getRequests();
    const request = list.find((r) => r.id === id);
    if (!request) return { success: false };
    request.dismissedBy = request.dismissedBy || [];
    if (!request.dismissedBy.includes(companyEmail)) request.dismissedBy.push(companyEmail);
    saveRequests(list);
    return { success: true };
  }

  function submitQuote(id, quote) {
    const list = getRequests();
    const request = list.find((r) => r.id === id);
    if (!request || request.status !== 'بانتظار العروض') return { success: false, error: 'الطلب لم يعد مفتوحاً للعروض.' };
    if (request.quotes.some((q) => q.companyEmail === quote.companyEmail)) return { success: false, error: 'أرسلت عرضاً لهذا الطلب من قبل.' };
    request.quotes.push({
      id: 'quo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      companyEmail: quote.companyEmail,
      companyPhone: quote.companyPhone || null,
      companyName: quote.companyName,
      companyType: quote.companyType || null,
      amount: Number(quote.amount),
      deliveryTime: quote.deliveryTime,
      note: quote.note || '',
      createdAt: new Date().toISOString()
    });
    request.updatedAt = new Date().toISOString();
    saveRequests(list);
    return { success: true, request };
  }

  function getQuotesByCompany(companyEmail) {
    return getRequests()
      .filter((r) => r.quotes.some((q) => q.companyEmail === companyEmail))
      .map((r) => ({
        request: r,
        quote: r.quotes.find((q) => q.companyEmail === companyEmail),
        won: !!r.acceptedQuoteId && r.quotes.some((q) => q.companyEmail === companyEmail && q.id === r.acceptedQuoteId)
      }));
  }

  function getSelectedBy(companyEmail) { return getRequests().filter((r) => r.selectedCompanyEmail === companyEmail); }

  function acceptQuote(requestId, quoteId) {
    const list = getRequests();
    const request = list.find((r) => r.id === requestId);
    if (!request || request.status !== 'بانتظار العروض') return { success: false, error: 'لا يمكن اختيار العرض الآن.' };
    const quote = request.quotes.find((q) => q.id === quoteId);
    if (!quote) return { success: false, error: 'العرض غير موجود.' };
    request.status = 'تم اختيار عرض';
    request.selectedCompanyEmail = quote.companyEmail;
    request.selectedCompanyName = quote.companyName;
    request.acceptedQuoteId = quote.id;
    request.updatedAt = new Date().toISOString();
    saveRequests(list);
    return { success: true, request };
  }

  window.SSPMarketplace = {
    getRequests, createRequest, getByOwner, getBySourceOrder, getOpenForCompany,
    dismissForCompany, submitQuote, getQuotesByCompany, getSelectedBy, acceptQuote
  };
})();
