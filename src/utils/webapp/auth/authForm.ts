/**
 * Auth Form Handler
 *
 * Gère la soumission du formulaire d'authentification Webflow
 * - Intercepte le submit du formulaire
 * - Appelle l'API de login
 * - Affiche les erreurs / succès
 * - Met à jour l'UI selon l'état de connexion
 */

import gsap from 'gsap';

import { checkSession, login, logout } from './authService';
import { getStoredUser, isAuthenticated, onAuthEvent } from './authState';

// ============================================
// Selectors
// ============================================

const SELECTORS = {
  // Formulaire de connexion
  AUTH_FORM: '[data-auth="form"]',
  EMAIL_INPUT: '[data-auth="email"]',
  PASSWORD_INPUT: '[data-auth="password"]',
  SUBMIT_BUTTON: '[data-auth="submit"]',
  ERROR_MESSAGE: '[data-auth="error"]',

  // États du formulaire Webflow (fallback)
  FORM_SUCCESS: '.w-form-done',
  FORM_ERROR: '.w-form-fail',

  // Composant auth global
  AUTH_COMPONENT: '.auth_component',
  AUTH_CARDS: '.auth_cards',

  // Cards dans le composant auth
  CARD_LOGIN: '[data-auth-card="login"]',
  CARD_LOGGED: '[data-auth-card="logged"]',
  CARD_FORGOT: '[data-auth-card="forgot"]',
  CARD_RESET: '[data-auth-card="reset"]',

  // Infos utilisateur
  USER_NAME: '[data-user="name"]',
  USER_EMAIL: '[data-user="email"]',
  USER_COMPANY: '[data-user="company"]',

  // Actions
  LOGOUT_BUTTON: '[data-auth="logout"]',
  FORGOT_LINK: '[data-auth="forgot-link"]',

  // Éléments à afficher/masquer selon l'état d'auth
  SHOW_IF_LOGGED: '[data-auth-show="logged"]',
  HIDE_IF_LOGGED: '[data-auth-hide="logged"]',
} as const;

// ============================================
// Form Initialization
// ============================================

/**
 * Initialise le formulaire d'authentification
 */
export function initAuthForm(): void {
  // console.log('[FTO Auth] Initializing auth form...');

  // Initialiser le formulaire de login
  initLoginForm();

  // Initialiser le bouton de déconnexion
  initLogoutButton();

  // Initialiser le lien mot de passe oublié
  initForgotPasswordLink();

  // Écouter les événements d'authentification pour mettre à jour l'UI
  setupAuthListeners();

  // Vérifier l'état initial et mettre à jour l'UI
  updateUIBasedOnAuthState();

  // Vérifier la session au chargement
  checkSession().then((user) => {
    if (user) {
      // console.log('[FTO Auth] Session restored for:', user.email);
      updateUIBasedOnAuthState();
    }
  });
}

// ============================================
// Login Form
// ============================================

/**
 * Initialise le formulaire de login
 */
function initLoginForm(): void {
  // Stratégie 1: Chercher avec l'attribut data-auth="form"
  let form = document.querySelector<HTMLFormElement>(SELECTORS.AUTH_FORM);

  // Stratégie 2: Chercher le formulaire Webflow par son nom
  if (!form) {
    form = document.querySelector<HTMLFormElement>('form[name="Auth Form"]');
  }

  // Stratégie 3: Chercher dans le composant .auth_component
  if (!form) {
    const authComponent = document.querySelector('.auth_component');
    if (authComponent) {
      form = authComponent.querySelector<HTMLFormElement>('form');
    }
  }

  // Stratégie 4: Chercher n'importe quel formulaire avec un input password
  if (!form) {
    const passwordInputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]');
    for (const input of passwordInputs) {
      const parentForm = input.closest('form');
      if (parentForm) {
        form = parentForm as HTMLFormElement;
        break;
      }
    }
  }

  if (form) {
    // console.log('[FTO Auth] Form found:', form);
    setupLoginForm(form);
  } else {
    // console.warn('[FTO Auth] No login form found on this page');
  }
}

