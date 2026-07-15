/* SSP.Q8 — صفحة الدخول */
(() => {
  'use strict';
  const roleTabClient = document.getElementById('roleTabClient');
  const roleTabCompany = document.getElementById('roleTabCompany');
  const clientAuthPanel = document.getElementById('clientAuthPanel');
  const companyAuthPanel = document.getElementById('companyAuthPanel');
  const toastContainer = document.getElementById('toastContainer');
  let currentRole = 'client';

  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast'; toast.textContent = message; toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
  function setRole(role) {
    currentRole = role;
    roleTabClient.classList.toggle('is-active', role === 'client');
    roleTabClient.setAttribute('aria-selected', String(role === 'client'));
    roleTabCompany.classList.toggle('is-active', role === 'company');
    roleTabCompany.setAttribute('aria-selected', String(role === 'company'));
    clientAuthPanel.classList.toggle('form-hidden', role !== 'client');
    companyAuthPanel.classList.toggle('form-hidden', role !== 'company');
  }

  const clientAuthError = document.getElementById('clientAuthError');
  const clientDetailsForm = document.getElementById('clientDetailsForm');
  const clientEmailInput = document.getElementById('clientEmailInput');
  const clientPhoneInput = document.getElementById('clientPhoneInput');
  const clientOtpForm = document.getElementById('clientOtpForm');
  const otpCodeDisplay = document.getElementById('otpCodeDisplay');
  const clientOtpInput = document.getElementById('clientOtpInput');
  const backToDetailsBtn = document.getElementById('backToDetailsBtn');

  function clientError(message) { clientAuthError.textContent = message; clientAuthError.classList.add('is-visible'); }
  function clearClientError() { clientAuthError.textContent = ''; clientAuthError.classList.remove('is-visible'); }
  function handleClientDetailsSubmit(event) {
    event.preventDefault(); clearClientError();
    const result = window.SSPAuth.requestClientOtp({ email: clientEmailInput.value, phone: clientPhoneInput.value });
    if (!result.success) return clientError(result.error);
    otpCodeDisplay.textContent = result.code;
    clientDetailsForm.classList.add('form-hidden');
    clientOtpForm.classList.remove('form-hidden');
    clientOtpInput.focus(); showToast('تم إنشاء كود تحقق تجريبي.');
  }
  function handleClientOtpSubmit(event) {
    event.preventDefault(); clearClientError();
    const result = window.SSPAuth.verifyClientOtp({ email: clientEmailInput.value, code: clientOtpInput.value });
    if (!result.success) return clientError(result.error);
    redirectAfterAuth('client');
  }
  function backToDetails() {
    clientOtpForm.classList.add('form-hidden'); clientDetailsForm.classList.remove('form-hidden');
    clientOtpInput.value = ''; clearClientError();
  }

  const companyModeTabs = [...document.querySelectorAll('#companyAuthPanel .mode-tab')];
  const companyAuthTitle = document.getElementById('companyAuthTitle');
  const companyAuthSubtitle = document.getElementById('companyAuthSubtitle');
  const companyAuthForm = document.getElementById('companyAuthForm');
  const companyAuthError = document.getElementById('companyAuthError');
  const companyAuthSubmitBtn = document.getElementById('companyAuthSubmitBtn');
  const companyNameGroup = document.getElementById('companyNameGroup');
  const companyPersonNameInput = document.getElementById('companyPersonNameInput');
  const companyCompanyNameGroup = document.getElementById('companyCompanyNameGroup');
  const companyNameInput = document.getElementById('companyNameInput');
  const companyPhoneGroup = document.getElementById('companyPhoneGroup');
  const companyPhoneInput = document.getElementById('companyPhoneInput');
  const companyTypeGroup = document.getElementById('companyTypeGroup');
  const companyTypeInput = document.getElementById('companyTypeInput');
  const companyEmailInput = document.getElementById('companyEmailInput');
  const companyPasswordInput = document.getElementById('companyPasswordInput');
  let companyMode = 'login';

  const COMPANY_COPY = {
    login: { title: 'دخول الشركة', subtitle: 'ادخل لمشاهدة الحزم المرسلة إلى شركتك وتقديم عرض تقريبي.', submit: 'دخول' },
    register: { title: 'تسجيل شركة جديدة', subtitle: 'أنشئ حساب الشركة، وبعد تفعيل الاشتراك تستطيع تقديم العروض.', submit: 'إنشاء الحساب' }
  };
  function companyError(message) { companyAuthError.textContent = message; companyAuthError.classList.add('is-visible'); }
  function clearCompanyError() { companyAuthError.textContent = ''; companyAuthError.classList.remove('is-visible'); }
  function fillCompanyTypes() {
    companyTypeInput.innerHTML = '<option value="">اختر التخصص</option>' + SITE_CONTENT.companyTypes.map((t) => `<option value="${t}">${t}</option>`).join('');
  }
  function updateCompanyView() {
    const copy = COMPANY_COPY[companyMode];
    companyAuthTitle.textContent = copy.title; companyAuthSubtitle.textContent = copy.subtitle; companyAuthSubmitBtn.textContent = copy.submit;
    companyModeTabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.mode === companyMode));
    const reg = companyMode === 'register';
    [companyNameGroup, companyCompanyNameGroup, companyPhoneGroup, companyTypeGroup].forEach((el) => el.classList.toggle('form-hidden', !reg));
    companyPersonNameInput.required = reg; companyNameInput.required = reg; companyPhoneInput.required = reg; companyTypeInput.required = reg;
    clearCompanyError();
  }
  function handleCompanyAuthSubmit(event) {
    event.preventDefault(); clearCompanyError();
    const email = companyEmailInput.value; const password = companyPasswordInput.value;
    if (companyMode === 'register') {
      const result = window.SSPAuth.registerUser({
        name: companyPersonNameInput.value, email, password, role: 'company',
        companyName: companyNameInput.value, phone: companyPhoneInput.value, companyType: companyTypeInput.value
      });
      if (!result.success) return companyError(result.error);
      return redirectAfterAuth('company');
    }
    const result = window.SSPAuth.loginUser({ email, password, role: 'company' });
    if (!result.success) return companyError(result.error);
    redirectAfterAuth('company');
  }
  function redirectAfterAuth(role) {
    showToast('تم تسجيل الدخول.');
    setTimeout(() => { window.location.href = role === 'company' ? 'company-portal.html' : 'client-portal.html'; }, 250);
  }
  function init() {
    fillCompanyTypes();
    roleTabClient.addEventListener('click', () => setRole('client'));
    roleTabCompany.addEventListener('click', () => setRole('company'));
    clientDetailsForm.addEventListener('submit', handleClientDetailsSubmit);
    clientOtpForm.addEventListener('submit', handleClientOtpSubmit);
    backToDetailsBtn.addEventListener('click', backToDetails);
    companyModeTabs.forEach((tab) => tab.addEventListener('click', () => { companyMode = tab.dataset.mode; updateCompanyView(); }));
    companyAuthForm.addEventListener('submit', handleCompanyAuthSubmit);
    if (new URLSearchParams(window.location.search).get('role') === 'company') setRole('company');
    updateCompanyView();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
