(function () {
  const tapToOpenBtn = document.getElementById('tap-to-open');
  const video = document.getElementById('invite-video');
  const skipBtn = document.getElementById('skip-video');
  const videoStage = document.getElementById('video-stage');
  const mainContent = document.getElementById('main-content');
  const rsvpSection = document.getElementById('rsvp');
  const nqootSection = document.getElementById('nqoot');
  const petalsContainer = document.getElementById('petals');

  let hasRevealedContent = false;

  // Runs when the video ends, errors, or is skipped. Resets the video and
  // re-shows the tap overlay so scrolling back up and tapping again replays it.
  function onVideoFinished() {
    video.pause();
    video.currentTime = 0;
    tapToOpenBtn.hidden = false;
    skipBtn.hidden = true;

    if (!hasRevealedContent) {
      hasRevealedContent = true;
      mainContent.hidden = false;
      rsvpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function startVideo() {
    tapToOpenBtn.hidden = true;
    skipBtn.hidden = false;

    video.addEventListener('ended', onVideoFinished, { once: true });
    video.addEventListener('error', onVideoFinished, { once: true });

    video.play().catch(onVideoFinished);
  }

  tapToOpenBtn.addEventListener('click', startVideo);
  skipBtn.addEventListener('click', onVideoFinished);

  // ---- Floating petals background ----
  // Fixed to the viewport (so the fall animation is always on-screen while
  // visible) but faded out whenever the video section is in view, so they
  // never show on top of the video — only once you've scrolled below it.

  const MAX_PETALS = 18;

  function spawnPetal() {
    if (petalsContainer.childElementCount >= MAX_PETALS) return;

    const petal = document.createElement('div');
    petal.className = 'petal';

    const size = 10 + Math.random() * 10;
    const duration = 10 + Math.random() * 8;

    petal.style.left = `${Math.random() * 100}%`;
    petal.style.width = `${size}px`;
    petal.style.height = `${size * 1.3}px`;
    petal.style.animationDuration = `${duration}s`;

    petalsContainer.appendChild(petal);
    setTimeout(() => petal.remove(), duration * 1000 + 500);
  }

  for (let i = 0; i < 8; i++) spawnPetal();
  setInterval(spawnPetal, 900);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      ([entry]) => petalsContainer.classList.toggle('is-hidden', entry.isIntersecting),
      { threshold: 0.05 }
    );
    observer.observe(videoStage);
  }

  // ---- RSVP ----

  const rsvpInput = document.getElementById('rsvp-name');
  const rsvpSuggestions = document.getElementById('rsvp-suggestions');
  const rsvpConfirmBtn = document.getElementById('rsvp-confirm');
  const rsvpMessage = document.getElementById('rsvp-message');

  let guestNames = [];
  let selectedGuestName = null;

  fetch('/api/guests')
    .then((res) => res.json())
    .then((names) => {
      guestNames = Array.isArray(names) ? names : [];
    })
    .catch(() => {
      guestNames = [];
    });

  function renderSuggestions(matches) {
    rsvpSuggestions.innerHTML = '';
    if (matches.length === 0) {
      rsvpSuggestions.hidden = true;
      return;
    }
    matches.slice(0, 8).forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      li.addEventListener('click', () => {
        rsvpInput.value = name;
        selectedGuestName = name;
        rsvpConfirmBtn.disabled = false;
        rsvpSuggestions.hidden = true;
      });
      rsvpSuggestions.appendChild(li);
    });
    rsvpSuggestions.hidden = false;
  }

  rsvpInput.addEventListener('input', () => {
    selectedGuestName = null;
    rsvpConfirmBtn.disabled = true;
    rsvpMessage.textContent = '';

    const query = rsvpInput.value.trim().toLowerCase();
    if (!query) {
      rsvpSuggestions.hidden = true;
      return;
    }
    renderSuggestions(guestNames.filter((n) => n.toLowerCase().includes(query)));
  });

  document.addEventListener('click', (e) => {
    if (!rsvpSuggestions.contains(e.target) && e.target !== rsvpInput) {
      rsvpSuggestions.hidden = true;
    }
  });

  rsvpConfirmBtn.addEventListener('click', async () => {
    if (!selectedGuestName) return;

    rsvpConfirmBtn.disabled = true;
    rsvpMessage.textContent = 'Confirming…';

    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedGuestName }),
      });
      const data = await res.json();

      if (!res.ok) {
        rsvpMessage.textContent = data.error || "We couldn't find your name — please check the spelling or contact us.";
        rsvpConfirmBtn.disabled = false;
        return;
      }

      const partyText = data.partySize > 1
        ? `Thank you for joining us! Your party of ${data.partySize} is seated at Table ${data.table}.`
        : `Thank you for joining us! You're seated at Table ${data.table}.`;
      rsvpMessage.textContent = partyText;

      setTimeout(() => {
        nqootSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 1800);
    } catch (err) {
      rsvpMessage.textContent = 'Something went wrong — please try again in a moment.';
      rsvpConfirmBtn.disabled = false;
    }
  });

  // ---- Nqoot (gift) ----

  const giftNameInput = document.getElementById('gift-name');
  const giftAmountInput = document.getElementById('gift-amount');
  const amountButtons = document.querySelectorAll('.amount-btn');
  const giftSubmitBtn = document.getElementById('gift-submit');
  const giftMessage = document.getElementById('gift-message');
  const zelleNumberBtn = document.getElementById('zelle-number');
  const zelleCopied = document.getElementById('zelle-copied');

  zelleNumberBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(zelleNumberBtn.textContent.trim()).then(() => {
      zelleCopied.hidden = false;
      setTimeout(() => { zelleCopied.hidden = true; }, 2000);
    });
  });

  amountButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      amountButtons.forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      giftAmountInput.value = btn.dataset.amount;
    });
  });

  giftAmountInput.addEventListener('input', () => {
    amountButtons.forEach((b) => b.classList.remove('selected'));
  });

  giftSubmitBtn.addEventListener('click', async () => {
    const name = giftNameInput.value.trim();
    const amount = Number(giftAmountInput.value);

    if (!name) {
      giftMessage.textContent = 'Please enter your name.';
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      giftMessage.textContent = 'Please choose or enter a valid amount.';
      return;
    }

    giftSubmitBtn.disabled = true;
    giftMessage.textContent = 'Saving…';

    try {
      const res = await fetch('/api/log-gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, amount }),
      });
      const data = await res.json();

      if (!res.ok) {
        giftMessage.textContent = data.error || 'Something went wrong — please try again.';
        giftSubmitBtn.disabled = false;
        return;
      }

      giftMessage.textContent = 'Thank you so much for your generosity!';
    } catch (err) {
      giftMessage.textContent = 'Something went wrong — please try again.';
      giftSubmitBtn.disabled = false;
    }
  });
})();