/**
 * Configure le formulaire de login
 */
function setupLoginForm(form: HTMLFormElement): void {
  // Trouver les inputs
  const emailInput =
    form.querySelector<HTMLInputElement>(SELECTORS.EMAIL_INPUT) ||
    form.querySelector<HTMLInputElement>('input[type="email"]') ||
    form.querySelector<HTMLInputElement>('input[name="email"]') ||
    form.querySelector<HTMLInputElement>('input:first-of-type');

  const passwordInput =
    form.querySelector<HTMLInputElement>(SELECTORS.PASSWORD_INPUT) ||
    form.querySelector<HTMLInputElement>('input[type="password"]') ||
    form.querySelector<HTMLInputElement>('input[name="password"]');

  const submitButton =
    form.querySelector<HTMLButtonElement>(SELECTORS.SUBMIT_BUTTON) ||
    form.querySelector<HTMLButtonElement>('input[type="submit"]') ||
    form.querySelector<HTMLButtonElement>('button[type="submit"]') ||
    form.querySelector<HTMLButtonElement>('button');

  const errorElement =
    form.querySelector<HTMLElement>(SELECTORS.ERROR_MESSAGE) ||
    form.parentElement?.querySelector<HTMLElement>(SELECTORS.FORM_ERROR);

  // Cacher l'élément d'erreur par défaut
  hideError(errorElement);

  // console.log('[FTO Auth] Setting up form with:', {
  //   emailInput: !!emailInput,
  //   passwordInput: !!passwordInput,
  //   submitButton: !!submitButton,
  //   errorElement: !!errorElement,
  // });

  // Cacher l'erreur quand l'utilisateur commence à taper
  if (emailInput) {
    emailInput.addEventListener('input', () => hideError(errorElement));
  }
  if (passwordInput) {
    passwordInput.addEventListener('input', () => hideError(errorElement));
  }

  // Intercepter la soumission du formulaire
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // console.log('[FTO Auth] Form submitted!');

    // Récupérer les valeurs
    const email = emailInput?.value?.trim() || '';
    const password = passwordInput?.value || '';

    // Ne pas logger les credentials, même partiellement
    // console.log('[FTO Auth] Attempting login for:', email.substring(0, 3) + '***');

    // Validation basique
    if (!email || !password) {
      showError(errorElement, 'Veuillez remplir tous les champs.');
      return;
    }

    // Désactiver le bouton pendant la requête
    if (submitButton) {
      submitButton.setAttribute('disabled', 'true');
      submitButton.style.opacity = '0.6';
      submitButton.style.cursor = 'wait';

      try {
        const result = await login({ email, password });

        if (result.success && result.data) {
          // Succès : masquer l'erreur
          hideError(errorElement);

          // Mettre à jour l'UI avec les infos utilisateur
          updateUserInfo(result.data);

          // Animer la transition login → logged
          await animateCardTransition('login', 'logged');

          // Mettre à jour les éléments show/hide
          updateShowHideElements();
        } else {
          // Erreur : afficher le message
          showError(errorElement, result.error || 'Identifiants incorrects');
        }
      } catch (error) {
        showError(errorElement, 'Une erreur est survenue. Veuillez réessayer.');
        console.error('Login error:', error);
      } finally {
        // Réactiver le bouton
        submitButton.removeAttribute('disabled');
        submitButton.style.opacity = '';
        submitButton.style.cursor = '';
      }
    }
  });
}

// ============================================
// Logout
// ============================================

/**
 * Initialise le bouton de déconnexion
 */
function initLogoutButton(): void {
  const logoutButtons = document.querySelectorAll<HTMLElement>(SELECTORS.LOGOUT_BUTTON);

  logoutButtons.forEach((button) => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();

      button.setAttribute('disabled', 'true');
      button.style.opacity = '0.6';
      button.style.cursor = 'wait';

      try {
        await logout();

        // Animer la transition logged → login
        await animateCardTransition('logged', 'login');

        // Mettre à jour les éléments show/hide
        updateShowHideElements();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        button.removeAttribute('disabled');
        button.style.opacity = '';
        button.style.cursor = '';
      }
    });
  });
}

