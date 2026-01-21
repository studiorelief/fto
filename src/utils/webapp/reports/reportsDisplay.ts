/**
 * Reports Display Component
 * Affiche les rapports Power BI dans la page Webflow
 *
 * Attributs Webflow requis :
 * - [data-reports="list"]      : Container de la liste des rapports
 * - [data-reports="item"]      : Template d'un rapport (sera cloné)
 * - [data-reports="count"]     : Élément affichant le nombre de résultats
 * - [data-reports="empty"]     : Message "aucun résultat"
 * - [data-reports="loading"]   : État de chargement (shimmer)
 *
 * Dans chaque item :
 * - [data-report="name"]       : Nom du rapport
 * - [data-report="category"]   : Catégorie
 * - [data-report="image"]      : Image (src)
 * - [data-report="link"]       : Lien vers le rapport (href)
 * - [data-report="access"]     : Texte d'accès ("Publique" ou "Membre FTO")
 *
 * Compatible avec Finsweet Attributes V2 :
 * - fs-list-element="wrapper"  : Sur le wrapper
 * - fs-list-element="list"     : Sur data-reports="list"
 * - fs-list-element="item"     : Sur data-reports="item"
 */

// Déclaration pour Finsweet Attributes
declare global {
  interface Window {
    FsAttributes?: unknown;
  }
}

import type { CategoryResponse, ReportResponse } from '../api/types';
import { isAuthenticated } from '../auth';
import { generateReportUrl } from './reportDetail';
import {
  clearAllCache,
  getCategories,
  getFilteredReports,
  type ReportsFilters,
} from './reportsService';

// ============================================
// Selectors
// ============================================

const SELECTORS = {
  // Container principal
  LIST_CONTAINER: '[data-reports="list"]',
  ITEM_TEMPLATE: '[data-reports="item"]',
  COUNT: '[data-reports="count"]',
  EMPTY_STATE: '[data-reports="empty"]',
  LOADING_STATE: '[data-reports="loading"]',

  // Filtres
  FILTER_CATEGORY: '[data-reports-filter="category"]', // Select dropdown
  FILTER_CATEGORIES: '[data-reports-filter="categories"]', // Checkboxes wrapper
  FILTER_CATEGORY_CHECKBOX: '[data-category]', // Individual checkbox with data-category
  FILTER_CATEGORY_TEMPLATE: '[data-reports-filter="category-item"]', // Template checkbox (sera cloné)
  FILTER_CATEGORY_LABEL: '[data-reports-filter=""]', // Label dans le template (attribut vide)
  FILTER_SEARCH: '[data-reports-filter="search"]',
  FILTER_CLEAR: '[data-reports-filter="clear"]',

  // Dans chaque item
  REPORT_NAME: '[data-report="name"]',
  REPORT_CATEGORY: '[data-report="category"]',
  REPORT_IMAGE: '[data-report="image"]',
  REPORT_LINK: '[data-report="link"]',
  REPORT_DATE: '[data-report="date"]',
  REPORT_DESCRIPTION: '[data-report="description"]',
  REPORT_PRIVATE: '[data-reports="private"]', // Badge "Réservé aux membres"
  REPORT_ACCESS: '[data-report="access"]', // Texte "Publique" ou "Membre FTO"
} as const;

// ============================================
// State
// ============================================

let itemTemplate: HTMLElement | null = null;
let checkboxTemplate: HTMLElement | null = null; // Template pour les checkboxes catégories
let currentFilters: ReportsFilters = { active: true };
let selectedCategoryNames: string[] = []; // Pour les checkboxes multichoix
let categories: CategoryResponse[] = [];

// ============================================
// Initialization
// ============================================

/**
 * Initialise l'affichage des rapports
 */
