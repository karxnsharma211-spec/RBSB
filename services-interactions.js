/* RBSB EVENTS — interactive service details */
(() => {
  'use strict';

  const cards = [...document.querySelectorAll('.services-grid .service-card')];
  if (!cards.length) return;

  const modal = document.createElement('div');
  modal.className = 'service-detail-modal';
  modal.id = 'serviceDetailModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'serviceDetailTitle');
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="service-detail-backdrop" data-service-close></div>
    <section class="service-detail-panel" tabindex="-1">
      <button type="button" class="service-detail-close" aria-label="Close service details" data-service-close>&times;</button>
      <img class="service-detail-image" alt="">
      <div class="service-detail-body">
        <span class="service-detail-number"></span>
        <h2 id="serviceDetailTitle"></h2>
        <p class="service-detail-description"></p>
        <h3>What's included</h3>
        <ul class="service-detail-list"></ul>
        <a class="primary-btn service-detail-enquire" href="booking.html">Enquire about this service</a>
      </div>
    </section>`;
  document.body.appendChild(modal);

  const panel = modal.querySelector('.service-detail-panel');
  const image = modal.querySelector('.service-detail-image');
  const number = modal.querySelector('.service-detail-number');
  const title = modal.querySelector('#serviceDetailTitle');
  const description = modal.querySelector('.service-detail-description');
  const list = modal.querySelector('.service-detail-list');
  const enquire = modal.querySelector('.service-detail-enquire');
  let lastFocus = null;

  const openDetails = card => {
    const heading = card.querySelector('h3');
    const paragraph = card.querySelector('.service-card-content > p');
    const photo = card.querySelector('.service-image img');
    const serviceNumber = card.querySelector('.service-number');
    const features = [...card.querySelectorAll('.service-card-content li')];

    if (!heading) return;
    lastFocus = document.activeElement;
    title.textContent = heading.textContent.trim();
    number.textContent = serviceNumber?.textContent.trim() || 'EVENT SERVICE';
    description.textContent = paragraph?.textContent.trim() || 'Explore this event service and share your requirements with our team.';
    image.src = photo?.currentSrc || photo?.src || '';
    image.alt = photo?.alt || heading.textContent.trim();
    image.hidden = !image.src;

    list.replaceChildren();
    features.forEach(feature => {
      const li = document.createElement('li');
      li.textContent = feature.textContent.trim();
      list.appendChild(li);
    });

    enquire.href = `booking.html?service=${encodeURIComponent(heading.textContent.trim())}`;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('service-modal-open');
    modal.querySelector('.service-detail-close').focus();
  };

  const closeDetails = () => {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('service-modal-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  };

  cards.forEach(card => {
    const content = card.querySelector('.service-card-content');
    if (!content || content.querySelector('.service-view-details')) return;
    const heading = card.querySelector('h3');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'service-view-details';
    button.textContent = 'View Service Details';
    button.setAttribute('aria-label', `View details for ${heading?.textContent.trim() || 'this service'}`);
    const enquireLink = content.querySelector('a.service-link');
    content.insertBefore(button, enquireLink || null);
    button.addEventListener('click', () => openDetails(card));
    card.classList.add('service-card-interactive');
    card.addEventListener('click', event => {
      if (event.target.closest('a, button')) return;
      openDetails(card);
    });
    card.addEventListener('keydown', event => {
      if (event.target !== card) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDetails(card);
      }
    });
    card.tabIndex = 0;
    card.setAttribute('aria-label', `Open details for ${heading?.textContent.trim() || 'service'}`);
  });

  modal.addEventListener('click', event => {
    if (event.target.closest('[data-service-close]')) closeDetails();
  });
  document.addEventListener('keydown', event => {
    if (!modal.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeDetails();
    if (event.key === 'Tab') {
      const focusable = [...modal.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
  });
})();
