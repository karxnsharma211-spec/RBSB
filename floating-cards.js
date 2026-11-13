/* Interactive pointer lighting for the floating event-card deck */
(() => {
  const deck = document.querySelector('.category-grid');
  if (!deck) return;
  const cards = [...deck.querySelectorAll('.category-card')];
  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  cards.forEach((card, index) => {
    card.style.setProperty('--float-delay', `${-(index * .73)}s`);
    card.addEventListener('pointerenter', () => {
      cards.forEach(other => other.classList.toggle('is-focused', other === card));
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-focused');
      card.style.removeProperty('--pointer-x');
      card.style.removeProperty('--pointer-y');
    });
    if (finePointer) {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--pointer-x', `${x}%`);
        card.style.setProperty('--pointer-y', `${y}%`);
      });
    }
    // Keyboard users get the same focused-card treatment without blocking navigation.
    card.addEventListener('focus', () => card.classList.add('is-focused'));
    card.addEventListener('blur', () => card.classList.remove('is-focused'));
  });
})();