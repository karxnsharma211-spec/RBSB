/* RBSB EVENTS — accessible, repeatable motion layer */
(() => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

  const progress = document.createElement('div');
  progress.className = 'motion-progress';
  progress.setAttribute('aria-hidden', 'true');
  const ambient = document.createElement('div');
  ambient.className = 'motion-ambient';
  ambient.setAttribute('aria-hidden', 'true');
  const wash = document.createElement('div');
  wash.className = 'motion-page-wash';
  wash.setAttribute('aria-hidden', 'true');
  document.body.prepend(ambient, progress, wash);
  document.documentElement.classList.add('motion-ready');

  [...document.images].forEach((img, index) => {
    if (!img.hasAttribute('decoding')) img.decoding = 'async';
    if (index > 1 && !img.hasAttribute('loading')) img.loading = 'lazy';
    if (index <= 1 && !img.hasAttribute('fetchpriority')) img.fetchPriority = 'high';
  });

  let scrollQueued = false;
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    scrollQueued = false;
  };
  addEventListener('scroll', () => {
    if (!scrollQueued) { requestAnimationFrame(updateProgress); scrollQueued = true; }
  }, { passive: true });
  updateProgress();

  if (!reduce) {
    // Include page sections even on pages that do not use a <main> wrapper.
    // Also include the actual cards used by Venues, Services, Budget and About Us.
    const revealSelector = [
      'section',
      '.section-heading', '.hero-content',
      '.venues-hero-content', '.services-hero-content',
      '.budget-hero-content', '.about-hero-content',
      '.venue-card', '.venue-benefit-card',
      '.service-card', '.services-process-card',
      '.budget-expense-card', '.budget-summary-card', '.budget-tip-card',
      '.about-value-card', '.mission-card', '.vision-card', '.about-benefit',
      '.category-card', '.event-card', '.feature-card',
      '.testimonial-card', '.auth-container', '.contact-form',
      '.contact-info-card', '.dashboard-card', '.stat-card', '.content-card'
    ].join(',');

    let revealIndex = 0;
    let observer;
    const prepareReveal = (root = document) => {
      root.querySelectorAll?.(revealSelector).forEach(el => {
        if (el.closest('[hidden]') || el.dataset.motionReady) return;
        el.dataset.motionReady = '1';
        el.classList.add('motion-reveal');
        el.style.setProperty('--motion-delay', `${(revealIndex++ % 4) * 75}ms`);
        if (revealIndex % 9 === 3) el.classList.add('motion-from-left');
        else if (revealIndex % 9 === 6) el.classList.add('motion-from-right');
        if (observer) observer.observe(el);
        else el.classList.add('is-visible');
      });
    };

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          // Remove the visible state after leaving so it replays on every return.
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
          else entry.target.classList.remove('is-visible');
        });
      }, {
        threshold: 0,
        // A small bottom inset prevents triggering too early while scrolling.
        rootMargin: '0px 0px -8% 0px'
      });
    }

    prepareReveal();
    // Observe cards/sections inserted later by filters, search, or page scripts.
    const mutationObserver = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          if (node.matches?.(revealSelector) && !node.dataset.motionReady) {
            prepareReveal({ querySelectorAll: () => [node, ...node.querySelectorAll(revealSelector)] });
          } else prepareReveal(node);
        }
      }));
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    if (finePointer) {
      document.querySelectorAll('.event-card, .venue-card, .service-card, .feature-card, .stat-card, .testimonial-card').forEach(card => {
        card.classList.add('motion-spotlight');
        card.addEventListener('pointermove', event => {
          const rect = card.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width;
          const py = (event.clientY - rect.top) / rect.height;
          card.style.setProperty('--spot-x', `${px * 100}%`);
          card.style.setProperty('--spot-y', `${py * 100}%`);
          card.style.setProperty('--motion-tilt-x', `${(0.5 - py) * 3.2}deg`);
          card.style.setProperty('--motion-tilt-y', `${(px - 0.5) * 3.2}deg`);
        });
        card.addEventListener('pointerleave', () => {
          card.style.setProperty('--motion-tilt-x', '0deg');
          card.style.setProperty('--motion-tilt-y', '0deg');
        });
      });
      document.addEventListener('pointermove', event => {
        document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
        document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
      }, { passive: true });
    }

    document.addEventListener('pointerdown', event => {
      const control = event.target.closest('button, .primary-btn, .primary-button, .secondary-btn, .secondary-button, .signup-button, .venue-button, .search-button, input[type="submit"]');
      if (!control || control.disabled) return;
      const rect = control.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'motion-ripple';
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      control.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }, { passive: true });

    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
          link.target === '_blank' || link.hasAttribute('download')) return;
      let destination;
      try { destination = new URL(link.href, location.href); } catch { return; }
      if (destination.origin !== location.origin || destination.pathname === location.pathname ||
          destination.hash || link.hasAttribute('data-no-transition')) return;
      document.body.classList.add('motion-page-leaving');
    });
  }

  addEventListener('pageshow', () => document.body.classList.remove('motion-page-leaving'));
})();
