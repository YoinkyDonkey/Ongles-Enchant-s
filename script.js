document.addEventListener('DOMContentLoaded', () => {
  // ========================
  // SELECT ELEMENTS
  // ========================
  const serviceCards = document.querySelectorAll('.service-card');
  const totalPriceEl = document.getElementById('total-price');
  const totalTimeEl = document.getElementById('total-time');

  // ========================
  // FUNCTION TO UPDATE TOTALS
  // ========================
  const updateTotals = () => {
    let totalPrice = 0;
    let totalTime = 0;

    serviceCards.forEach(card => {
      if (card.classList.contains('selected')) {
        const price = parseFloat(card.dataset.price) || 0;
        const duration = parseFloat(card.dataset.duration) || 0;
        totalPrice += price;
        totalTime += duration;
      }
    });

    totalPriceEl.textContent = totalPrice.toFixed(2);
    totalTimeEl.textContent = totalTime;
  };

  // ========================
  // CLICK EVENT TO TOGGLE SELECTION (ONE PER CATEGORY)
  // ========================
  serviceCards.forEach(card => {
    card.addEventListener('click', () => {
      const category = card.dataset.category;

      // Deselect other cards in the same category
      serviceCards.forEach(c => {
        if (c.dataset.category === category && c !== card) {
          c.classList.remove('selected');
        }
      });

      // Toggle clicked card
      card.classList.toggle('selected');

      // Update totals
      updateTotals();
    });
  });

  // ========================
  // SCROLL-BASED BACKGROUND COLOR CHANGE
  // ========================
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = scrollTop / docHeight;

    const startColor = [105, 21, 46]; // dark red
    const endColor = [172, 147, 98];  // light beige

    const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * scrollPercent);
    const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * scrollPercent);
    const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * scrollPercent);

    document.documentElement.style.setProperty('--backgroundcolor', `rgb(${r}, ${g}, ${b})`);

  });
});