export async function initReportsDisplay(): Promise<void> {
  // console.log('[FTO Reports] Initializing reports display...');

  // Vérifier si on est sur la bonne page
  const listContainer = document.querySelector(SELECTORS.LIST_CONTAINER);
  if (!listContainer) {
    // console.log('[FTO Reports] No reports list found on this page');
    return;
  }

  // Sauvegarder le template (une seule fois)
  if (!itemTemplate) {
    const template = listContainer.querySelector<HTMLElement>(SELECTORS.ITEM_TEMPLATE);
    if (template) {
      itemTemplate = template.cloneNode(true) as HTMLElement;
      // Cacher le template original (ne pas le supprimer pour compatibilité Finsweet)
      template.style.display = 'none';
      template.setAttribute('data-reports', 'template');
    }
  }

  // Initialiser les filtres (une seule fois)
  initFilters();

  // Écouter les événements d'authentification pour refetch
  initAuthEventListeners();

  // Observer les changements de visibilité (pour sync avec Finsweet)
  initVisibilityObserver();

  // Charger les données (accessible même sans authentification)
  await loadAllData();
}

/**
 * Charge toutes les données (catégories + rapports)
 */
async function loadAllData(): Promise<void> {
  // console.log('[FTO Reports] Loading all data...');
  hideEmptyState();

  // Charger les catégories d'abord
  await loadCategories();

  // Charger les rapports
  await loadReports();
}

let authListenersInitialized = false;

/**
 * Écoute les événements d'authentification
 */
function initAuthEventListeners(): void {
  if (authListenersInitialized) return;
  authListenersInitialized = true;

  // Quand l'utilisateur se connecte → vider le cache et refetch (pour avoir les URLs/guids)
  window.addEventListener('auth:tokens-updated', () => {
    // console.log('[FTO Reports] Auth tokens updated, reloading data...');
    clearAllCache(); // Vider le cache pour récupérer les données avec auth
    loadAllData();
  });

  // Quand l'utilisateur se déconnecte → vider le cache et refetch (URLs vides pour non-public)
  window.addEventListener('auth:logged-out', () => {
    // console.log('[FTO Reports] User logged out, reloading data...');
    clearAllCache(); // Vider le cache pour récupérer les données sans auth
    loadAllData();
  });
}

// clearReportsList supprimé - les rapports sont désormais accessibles sans authentification

// ============================================
// Data Loading
// ============================================

/**
 * Charge les catégories pour les filtres
 */
async function loadCategories(): Promise<void> {
  const response = await getCategories();
  if (response.success && response.data) {
    categories = response.data;
    populateCategoryFilter(); // Pour les selects
    populateCategoryCheckboxes(); // Pour les checkboxes
  }
}

/**
 * Charge et affiche les rapports
 */
async function loadReports(): Promise<void> {
  // Construire les filtres avec les catégories checkboxes
  const filtersToApply = {
    ...currentFilters,
    categoryNames: selectedCategoryNames.length > 0 ? selectedCategoryNames : undefined,
  };

  // console.log('[FTO Reports] Loading reports with filters:', filtersToApply);

  // Afficher l'état de chargement
  showLoading();

  try {
    const response = await getFilteredReports(filtersToApply);

    if (response.success && response.data) {
      const reports = response.data;
      // console.log('[FTO Reports] Loaded', reports.length, 'reports');

      renderReports(reports);
      updateCount(reports.length);

      if (reports.length === 0) {
        showEmptyState();
      } else {
        hideEmptyState();
      }
    } else {
      console.error('[FTO Reports] Error loading reports:', response.error);
      showEmptyState('Erreur lors du chargement des rapports');
    }
  } catch (error) {
    console.error('[FTO Reports] Exception loading reports:', error);
    showEmptyState('Erreur lors du chargement des rapports');
  } finally {
    hideLoading();
  }
}

// ============================================
// Rendering
// ============================================

/**
 * Affiche les rapports dans le container
 */
function renderReports(reports: ReportResponse[]): void {
  const container = document.querySelector(SELECTORS.LIST_CONTAINER);
  if (!container || !itemTemplate) return;

  // Vider les items déjà rendus (pas le template original si présent)
  const existingItems = container.querySelectorAll('[data-reports="item-rendered"]');
  existingItems.forEach((item) => item.remove());

  // Créer les éléments pour chaque rapport
  reports.forEach((report) => {
    const item = createReportItem(report);
    if (item) {
      container.appendChild(item);
    }
  });

  // Notifier Finsweet qu'on a mis à jour la liste (si disponible)
  if (typeof window.FsAttributes !== 'undefined') {
    // console.log('[FTO Reports] Notifying Finsweet of list update...');
    // Trigger Finsweet refresh si disponible
    window.dispatchEvent(new CustomEvent('fs-attributes-loaded'));
  }
}

