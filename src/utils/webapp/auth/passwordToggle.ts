/**
 * Password Visibility Toggle
 * Permet d'afficher/masquer les mots de passe avec des icônes interactives
 */

/**
 * Initialise le toggle de visibilité pour tous les champs de mot de passe
 * Utilise l'attribut ms-code-password="transform" pour cibler les wrappers d'icônes
 */
export function initPasswordToggle(): void {
  // Sélectionner tous les wrappers d'icônes avec l'attribut ms-code-password
  const toggleWrappers = document.querySelectorAll<HTMLElement>('[ms-code-password="transform"]');

  if (toggleWrappers.length === 0) {
    // console.warn('Aucun wrapper de toggle de mot de passe trouvé');
    return;
  }

  toggleWrappers.forEach((wrapper) => {
    setupPasswordToggle(wrapper);
  });

  // console.log(`✅ ${toggleWrappers.length} toggle(s) de mot de passe initialisé(s)`);
}

/**
 * Configure un toggle de visibilité pour un wrapper spécifique
 */
function setupPasswordToggle(wrapper: HTMLElement): void {
  // Trouver l'input de mot de passe associé
  const container = wrapper.closest('.form_input-relative');
  if (!container) {
    console.error('Container .form_input-relative non trouvé pour', wrapper);
    return;
  }

  const passwordInput = container.querySelector<HTMLInputElement>(
    'input[type="password"], input[data-auth="password"]'
  );

  if (!passwordInput) {
    console.error('Input de mot de passe non trouvé dans', container);
    return;
  }

  // Trouver les icônes
  const showIcon = wrapper.querySelector<HTMLElement>('.form_eye-show');
  const hideIcon = wrapper.querySelector<HTMLElement>('.form_eye-close');

  if (!showIcon || !hideIcon) {
    console.error('Icônes .form_eye-show ou .form_eye-close non trouvées dans', wrapper);
    return;
  }

  // État initial : mot de passe masqué
  setPasswordVisibility(passwordInput, showIcon, hideIcon, false);

  // Ajouter le curseur pointer sur le wrapper
  wrapper.style.cursor = 'pointer';

  // Event listener pour le toggle
  wrapper.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isCurrentlyVisible = passwordInput.type === 'text';
    setPasswordVisibility(passwordInput, showIcon, hideIcon, !isCurrentlyVisible);
  });
}

/**
 * Change la visibilité du mot de passe et met à jour les icônes
 */
function setPasswordVisibility(
  input: HTMLInputElement,
  showIcon: HTMLElement,
  hideIcon: HTMLElement,
  visible: boolean
): void {
  if (visible) {
    // Afficher le mot de passe
    input.type = 'text';
    showIcon.style.display = 'none';
    hideIcon.style.display = 'block';
  } else {
    // Masquer le mot de passe
    input.type = 'password';
    showIcon.style.display = 'block';
    hideIcon.style.display = 'none';
  }
}

/**
 * Réinitialise tous les champs de mot de passe en mode masqué
 * Utile après la soumission d'un formulaire
 */
export function resetPasswordVisibility(): void {
  const toggleWrappers = document.querySelectorAll<HTMLElement>('[ms-code-password="transform"]');

  toggleWrappers.forEach((wrapper) => {
    const container = wrapper.closest('.form_input-relative');
    if (!container) return;

    const passwordInput = container.querySelector<HTMLInputElement>(
      'input[type="text"], input[type="password"]'
    );
    const showIcon = wrapper.querySelector<HTMLElement>('.form_eye-show');
    const hideIcon = wrapper.querySelector<HTMLElement>('.form_eye-close');

    if (passwordInput && showIcon && hideIcon) {
      setPasswordVisibility(passwordInput, showIcon, hideIcon, false);
    }
  });
}