// ============================================
// Forgot Password
// ============================================

/**
 * Initialise le lien mot de passe oublié
 */
function initForgotPasswordLink(): void {
  const forgotLinks = document.querySelectorAll<HTMLElement>(SELECTORS.FORGOT_LINK);

  forgotLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showCard('forgot');
    });
  });
}

// ============================================
// UI Updates
// ============================================

/**
 * Met à jour les éléments show/hide selon l'état d'auth
 */
function updateShowHideElements(): void {
  const isLoggedIn = isAuthenticated();

  // Éléments à afficher si connecté
  const showIfLogged = document.querySelectorAll<HTMLElement>(SELECTORS.SHOW_IF_LOGGED);
  showIfLogged.forEach((el) => {
    if (isLoggedIn) {
      el.style.setProperty('display', 'block', 'important');
    } else {
      el.style.setProperty('display', 'none', 'important');
    }
  });

  // Éléments à masquer si connecté
  const hideIfLogged = document.querySelectorAll<HTMLElement>(SELECTORS.HIDE_IF_LOGGED);
  hideIfLogged.forEach((el) => {
    if (isLoggedIn) {
      el.style.setProperty('display', 'none', 'important');
    } else {
      el.style.setProperty('display', 'block', 'important');
    }
  });
}

/**
 * Met à jour l'UI en fonction de l'état d'authentification
 */
function updateUIBasedOnAuthState(): void {
  const isLoggedIn = isAuthenticated();

  // console.log('[FTO Auth] Updating UI, isLoggedIn:', isLoggedIn);

  // Mettre à jour les éléments show/hide
  updateShowHideElements();

  // Afficher la bonne card dans le composant auth (sans animation au chargement)
  if (isLoggedIn) {
    showCard('logged');
    const user = getStoredUser();
    if (user) {
      updateUserInfo(user);
    }
  } else {
    showCard('login');
  }
}

// Track current card for animations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let currentCard: 'login' | 'logged' | 'forgot' | 'reset' = 'login';

/**
 * Affiche une card spécifique dans le composant auth (sans animation)
 */
function showCard(cardType: 'login' | 'logged' | 'forgot' | 'reset'): void {
  const cards = {
    login: document.querySelector<HTMLElement>(SELECTORS.CARD_LOGIN),
    logged: document.querySelector<HTMLElement>(SELECTORS.CARD_LOGGED),
    forgot: document.querySelector<HTMLElement>(SELECTORS.CARD_FORGOT),
    reset: document.querySelector<HTMLElement>(SELECTORS.CARD_RESET),
  };

  // Masquer toutes les cards
  Object.values(cards).forEach((card) => {
    if (card) {
      card.style.display = 'none';
      gsap.set(card, { xPercent: 0, opacity: 1 });
    }
  });

  // Afficher la card demandée
  const targetCard = cards[cardType];
  if (targetCard) {
    targetCard.style.display = '';
  }

  // Cacher les erreurs quand on change de card
  const errorElements = document.querySelectorAll<HTMLElement>(SELECTORS.ERROR_MESSAGE);
  errorElements.forEach((el) => {
    el.style.display = 'none';
  });

  currentCard = cardType;
}

/**
 * Anime la transition entre deux cards (slide effect séquentiel)
 */