/**
 * Crée un élément de rapport à partir du template
 */
function createReportItem(report: ReportResponse): HTMLElement | null {
  if (!itemTemplate) return null;

  const item = itemTemplate.cloneNode(true) as HTMLElement;

  // Remplir les données
  const nameEl = item.querySelector(SELECTORS.REPORT_NAME);
  if (nameEl) nameEl.textContent = report.name;

  const categoryEl = item.querySelector(SELECTORS.REPORT_CATEGORY);
  if (categoryEl) categoryEl.textContent = report.category_name || 'Non catégorisé';

  const imageEl = item.querySelector<HTMLImageElement>(SELECTORS.REPORT_IMAGE);
  if (imageEl && report.image_url) {
    imageEl.src = report.image_url;
    imageEl.alt = report.name;
  }

  const linkEl = item.querySelector<HTMLAnchorElement>(SELECTORS.REPORT_LINK);
  if (linkEl) {
    // Logique de cliquabilité selon auth et statut public
    const userAuthenticated = isAuthenticated();
    const isClickable = report.public || userAuthenticated;

    if (isClickable) {
      // Rapport cliquable : générer l'URL vers la page de détail
      linkEl.href = generateReportUrl(report);
      linkEl.style.pointerEvents = '';
      linkEl.style.cursor = '';
    } else {
      // Rapport privé + non connecté : désactiver le lien
      linkEl.removeAttribute('href');
      linkEl.style.pointerEvents = 'none';
      linkEl.style.cursor = 'default';
    }
  }

  // Gérer le badge "Réservé aux membres" (visible si public: false)
  const privateEl = item.querySelector<HTMLElement>(SELECTORS.REPORT_PRIVATE);
  if (privateEl) {
    privateEl.style.display = report.public ? 'none' : '';
  }

  // Afficher le texte d'accès (Publique ou Membre FTO)
  const accessEl = item.querySelector<HTMLElement>(SELECTORS.REPORT_ACCESS);
  if (accessEl) {
    const accessText = report.public ? 'Publique' : 'Membre FTO';
    accessEl.textContent = accessText;
    accessEl.setAttribute('fs-list-value', accessText);
  }

  // Rendre l'élément visible (au cas où le template était caché)
  item.style.display = '';

  // IMPORTANT: Garder les attributs Finsweet pour la compatibilité
  // On change juste data-reports en data-reports-item pour éviter les conflits
  item.setAttribute('data-reports', 'item-rendered');

  return item;
}

// ============================================
// Filters
// ============================================

/**
 * Initialise les filtres
 */
function initFilters(): void {
  // Filtre par catégorie (select dropdown)
  const categoryFilter = document.querySelector<HTMLSelectElement>(SELECTORS.FILTER_CATEGORY);
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      const { value } = e.target as HTMLSelectElement;
      currentFilters.categoryId = value ? parseInt(value, 10) : undefined;
      loadReports();
    });
  }

  // Filtre par catégories (checkboxes multichoix)
  const categoriesWrapper = document.querySelector(SELECTORS.FILTER_CATEGORIES);
  if (categoriesWrapper) {
    const checkboxes = categoriesWrapper.querySelectorAll<HTMLInputElement>(
      `${SELECTORS.FILTER_CATEGORY_CHECKBOX}`
    );

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        updateSelectedCategories();
        loadReports();
      });
    });

    // console.log('[FTO Reports] Found', checkboxes.length, 'category checkboxes');
  }

  // Filtre par recherche
  const searchFilter = document.querySelector<HTMLInputElement>(SELECTORS.FILTER_SEARCH);
  if (searchFilter) {
    let debounceTimer: ReturnType<typeof setTimeout>;
    searchFilter.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentFilters.search = (e.target as HTMLInputElement).value || undefined;
        loadReports();
      }, 300);
    });
  }

  // Bouton effacer les filtres
  const clearBtn = document.querySelectorAll(SELECTORS.FILTER_CLEAR);
  clearBtn.forEach((btn) => {
    btn.addEventListener('click', () => {
      clearFilters();
    });
  });
}

