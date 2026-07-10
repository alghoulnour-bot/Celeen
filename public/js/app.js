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
  // transparency) — flowers hug the top-left origin; the .vine--*
  // transforms flip it into each corner.
  const CORNER_IMG = '<img class="vine__img" src="assets/flower-corner.png" alt="" aria-hidden="true" />';
  document.querySelectorAll('[data-vine]').forEach((el) => { el.innerHTML = CORNER_IMG; });

  /* ---------------------------------------------------------- Preloader ---- */
  // Someone coming back from Stripe has already seen the preloader on their way
  // in; making them sit through it again before we can even show their receipt
  // is the difference between a 3s wait and none.
  const returningFromCheckout = new URLSearchParams(window.location.search).has('nqoot');

  function runPreloader(done) {
    const pre = document.getElementById('preloader');
    if (!pre || !hasGSAP || prefersReduced || returningFromCheckout) {
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
    const seal = document.getElementById('envelope-seal');
    const scene = document.getElementById('envelope-scene');
    const heroScene = document.getElementById('hero-scene');
    const heroTitle = document.getElementById('hero-scene-title');
    const flash = document.getElementById('hero-flash');
    const cta = document.getElementById('hero-cta');
    if (!envelope || !heroScene) return;

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
    gsap.set(seal, { x: 0, xPercent: -50 }); // matches the CSS translateX(-50%)
    if (cta) gsap.set(cta, { xPercent: -50, autoAlpha: 0, y: 12 });
    gsap.set(heroScene, { autoAlpha: 0 });
    gsap.set(heroTitle, { autoAlpha: 0, y: 18 });
    gsap.set('.vines', { autoAlpha: 0 }); // corner flowers arrive with the ballroom

    const hint = document.getElementById('hero-hint');
    const skip = document.getElementById('hero-skip');

    // The flap mirrors about its TOP edge (transform-origin: 50% 0), so under
    // scaleY(s) its apex sits at y = s * flapHeight: it travels from +H down to
    // -H, i.e. 2H. Translating the seal by -2H with the same ease and duration
    // keeps it welded to the apex on every frame, not just at the ends.
    const flapHeight = () => {
      const pct = parseFloat(getComputedStyle(envelope).getPropertyValue('--flap-h')) || 66;
      return (envelope.clientHeight * pct) / 100;
    };
    const flapTravel = () => -2 * flapHeight();

    // Standing the flap up puts its tip above the envelope. Where there's spare
    // room below (desktop) we ease the scene down so the tip and seal stay in
    // view. Where there isn't (a phone, where the envelope fills the screen) we
    // simply let the flap travel off the top — never scale the scene down, and
    // never push the envelope's bottom out of frame.
    const PAD = 16;
    const sceneShift = () => {
      const heroH = document.getElementById('hero-pin').clientHeight;
      const envH = envelope.clientHeight;
      const sealR = parseFloat(getComputedStyle(envelope).getPropertyValue('--seal-r')) || 38;
      const tipTop = heroH / 2 - envH / 2 - flapHeight();
      const wanted = Math.max(0, sealR + 18 - tipTop);        // to clear the top edge
      const room = Math.max(0, heroH - PAD - (heroH / 2 + envH / 2)); // space under the envelope
      // Only move if the move actually achieves something. A partial shift just
      // slides the envelope down while the tip stays off-screen anyway.
      return wanted <= room ? wanted : 0;
    };

    // The page stays locked behind the sealed envelope until it's opened.
    function lockScroll() {
      document.documentElement.classList.add('is-sealed');
      if (lenis) lenis.stop();
    }
    function unlockScroll() {
      document.documentElement.classList.remove('is-sealed');
      if (lenis) lenis.start();
      if (hasGSAP) ScrollTrigger.refresh();
      if (skip) skip.hidden = true;
    }

    if (prefersReduced) {
      gsap.set(scene, { autoAlpha: 0 });
      gsap.set('#envelope-flap-shade', { autoAlpha: 0 });
      gsap.set(heroScene, { autoAlpha: 1 });
      gsap.set(heroTitle, { autoAlpha: 1, y: 0 });
      gsap.set('.vines', { autoAlpha: 1 });
      if (cta) gsap.set(cta, { xPercent: -50, autoAlpha: 1, y: 0 });
      if (hint) gsap.set(hint, { autoAlpha: 0 });
      unlockScroll();
      return;
    }

    // Time-based (not scrubbed): the whole opening plays on tap. Nothing slides
    // out of the envelope — it simply opens, blooms to white, and dissolves
    // into the ballroom.
    const tl = gsap.timeline({ paused: true });

    tl.to(hint, { autoAlpha: 0, y: 14, duration: 0.35, ease: 'power1.out' }, 0)
      // Flap lifts slowly, and the wax seal travels up with it, still stuck on.
      // Same ease + duration on both, so the seal tracks the apex every frame.
      .to(flap, { scaleY: -1, duration: 1.9, ease: 'power2.inOut' }, 0.2)
      .to(seal, { y: flapTravel, duration: 1.9, ease: 'power2.inOut' }, 0.2)
      // The shadow the closed flap casts on the face has nothing to cast it.
      .to('#envelope-flap-shade', { autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, 0.2)
      .to(scene, { y: sceneShift, duration: 1.9, ease: 'power2.inOut' }, 0.2)
      // Bloom to white halfway through the lift (the flap runs 0.2→2.1), while
      // pushing gently INTO the envelope — it reads as going inside rather than
      // watching the flap finish.
      .to(flash, { opacity: 1, duration: 0.55, ease: 'power2.in' }, 1.15)
      .to(scene, { scale: 1.14, duration: 0.8, ease: 'power2.in' }, 1.1)
      // Hidden behind the white: swap the envelope out for the ballroom.
      .set(scene, { autoAlpha: 0 }, 1.7)
      .set(heroScene, { autoAlpha: 1 }, 1.7)
      .to(flash, { opacity: 0, duration: 1.0, ease: 'power2.out' }, 1.75)
      // Slow drift on the photo itself (not the container — it holds the title).
      .to('.hero-scene__img', { scale: 1.06, duration: 3.4, ease: 'power1.out' }, 1.75)
      .to(heroTitle, { autoAlpha: 1, y: 0, duration: 1.0, ease: 'power2.out' }, 2.05)
      // The floral corners settle in once the ballroom is showing.
      .to('.vines', { autoAlpha: 1, duration: 1.2, ease: 'power2.out' }, 2.1)
      .to(cta, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 2.55)
      // Hand the page back as soon as the scene has settled — the slow drift on
      // the photo keeps running past this and must not hold the scroll lock.
      .call(unlockScroll, null, 2.95);

    let opened = false;
    function openEnvelope() {
      if (opened) return;
      opened = true;
      scene.classList.remove('is-tappable');
      tl.play();
    }
    // Jump straight to the opened state (Skip, or coming back from Stripe).
    function skipEnvelope() {
      if (opened) return;
      opened = true;
      scene.classList.remove('is-tappable');
      tl.progress(1);
      unlockScroll();
    }

    scene.classList.add('is-tappable');
    scene.addEventListener('click', openEnvelope);
    if (hint) hint.addEventListener('click', openEnvelope);
    if (skip) skip.addEventListener('click', skipEnvelope);
    lockScroll();

    // Returning from Stripe checkout? Don't make them re-open the envelope.
    if (new URLSearchParams(window.location.search).get('nqoot')) skipEnvelope();
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

  /* --------------------------------------------- Save-the-date calendar ---- */
  // July 2026 laid out Sun→Sat. Hard-coded rather than derived from Date so the
  // grid can never shift with the viewer's timezone.
  function buildCalendar() {
    const grid = document.getElementById('cal-grid');
    if (!grid) return;
    const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const FIRST_DOW = 3;  // July 1, 2026 falls on a Wednesday
    const DAYS = 31;
    const WEDDING = 26;

    let html = DOW.map((d) => `<span class="cal__dow">${d}</span>`).join('');
    for (let i = 0; i < FIRST_DOW; i++) html += '<span class="cal__day cal__day--empty"></span>';
    for (let d = 1; d <= DAYS; d++) {
      html += d === WEDDING
        ? `<span class="cal__day cal__day--wed" aria-label="July 26, 2026 — our wedding day">${d}</span>`
        : `<span class="cal__day">${d}</span>`;
    }
    grid.innerHTML = html;
  }

  /* -------------------------------------------------------- Guest reactions */
  // Decorative only — the count is not persisted anywhere. It starts at a warm
  // number, climbs when a guest taps, and ticks up on its own now and then so
  // the invitation feels like other people are looking at it too.
  function buildLikes() {
    const wrap = document.getElementById('likes');
    const btn = document.getElementById('likes-btn');
    const countEl = document.getElementById('likes-count');
    const stage = document.getElementById('likes-stage');
    if (!wrap || !btn || !countEl || !stage) return;

    const HEART = '<svg viewBox="0 0 24 24"><path d="M12 20.7l-1.3-1.2C6 15.4 3 12.7 3 9.3 3 6.7 5 4.7 7.5 4.7c1.5 0 2.9.7 3.8 1.8h1.4c.9-1.1 2.3-1.8 3.8-1.8C19 4.7 21 6.7 21 9.3c0 3.4-3 6.1-7.7 10.2L12 20.7z"/></svg>';
    let count = 89;
    wrap.hidden = false;

    function render() { countEl.textContent = count.toLocaleString(); }
    render();

    function floatHeart() {
      const h = document.createElement('span');
      h.className = 'heart';
      h.innerHTML = HEART;
      const dur = 1.3 + Math.random() * 0.9;
      h.style.setProperty('--dur', dur + 's');
      h.style.setProperty('--dx', (Math.random() * 64 - 32).toFixed(0) + 'px');
      h.style.setProperty('--rise', (105 + Math.random() * 80).toFixed(0) + 'px');
      h.style.setProperty('--sc', (0.85 + Math.random() * 0.7).toFixed(2));
      h.style.setProperty('--rot', (Math.random() * 50 - 25).toFixed(0) + 'deg');
      stage.appendChild(h);
      setTimeout(() => h.remove(), dur * 1000 + 120);
    }

    btn.addEventListener('click', () => {
      count += 1;
      render();
      floatHeart();
      btn.classList.remove('is-thumped');
      void btn.offsetWidth; // restart the keyframe so rapid taps each thump
      btn.classList.add('is-thumped');
    });

    // Every so often, "someone else" reacts — a small barrage, counted in.
    function otherGuestLikes() {
      const burst = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < burst; i++) {
        setTimeout(() => { count += 1; render(); floatHeart(); }, i * 190);
      }
      schedule();
    }
    function schedule() {
      setTimeout(otherGuestLikes, 9000 + Math.random() * 16000);
    }
    schedule();
  }

  /* ----------------------------------------------------- Background music -- */
  // Never autoplays (browsers block it anyway). The button only appears if a
  // track actually exists at assets/music.mp3.
  function buildMusic() {
    const audio = document.getElementById('music');
    const btn = document.getElementById('music-toggle');
    if (!audio || !btn) return;

    fetch(audio.getAttribute('src'), { method: 'HEAD' })
      .then((res) => { if (res.ok) btn.hidden = false; })
      .catch(() => {});

    btn.addEventListener('click', () => {
      if (audio.paused) {
        audio.volume = 0.35;
        audio.play().then(() => {
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('aria-label', 'Pause music');
        }).catch(() => {});
      } else {
        audio.pause();
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Play music');
      }
    });
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
    return function goto(step, opts) {
      Object.values(steps).forEach((q) => { q.classList.remove('is-active'); q.hidden = true; });
      steps[step].hidden = false;
      steps[step].classList.add('is-active');
      if (opts && opts.scroll === false) return; // caller is positioning us itself
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
    const state = { name: null, amount: null };

    /* Step 1 — name (recorded for the couple's records; not an RSVP) */
    const nameNext = document.getElementById('g-name-next');
    const nameErr = document.getElementById('g-name-err');
    setupAutocomplete(document.getElementById('g-name'), document.getElementById('g-suggestions'),
      (name) => { state.name = name; nameNext.disabled = false; },
      () => { state.name = null; nameNext.disabled = true; nameErr.textContent = ''; });
    nameNext.addEventListener('click', () => { if (state.name) goto('amount'); });

    /* Step 2 — amount (free-typed, whole dollars) */
    const amountInput = document.getElementById('g-amount');
    const amountErr = document.getElementById('g-amount-err');
    const amountNext = document.getElementById('g-amount-next');

    amountInput.addEventListener('input', () => { amountErr.textContent = ''; });
    amountInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); amountNext.click(); } });

    amountNext.addEventListener('click', () => {
      const raw = amountInput.value.trim();
      const amt = Math.round(Number(raw));
      // Mirrors the server's guard, which rejects anything outside 1…100000.
      if (!raw || !Number.isFinite(amt) || amt < 1) {
        amountErr.textContent = 'Please enter an amount of $1 or more.';
        amountInput.focus();
        return;
      }
      if (amt > 100000) {
        amountErr.textContent = 'Please enter $100,000 or less.';
        amountInput.focus();
        return;
      }
      amountErr.textContent = '';
      state.amount = amt;
      document.getElementById('g-pay-amount').textContent = `$${amt.toLocaleString()} · card or Apple Pay`;
      goto('pay');
    });

    /* Step 3 — pay: create a Stripe Checkout session and hand off to Stripe */
    const pay = document.getElementById('g-pay');
    const payErr = document.getElementById('g-pay-err');
    pay.addEventListener('click', async () => {
      pay.disabled = true; payErr.textContent = '';
      try {
        const res = await fetch('/api/nqoot/checkout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: state.name, amount: state.amount }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout. Please try again.');
        window.location.assign(data.url); // hosted Stripe checkout
      } catch (err) { payErr.textContent = err.message; pay.disabled = false; }
    });

    /* Back buttons */
    panel.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => goto(b.dataset.back)));

    // If Stripe just redirected back here after payment, confirm + say thanks.
    handleNqootReturn(goto);
  }

  // On return from Stripe Checkout (?nqoot=paid&session_id=…) verify the payment
  // server-side, record it once, and drop the guest on the nqoot thank-you card.
  function handleNqootReturn(goto) {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('nqoot');
    if (!status) return;
    // Clean the query so a reload doesn't re-trigger this.
    history.replaceState(null, '', window.location.pathname + '#nqoot');
    if (status !== 'paid') return; // cancelled — leave them at the top of nqoot
    const sessionId = params.get('session_id');
    const title = document.getElementById('g-thanks-title');
    const sub = document.getElementById('g-thanks-sub');

    // Put them ON the card they just paid from. Not at the top of the page,
    // and not on a smooth ride down past the whole site — an instant jump.
    const land = () => {
      const el = document.getElementById('nqoot');
      if (lenis) lenis.scrollTo(el, { offset: -20, immediate: true });
      else el.scrollIntoView();
    };

    const thank = (amount) => {
      title.textContent = 'Thank you';
      sub.textContent = Number.isFinite(amount)
        ? `Your $${Math.round(amount)} gift means the world to us.`
        : 'Your generosity means the world to us.';
    };

    // Show the card up front, so they never glimpse the name step while we
    // check with Stripe.
    title.textContent = 'One moment…';
    sub.textContent = 'Confirming your gift.';
    goto('thanks', { scroll: false });
    land();
    requestAnimationFrame(land); // again once layout has settled

    if (!sessionId) { thank(); return; }
    fetch('/api/nqoot/confirm?session_id=' + encodeURIComponent(sessionId))
      .then((r) => r.json()).then((data) => {
        if (data && data.ok) {
          thank(data.amount);
        } else {
          // Stripe says this session was never paid — don't thank them for it.
          title.textContent = 'We couldn’t confirm that';
          sub.textContent = 'No payment was recorded. If you were charged, please let us know.';
        }
        land();
      })
      // Couldn't reach our server to verify. Stripe only sends people here after
      // a successful payment, so thank them rather than accuse them.
      .catch(() => { thank(); land(); });
  }

  /* --------------------------------------------------------------- Boot ---- */
  function init() {
    if (hasGSAP) {
      gsap.registerPlugin(ScrollTrigger);
      // Mobile browsers fire a resize every time the URL bar hides/shows while
      // scrolling. Without this, ScrollTrigger recalculates all trigger points
      // mid-scroll and everything jumps.
      ScrollTrigger.config({ ignoreMobileResize: true });
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
    buildCalendar();
    buildMusic();
    buildLikes();
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
