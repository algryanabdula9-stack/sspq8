/* ==========================================================================
   SSP.Q8 — PORTAL PAGE SCRIPT
   ========================================================================== */

(() => {
  'use strict';

  const state = { role: 'client', mode: 'login' };

  const roleTabClient = document.getElementById('roleTabClient');
  const roleTabCompany = document.getElementById('roleTabCompany');
  const modeTabs = [...document.querySelectorAll('.mode-tab')];

  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const authForm = document.getElementById('authForm');
  const authError = document.getElementById('authError');
  const authSubmitBtn = document.getElementById('authSubmitBtn');

  const nameGroup = document.getElementById('nameGroup');
  const nameInput = document.getElementById('nameInput');
  const companyNameGroup = document.getElementById('companyNameGroup');
  const companyNameInput = document.getElementById('companyNameInput');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');

  const toastContainer = document.getElementById('toastContainer');

  const COPY = {
    client: {
      login: { title: 'دخول العميل', subtitle: 'سجّل دخولك عشان تقدر ترسل طلب عرض سعر لشركات مشتركة.', submit: 'دخول' },
      register: { title: 'حساب عميل جديد', subtitle: 'أنشئ حسابك عشان تقدر تحفظ طلباتك وتتابع الشركات اللي تشتغل عليها.', submit: 'إنشاء الحساب' }
    },
    company: {
      login: { title: 'دخول شركة البرمجة', subtitle: 'سجّل دخولك عشان تشوف طلبات العملاء المفتوحة وتستلم اللي يناسبك.', submit: 'دخول' },
      register: { title: 'تسجيل شركة برمجة جديدة', subtitle: 'أنشئ حساب شركتك عشان تظهر لك طلبات العملاء وتقدر تستلمها.', submit: 'إنشاء الحساب' }
    }
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

  function showError(message) {
    authError.textContent = message;
    authError.classList.add('is-visible');
  }

  function clearError() {
    authError.textContent = '';
    authError.classList.remove('is-visible');
  }

  function updateView() {
    const copy = COPY[state.role][state.mode];
    authTitle.textContent = copy.title;
    authSubtitle.textContent = copy.subtitle;
    authSubmitBtn.textContent = copy.submit;

    roleTabClient.classList.toggle('is-active', state.role === 'client');
    roleTabClient.setAttribute('aria-selected', String(state.role === 'client'));
    roleTabCompany.classList.toggle('is-active', state.role === 'company');
    roleTabCompany.setAttribute('aria-selected', String(state.role === 'company'));

    modeTabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.mode === state.mode));

    const isRegister = state.mode === 'register';
    nameGroup.classList.toggle('form-hidden', !isRegister);
    nameInput.required = isRegister;

    const showCompanyField = isRegister && state.role === 'company';
    companyNameGroup.classList.toggle('form-hidden', !showCompanyField);
    companyNameInput.required = showCompanyField;

    clearError();
  }

  function setRole(role) {
    state.role = role;
    updateView();
  }

  function setMode(mode) {
    state.mode = mode;
    updateView();
  }

  function handleSubmit(event) {
    event.preventDefault();
    clearError();

    const email = emailInput.value;
    const password = passwordInput.value;

    if (state.mode === 'register') {
      const result = window.SSPAuth.registerUser({
        name: nameInput.value,
        email,
        password,
        role: state.role,
        companyName: state.role === 'company' ? companyNameInput.value : null
      });

      if (!result.success) {
        showError(result.error);
        return;
      }
      redirectAfterAuth(state.role);
      return;
    }

    const result = window.SSPAuth.loginUser({ email, password, role: state.role });
    if (!result.success) {
      showError(result.error);
      return;
    }
    redirectAfterAuth(state.role);
  }

  function redirectAfterAuth(role) {
    showToast('تم تسجيل الدخول بنجاح.');
    window.setTimeout(() => {
      window.location.href = role === 'company' ? 'company-portal.html' : 'client-portal.html';
    }, 500);
  }

  function initFromQueryString() {
    const params = new URLSearchParams(window.location.search);
    const requestedRole = params.get('role');
    if (requestedRole === 'company') setRole('company');
  }

  function init() {
    roleTabClient.addEventListener('click', () => setRole('client'));
    roleTabCompany.addEventListener('click', () => setRole('company'));
    modeTabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
    authForm.addEventListener('submit', handleSubmit);

    initFromQueryString();
    updateView();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