/**
 * Met à jour la liste des catégories sélectionnées (checkboxes)
 */
function updateSelectedCategories(): void {
  const categoriesWrapper = document.querySelector(SELECTORS.FILTER_CATEGORIES);
  if (!categoriesWrapper) return;

  const checkboxes = categoriesWrapper.querySelectorAll<HTMLInputElement>(
    `${SELECTORS.FILTER_CATEGORY_CHECKBOX}`
  );

  selectedCategoryNames = [];

  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      const categoryName = checkbox.getAttribute('data-category');
      if (categoryName) {
        selectedCategoryNames.push(categoryName.toLowerCase());
      }
    }
  });

  // console.log('[FTO Reports] Selected categories:', selectedCategoryNames);
}

/**
 * Remplit le select des catégories
 */
function populateCategoryFilter(): void {
  const categoryFilter = document.querySelector<HTMLSelectElement>(SELECTORS.FILTER_CATEGORY);
  if (!categoryFilter) return;

  // Garder la première option (souvent "Toutes les catégories")
  const firstOption = categoryFilter.querySelector('option');

  // Vider le select
  categoryFilter.innerHTML = '';

  // Remettre la première option
  if (firstOption) {
    categoryFilter.appendChild(firstOption);
  }

  // Ajouter les catégories
  categories.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat.id.toString();
    option.textContent = cat.name;
    categoryFilter.appendChild(option);
  });
}

/**
 * Remplit les checkboxes des catégories depuis l'API
 */
function populateCategoryCheckboxes(): void {
  const wrapper = document.querySelector(SELECTORS.FILTER_CATEGORIES);
  if (!wrapper) return;

  // Trouver ou récupérer le template
  if (!checkboxTemplate) {
    const template = wrapper.querySelector(SELECTORS.FILTER_CATEGORY_TEMPLATE);
    if (template) {
      checkboxTemplate = template.cloneNode(true) as HTMLElement;
      template.remove();
    } else {
      // console.warn('[FTO Reports] No checkbox template found');
      return;
    }
  }

  // Vider le wrapper (sauf éléments sans data-reports-filter)
  const existingCheckboxes = wrapper.querySelectorAll(SELECTORS.FILTER_CATEGORY_TEMPLATE);
  existingCheckboxes.forEach((el) => el.remove());

  // Créer une checkbox pour chaque catégorie
  categories.forEach((cat) => {
    if (checkboxTemplate) {
      const checkboxItem = checkboxTemplate.cloneNode(true) as HTMLElement;

      // Trouver l'input checkbox et lui ajouter data-category
      const input = checkboxItem.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (input) {
        input.setAttribute('data-category', cat.name);
        input.checked = false;

        // Écouter les changements
        input.addEventListener('change', () => {
          updateSelectedCategories();
          loadReports();
        });
      }

      // Mettre à jour le label
      const label = checkboxItem.querySelector(SELECTORS.FILTER_CATEGORY_LABEL);
      if (label) {
        label.textContent = cat.name;
      } else {
        // Fallback : chercher un span ou le texte dans le label
        const labelText = checkboxItem.querySelector('.form_checkbox-label, span, label');
        if (labelText) {
          labelText.textContent = cat.name;
        }
      }

      // Retirer l'attribut template pour éviter les doublons
      checkboxItem.removeAttribute('data-reports-filter');

      wrapper.appendChild(checkboxItem);
    }
  });

  // console.log('[FTO Reports] Populated', categories.filter((c) => c.active).length, 'category checkboxes');
}

/**
 * Efface tous les filtres
 */
function clearFilters(): void {
  currentFilters = { active: true };
  selectedCategoryNames = [];

  // Reset le select
  const categoryFilter = document.querySelector<HTMLSelectElement>(SELECTORS.FILTER_CATEGORY);
  if (categoryFilter) categoryFilter.value = '';

  // Reset les checkboxes
  const categoriesWrapper = document.querySelector(SELECTORS.FILTER_CATEGORIES);
  if (categoriesWrapper) {
    const checkboxes = categoriesWrapper.querySelectorAll<HTMLInputElement>(
      `${SELECTORS.FILTER_CATEGORY_CHECKBOX}`
    );
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
  }

  // Reset la recherche
  const searchFilter = document.querySelector<HTMLInputElement>(SELECTORS.FILTER_SEARCH);
  if (searchFilter) searchFilter.value = '';

  loadReports();
}

