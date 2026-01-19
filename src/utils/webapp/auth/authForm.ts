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

import { checkSession, forgotPassword, login, logout, resetPassword } from './authService';
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
  BACK_TO_LOGIN: '[data-auth="back-to-login"]',

  // Formulaire mot de passe oublié (dans la card reset de la popup)
  FORGOT_FORM: '[data-auth-reset="form"]',
  FORGOT_EMAIL: '[data-auth-reset="email"]',
  FORGOT_SUBMIT: '[data-auth-reset="submit"]',
  FORGOT_ERROR: '[data-auth-reset="error"]',
  FORGOT_SUCCESS: '[data-auth-reset="success"]',
  FORGOT_MESSAGE: '[data-auth-reset="message-reset"]',
  FORGOT_EMAIL_MIRROR: '[data-auth-reset="email-mirror"]',

  // Formulaire nouveau mot de passe (page /reset-password)
  NEW_PASSWORD_FORM: '[data-new-password="form"]',
  NEW_PASSWORD_PASSWORD: '[data-new-password="password"]',
  NEW_PASSWORD_CONFIRM: '[data-new-password="password-confirm"]',
  NEW_PASSWORD_SUBMIT: '[data-new-password="submit"]',
  NEW_PASSWORD_ERROR: '[data-new-password="error"]',
  NEW_PASSWORD_SUCCESS: '[data-new-password="success"]',

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

  // Initialiser le formulaire mot de passe oublié
  initForgotPasswordForm();

  // Initialiser le bouton retour vers login
  initBackToLoginButton();

  // Initialiser le formulaire de nouveau mot de passe (page reset)
  initNewPasswordForm();

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
      animateCardTransition('login', 'forgot');
    });
  });
}

/**
 * Initialise le bouton retour vers login
 */
function initBackToLoginButton(): void {
  const backButtons = document.querySelectorAll<HTMLElement>(SELECTORS.BACK_TO_LOGIN);

  backButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      animateCardTransition('forgot', 'login');
    });
  });
}

// ============================================
// Forgot Password Form
// ============================================

/**
 * Initialise le formulaire mot de passe oublié (dans la card reset de la popup)
 */
function initForgotPasswordForm(): void {
  // Chercher le formulaire dans la card reset (c'est le formulaire "mot de passe oublié")
  const resetCard = document.querySelector<HTMLElement>(SELECTORS.CARD_RESET);
  if (!resetCard) return;

  // Stratégie 1: Chercher avec l'attribut data-auth-reset="form"
  let form = resetCard.querySelector<HTMLFormElement>(SELECTORS.FORGOT_FORM);

  // Stratégie 2: Chercher n'importe quel formulaire dans la card
  if (!form) {
    form = resetCard.querySelector<HTMLFormElement>('form');
  }

  if (!form) return;

  const emailInput =
    form.querySelector<HTMLInputElement>(SELECTORS.FORGOT_EMAIL) ||
    form.querySelector<HTMLInputElement>('input[type="email"]') ||
    form.querySelector<HTMLInputElement>('input[name="email"]');

  const submitButton =
    form.querySelector<HTMLButtonElement>(SELECTORS.FORGOT_SUBMIT) ||
    form.querySelector<HTMLButtonElement>('input[type="submit"]') ||
    form.querySelector<HTMLButtonElement>('button[type="submit"]') ||
    form.querySelector<HTMLButtonElement>('button');

  const errorElement =
    form.querySelector<HTMLElement>(SELECTORS.FORGOT_ERROR) ||
    resetCard.querySelector<HTMLElement>(SELECTORS.FORGOT_ERROR) ||
    form.parentElement?.querySelector<HTMLElement>('.w-form-fail');

  const successElement =
    form.querySelector<HTMLElement>(SELECTORS.FORGOT_SUCCESS) ||
    resetCard.querySelector<HTMLElement>(SELECTORS.FORGOT_SUCCESS) ||
    form.parentElement?.querySelector<HTMLElement>('.w-form-done');

  // Message de succès personnalisé (data-auth-reset="message-reset")
  const messageElement = resetCard.querySelector<HTMLElement>(SELECTORS.FORGOT_MESSAGE);

  // Élément miroir pour afficher l'email soumis
  const emailMirrorElement = resetCard.querySelector<HTMLElement>(SELECTORS.FORGOT_EMAIL_MIRROR);

  // Cacher l'erreur, succès et message par défaut
  hideError(errorElement);
  if (successElement) successElement.style.display = 'none';
  if (messageElement) messageElement.style.display = 'none';

  // Cacher l'erreur quand l'utilisateur tape
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      hideError(errorElement);
      if (successElement) successElement.style.display = 'none';
    });
  }

  // Intercepter la soumission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const email = emailInput?.value?.trim() || '';

    if (!email) {
      showError(errorElement, 'Veuillez entrer votre email.');
      return;
    }

    // Désactiver le bouton
    if (submitButton) {
      submitButton.setAttribute('disabled', 'true');
      submitButton.style.opacity = '0.6';
      submitButton.style.cursor = 'wait';
    }

    try {
      const result = await forgotPassword(email);

      if (result.success) {
        // Masquer le formulaire et afficher le message de succès
        hideError(errorElement);
        form.style.display = 'none';

        // Afficher l'email soumis dans le miroir
        if (emailMirrorElement) {
          emailMirrorElement.textContent = email;
        }

        // Afficher le message personnalisé (data-auth-reset="message-reset")
        if (messageElement) {
          messageElement.style.setProperty('display', 'block', 'important');
        }

        // Afficher aussi l'élément de succès Webflow si présent
        if (successElement) {
          successElement.style.setProperty('display', 'block', 'important');
        }
      } else {
        showError(errorElement, result.error || 'Une erreur est survenue. Veuillez réessayer.');
      }
    } catch (error) {
      showError(errorElement, 'Une erreur est survenue. Veuillez réessayer.');
      console.error('Forgot password error:', error);
    } finally {
      if (submitButton) {
        submitButton.removeAttribute('disabled');
        submitButton.style.opacity = '';
        submitButton.style.cursor = '';
      }
    }
  });
}

