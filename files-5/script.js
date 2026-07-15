/* ==========================================================================
   SSP.Q8 — SITE SCRIPT
   Sections: 1. Configuration  2. State  3. DOM References  4. Utilities
   5. Rendering  6. Event Handlers  7. Initialization
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     1. APPLICATION CONFIGURATION
     ------------------------------------------------------------------------ */
  const CONFIG = {
    // ملاحظة: استبدل هذا الرقم برقم واتساب العمل الفعلي قبل النشر.
    whatsappNumber: '96500000000',
    toastDuration: 3200,
    scrollShadowThreshold: 8
  };

  /* ------------------------------------------------------------------------
     2. STATE
     ------------------------------------------------------------------------ */
  const calculatorState = {
    tierBase: 45,
    tierName: 'نموذج تفاعلي',
    complexityMult: 1,
    complexityName: 'بسيطة'
  };

  // مكتبة أيقونات بسيطة تُستخدم بالمنتجات الجاهزة. لإضافة أيقونة جديدة، أضف
  // مفتاحاً جديداً هنا واستخدم اسمه بحقل icon داخل js/content.js.
  const ICONS = {
    ledger: `<svg viewBox="0 0 40 40" fill="none">
      <rect x="7" y="6" width="26" height="28" rx="1" stroke="currentColor" stroke-width="2"></rect>
      <path d="M13 14H27M13 20H27M13 26H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
    </svg>`,
    inventory: `<svg viewBox="0 0 40 40" fill="none">
      <path d="M20 6L33 12.5V27.5L20 34L7 27.5V12.5L20 6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>
      <path d="M7 12.5L20 19M20 19L33 12.5M20 19V34" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>
    </svg>`,
    default: `<svg viewBox="0 0 40 40" fill="none">
      <rect x="9" y="6" width="22" height="28" rx="1" stroke="currentColor" stroke-width="2"></rect>
      <path d="M14 15H26M14 21H26M14 27H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
    </svg>`
  };

  /* ------------------------------------------------------------------------
     3. DOM REFERENCES
     ------------------------------------------------------------------------ */
  const header = document.querySelector('.site-header');
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('main-nav');
  const toastContainer = document.getElementById('toastContainer');

  const calculatorForm = document.getElementById('calculatorForm');
  const productsGrid = document.getElementById('productsGrid');
  const tierOptionsContainer = document.getElementById('tierOptions');
  const complexityOptionsContainer = document.getElementById('complexityOptions');
  const portfolioGrid = document.getElementById('portfolioGrid');

  const calcFormulaEl = document.getElementById('calcFormula');
  const calcTierNameEl = document.getElementById('calcTierName');
  const calcComplexityNameEl = document.getElementById('calcComplexityName');
  const calcTotalEl = document.getElementById('calcTotal');
  const startNowBtn = document.getElementById('startNowBtn');

  const yearEl = document.getElementById('year');

  // هذي المتغيرات تُملأ بعد بناء المحتوى ديناميكياً (انظر renderAllContent).
  let tierInputs = [];
  let complexityInputs = [];
  let buyButtons = [];

  /* ------------------------------------------------------------------------
     4. UTILITY FUNCTIONS
     ------------------------------------------------------------------------ */

  /**
   * تنسيق رقم بثلاث خانات عشرية بأسلوب دفتر حسابات (يشبه خلية إكسل).
   */
  function formatCurrency(amount) {
    return amount.toFixed(3);
  }

  /**
   * بناء رابط واتساب برسالة معبأة مسبقاً.
   */
  function buildWhatsAppLink(message) {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${CONFIG.whatsappNumber}?text=${encoded}`;
  }

  /**
   * عرض إشعار toast قصير للمستخدم.
   */
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
    }, CONFIG.toastDuration);
  }

  /* ------------------------------------------------------------------------
     5. RENDERING
     ------------------------------------------------------------------------ */

  /**
   * بناء بطاقات المنتجات الجاهزة من js/content.js.
   */
  function renderProducts() {
    if (!productsGrid || !window.SITE_CONTENT) return;

    productsGrid.innerHTML = SITE_CONTENT.products.map((product) => {
      const featuresHtml = product.features
        .map((feature) => `<li><span class="square-bullet" aria-hidden="true"></span>${feature}</li>`)
        .join('');
      const iconSvg = ICONS[product.icon] || ICONS.default;

      return `
        <article class="product-card reveal">
          <span class="corner-mark" aria-hidden="true"></span>
          <div class="product-card__icon" aria-hidden="true">${iconSvg}</div>
          <h3 class="product-card__title">${product.name}</h3>
          <p class="product-card__desc">${product.description}</p>
          <ul class="product-card__features">${featuresHtml}</ul>
          <div class="product-card__footer">
            <span class="price"><span class="price__value">${product.price}</span> <span class="price__currency">د.ك</span></span>
            <a class="btn btn--navy btn--sm buy-btn" data-product="${product.name}" data-price="${product.price}" href="#">اشترِ الآن</a>
          </div>
        </article>`;
    }).join('');
  }

  /**
   * بناء بطاقات مستويات النموذج الأولي من js/content.js.
   */
  function renderTiers() {
    if (!tierOptionsContainer || !window.SITE_CONTENT) return;

    tierOptionsContainer.innerHTML = SITE_CONTENT.tiers.map((tier) => {
      const featuredClass = tier.featured ? ' tier-card--featured' : '';
      const checkedAttr = tier.featured ? ' checked' : '';
      const badgeHtml = tier.featured ? `<span class="tier-card__badge">${tier.badge || 'الأكثر طلباً'}</span>` : '';

      return `
        <label class="tier-card${featuredClass}">
          <input type="radio" name="tier" value="${tier.price}" data-tier-name="${tier.name}"${checkedAttr}>
          ${badgeHtml}
          <span class="tier-card__body">
            <span class="tier-card__title">${tier.name}</span>
            <span class="tier-card__desc">${tier.description}</span>
            <span class="tier-card__price">من <span class="mono">${tier.price}</span> د.ك</span>
          </span>
        </label>`;
    }).join('');
  }

  /**
   * بناء أزرار درجة التعقيد من js/content.js.
   */
  function renderComplexityLevels() {
    if (!complexityOptionsContainer || !window.SITE_CONTENT) return;

    complexityOptionsContainer.innerHTML = SITE_CONTENT.complexityLevels.map((level, index) => `
      <label class="complexity-btn">
        <input type="radio" name="complexity" value="${level.multiplier}"${index === 0 ? ' checked' : ''}>
        <span class="complexity-btn__name">${level.name}</span>
        <span class="complexity-btn__mult mono">×${level.multiplier}</span>
        <span class="complexity-btn__hint">${level.hint}</span>
      </label>`).join('');
  }

  /**
   * بناء بطاقات الأعمال السابقة من js/content.js.
   */
  function renderPortfolio() {
    if (!portfolioGrid || !window.SITE_CONTENT) return;

    portfolioGrid.innerHTML = SITE_CONTENT.portfolio.map((item) => `
      <article class="portfolio-card reveal">
        <span class="corner-mark" aria-hidden="true"></span>
        <span class="portfolio-card__tag">${item.tag}</span>
        <h3 class="portfolio-card__title">${item.name}</h3>
        <p class="portfolio-card__desc">${item.description}</p>
      </article>`).join('');
  }

  /**
   * بناء كل الأقسام المعتمدة على المحتوى، ثم تحديث مراجع عناصر الحاسبة
   * وأزرار الشراء لأنها أصبحت موجودة بالصفحة الآن.
   */
  function renderAllContent() {
    if (!window.SITE_CONTENT) {
      console.error('SITE_CONTENT غير موجود — تأكد من تحميل js/content.js قبل js/script.js');
      return;
    }

    renderProducts();
    renderTiers();
    renderComplexityLevels();
    renderPortfolio();

    tierInputs = calculatorForm ? [...calculatorForm.querySelectorAll('input[name="tier"]')] : [];
    complexityInputs = calculatorForm ? [...calculatorForm.querySelectorAll('input[name="complexity"]')] : [];
    buyButtons = [...document.querySelectorAll('.buy-btn')];

    const checkedTier = tierInputs.find((input) => input.checked);
    const checkedComplexity = complexityInputs.find((input) => input.checked);
    if (checkedTier) {
      calculatorState.tierBase = Number(checkedTier.value);
      calculatorState.tierName = checkedTier.dataset.tierName || '';
    }
    if (checkedComplexity) {
      calculatorState.complexityMult = Number(checkedComplexity.value);
      const label = checkedComplexity.closest('.complexity-btn').querySelector('.complexity-btn__name');
      calculatorState.complexityName = label ? label.textContent : '';
    }
  }

  /**
   * إعادة حساب السعر وتحديث خلية النتيجة بالكامل.
   */
  function renderCalculator() {
    const total = calculatorState.tierBase * calculatorState.complexityMult;

    if (calcFormulaEl) {
      calcFormulaEl.textContent = `= ${formatCurrency(calculatorState.tierBase)} × ${calculatorState.complexityMult}`;
    }
    if (calcTierNameEl) calcTierNameEl.textContent = calculatorState.tierName;
    if (calcComplexityNameEl) calcComplexityNameEl.textContent = calculatorState.complexityName;
    if (calcTotalEl) calcTotalEl.textContent = formatCurrency(total);
  }

  /* ------------------------------------------------------------------------
     6. EVENT HANDLERS
     ------------------------------------------------------------------------ */

  function handleHeaderScroll() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > CONFIG.scrollShadowThreshold);
  }

  function handleNavToggle() {
    const isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'إغلاق قائمة التنقل' : 'فتح قائمة التنقل');
  }

  function closeMobileNav() {
    if (!mainNav || !mainNav.classList.contains('is-open')) return;
    mainNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'فتح قائمة التنقل');
  }

  /**
   * تمييز البطاقة المختارة بصرياً (احتياط للمتصفحات التي لا تدعم :has()).
   */
  function markSelected(inputsGroup, selectedInput) {
    inputsGroup.forEach((input) => {
      input.closest('label').classList.toggle('is-selected', input === selectedInput);
    });
  }

  function handleTierChange(event) {
    const input = event.target;
    calculatorState.tierBase = Number(input.value);
    calculatorState.tierName = input.dataset.tierName || '';
    markSelected(tierInputs, input);
    renderCalculator();
  }

  function handleComplexityChange(event) {
    const input = event.target;
    calculatorState.complexityMult = Number(input.value);
    const label = input.closest('.complexity-btn').querySelector('.complexity-btn__name');
    calculatorState.complexityName = label ? label.textContent : '';
    markSelected(complexityInputs, input);
    renderCalculator();
  }

  function handleStartNowClick(event) {
    event.preventDefault();
    const total = calculatorState.tierBase * calculatorState.complexityMult;
    const message =
      `مرحباً SSP.Q8، أبي أبدأ بطلب نموذج أولي.\n` +
      `المستوى: ${calculatorState.tierName}\n` +
      `درجة التعقيد: ${calculatorState.complexityName}\n` +
      `السعر التقريبي: ${formatCurrency(total)} د.ك`;

    window.open(buildWhatsAppLink(message), '_blank', 'noopener');
    showToast('تم فتح واتساب لإكمال طلبك.');
  }

  function handleBuyClick(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const productName = button.dataset.product;
    const price = button.dataset.price;
    const message = `مرحباً SSP.Q8، أبي أشتري: ${productName} (${price} د.ك).`;

    window.open(buildWhatsAppLink(message), '_blank', 'noopener');
    showToast(`تم فتح واتساب لطلب "${productName}".`);
  }

  /**
   * كشف عناصر ظهور تدريجي عند التمرير (يُحترم تفضيل تقليل الحركة عبر CSS).
   */
  function setupRevealObserver() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    if (!('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------------
     7. INITIALIZATION
     ------------------------------------------------------------------------ */
  function init() {
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // يبني هذا كل بطاقات المنتجات/المستويات/الأعمال السابقة من js/content.js
    // ويملأ tierInputs / complexityInputs / buyButtons بالعناصر الجديدة.
    renderAllContent();

    window.addEventListener('scroll', handleHeaderScroll, { passive: true });
    handleHeaderScroll();

    if (navToggle && mainNav) {
      navToggle.addEventListener('click', handleNavToggle);
      mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMobileNav));
    }

    tierInputs.forEach((input) => input.addEventListener('change', handleTierChange));
    complexityInputs.forEach((input) => input.addEventListener('change', handleComplexityChange));

    const checkedTier = tierInputs.find((input) => input.checked);
    const checkedComplexity = complexityInputs.find((input) => input.checked);
    if (checkedTier) markSelected(tierInputs, checkedTier);
    if (checkedComplexity) markSelected(complexityInputs, checkedComplexity);

    renderCalculator();

    if (startNowBtn) startNowBtn.addEventListener('click', handleStartNowClick);
    buyButtons.forEach((button) => button.addEventListener('click', handleBuyClick));

    setupRevealObserver();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
