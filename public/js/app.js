/* ============================================================================
   Omar & Celeen — interactions
   Preloader · Lenis · GSAP envelope+photo scene · blur-in · photo wipe
   · magnetic buttons · countdown · merged RSVP+Nqoot questionnaire
   ========================================================================== */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof gsap !== 'undefined';
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Always begin at the top (the envelope) on load/refresh — don't let the
  // browser restore a mid-page scroll position.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  window.addEventListener('beforeunload', () => window.scrollTo(0, 0));

  /* ------------------------------------------------- O&C olive crest ------- */
  const CREST_SPRIG =
    '<path d="M62 96 C 42 92, 27 78, 20 58"/>' +
    '<g class="crest__leaves">' +
    '<ellipse cx="20" cy="58" rx="6.4" ry="2.5" transform="rotate(-62 20 58)"/>' +
    '<ellipse cx="26" cy="69" rx="6.4" ry="2.5" transform="rotate(-46 26 69)"/>' +
    '<ellipse cx="35" cy="79" rx="6.4" ry="2.5" transform="rotate(-31 35 79)"/>' +
    '<ellipse cx="47" cy="88" rx="6" ry="2.4" transform="rotate(-18 47 88)"/>' +
    '<ellipse cx="30" cy="60" rx="5.4" ry="2.1" transform="rotate(-98 30 60)"/>' +
    '<ellipse cx="39" cy="70" rx="5.4" ry="2.1" transform="rotate(-82 39 70)"/>' +
    '<ellipse cx="50" cy="80" rx="5.4" ry="2.1" transform="rotate(-66 50 80)"/>' +
    '</g>';
  const CREST_SVG =
    '<svg class="crest__svg" viewBox="0 0 160 132" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<text x="80" y="60" text-anchor="middle" class="crest__txt">O&amp;C</text>' +
    '<g class="crest__olive">' + CREST_SPRIG + '</g>' +
    '<g class="crest__olive" transform="translate(160,0) scale(-1,1)">' + CREST_SPRIG + '</g>' +
    '</svg>';
  document.querySelectorAll('[data-crest]').forEach((el) => { el.innerHTML = CREST_SVG; });

  /* ---------------------------------------------------------- Preloader ---- */
  function runPreloader(done) {
    const pre = document.getElementById('preloader');
    if (!pre || !hasGSAP || prefersReduced) {
      if (pre) pre.style.display = 'none';
      done();
      return;
    }
    gsap.timeline({ onComplete: () => { pre.classList.add('is-done'); done(); } })
      .to('.preloader__crest', { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power2.out', delay: 0.15 })
      .to('.preloader__line', { width: 130, duration: 0.7, ease: 'power2.inOut' }, '-=0.4')
      .to('.preloader__crest', { opacity: 0, duration: 0.4, delay: 0.35 })
      .to(pre, { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, '-=0.1')
      .set(pre, { display: 'none' });
  }

  /* --------------------------------------------------------------- Lenis --- */
  let lenis = null;
  function initLenis() {
    if (typeof Lenis === 'undefined' || prefersReduced) return;
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4,
    });
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ------------------------------------------------ Hero: envelope + photo - */
  function buildHero() {
    const envelope = document.getElementById('envelope');
    const flap = document.getElementById('envelope-flap');
    const letter = document.getElementById('letter');
    const seal = document.getElementById('envelope-seal');
    const scene = document.getElementById('envelope-scene');
    const photo = document.getElementById('hero-photo');
    if (!envelope || !letter) return;

    gsap.set(scene, { xPercent: -50, yPercent: -50 });
    gsap.set(letter, { xPercent: -50 });
    gsap.set(photo, { xPercent: -50, y: () => window.innerHeight * 1.05, opacity: 0 });

    const vh = () => window.innerHeight;

    if (prefersReduced) {
      gsap.set(scene, { scale: 1.2 });
      gsap.set(flap, { autoAlpha: 0 });
      gsap.set(seal, { autoAlpha: 0 });
      gsap.set('.envelope__back, .envelope__front', { autoAlpha: 0 });
      gsap.set(letter, { xPercent: -50, y: -vh() * 0.16, scale: 1.0 });
      gsap.set(photo, { y: vh() * 0.44, opacity: 1 });
      return;
    }

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '#hero', start: 'top top', end: '+=2900',
        pin: '#hero-pin', scrub: 1, invalidateOnRefresh: true,
        onUpdate: (self) => { flap.style.zIndex = self.progress > 0.30 ? '1' : '6'; },
      },
    });

    tl.to('#hero-hint', { autoAlpha: 0, y: 14, duration: 0.35 }, 0)
      // 1) Zoom in — the camera pushes toward the envelope, "entering" it.
      .to(scene, { scale: 1.2, duration: 1.8, ease: 'power1.inOut' }, 0.1)
      // 2) The flap lifts all the way open, revealing the lighter lining inside.
      .to(flap, { rotationX: -178, duration: 1.3, ease: 'power2.inOut' }, 0.2)
      .to(seal, { autoAlpha: 0, scale: 0.5, duration: 0.55, ease: 'power1.in' }, 0.25)
      // 3) Hold — the envelope sits fully open (lining + card visible inside)
      //    while the zoom finishes, before the card is drawn out.
      .to(letter, { xPercent: -50, y: () => -vh() * 0.16, scale: 1.0, duration: 1.0, ease: 'power2.out' }, 2.0)
      // 4) Photo rises to sit right beneath the card.
      .to(photo, { y: () => vh() * 0.44, opacity: 1, duration: 1.0, ease: 'power2.out' }, 2.3)
      // 5) The envelope shell dissolves together, gently, once the card is clear.
      .to(['.envelope__back', '.envelope__front', '.envelope__flap', '#envelope-seal'],
          { autoAlpha: 0, duration: 0.95, ease: 'power1.inOut' }, 2.4);
  }

  /* ---------------------------------------------------------- Blur-in ------ */
  function buildBlurIn() {
    if (!hasGSAP) return;
    document.querySelectorAll('.blurin, .blurin-mini').forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      const rtl = el.getAttribute('dir') === 'rtl';
      el.innerHTML = words.map((w) => `<span class="blurin-word">${w}</span>`).join(rtl ? ' ' : ' ');
      const spans = el.querySelectorAll('.blurin-word');
      if (prefersReduced) return;
      gsap.set(spans, { filter: 'blur(9px)', opacity: 0, y: 26 });
      ScrollTrigger.create({
        trigger: el, start: 'top 86%', once: true,
        onEnter: () => gsap.to(spans, { filter: 'blur(0px)', opacity: 1, y: 0, duration: 0.75, stagger: 0.09, ease: 'power2.out' }),
      });
    });
  }

  /* ------------------------------------------------- Photo wipe + parallax - */
  function buildPhotoWipe() {
    if (!hasGSAP) return;
    document.querySelectorAll('.photo-wipe').forEach((mask) => {
      if (prefersReduced) { gsap.set(mask, { clipPath: 'inset(0 0 0% 0)' }); return; }
      gsap.to(mask, {
        clipPath: 'inset(0 0 0% 0)', duration: 1.5, ease: 'power4.inOut',
        scrollTrigger: { trigger: mask, start: 'top 78%' },
      });
      const img = mask.querySelector('img');
      if (img) gsap.fromTo(img, { yPercent: -8 }, {
        yPercent: 4, ease: 'none',
        scrollTrigger: { trigger: mask, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  /* ------------------------------------------------------- Scroll reveals -- */
  function buildReveals() {
    const els = document.querySelectorAll('.reveal');
    if (!hasGSAP || prefersReduced) { els.forEach((el) => el.classList.add('is-in')); return; }
    els.forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => el.classList.add('is-in') }));
  }

  /* -------------------------------------------------------- Progress bar --- */
  function buildProgressBar() {
    const bar = document.getElementById('scroll-progress-bar');
    if (!bar || !hasGSAP) return;
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { bar.style.width = (self.progress * 100).toFixed(2) + '%'; } });
  }

  /* -------------------------------------------------- Magnetic buttons ----- */
  function buildMagnetic() {
    if (!hasGSAP || isTouch) return;
    document.querySelectorAll('.mag').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.28, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.4, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' }));
    });
  }

  /* --------------------------------------------------------- Countdown ----- */
  function buildCountdown() {
    const target = new Date('2026-07-26T19:00:00-05:00').getTime();
    const el = { d: document.getElementById('cd-days'), h: document.getElementById('cd-hours'), m: document.getElementById('cd-mins'), s: document.getElementById('cd-secs') };
    if (!el.d) return;
    const pad = (n) => String(Math.max(0, n)).padStart(2, '0');
    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) { el.d.textContent = el.h.textContent = el.m.textContent = el.s.textContent = '00'; clearInterval(t); return; }
      const s = Math.floor(diff / 1000);
      el.d.textContent = pad(Math.floor(s / 86400));
      el.h.textContent = pad(Math.floor((s % 86400) / 3600));
      el.m.textContent = pad(Math.floor((s % 3600) / 60));
      el.s.textContent = pad(s % 60);
    }
    tick();
    const t = setInterval(tick, 1000);
  }

  /* ------------------------------------------ Questionnaire (RSVP + Nqoot) - */
  function buildQuiz() {
    const quiz = document.getElementById('quiz');
    if (!quiz) return;

    const steps = {};
    quiz.querySelectorAll('.q').forEach((q) => { steps[q.dataset.step] = q; });
    const state = { name: null, table: null, partySize: null, method: null, amount: null };

    function goto(step) {
      Object.values(steps).forEach((q) => { q.classList.remove('is-active'); q.hidden = true; });
      steps[step].hidden = false;
      steps[step].classList.add('is-active');
      if (lenis) lenis.scrollTo('#attend', { offset: -30, duration: 0.6 });
    }

    async function post(path, body) {
      const res = await fetch('/api/respond/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      return data;
    }

    /* Step 1 — name lookup */
    const nameInput = document.getElementById('q-name');
    const suggest = document.getElementById('q-suggestions');
    const nameNext = document.getElementById('q-name-next');
    const nameErr = document.getElementById('q-name-err');
    let guestNames = [];
    fetch('/api/guests').then((r) => r.json()).then((n) => { guestNames = Array.isArray(n) ? n : []; }).catch(() => {});

    function renderSuggest(matches) {
      suggest.innerHTML = '';
      if (!matches.length) { suggest.hidden = true; return; }
      matches.slice(0, 8).forEach((name) => {
        const li = document.createElement('li');
        li.textContent = name;
        li.addEventListener('click', () => { nameInput.value = name; state.name = name; nameNext.disabled = false; suggest.hidden = true; });
        suggest.appendChild(li);
      });
      suggest.hidden = false;
    }
    nameInput.addEventListener('input', () => {
      state.name = null; nameNext.disabled = true; nameErr.textContent = '';
      const q = nameInput.value.trim().toLowerCase();
      if (!q) { suggest.hidden = true; return; }
      renderSuggest(guestNames.filter((n) => n.toLowerCase().includes(q)));
    });
    document.addEventListener('click', (e) => { if (!suggest.contains(e.target) && e.target !== nameInput) suggest.hidden = true; });
    nameNext.addEventListener('click', () => { if (state.name) goto('attend'); });

    /* Step 2 — attendance */
    quiz.querySelectorAll('[data-attend]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const attending = btn.dataset.attend === 'yes';
        try {
          const data = await post('attend', { name: state.name, attending });
          state.table = data.table; state.partySize = data.partySize;
          if (attending) {
            const seat = document.getElementById('q-seat');
            seat.textContent = state.partySize > 1 ? `You & your party of ${state.partySize} · Table ${state.table}` : `You're at Table ${state.table}`;
            goto('gift');
          } else {
            document.getElementById('q-thanks-title').textContent = 'We’ll miss you';
            document.getElementById('q-thanks-sub').textContent = 'Thank you for letting us know.';
            goto('thanks');
          }
        } catch (err) {
          const sub = document.getElementById('q-attend-sub');
          sub.textContent = err.message;
        }
      });
    });

    /* Step 3 — gift? */
    quiz.querySelectorAll('[data-gift]').forEach((btn) => {
      btn.addEventListener('click', () => { btn.dataset.gift === 'yes' ? goto('method') : goto('thanks'); });
    });

    /* Step 4 — method */
    quiz.querySelectorAll('[data-method]').forEach((btn) => {
      btn.addEventListener('click', () => { state.method = btn.dataset.method; goto('amount'); });
    });

    /* Step 5 — amount */
    const amountInput = document.getElementById('q-amount');
    const amountBtns = quiz.querySelectorAll('.amount-btn');
    const amountNext = document.getElementById('q-amount-next');
    amountBtns.forEach((b) => b.addEventListener('click', () => { amountBtns.forEach((x) => x.classList.remove('selected')); b.classList.add('selected'); amountInput.value = b.dataset.amount; }));
    amountInput.addEventListener('input', () => amountBtns.forEach((x) => x.classList.remove('selected')));
    amountNext.addEventListener('click', () => {
      const amt = Number(amountInput.value);
      if (!Number.isFinite(amt) || amt <= 0) { amountInput.focus(); return; }
      state.amount = amt;
      // Configure the pay step for the chosen method.
      document.getElementById('q-pay-card').hidden = state.method !== 'card';
      document.getElementById('q-pay-zelle').hidden = state.method !== 'zelle';
      document.getElementById('q-pay-title').textContent = state.method === 'zelle' ? `Send $${amt} via Zelle` : `Send $${amt} by card`;
      goto('pay');
    });

    /* Step 6 — pay */
    const stripeLink = document.getElementById('stripe-pay-link');
    if (stripeLink && stripeLink.dataset.placeholder === 'true') {
      stripeLink.style.opacity = '0.55';
      stripeLink.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('stripe-note').textContent = 'Card link coming soon — please use Zelle for now. Thank you!'; });
    }
    const zelleBtn = document.getElementById('zelle-number');
    if (zelleBtn) zelleBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(zelleBtn.querySelector('.zelle__num').textContent.trim())
        .then(() => { const h = document.getElementById('zelle-copied'); h.textContent = 'Copied!'; setTimeout(() => { h.textContent = 'Tap to copy'; }, 2000); }).catch(() => {});
    });
    const done = document.getElementById('q-done');
    const payErr = document.getElementById('q-pay-err');
    done.addEventListener('click', async () => {
      done.disabled = true; payErr.textContent = '';
      try {
        await post('gift', { name: state.name, method: state.method, amount: state.amount });
        document.getElementById('q-thanks-title').textContent = 'Thank you';
        document.getElementById('q-thanks-sub').textContent = 'Your generosity means the world to us.';
        goto('thanks');
      } catch (err) { payErr.textContent = err.message; done.disabled = false; }
    });

    /* Back buttons */
    quiz.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => goto(b.dataset.back)));
  }

  /* --------------------------------------------------------------- Boot ---- */
  function init() {
    if (hasGSAP) {
      gsap.registerPlugin(ScrollTrigger);
      initLenis();
      buildHero();
      buildBlurIn();
      buildPhotoWipe();
      buildReveals();
      buildProgressBar();
      buildMagnetic();
      ScrollTrigger.refresh();
    } else {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
      document.querySelectorAll('.photo-wipe').forEach((el) => { el.style.clipPath = 'inset(0 0 0% 0)'; });
    }
    buildCountdown();
    buildQuiz();
  }

  runPreloader(init);
})();