// ============================================
// Reset Password Form (page /reset-password)
// ============================================

/**
 * Initialise le formulaire de nouveau mot de passe
 */
function initNewPasswordForm(): void {
  // Vérifier qu'on est sur la page reset-password
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) return; // Pas de token, pas de formulaire à initialiser

  // Chercher le formulaire
  let form = document.querySelector<HTMLFormElement>(SELECTORS.NEW_PASSWORD_FORM);

  // Fallback: chercher n'importe quel formulaire sur la page
  if (!form) {
    form = document.querySelector<HTMLFormElement>('form');
  }

  if (!form) return;

  const passwordInput =
    form.querySelector<HTMLInputElement>(SELECTORS.NEW_PASSWORD_PASSWORD) ||
    form.querySelector<HTMLInputElement>('input[type="password"]') ||
    form.querySelector<HTMLInputElement>('input[name="password"]');

  const confirmInput =
    form.querySelector<HTMLInputElement>(SELECTORS.NEW_PASSWORD_CONFIRM) ||
    form.querySelectorAll<HTMLInputElement>('input[type="password"]')[1];

  const submitButton =
    form.querySelector<HTMLButtonElement>(SELECTORS.NEW_PASSWORD_SUBMIT) ||
    form.querySelector<HTMLButtonElement>('input[type="submit"]') ||
    form.querySelector<HTMLButtonElement>('button[type="submit"]') ||
    form.querySelector<HTMLButtonElement>('button');

  const errorElement =
    document.querySelector<HTMLElement>(SELECTORS.NEW_PASSWORD_ERROR) ||
    form.parentElement?.querySelector<HTMLElement>('.w-form-fail');

  const successElement =
    document.querySelector<HTMLElement>(SELECTORS.NEW_PASSWORD_SUCCESS) ||
    form.parentElement?.querySelector<HTMLElement>('.w-form-done');

  // Cacher erreur et succès par défaut
  hideError(errorElement);
  if (successElement) successElement.style.display = 'none';

  // Cacher l'erreur quand l'utilisateur tape
  if (passwordInput) {
    passwordInput.addEventListener('input', () => hideError(errorElement));
  }
  if (confirmInput) {
    confirmInput.addEventListener('input', () => hideError(errorElement));
  }

  // Intercepter la soumission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const password = passwordInput?.value || '';
    const confirmPassword = confirmInput?.value || '';

    // Validation
    if (!password) {
      showError(errorElement, 'Veuillez entrer un mot de passe.');
      return;
    }

    if (confirmInput && password !== confirmPassword) {
      showError(errorElement, 'Les mots de passe ne correspondent pas.');
      return;
    }

    // Validation du mot de passe (min 8 caractères, 1 majuscule, 1 chiffre, 1 spécial)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      showError(
        errorElement,
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.'
      );
      return;
    }

    // Désactiver le bouton
    if (submitButton) {
      submitButton.setAttribute('disabled', 'true');
      submitButton.style.opacity = '0.6';
      submitButton.style.cursor = 'wait';
    }

    try {
      const result = await resetPassword(token, password);

      if (result.success) {
        // Masquer le formulaire et afficher le succès
        hideError(errorElement);
        form.style.display = 'none';
        if (successElement) {
          successElement.style.setProperty('display', 'block', 'important');
          successElement.textContent =
            'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.';
        }
      } else {
        showError(
          errorElement,
          result.error || 'Le lien de réinitialisation est invalide ou a expiré.'
        );
      }
    } catch (error) {
      showError(errorElement, 'Une erreur est survenue. Veuillez réessayer.');
      console.error('Reset password error:', error);
    } finally {
      if (submitButton) {
        submitButton.removeAttribute('disabled');
        submitButton.style.opacity = '';
        submitButton.style.cursor = '';
      }
    }
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
    // Forward: login→logged, login→forgot, forgot→reset
    // Backward: logged→login, forgot→login, reset→forgot
    const forwardTransitions = ['login-logged', 'login-forgot', 'forgot-reset'];
    const transitionKey = `${from}-${to}`;
    const isForward = forwardTransitions.includes(transitionKey);
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
