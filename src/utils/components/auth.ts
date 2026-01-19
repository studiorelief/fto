import gsap from 'gsap';

/**
 * Animation pour afficher/masquer le composant d'authentification
 *
 * Au clic sur un élément avec [trigger="auth"]:
 * - .auth_component passe de display: none à flex
 * - .auth_cards anime de transformX 100% à 0% en 0.3s
 * - .auth_background anime l'opacité de 0 à 1 en 0.6s
 *
 * Fermeture avec .auth_background, .auth_close ou la touche Escape
 */

// Références globales pour l'ouverture/fermeture programmatique
let _openPopup: (() => void) | null = null;
let _closePopup: (() => void) | null = null;

/**
 * Ouvre le popup d'authentification (peut être appelé depuis d'autres modules)
 */
export function openAuthPopup(): void {
  if (_openPopup) {
    _openPopup();
  }
  // else: Popup not initialized yet - silently ignore
}

/**
 * Ferme le popup d'authentification (peut être appelé depuis d'autres modules)
 */
export function closeAuthPopup(): void {
  if (_closePopup) {
    _closePopup();
  }
}

export const authSide = () => {
  // Récupérer tous les triggers
  const triggers = document.querySelectorAll('[trigger="auth"]');

  if (!triggers.length) {
    return;
  }

  // Récupérer les éléments à animer
  const authComponent = document.querySelector('.auth_component') as HTMLElement;
  const authCards = document.querySelector('.auth_cards') as HTMLElement;
  const authBackground = document.querySelector('.auth_background') as HTMLElement;
  const authClose = document.querySelector('.auth_close') as HTMLElement;

  if (!authComponent) {
    console.error('Element .auth_component not found');
    return;
  }

  // État initial : s'assurer que les éléments sont dans leur état fermé
  if (authComponent) {
    gsap.set(authComponent, { display: 'none' });
  }
  if (authCards) {
    gsap.set(authCards, { xPercent: 100 });
  }
  if (authBackground) {
    gsap.set(authBackground, { opacity: 0 });
  }

  /**
   * Fonction pour ouvrir le popup
   */
  const openPopup = () => {
    // Désactiver le scroll du body
    document.body.style.overflow = 'hidden';

    // Afficher le composant
    if (authComponent) {
      gsap.set(authComponent, { display: 'flex' });
    }

    // Timeline pour orchestrer les animations
    const tl = gsap.timeline();

    // Animer les cartes (0.3s)
    if (authCards) {
      tl.to(
        authCards,
        {
          xPercent: 0,
          duration: 0.3,
          ease: 'power2.out',
        },
        0
      );
    }

    // Animer le background (0.6s)
    if (authBackground) {
      tl.to(
        authBackground,
        {
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
        },
        0
      );
    }
  };

  /**
   * Fonction pour fermer le popup
   */
  const closePopup = () => {
    // Timeline pour orchestrer les animations de fermeture
    document.body.style.overflow = '';

    const tl = gsap.timeline({
      onComplete: () => {
        // Masquer le composant après l'animation
        if (authComponent) {
          gsap.set(authComponent, { display: 'none' });
        }
      },
    });

    // Animer les cartes (0.3s)
    if (authCards) {
      tl.to(
        authCards,
        {
          xPercent: 100,
          duration: 0.3,
          ease: 'power2.in',
        },
        0
      );
    }

    // Animer le background (0.3s)
    if (authBackground) {
      tl.to(
        authBackground,
        {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.in',
        },
        0
      );
    }
  };

  // Exposer les fonctions pour utilisation externe
  _openPopup = openPopup;
  _closePopup = closePopup;

  // Ajouter un event listener sur chaque trigger pour ouvrir
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', openPopup);
  });

  // Fermer avec .auth_background
  if (authBackground) {
    authBackground.addEventListener('click', closePopup);
  }

  // Fermer avec .auth_close
  if (authClose) {
    authClose.addEventListener('click', closePopup);
  }

  // Fermer avec la touche Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authComponent && authComponent.style.display === 'flex') {
      closePopup();
    }
  });
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', authSide);
} else {
  authSide();
}