function animateCardTransition(
  from: 'login' | 'logged' | 'forgot' | 'reset',
  to: 'login' | 'logged' | 'forgot' | 'reset'
): Promise<void> {
  return new Promise((resolve) => {
    const cards = {
      login: document.querySelector<HTMLElement>(SELECTORS.CARD_LOGIN),
      logged: document.querySelector<HTMLElement>(SELECTORS.CARD_LOGGED),
      forgot: document.querySelector<HTMLElement>(SELECTORS.CARD_FORGOT),
      reset: document.querySelector<HTMLElement>(SELECTORS.CARD_RESET),
    };

    const fromCard = cards[from];
    const toCard = cards[to];

    if (!fromCard || !toCard) {
      showCard(to);
      resolve();
      return;
    }

    // Cacher les erreurs
    const errorElements = document.querySelectorAll<HTMLElement>(SELECTORS.ERROR_MESSAGE);
    errorElements.forEach((el) => {
      el.style.display = 'none';
    });

    // Déterminer la direction du slide
    // Login → Logged : slide vers la gauche (sortie -30, entrée +30)
    // Logged → Login : slide vers la droite (sortie +30, entrée -30)
    const isForward = from === 'login' && to === 'logged';
    const exitX = isForward ? -30 : 30;
    const enterX = isForward ? 30 : -30;

    // Préparer la card entrante AVANT l'animation (invisible mais prête)
    gsap.set(toCard, {
      display: 'flex',
      opacity: 0,
      xPercent: enterX,
      visibility: 'hidden', // Vraiment invisible
    });

    // Timeline séquentielle
    const tl = gsap.timeline({
      onComplete: () => {
        currentCard = to;
        resolve();
      },
    });

    // 1. Animer la card sortante
    tl.to(fromCard, {
      xPercent: exitX,
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        // Cacher et reset la card sortante
        gsap.set(fromCard, { display: 'none', xPercent: 0, opacity: 1 });
      },
    });

    // 2. Rendre visible et animer la card entrante
    tl.set(toCard, { visibility: 'visible' });

    tl.to(toCard, {
      xPercent: 0,
      opacity: 1,
      duration: 0.25,
      ease: 'power2.out',
    });
  });
}

/**
 * Met à jour les informations utilisateur dans l'UI
 */
function updateUserInfo(user: { name: string; email: string; company_name?: string }): void {
  // Nom
  const nameElements = document.querySelectorAll<HTMLElement>(SELECTORS.USER_NAME);
  nameElements.forEach((el) => {
    el.textContent = user.name;
  });

  // Email
  const emailElements = document.querySelectorAll<HTMLElement>(SELECTORS.USER_EMAIL);
  emailElements.forEach((el) => {
    el.textContent = user.email;
  });

  // Entreprise
  if (user.company_name) {
    const companyElements = document.querySelectorAll<HTMLElement>(SELECTORS.USER_COMPANY);
    companyElements.forEach((el) => {
      el.textContent = user.company_name || '';
    });
  }
}

// ============================================
// Error / Success Handling
// ============================================

/**
 * Affiche un message d'erreur
 */
function showError(element: HTMLElement | null | undefined, message: string): void {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  } else {
    // Fallback: chercher l'élément .w-form-fail de Webflow
    const webflowError = document.querySelector<HTMLElement>(SELECTORS.FORM_ERROR);
    if (webflowError) {
      webflowError.textContent = message;
      webflowError.style.display = 'block';
    }
  }
}

/**
 * Masque le message d'erreur
 */
function hideError(element: HTMLElement | null | undefined): void {
  if (element) {
    element.style.display = 'none';
  }
}

/**
 * Affiche l'état de succès après connexion
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function showSuccessState(form: HTMLFormElement): void {
  // Masquer le formulaire
  form.style.display = 'none';

  // Afficher le message de succès Webflow
  const successElement = form.parentElement?.querySelector<HTMLElement>(SELECTORS.FORM_SUCCESS);
  if (successElement) {
    successElement.style.display = 'block';
  }
}

// ============================================
// Auth Event Listeners
// ============================================

/**
 * Configure les écouteurs d'événements d'authentification
 */
function setupAuthListeners(): void {
  onAuthEvent('auth:logged-in', () => {
    updateUIBasedOnAuthState();
  });

  onAuthEvent('auth:logged-out', () => {
    updateUIBasedOnAuthState();
  });

  onAuthEvent('auth:user-updated', () => {
    const user = getStoredUser();
    if (user) {
      updateUserInfo(user);
    }
  });
}

// ============================================
// Export
// ============================================

export default initAuthForm;