// ============================================
// UI States
// ============================================

/**
 * Affiche l'état de chargement (tous les éléments)
 */
function showLoading(): void {
  const loadingEls = document.querySelectorAll<HTMLElement>(SELECTORS.LOADING_STATE);
  loadingEls.forEach((el) => {
    el.style.setProperty('display', 'block', 'important');
  });
}

/**
 * Cache l'état de chargement (tous les éléments)
 */
function hideLoading(): void {
  const loadingEls = document.querySelectorAll<HTMLElement>(SELECTORS.LOADING_STATE);
  loadingEls.forEach((el) => {
    el.style.setProperty('display', 'none', 'important');
  });
}

/**
 * Affiche l'état vide (tous les éléments)
 */
function showEmptyState(message?: string): void {
  const emptyEls = document.querySelectorAll<HTMLElement>(SELECTORS.EMPTY_STATE);
  emptyEls.forEach((el) => {
    if (message) {
      const textEl = el.querySelector('p, span, div');
      if (textEl) textEl.textContent = message;
    }
    el.style.setProperty('display', 'block', 'important');
  });
}

/**
 * Cache l'état vide (tous les éléments)
 */
function hideEmptyState(): void {
  const emptyEls = document.querySelectorAll<HTMLElement>(SELECTORS.EMPTY_STATE);
  emptyEls.forEach((el) => {
    el.style.setProperty('display', 'none', 'important');
  });
}

/**
 * Met à jour le compteur de résultats
 */
function updateCount(count: number): void {
  const countEl = document.querySelectorAll(SELECTORS.COUNT);
  countEl.forEach((el) => {
    el.textContent = count.toString();
  });
}

/**
 * Compte les items visibles (après filtrage Finsweet)
 */
function countVisibleItems(): number {
  const container = document.querySelector(SELECTORS.LIST_CONTAINER);
  if (!container) return 0;

  const items = container.querySelectorAll<HTMLElement>('[data-reports="item-rendered"]');
  let visibleCount = 0;

  items.forEach((item) => {
    // Un item est visible si son display n'est pas "none"
    const style = window.getComputedStyle(item);
    if (style.display !== 'none') {
      visibleCount += 1;
    }
  });

  return visibleCount;
}

/**
 * Met à jour le compteur basé sur les items visibles
 */
function updateVisibleCount(): void {
  const count = countVisibleItems();
  updateCount(count);
  // console.log('[FTO Reports] Visible items count:', count);

  // Afficher/cacher l'état vide selon le nombre visible
  if (count === 0) {
    showEmptyState();
  } else {
    hideEmptyState();
  }
}

/**
 * Initialise l'observation des changements de visibilité (pour Finsweet)
 */
function initVisibilityObserver(): void {
  const container = document.querySelector(SELECTORS.LIST_CONTAINER);
  if (!container) return;

  // Observer les changements d'attributs style sur les items
  const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;

    mutations.forEach((mutation) => {
      if (
        mutation.type === 'attributes' &&
        (mutation.attributeName === 'style' || mutation.attributeName === 'class')
      ) {
        shouldUpdate = true;
      }
      // Observer aussi l'ajout/suppression d'éléments
      if (mutation.type === 'childList') {
        shouldUpdate = true;
      }
    });

    if (shouldUpdate) {
      // Debounce pour éviter trop de mises à jour
      clearTimeout(visibilityDebounce);
      visibilityDebounce = setTimeout(updateVisibleCount, 50);
    }
  });

  observer.observe(container, {
    attributes: true,
    attributeFilter: ['style', 'class'],
    childList: true,
    subtree: true,
  });

  // console.log('[FTO Reports] Visibility observer initialized');
}

let visibilityDebounce: ReturnType<typeof setTimeout>;

// ============================================
// Export
// ============================================

export default initReportsDisplay;
