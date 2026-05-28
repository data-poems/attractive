// ================================
// ONBOARDING SYSTEM
// First-time user tooltips with localStorage tracking
// ================================

(function() {
  const ONBOARDING_KEY = 'attractorPlaygroundOnboardingCompleted';
  let currentOnboardingStep = 0;

  const onboardingSteps = [
    {
      target: '#randomBtn',
      title: 'Welcome to Attractor Playground!',
      text: 'Start here! Click <strong>Random</strong> to explore beautiful combinations of attractors, colors, and data sources.',
      position: 'right'
    },
    {
      target: '#colorSchemeSelect',
      title: 'Choose Your Colors',
      text: 'Pick your favorite color scheme. Each one creates a different mood for the visualization.',
      position: 'right'
    },
    {
      target: '#presetSelect',
      title: 'Famous Configurations',
      text: 'Try famous mathematical presets like "Lorenz Classic" or "Chua Double Scroll" for well-known chaotic systems.',
      position: 'right'
    }
  ];

  function checkOnboarding() {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      setTimeout(() => startOnboarding(), 500);
    }
  }

  function startOnboarding() {
    currentOnboardingStep = 0;
    showOnboardingStep(0);
  }

  function showOnboardingStep(stepIndex) {
    const step = onboardingSteps[stepIndex];
    if (!step) return;

    // Create tooltip if it doesn't exist
    let tooltip = document.getElementById('onboardingTooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'onboardingTooltip';
      tooltip.className = 'onboarding-tooltip';
      document.body.appendChild(tooltip);
    }

    // Highlight target element
    const targetElement = document.querySelector(step.target);
    if (targetElement) {
      // Remove previous highlight
      document.querySelectorAll('.onboarding-highlight').forEach(el => {
        el.classList.remove('onboarding-highlight');
      });
      targetElement.classList.add('onboarding-highlight');
    }

    // Build progress dots
    const progressDots = onboardingSteps.map((_, i) => {
      let dotClass = 'onboarding-progress-dot';
      if (i === stepIndex) dotClass += ' active';
      else if (i < stepIndex) dotClass += ' completed';
      return `<div class="${dotClass}"></div>`;
    }).join('');

    // Build tooltip content
    const isLastStep = stepIndex === onboardingSteps.length - 1;
    tooltip.innerHTML = `
      <div class="onboarding-progress">${progressDots}</div>
      <h3>${step.title}</h3>
      <p>${step.text}</p>
      <div class="onboarding-tooltip-buttons">
        <button class="btn-secondary" onclick="skipOnboarding()">Skip Tour</button>
        ${isLastStep
          ? '<button class="btn-primary" onclick="completeOnboarding()">Got it!</button>'
          : '<button class="btn-primary" onclick="nextOnboardingStep()">Next</button>'
        }
      </div>
    `;

    // Position tooltip
    if (targetElement) {
      positionTooltip(tooltip, targetElement, step.position);
    }

    // Show with animation
    setTimeout(() => {
      tooltip.classList.add('active');
    }, 50);
  }

  function positionTooltip(tooltip, targetElement, position) {
    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // Default to right position
    let top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
    let left = targetRect.right + 20;

    // Adjust if tooltip would go off-screen
    if (left + tooltipRect.width > window.innerWidth) {
      // Switch to left
      left = targetRect.left - tooltipRect.width - 20;
    }

    // Ensure tooltip stays on screen vertically
    if (top < 20) top = 20;
    if (top + tooltipRect.height > window.innerHeight - 20) {
      top = window.innerHeight - tooltipRect.height - 20;
    }

    // On mobile, center tooltip
    if (window.innerWidth <= 768) {
      left = (window.innerWidth - tooltipRect.width) / 2;
      top = Math.min(top, window.innerHeight - tooltipRect.height - 100);
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  window.nextOnboardingStep = function() {
    currentOnboardingStep++;
    if (currentOnboardingStep < onboardingSteps.length) {
      showOnboardingStep(currentOnboardingStep);
    } else {
      completeOnboarding();
    }
  };

  window.skipOnboarding = function() {
    completeOnboarding();
  };

  window.completeOnboarding = function() {
    // Remove tooltip
    const tooltip = document.getElementById('onboardingTooltip');
    if (tooltip) {
      tooltip.classList.remove('active');
      setTimeout(() => tooltip.remove(), 300);
    }

    // Remove highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    // Mark as completed
    localStorage.setItem(ONBOARDING_KEY, 'true');
  };

  // Auto-start when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkOnboarding);
  } else {
    checkOnboarding();
  }
})();
