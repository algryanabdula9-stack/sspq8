/* ==========================================================================
   SSP.Q8 — PORTAL PAGE SCRIPT
   ========================================================================== */

(() => {
  'use strict';

  const roleTabClient = document.getElementById('roleTabClient');
  const roleTabCompany = document.getElementById('roleTabCompany');
  const clientAuthPanel = document.getElementById('clientAuthPanel');
  const companyAuthPanel = document.getElementById('companyAuthPanel');

  const toastContainer = document.getElementById('toastContainer');

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

  /* ------------------------------------------------------------------------
     ROLE SWITCHING
     ------------------------------------------------------------------------ */
  let currentRole = 'client';

  function setRole(role) {
    currentRole = role;
    roleTabClient.classList.toggle('is-active', role === 'client');
    roleTabClient.setAttribute('aria-selected', String(role === 'client'));
    roleTabCompany.classList.toggle('is-active', role === 'company');
    roleTabCompany.setAttribute('aria-selected', String(role === 'company'));

    clientAuthPanel.classList.toggle('form-hidden', role !== 'client');
    companyAuthPanel.classList.toggle('form-hidden', role !== 'company');
  }

  /* ------------------------------------------------------------------------
     CLIENT OTP FLOW
     ------------------------------------------------------------------------ */
  const clientAuthError = document.getElementById('clientAuthError');
  const clientDetailsForm = document.getElementById('clientDetailsForm');
  const clientNameInput = document.getElementById('clientNameInput');
  const clientEmailInput = document.getElementById('clientEmailInput');
  const clientPhoneInput = document.getElementById('clientPhoneInput');

  const clientOtpForm = document.getElementById('clientOtpForm');
  const otpCodeDisplay = document.getElementById('otpCodeDisplay');
  const clientOtpInput = document.getElementById('clientOtpInput');
  const backToDetailsBtn = document.getElementById('backToDetailsBtn');

  function clientShowError(message) {
    clientAuthError.textContent = message;
    clientAuthError.classList.add('is-visible');
  }
  function clientClearError() {
    clientAuthError.textContent = '';
    clientAuthError.classList.remove('is-visible');
  }

  function handleClientDetailsSubmit(event) {
    event.preventDefault();
    clientClearError();

    const result = window.SSPAuth.requestClientOtp({
      name: clientNameInput.value,
      email: clientEmailInput.value,
      phone: clientPhoneInput.value
    });

    if (!result.success) {
      clientShowError(result.error);
      return;
    }

    otpCodeDisplay.textContent = result.code;
    clientDetailsForm.classList.add('form-hidden');
    clientOtpForm.classList.remove('form-hidden');
    clientOtpInput.focus();
    showToast('تم إرسال كود التحقق (تجريبي).');
  }

  function handleClientOtpSubmit(event) {
    event.preventDefault();
    clientClearError();

    const result = window.SSPAuth.verifyClientOtp({
      email: clientEmailInput.value,
      code: clientOtpInput.value
    });

    if (!result.success) {
      clientShowError(result.error);
      return;
    }

    redirectAfterAuth('client');
  }

  function backToDetails() {
    clientOtpForm.classList.add('form-hidden');
    clientDetailsForm.classList.remove('form-hidden');
    clientOtpInput.value = '';
    clientClearError();
  }

  /* ------------------------------------------------------------------------
     COMPANY LOGIN / REGISTER (بريد + كلمة مرور، بدون تغيير)
     ------------------------------------------------------------------------ */
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
  const companyEmailInput = document.getElementById('companyEmailInput');
  const companyPasswordInput = document.getElementById('companyPasswordInput');

  let companyMode = 'login';

  const COMPANY_COPY = {
    login: { title: 'دخول شركة البرمجة', subtitle: 'سجّل دخولك عشان تشوف طلبات العملاء وترسل عروض أسعار.', submit: 'دخول' },
    register: { title: 'تسجيل شركة برمجة جديدة', subtitle: 'أنشئ حساب شركتك عشان تظهر لك طلبات العملاء وتقدر ترسل عروضك.', submit: 'إنشاء الحساب' }
  };

  function companyShowError(message) {
    companyAuthError.textContent = message;
    companyAuthError.classList.add('is-visible');
  }
  function companyClearError() {
    companyAuthError.textContent = '';
    companyAuthError.classList.remove('is-visible');
  }

  function updateCompanyView() {
    const copy = COMPANY_COPY[companyMode];
    companyAuthTitle.textContent = copy.title;
    companyAuthSubtitle.textContent = copy.subtitle;
    companyAuthSubmitBtn.textContent = copy.submit;

    companyModeTabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.mode === companyMode));

    const isRegister = companyMode === 'register';
    companyNameGroup.classList.toggle('form-hidden', !isRegister);
    companyPersonNameInput.required = isRegister;
    companyCompanyNameGroup.classList.toggle('form-hidden', !isRegister);
    companyNameInput.required = isRegister;

    companyClearError();
  }

  function setCompanyMode(mode) {
    companyMode = mode;
    updateCompanyView();
  }

  function handleCompanyAuthSubmit(event) {
    event.preventDefault();
    companyClearError();

    const email = companyEmailInput.value;
    const password = companyPasswordInput.value;

    if (companyMode === 'register') {
      const result = window.SSPAuth.registerUser({
        name: companyPersonNameInput.value,
        email,
        password,
        role: 'company',
        companyName: companyNameInput.value
      });
      if (!result.success) { companyShowError(result.error); return; }
      redirectAfterAuth('company');
      return;
    }

    const result = window.SSPAuth.loginUser({ email, password, role: 'company' });
    if (!result.success) { companyShowError(result.error); return; }
    redirectAfterAuth('company');
  }

  /* ------------------------------------------------------------------------
     SHARED
     ------------------------------------------------------------------------ */
  function redirectAfterAuth(role) {
    showToast('تم تسجيل الدخول بنجاح.');
    window.setTimeout(() => {
      window.location.href = role === 'company' ? 'company-portal.html' : 'client-portal.html';
    }, 400);
  }

  function initFromQueryString() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('role') === 'company') setRole('company');
  }

  function init() {
    roleTabClient.addEventListener('click', () => setRole('client'));
    roleTabCompany.addEventListener('click', () => setRole('company'));

    clientDetailsForm.addEventListener('submit', handleClientDetailsSubmit);
    clientOtpForm.addEventListener('submit', handleClientOtpSubmit);
    backToDetailsBtn.addEventListener('click', backToDetails);

    companyModeTabs.forEach((tab) => tab.addEventListener('click', () => setCompanyMode(tab.dataset.mode)));
    companyAuthForm.addEventListener('submit', handleCompanyAuthSubmit);

    initFromQueryString();
    setRole(currentRole);
    updateCompanyView();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
