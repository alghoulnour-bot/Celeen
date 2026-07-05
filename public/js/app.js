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

  // Gentle ease-in-out for programmatic scrolls: eases in slowly (no sudden
  // "flash" dart) and settles softly at the end.
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // Smoothly scroll to a section. Distance-aware duration so a long jump (past
  // the pinned hero) travels at a calm, readable speed instead of racing.
  function smoothScrollTo(target, offset) {
    if (!lenis) { const el = document.querySelector(target); if (el) el.scrollIntoView({ behavior: 'smooth' }); return; }
    const el = document.querySelector(target);
    const dist = el ? Math.abs(el.getBoundingClientRect().top) : 0;
    const duration = Math.min(2.6, Math.max(1.2, dist / 1400)); // ~1400px per second, clamped
    lenis.scrollTo(target, { offset: offset || 0, duration, easing: easeInOutCubic });
  }

  // Always begin at the top (the envelope) on load/refresh — don't let the
  // browser restore a mid-page scroll position.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  window.addEventListener('beforeunload', () => window.scrollTo(0, 0));

  /* ---------------------------------------- Interlocking O&C monogram ------ */
  // Overlapping calligraphic O and C (script), like the reference logo.
  const CREST_SVG =
    '<svg class="crest__svg" viewBox="0 0 150 118" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<text class="crest__mono crest__mono--o" x="52" y="92" text-anchor="middle">O</text>' +
    '<text class="crest__mono crest__mono--c" x="82" y="92" text-anchor="middle">C</text>' +
    '</svg>';
  document.querySelectorAll('[data-crest]').forEach((el) => { el.innerHTML = CREST_SVG; });

  /* ------------------------------------------------ Botanical corner vine -- */
  // Sculpted white-plaster floral corner (real photo, background cut to
  // transparency) — flowers hug the top-left origin; the .vine--*/.env-bloom--*
  // transforms flip it into each corner.
  const CORNER_IMG = '<img class="vine__img" src="assets/flower-corner.png" alt="" aria-hidden="true" />';
  document.querySelectorAll('[data-vine]').forEach((el) => { el.innerHTML = CORNER_IMG; });

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
    const cta = document.getElementById('hero-cta');
    if (!envelope || !letter) return;

    // Jump to the matching questionnaire when a hero CTA is clicked.
    if (cta) cta.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        smoothScrollTo(a.getAttribute('href'), -20);
      });
    });

    // x:0/y:0 so GSAP's -50% doesn't stack on the CSS translate(-50%) (which
    // it otherwise reads as pixels), which shoved the envelope off-centre on
    // mobile.
    gsap.set(scene, { x: 0, y: 0, xPercent: -50, yPercent: -50 });
    gsap.set(letter, { x: 0, xPercent: -50 });
    gsap.set(photo, { xPercent: -50, y: () => window.innerHeight * 1.05, opacity: 0 });
    if (cta) gsap.set(cta, { xPercent: -50, autoAlpha: 0, y: 12 });

    const vh = () => window.innerHeight;

    if (prefersReduced) {
      gsap.set(flap, { scaleY: -1 });
      gsap.set(seal, { autoAlpha: 0 });
      gsap.set('.envelope__back, .envelope__front, .env-bloom', { autoAlpha: 0 });
      gsap.set(letter, { x: 0, xPercent: -50, y: -vh() * 0.26, scale: 1.02 });
      gsap.set(photo, { y: vh() * 0.30, opacity: 1 });
      if (cta) gsap.set(cta, { xPercent: -50, autoAlpha: 1, y: 0 });
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero', start: 'top top', end: '+=1700',
        pin: '#hero-pin', scrub: 0.3, invalidateOnRefresh: true,
        // Flap covers the card while lifting; once past vertical it drops
        // behind so the card slides out on top.
        onUpdate: (self) => { flap.style.zIndex = self.progress > 0.32 ? '1' : '6'; },
      },
    });

    tl.to('#hero-hint', { autoAlpha: 0, y: 14, duration: 0.25, ease: 'power1.out' }, 0)
      // Flap opens UPWARD — flips up above the envelope (apex up) and stays,
      // like a real open envelope, instead of being erased.
      .to(flap, { scaleY: -1, duration: 0.85, ease: 'power2.inOut' }, 0.05)
      .to(seal, { autoAlpha: 0, scale: 0.5, duration: 0.4, ease: 'power1.in' }, 0.05)
      // Corner blooms clear off the envelope as it begins to open.
      .to('.env-bloom', { autoAlpha: 0, duration: 0.4, ease: 'power1.in' }, 0.05)
      // Card comes out right after; the envelope dissolves quickly and the
      // photo rises up beneath — all overlapping so it doesn't drag.
      .to(letter, { x: 0, xPercent: -50, y: () => -vh() * 0.26, scale: 1.02, duration: 0.6, ease: 'power2.out' }, 0.85)
      .to(['.envelope__back', '.envelope__front', '#envelope-seal'],
          { autoAlpha: 0, duration: 0.4, ease: 'power1.inOut' }, 0.9)
      // The open flap lingers a beat (clearly shown open), then tidies away.
      .to(flap, { autoAlpha: 0, duration: 0.35, ease: 'power1.in' }, 1.15)
      .to(photo, { y: () => vh() * 0.30, opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.95)
      .to(cta, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.25);
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

  /* ------------------------------------------------ Questionnaire helpers -- */
  // Guest list is fetched once and shared by both flows' autocompletes.
  let guestNamesCache = null;
  function loadGuestNames() {
    if (!guestNamesCache) {
      guestNamesCache = fetch('/api/guests').then((r) => r.json())
        .then((n) => (Array.isArray(n) ? n : [])).catch(() => []);
    }
    return guestNamesCache;
  }

  // Wire an autocomplete input to the guest list. onPick(name) fires when a
  // name is chosen; onClear() fires when the field is edited off a valid pick.
  function setupAutocomplete(input, suggest, onPick, onClear) {
    let names = [];
    loadGuestNames().then((n) => { names = n; });
    function render(matches) {
      suggest.innerHTML = '';
      if (!matches.length) { suggest.hidden = true; return; }
      matches.slice(0, 8).forEach((name) => {
        const li = document.createElement('li');
        li.textContent = name;
        li.addEventListener('click', () => { input.value = name; suggest.hidden = true; onPick(name); });
        suggest.appendChild(li);
      });
      suggest.hidden = false;
    }
    input.addEventListener('input', () => {
      onClear();
      const q = input.value.trim().toLowerCase();
      if (!q) { suggest.hidden = true; return; }
      render(names.filter((n) => n.toLowerCase().includes(q)));
    });
    document.addEventListener('click', (e) => { if (!suggest.contains(e.target) && e.target !== input) suggest.hidden = true; });
  }

  // Step navigation scoped to one panel; scrolls the section into view.
  function makeStepper(panel, anchor) {
    const steps = {};
    panel.querySelectorAll('.q').forEach((q) => { steps[q.dataset.step] = q; });
    return function goto(step) {
      Object.values(steps).forEach((q) => { q.classList.remove('is-active'); q.hidden = true; });
      steps[step].hidden = false;
      steps[step].classList.add('is-active');
      if (lenis) lenis.scrollTo(anchor, { offset: -30, duration: 0.6 });
    };
  }

  async function postRespond(path, body) {
    const res = await fetch('/api/respond/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  }

  /* ------------------------------------------------------------ RSVP flow -- */
  function buildRsvp() {
    const panel = document.getElementById('rsvp');
    if (!panel) return;
    const goto = makeStepper(panel, '#attend');
    const state = { name: null, table: null, partySize: null, members: [] };

    function setSeatBadge(text) {
      const el = document.getElementById('r-thanks-seat');
      if (el) { el.textContent = text || ''; el.hidden = !text; }
    }
    function setThanks(title, sub) {
      document.getElementById('r-thanks-title').textContent = title;
      document.getElementById('r-thanks-sub').textContent = sub;
    }
    // The table is shown whenever ANYONE in the party is coming — so if the
    // person filling this out can't make it but their family can, they still
    // see where the family is seated.
    function enterThanks(attending) {
      const anyAttending = state.members.length ? state.members.some((m) => m.attending) : attending;
      if (attending) {
        setSeatBadge(state.partySize > 1
          ? `Your seat · Table ${state.table} · Party of ${state.partySize}`
          : `Your seat · Table ${state.table}`);
        setThanks('Thank you', "We can't wait to celebrate with you.");
      } else if (anyAttending) {
        setSeatBadge(`Your family is seated at Table ${state.table}`);
        setThanks('Thank you', "We'll miss you — but we're glad your family will be there.");
      } else {
        setSeatBadge('');
        setThanks('We’ll miss you', 'Thank you for letting us know.');
      }
      goto('thanks');
    }

    /* Step 1 — name lookup */
    const nameNext = document.getElementById('r-name-next');
    const nameErr = document.getElementById('r-name-err');
    setupAutocomplete(document.getElementById('r-name'), document.getElementById('r-suggestions'),
      (name) => { state.name = name; nameNext.disabled = false; },
      () => { state.name = null; nameNext.disabled = true; nameErr.textContent = ''; });

    nameNext.addEventListener('click', async () => {
      if (!state.name) return;
      nameNext.disabled = true; nameErr.textContent = '';
      try {
        const res = await fetch('/api/respond/party?name=' + encodeURIComponent(state.name));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
        state.table = data.table;
        state.partySize = data.size;
        state.members = data.members.map((m) => ({ name: m.name, attending: m.responded ? m.attending : true }));
        const me = data.members.find((m) => m.name.toLowerCase() === state.name.toLowerCase());
        if (me && me.responded) { enterThanks(me.attending); return; }
        document.getElementById('r-party-table').textContent = 'Table ' + data.table;
        buildMembers();
        goto('party');
      } catch (err) {
        nameErr.textContent = err.message;
      } finally {
        nameNext.disabled = false;
      }
    });

    /* Step 2 — who's coming (party checklist) */
    function buildMembers() {
      const wrap = document.getElementById('r-members');
      wrap.innerHTML = '';
      state.members.forEach((m) => {
        const row = document.createElement('div');
        row.className = 'member';
        row.innerHTML = '<span class="member__name"></span>'
          + '<div class="member__seg"><button type="button" data-att="yes">Coming</button>'
          + '<button type="button" data-att="no">Can’t</button></div>';
        row.querySelector('.member__name').textContent = m.name;
        const yes = row.querySelector('[data-att="yes"]');
        const no = row.querySelector('[data-att="no"]');
        const paint = () => { yes.classList.toggle('is-on', m.attending); no.classList.toggle('is-on', !m.attending); };
        yes.addEventListener('click', () => { m.attending = true; paint(); });
        no.addEventListener('click', () => { m.attending = false; paint(); });
        paint();
        wrap.appendChild(row);
      });
    }

    const partyNext = document.getElementById('r-party-next');
    const partyErr = document.getElementById('r-party-err');
    partyNext.addEventListener('click', async () => {
      partyNext.disabled = true; partyErr.textContent = '';
      try {
        await postRespond('party', { members: state.members });
        const me = state.members.find((m) => m.name.toLowerCase() === state.name.toLowerCase());
        enterThanks(me ? me.attending : true);
      } catch (err) {
        partyErr.textContent = err.message;
        partyNext.disabled = false;
      }
    });

    /* Thank-you card → gentle hand-off to the nqoot section */
    const toNqoot = document.getElementById('r-to-nqoot');
    if (toNqoot) toNqoot.addEventListener('click', (e) => {
      e.preventDefault();
      smoothScrollTo('#nqoot', -20);
    });
  }

  /* ----------------------------------------------------------- Nqoot flow -- */
  function buildNqoot() {
    const panel = document.getElementById('gift');
    if (!panel) return;
    const goto = makeStepper(panel, '#nqoot');
    const state = { name: null, method: null, amount: null };

    /* Step 1 — name (recorded for the couple's records; not an RSVP) */
    const nameNext = document.getElementById('g-name-next');
    const nameErr = document.getElementById('g-name-err');
    setupAutocomplete(document.getElementById('g-name'), document.getElementById('g-suggestions'),
      (name) => { state.name = name; nameNext.disabled = false; },
      () => { state.name = null; nameNext.disabled = true; nameErr.textContent = ''; });
    nameNext.addEventListener('click', () => { if (state.name) goto('method'); });

    /* Step 2 — method */
    panel.querySelectorAll('[data-method]').forEach((btn) => {
      btn.addEventListener('click', () => { state.method = btn.dataset.method; goto('amount'); });
    });

    /* Step 3 — amount */
    const amountInput = document.getElementById('g-amount');
    const amountBtns = panel.querySelectorAll('.amount-btn');
    const amountNext = document.getElementById('g-amount-next');
    amountBtns.forEach((b) => b.addEventListener('click', () => { amountBtns.forEach((x) => x.classList.remove('selected')); b.classList.add('selected'); amountInput.value = b.dataset.amount; }));
    amountInput.addEventListener('input', () => amountBtns.forEach((x) => x.classList.remove('selected')));
    amountNext.addEventListener('click', () => {
      const amt = Number(amountInput.value);
      if (!Number.isFinite(amt) || amt <= 0) { amountInput.focus(); return; }
      state.amount = amt;
      document.getElementById('g-pay-card').hidden = state.method !== 'card';
      document.getElementById('g-pay-zelle').hidden = state.method !== 'zelle';
      document.getElementById('g-pay-title').textContent = state.method === 'zelle' ? `Send $${amt} via Zelle` : `Send $${amt} by card`;
      goto('pay');
    });

    /* Step 4 — pay */
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
    const done = document.getElementById('g-done');
    const payErr = document.getElementById('g-pay-err');
    done.addEventListener('click', async () => {
      done.disabled = true; payErr.textContent = '';
      try {
        await postRespond('gift', { name: state.name, method: state.method, amount: state.amount });
        goto('thanks');
      } catch (err) { payErr.textContent = err.message; done.disabled = false; }
    });

    /* Back buttons */
    panel.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => goto(b.dataset.back)));
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
    buildRsvp();
    buildNqoot();
    buildAdminDot();
  }

  /* ---- Discreet admin access (footer dot -> passcode -> dashboard) -------- */
  function buildAdminDot() {
    const dot = document.getElementById('admin-dot');
    const form = document.getElementById('admin-form');
    const input = document.getElementById('admin-pass');
    if (!dot || !form) return;
    dot.addEventListener('click', () => {
      form.hidden = !form.hidden;
      if (!form.hidden) input.focus();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = input.value.trim();
      if (code) window.location.href = '/admin?key=' + encodeURIComponent(code);
    });
  }

  runPreloader(init);
})();
