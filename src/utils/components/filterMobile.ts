/* Gestion du filtre hub en mobile avec side nav animé */
/* Supporte plusieurs .hub_side (un par tab) */

let isFilterMobileInitialized = false;

let hubFilterButton: HTMLButtonElement | null = null;
let hubSides: HTMLElement[] = [];
let hubIconOpen: HTMLElement | null = null;
let hubIconClose: HTMLElement | null = null;

/**
 * Récupère le .hub_side actuellement visible (dans le tab actif)
 */
function getVisibleHubSide(): HTMLElement | null {
  for (const hubSide of hubSides) {
    // Méthode 1 : Vérifier si le hub_side est dans un tab Webflow actif
    const tabPane = hubSide.closest('.w-tab-pane');
    if (tabPane) {
      // Webflow ajoute la classe w--tab-active sur le tab pane actif
      if (tabPane.classList.contains('w--tab-active')) {
        return hubSide;
      }
      continue;
    }

    // Méthode 2 : Fallback pour les éléments hors tabs - vérifier la visibilité CSS
    const style = window.getComputedStyle(hubSide);
    if (style.display !== 'none' && hubSide.offsetParent !== null) {
      return hubSide;
    }
  }
  // Fallback : retourner le premier si aucun n'est clairement visible
  return hubSides[0] || null;
}

export function filterMobile() {
  // Éviter d'initialiser plusieurs fois
  if (isFilterMobileInitialized) {
    return;
  }

  // Sélection des éléments
  hubFilterButton = document.querySelector('.hub_filter-button') as HTMLButtonElement | null;
  hubSides = Array.from(document.querySelectorAll('.hub_side')) as HTMLElement[];
  hubIconOpen = document.querySelector('.hub_filter-icon-open') as HTMLElement | null;
  hubIconClose = document.querySelector('.hub_filter-icon-close') as HTMLElement | null;

  if (!hubFilterButton || hubSides.length === 0) {
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
    // Fermer tous les hub_side
    hubSides.forEach((hubSide) => {
      if (initial) {
        hubSide.style.transition = 'none';
      } else {
        hubSide.style.transition = 'transform 0.3s ease-out';
      }
      hubSide.style.transform = 'translateX(100%)';
    });

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

  // État ouvert (ouvre uniquement le hub_side visible)
  function setOpenState() {
    const visibleHubSide = getVisibleHubSide();
    if (!visibleHubSide) return;

    visibleHubSide.style.transition = 'transform 0.3s ease-out';
    visibleHubSide.style.transform = 'translateX(0%)';

    if (hubIconOpen) {
      hubIconOpen.style.display = 'none';
    }
    if (hubIconClose) {
      hubIconClose.style.display = 'flex';
    }

    // Mettre à jour l'état
    isHubOpen = true;
  }

  // Initialisation de l'état : démarrer fermé uniquement en mobile
  if (mobileMediaQuery.matches) {
    setClosedState(true);
  }

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

  // Gérer les changements de breakpoint
  mobileMediaQuery.addEventListener('change', (e) => {
    if (e.matches) {
      // On entre en mobile : fermer tous les hubs sans animation
      setClosedState(true);
    } else {
      // On repasse en desktop : nettoyer les styles inline pour laisser le CSS desktop s'appliquer
      hubSides.forEach((hubSide) => {
        hubSide.style.transform = '';
        hubSide.style.transition = '';
      });

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
