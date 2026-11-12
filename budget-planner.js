/* RBSB EVENTS — Budget Planner (client-side, no API or Firebase setup needed) */
(() => {
  'use strict';

  const form = document.getElementById('budgetPlannerForm');
  if (!form) return;

  const results = document.getElementById('budgetResults');
  const breakdown = document.getElementById('budgetBreakdownList');
  const status = document.getElementById('budgetStatus');
  const editButton = document.getElementById('editBudget');
  const storageKey = 'rbsbBudgetPlannerDraftV1';

  const expenseFields = [
    ['venueCost', 'Venue & Hall'],
    ['cateringCost', 'Food & Catering'],
    ['decorationCost', 'Decoration'],
    ['photographyCost', 'Photography'],
    ['videographyCost', 'Videography'],
    ['entertainmentCost', 'Entertainment'],
    ['lightingCost', 'Lighting & Sound'],
    ['invitationCost', 'Invitations'],
    ['otherCost', 'Other Expenses']
  ];

  const money = amount => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(amount);

  const numberFrom = id => {
    const field = document.getElementById(id);
    const value = field ? Number(field.value) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  };

  const getDraft = () => {
    const data = {};
    form.querySelectorAll('input, select').forEach(field => {
      if (field.name) data[field.name] = field.value;
    });
    return data;
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(getDraft()));
    } catch (error) {
      // The calculator still works if browser storage is unavailable.
    }
  };

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const data = JSON.parse(saved);
      Object.entries(data).forEach(([name, value]) => {
        const field = form.elements.namedItem(name);
        if (field && typeof value === 'string') field.value = value;
      });
    } catch (error) {
      // Ignore an invalid or unavailable saved draft.
    }
  };

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const renderBreakdown = (items, total) => {
    breakdown.replaceChildren();
    const usedItems = items.filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    if (!usedItems.length) {
      const empty = document.createElement('p');
      empty.className = 'budget-breakdown-item';
      empty.textContent = 'No expenses entered yet. Add an amount to any category to see your breakdown.';
      breakdown.appendChild(empty);
      return;
    }

    usedItems.forEach(item => {
      const row = document.createElement('div');
      row.className = 'budget-breakdown-item';

      const label = document.createElement('span');
      label.textContent = item.label;

      const value = document.createElement('strong');
      const share = total > 0 ? (item.amount / total) * 100 : 0;
      value.textContent = `${money(item.amount)} · ${share.toFixed(1)}%`;

      row.append(label, value);
      breakdown.appendChild(row);
    });
  };

  const calculate = event => {
    if (event) event.preventDefault();

    if (!form.reportValidity()) return;

    const budget = numberFrom('totalBudget');
    if (budget <= 0) {
      document.getElementById('totalBudget').setCustomValidity('Please enter a budget greater than zero.');
      document.getElementById('totalBudget').reportValidity();
      document.getElementById('totalBudget').setCustomValidity('');
      return;
    }

    const items = expenseFields.map(([id, label]) => ({
      id, label, amount: numberFrom(id)
    }));
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const remaining = budget - total;

    setText('resultBudget', money(budget));
    setText('resultExpenses', money(total));
    setText('resultRemaining', money(remaining));
    renderBreakdown(items, total);

    status.classList.remove('budget-status-over', 'budget-status-under');
    if (remaining < 0) {
      status.classList.add('budget-status-over');
      status.textContent = `You are over your budget by ${money(Math.abs(remaining))}. Review the largest expense categories below and adjust your estimates.`;
    } else if (remaining === 0) {
      status.classList.add('budget-status-under');
      status.textContent = 'Your estimated expenses use your full budget exactly. Consider keeping a small emergency reserve if possible.';
    } else {
      status.classList.add('budget-status-under');
      const percentLeft = budget ? (remaining / budget) * 100 : 0;
      status.textContent = `Good planning! You have ${money(remaining)} remaining (${percentLeft.toFixed(1)}% of your budget). Keep some of it aside for unexpected costs.`;
    }

    results.hidden = false;
    results.setAttribute('data-calculated', 'true');
    saveDraft();
    results.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  form.addEventListener('submit', calculate);

  form.addEventListener('input', event => {
    if (event.target.matches('input, select')) {
      if (event.target.type === 'number' && event.target.value !== '' && Number(event.target.value) < 0) {
        event.target.setCustomValidity('Please enter zero or a positive amount.');
      } else {
        event.target.setCustomValidity('');
      }
      saveDraft();
    }
  });

  form.addEventListener('change', saveDraft);

  form.addEventListener('reset', () => {
    window.setTimeout(() => {
      results.hidden = true;
      results.removeAttribute('data-calculated');
      status.classList.remove('budget-status-over', 'budget-status-under');
      breakdown.replaceChildren();
      try { localStorage.removeItem(storageKey); } catch (error) {}
    }, 0);
  });

  if (editButton) {
    editButton.addEventListener('click', () => {
      results.hidden = true;
      document.getElementById('budget-planner').scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      });
      document.getElementById('totalBudget').focus({ preventScroll: true });
    });
  }

  restoreDraft();
})();
