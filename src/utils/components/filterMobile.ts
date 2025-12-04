/* Gestion du filtre hub en mobile avec side nav animé */

let isFilterMobileInitialized = false;

let hubFilterButton: HTMLButtonElement | null = null;
let hubSide: HTMLElement | null = null;
let hubIconOpen: HTMLElement | null = null;
let hubIconClose: HTMLElement | null = null;

export function filterMobile() {
  // Éviter d'initialiser plusieurs fois
  if (isFilterMobileInitialized) {
    return;
  }

  // Sélection des éléments
  hubFilterButton = document.querySelector('.hub_filter-button') as HTMLButtonElement | null;
  hubSide = document.querySelector('.hub_side') as HTMLElement | null;
  hubIconOpen = document.querySelector('.hub_filter-icon-open') as HTMLElement | null;
  hubIconClose = document.querySelector('.hub_filter-icon-close') as HTMLElement | null;

  if (!hubFilterButton || !hubSide) {
    // Éléments nécessaires non trouvés
    return;
  }

  isFilterMobileInitialized = true;

  // Media query pour mobile
  const mobileMediaQuery = window.matchMedia('(max-width: 991px)');

  // Variable pour tracker l'état (démarre fermé)
  let isHubOpen = false;

  // État initial : hub fermé
  function setClosedState(initial = false) {
    if (!hubSide) return;

    // Fermé : translateX 100%
    if (initial) {
      // Pas d'animation pour l'état initial
      hubSide.style.transition = 'none';
    } else {
      hubSide.style.transition = 'transform 0.3s ease-out';
    }
    hubSide.style.transform = 'translateX(100%)';

    // Icônes
    if (hubIconOpen) {
      hubIconOpen.style.display = 'flex';
    }
    if (hubIconClose) {
      hubIconClose.style.display = 'none';
    }

    // Mettre à jour l'état
    isHubOpen = false;
  }

  // État ouvert
  function setOpenState() {
    if (!hubSide) return;

    hubSide.style.transition = 'transform 0.3s ease-out';
    hubSide.style.transform = 'translateX(0%)';

    if (hubIconOpen) {
      hubIconOpen.style.display = 'none';
    }
    if (hubIconClose) {
      hubIconClose.style.display = 'flex';
    }

    // Mettre à jour l'état
    isHubOpen = true;
  }

  // Initialisation de l'état : démarrer fermé
  setClosedState(true);

  // Handler de clic
  function handleFilterClick(e: Event) {
    e.preventDefault();
    e.stopPropagation();

    // Ne fonctionner que sur mobile
    if (!mobileMediaQuery.matches) return;

    if (isHubOpen) {
      setClosedState();
    } else {
      setOpenState();
    }
  }

  hubFilterButton.addEventListener('click', handleFilterClick);

  // Reset quand on repasse en desktop
  mobileMediaQuery.addEventListener('change', (e) => {
    if (!e.matches && hubSide) {
      // Nettoyer les styles inline pour laisser le CSS desktop s'appliquer
      hubSide.style.transform = '';
      hubSide.style.transition = '';

      if (hubIconOpen) {
        hubIconOpen.style.display = '';
      }
      if (hubIconClose) {
        hubIconClose.style.display = '';
      }

      // Remettre l'état à fermé
      isHubOpen = false;
    }
  });
}
