/* Gestion du menu mobile avec side nav animé */

// Variable pour éviter d'initialiser plusieurs fois
let isNavMobileInitialized = false;

// Références aux éléments
let navButton: HTMLElement | null = null;
let navMenu: HTMLElement | null = null;
let navIconOpen: HTMLElement | null = null;
let navIconClose: HTMLElement | null = null;
let navMenuBackground: HTMLElement | null = null;

// Fonction pour fermer le side nav (appelable depuis l'extérieur)
export function closeNavMobile() {
  if (!navButton || !navMenu) {
    return;
  }

  // Ajouter la transition de fermeture
  navMenu.style.transition = 'transform 0.3s ease-out';

  // État fermé : X 100%
  navMenu.style.transform = 'translateX(100%)';

  // Fond : opacité 1 -> 0 en 0.2s
  if (navMenuBackground) {
    navMenuBackground.style.transition = 'opacity 0.2s ease-out';
    navMenuBackground.style.opacity = '0';
  }

  // Retirer la classe is-active du bouton
  navButton.classList.remove('is-active');

  // Gérer les icônes
  if (navIconOpen) {
    navIconOpen.style.display = 'flex';
  }
  if (navIconClose) {
    navIconClose.style.display = 'none';
  }

  // Réactiver le scroll de la page après l'animation
  window.setTimeout(() => {
    document.body.style.overflow = '';
  }, 300);
}

export function navMobile() {
  // Éviter d'initialiser plusieurs fois
  if (isNavMobileInitialized) {
    return;
  }

  // Sélectionner les éléments nécessaires (nouvelles classes)
  navButton = document.querySelector('.nav_mobile-button') as HTMLElement | null;
  navMenu = document.querySelector('.nav_menu') as HTMLElement | null;
  navIconOpen = document.querySelector('.nav_mobile-open') as HTMLElement | null;
  navIconClose = document.querySelector('.nav_mobile-close') as HTMLElement | null;
  navMenuBackground = document.querySelector('.nav_menu-background') as HTMLElement | null;

  if (!navButton || !navMenu) {
    // Éléments nécessaires non trouvés
    return;
  }

  // Marquer comme initialisé
  isNavMobileInitialized = true;

  // Media query pour détecter les écrans < 991px
  const mobileMediaQuery = window.matchMedia('(max-width: 991px)');

  // Fonction pour initialiser l'état mobile (seulement si on est en mobile)
  function initMobileState() {
    if (!navMenu) return;

    // Initialiser la position du menu (caché sur l'axe X)
    navMenu.style.transform = 'translateX(100%)';
    navMenu.style.transition = 'none'; // Pas de transition pour l'état initial

    // Fond : état initial opacité 0
    if (navMenuBackground) {
      navMenuBackground.style.opacity = '0';
      navMenuBackground.style.transition = 'none';
    }

    // État initial des icônes : menu fermé
    if (navIconOpen) {
      navIconOpen.style.display = 'flex';
    }
    if (navIconClose) {
      navIconClose.style.display = 'none';
    }
  }

  // Fonction pour ouvrir le side nav
  function openSideNav() {
    if (!navButton || !navMenu) return;

    // Empêcher le scroll de la page
    document.body.style.overflow = 'hidden';

    // Ajouter la classe is-active immédiatement
    navButton.classList.add('is-active');

    // Gérer les icônes
    if (navIconOpen) {
      navIconOpen.style.display = 'none';
    }
    if (navIconClose) {
      navIconClose.style.display = 'flex';
    }

    // Ajouter la transition
    navMenu.style.transition = 'transform 0.3s ease-out';

    // Fond : opacité 0 -> 1 en 0.4s
    if (navMenuBackground) {
      navMenuBackground.style.transition = 'opacity 0.4s ease-out';
      window.setTimeout(() => {
        if (navMenuBackground) {
          navMenuBackground.style.opacity = '1';
        }
      }, 200);
    }

    // Déclencher l'animation d'ouverture : X 0%
    window.requestAnimationFrame(() => {
      if (navMenu) {
        navMenu.style.display = 'block';
        navMenu.style.transform = 'translateX(0%)';
      }
    });
  }

  // Fonction pour réinitialiser l'état sur desktop
  function resetOnDesktop() {
    if (!navMenu || !navButton) return;

    // Fermer le menu et réinitialiser les styles
    navMenu.style.transform = '';
    navMenu.style.transition = '';
    navButton.classList.remove('is-active');
    document.body.style.overflow = '';

    // Fond : revenir à l'état initial
    if (navMenuBackground) {
      navMenuBackground.style.opacity = '0';
      navMenuBackground.style.transition = '';
    }

    // Icônes : état fermé par défaut
    if (navIconOpen) {
      navIconOpen.style.display = 'flex';
    }
    if (navIconClose) {
      navIconClose.style.display = 'none';
    }
  }

  // Handler du clic sur le bouton
  function handleButtonClick(e: Event) {
    e.preventDefault();
    e.stopPropagation();

    const isActive = navButton?.classList.contains('is-active');

    if (isActive) {
      closeNavMobile();
    } else {
      openSideNav();
    }
  }

  // Fonction pour ajouter les event listeners (seulement sur mobile)
  function addEventListeners() {
    if (navButton && mobileMediaQuery.matches) {
      navButton.addEventListener('click', handleButtonClick);
    }
  }

  // Fonction pour retirer les event listeners
  function removeEventListeners() {
    if (navButton) {
      navButton.removeEventListener('click', handleButtonClick);
    }
  }

  // Initialiser selon la taille d'écran au chargement
  if (mobileMediaQuery.matches) {
    // Si on est en mobile, initialiser l'état mobile
    initMobileState();
    addEventListeners();
  } else {
    // Si on est en desktop, s'assurer que les styles sont propres
    resetOnDesktop();
  }

  // Écouter les changements de taille d'écran
  mobileMediaQuery.addEventListener('change', (e) => {
    if (e.matches) {
      // Si on passe en mobile, initialiser l'état mobile et ajouter les listeners
      initMobileState();
      addEventListeners();
    } else {
      // Si on passe en desktop, retirer les listeners et réinitialiser
      removeEventListeners();
      resetOnDesktop();
    }
  });
}
