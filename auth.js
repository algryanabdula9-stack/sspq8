/* ==========================================================================
   SSP.Q8 — AUTH (نموذج أولي)
   ==========================================================================
   تنبيه مهم: هذا تسجيل دخول تجريبي فقط لأغراض العرض.
   كلمات المرور تُخزَّن هنا كنص عادي داخل متصفحك (localStorage) بدون تشفير،
   والبيانات لا تُشارك بين أجهزة مختلفة. النسخة الحقيقية تحتاج سيرفر
   وقاعدة بيانات حقيقية وتشفير كلمات مرور — لا تُستخدم هذه النسخة بحسابات
   أو بيانات حقيقية لعملاء أو شركات.
   ========================================================================== */

(function () {
  'use strict';

  const USERS_KEY = 'ssp_users';
  const SESSION_KEY = 'ssp_session';

  // حساب الأدمن (أنت) — مو مسجّل مع باقي المستخدمين، بيانات دخول ثابتة بالكود.
  // ⚠️ نسخة تجريبية: أي شخص يفتح كود الصفحة (View Source) يقدر يشوف هذي القيم.
  // قبل أي استخدام حقيقي، غيّر البريد وكلمة المرور، والأفضل تنتقل لتسجيل دخول
  // حقيقي عبر سيرفر بدل ما تكون القيم مكتوبة داخل الجافاسكربت.
  const ADMIN_CREDENTIALS = {
    email: 'admin@sspq8.com',
    password: 'sspq8-admin-2026'
  };

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getCompanies() {
    return getUsers().filter((u) => u.role === 'company');
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }

  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      email: user.email,
      name: user.name,
      role: user.role,
      companyName: user.companyName || null,
      subscriptionActive: !!user.subscriptionActive
    }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getUserByEmail(email) {
    return getUsers().find((u) => u.email === email) || null;
  }

  function registerUser({ name, email, password, role, companyName }) {
    const users = getUsers();
    const emailNorm = String(email).trim().toLowerCase();

    if (!name || !emailNorm || !password) {
      return { success: false, error: 'عبّي كل الحقول المطلوبة.' };
    }
    if (users.some((u) => u.email === emailNorm)) {
      return { success: false, error: 'هذا البريد مسجل من قبل، جرّب تسجيل الدخول.' };
    }

    const user = {
      name: name.trim(),
      email: emailNorm,
      password,
      role,
      companyName: companyName ? companyName.trim() : null,
      subscriptionActive: false,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);
    setSession(user);
    return { success: true, user };
  }

  function loginUser({ email, password, role }) {
    const emailNorm = String(email).trim().toLowerCase();
    const user = getUsers().find((u) => u.email === emailNorm && u.role === role);

    if (!user) {
      return { success: false, error: 'ما فيه حساب بهذا البريد لهذا النوع من الحسابات.' };
    }
    if (user.password !== password) {
      return { success: false, error: 'كلمة المرور غير صحيحة.' };
    }

    setSession(user);
    return { success: true, user };
  }

  function updateSubscription(email, active) {
    const users = getUsers();
    const user = users.find((u) => u.email === email);
    if (!user) return { success: false };

    user.subscriptionActive = active;
    saveUsers(users);

    const session = getSession();
    if (session && session.email === email) setSession(user);

    return { success: true, user };
  }

  function loginAdmin({ email, password }) {
    const emailNorm = String(email).trim().toLowerCase();
    if (emailNorm !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
      return { success: false, error: 'بيانات الدخول غير صحيحة.' };
    }
    const adminUser = { email: ADMIN_CREDENTIALS.email, name: 'إدارة SSP.Q8', role: 'admin' };
    setSession(adminUser);
    return { success: true, user: adminUser };
  }

  /**
   * يتأكد إن فيه جلسة مسجلة بالدور المطلوب، وإلا يرجّع المستخدم لصفحة الدخول.
   */
  function requireRole(role, redirectTo) {
    const session = getSession();
    if (!session || session.role !== role) {
      window.location.href = redirectTo || 'portal.html';
      return null;
    }
    return session;
  }

  window.SSPAuth = {
    getUsers,
    getCompanies,
    getSession,
    setSession,
    clearSession,
    getUserByEmail,
    registerUser,
    loginUser,
    loginAdmin,
    updateSubscription,
    requireRole
  };
})();
