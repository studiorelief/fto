/**
 * Slide Animation Login ↔ Reset
 *
 * Animation de type tab avec effet de slide entre les cards login et reset.
 * - Click sur data-animation="reset" → Slide vers la card reset
 * - Click sur data-animation="login" → Slide vers la card login
 */

import gsap from 'gsap';

// ============================================
// Selectors
// ============================================

const SELECTORS = {
  ANIMATION_RESET: '[data-animation="reset"]',
  ANIMATION_LOGIN: '[data-animation="login"]',
  CARD_LOGIN: '[data-auth-card="login"]',
  CARD_RESET: '[data-auth-card="reset"]',
} as const;

// ============================================
// Types
// ============================================

type CardType = 'login' | 'reset';

// ============================================
// State
// ============================================

let currentCard: CardType = 'login';
let isAnimating = false;

// ============================================
// Animation
// ============================================

/**
 * Anime la transition entre les cards login et reset
 */
function animateSlide(to: CardType): void {
  if (isAnimating || currentCard === to) return;

  const loginCard = document.querySelector<HTMLElement>(SELECTORS.CARD_LOGIN);
  const resetCard = document.querySelector<HTMLElement>(SELECTORS.CARD_RESET);

  if (!loginCard || !resetCard) {
    return;
  }

  isAnimating = true;

  const fromCard = to === 'reset' ? loginCard : resetCard;
  const toCard = to === 'reset' ? resetCard : loginCard;

  // Direction du slide
  // reset: fromCard sort vers la gauche, toCard entre par la droite
  // login: fromCard sort vers la droite, toCard entre par la gauche
  const isGoingToReset = to === 'reset';
  const exitX = isGoingToReset ? -100 : 100; // Login sort à gauche, Reset sort à droite
  const enterX = isGoingToReset ? 100 : -100; // Reset entre par la droite, Login entre par la gauche

  // Nettoyer les animations en cours
  gsap.killTweensOf(fromCard);
  gsap.killTweensOf(toCard);

  // S'assurer que toCard est caché pendant l'animation de sortie
  gsap.set(toCard, {
    display: 'none',
    clearProps: 'transform,opacity',
  });

  // Forcer l'état initial de la card sortante
  gsap.set(fromCard, {
    clearProps: 'transform',
  });
  gsap.set(fromCard, {
    xPercent: 0,
    opacity: 1,
    display: 'flex',
    visibility: 'visible',
  });

  // Timeline séquentielle
  const tl = gsap.timeline({
    onComplete: () => {
      currentCard = to;
      isAnimating = false;
    },
  });

  // 1. Animer la card sortante (slide out + fade out)
  tl.fromTo(
    fromCard,
    {
      xPercent: 0,
      opacity: 1,
    },
    {
      xPercent: exitX,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.inOut',
      onComplete: () => {
        // Cacher la card sortante APRÈS l'animation
        gsap.set(fromCard, {
          display: 'none',
          clearProps: 'transform,opacity',
        });
      },
    }
  );

  // 2. Préparer et animer la card entrante (APRÈS que fromCard soit cachée)
  tl.set(toCard, {
    display: 'flex',
    visibility: 'visible',
    opacity: 0,
    xPercent: enterX,
  });

  tl.fromTo(
    toCard,
    {
      xPercent: enterX,
      opacity: 0,
    },
    {
      xPercent: 0,
      opacity: 1,
      duration: 0.3,
      ease: 'power2.inOut',
    }
  );
}

// ============================================
// Initialization
// ============================================

/**
 * Initialise les event listeners pour les animations de slide
 */
export function initSlideLoginReset(): void {
  // Boutons pour aller vers reset
  const resetButtons = document.querySelectorAll<HTMLElement>(SELECTORS.ANIMATION_RESET);
  resetButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      animateSlide('reset');
    });
  });

  // Boutons pour aller vers login
  const loginButtons = document.querySelectorAll<HTMLElement>(SELECTORS.ANIMATION_LOGIN);
  loginButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      animateSlide('login');
    });
  });

  // Initialisation : s'assurer que la card login est visible et reset cachée
  const loginCard = document.querySelector<HTMLElement>(SELECTORS.CARD_LOGIN);
  const resetCard = document.querySelector<HTMLElement>(SELECTORS.CARD_RESET);

  if (loginCard) {
    gsap.set(loginCard, { display: 'flex', opacity: 1, xPercent: 0 });
  }

  if (resetCard) {
    gsap.set(resetCard, { display: 'none', opacity: 1, xPercent: 0 });
  }
}

export default initSlideLoginReset;
