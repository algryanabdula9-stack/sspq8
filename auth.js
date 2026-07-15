/* ==========================================================================
   SSP.Q8 — AUTH (نموذج أولي محلي)
   ========================================================================== */
(function () {
  'use strict';

  const USERS_KEY = 'ssp_users';
  const SESSION_KEY = 'ssp_session';
  const OTP_KEY = 'ssp_otp_pending';

  const ADMIN_CREDENTIALS = {
    email: 'admin@sspq8.com',
    password: 'sspq8-admin-2026'
  };

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
  function getCompanies() { return getUsers().filter((u) => u.role === 'company'); }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
  }

  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      email: user.email,
      name: user.name,
      phone: user.phone || null,
      role: user.role,
      companyName: user.companyName || null,
      companyType: user.companyType || null,
      subscriptionActive: !!user.subscriptionActive
    }));
  }

  function clearSession() { localStorage.removeItem(SESSION_KEY); }
  function getUserByEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    return getUsers().find((u) => u.email === normalized) || null;
  }

  function registerUser({ name, email, password, role, companyName, phone, companyType }) {
    const users = getUsers();
    const emailNorm = String(email || '').trim().toLowerCase();

    if (!name || !emailNorm || !password) return { success: false, error: 'عبّئ كل الحقول المطلوبة.' };
    if (role === 'company' && (!companyName || !phone || !companyType)) {
      return { success: false, error: 'عبّئ بيانات الشركة ورقم الهاتف والتخصص.' };
    }
    if (users.some((u) => u.email === emailNorm)) {
      return { success: false, error: 'هذا البريد مسجل من قبل، جرّب تسجيل الدخول.' };
    }

    const user = {
      name: name.trim(),
      email: emailNorm,
      password,
      phone: phone ? phone.trim() : null,
      role,
      companyName: companyName ? companyName.trim() : null,
      companyType: companyType || null,
      subscriptionActive: false,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    setSession(user);
    return { success: true, user };
  }

  function loginUser({ email, password, role }) {
    const emailNorm = String(email || '').trim().toLowerCase();
    const user = getUsers().find((u) => u.email === emailNorm && u.role === role);
    if (!user) return { success: false, error: 'ما فيه حساب بهذا البريد لهذا النوع من الحسابات.' };
    if (user.password !== password) return { success: false, error: 'كلمة المرور غير صحيحة.' };
    setSession(user);
    return { success: true, user };
  }

  function updateSubscription(email, active) {
    const users = getUsers();
    const user = users.find((u) => u.email === String(email || '').trim().toLowerCase());
    if (!user) return { success: false };
    user.subscriptionActive = !!active;
    saveUsers(users);
    const session = getSession();
    if (session && session.email === user.email) setSession(user);
    return { success: true, user };
  }

  function getOtpPending() {
    try { return JSON.parse(localStorage.getItem(OTP_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveOtpPending(pending) { localStorage.setItem(OTP_KEY, JSON.stringify(pending)); }

  function requestClientOtp({ email, phone }) {
    const emailNorm = String(email || '').trim().toLowerCase();
    const phoneNorm = String(phone || '').trim();
    if (!emailNorm || !phoneNorm) return { success: false, error: 'عبّئ البريد الإلكتروني ورقم الهاتف.' };

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const pending = getOtpPending();
    pending[emailNorm] = { code, phone: phoneNorm, createdAt: Date.now() };
    saveOtpPending(pending);
    return { success: true, code };
  }

  function verifyClientOtp({ email, code }) {
    const emailNorm = String(email || '').trim().toLowerCase();
    const pending = getOtpPending();
    const entry = pending[emailNorm];
    if (!entry) return { success: false, error: 'أرسل كود التحقق أولاً.' };
    if (Date.now() - entry.createdAt > 10 * 60 * 1000) {
      delete pending[emailNorm];
      saveOtpPending(pending);
      return { success: false, error: 'انتهت صلاحية الكود، أرسل كوداً جديداً.' };
    }
    if (String(code || '').trim() !== entry.code) return { success: false, error: 'الكود غير صحيح.' };

    const users = getUsers();
    let user = users.find((u) => u.email === emailNorm && u.role === 'client');
    if (!user) {
      const last4 = entry.phone.replace(/\D/g, '').slice(-4) || 'جديد';
      user = {
        name: `عميل ${last4}`,
        email: emailNorm,
        phone: entry.phone,
        role: 'client',
        createdAt: new Date().toISOString()
      };
      users.push(user);
    } else {
      user.phone = entry.phone || user.phone;
    }
    saveUsers(users);
    delete pending[emailNorm];
    saveOtpPending(pending);
    setSession(user);
    return { success: true, user };
  }

  function loginAdmin({ email, password }) {
    const emailNorm = String(email || '').trim().toLowerCase();
    if (emailNorm !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
      return { success: false, error: 'بيانات الدخول غير صحيحة.' };
    }
    const admin = { email: ADMIN_CREDENTIALS.email, name: 'إدارة SSP.Q8', role: 'admin' };
    setSession(admin);
    return { success: true, user: admin };
  }

  function requireRole(role, redirectTo) {
    const session = getSession();
    if (!session || session.role !== role) {
      window.location.href = redirectTo || 'portal.html';
      return null;
    }
    return session;
  }

  window.SSPAuth = {
    getUsers, getCompanies, getSession, setSession, clearSession, getUserByEmail,
    registerUser, loginUser, requestClientOtp, verifyClientOtp, loginAdmin,
    updateSubscription, requireRole
  };
})();
