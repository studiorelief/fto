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
 * - [data-reports="accessible"]     : Visible si le rapport est accessible (public ou connecté)
 * - [data-reports="not-accessible"] : Visible si le rapport n'est pas accessible (privé + non connecté)
 *
 * Filtres accès (checkboxes Webflow) :
 * - [data-reports-filter="access"] input[data-access="Publique"]
 * - [data-reports-filter="access"] input[data-access="Membre FTO"]
 */

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
  FILTER_ACCESS: '[data-reports-filter="access"]', // Wrapper checkboxes accès
  FILTER_ACCESS_CHECKBOX: '[data-access]', // Individual checkbox with data-access
  FILTER_ACCESS_EMPTY: '[data-access="empty"]', // Message "aucun résultat" pour ce filtre
  FILTER_ACCESS_CLEAR: '[data-access="clear"]', // Bouton reset filtre accès
  FILTER_SEARCH: '[data-reports-filter="search"]',
  FILTER_CLEAR: '[data-reports-filter="clear"]',

  // Dans chaque item
  REPORT_NAME: '[data-report="name"]',
  REPORT_CATEGORY: '[data-report="category"]',
  REPORT_IMAGE: '[data-report="image"]',
  REPORT_LINK: '[data-report="link"]',
  REPORT_DATE: '[data-report="date"]',
  REPORT_DATE_WRAPPER: '[data-report="date-wrapper"]',
  REPORT_CATEGORY_ICON: '[data-report="category-icon"]',
  REPORT_DESCRIPTION: '[data-report="description"]',
  REPORT_PRIVATE: '[data-reports="private"]', // Badge "Réservé aux membres"
  REPORT_ACCESS: '[data-report="access"]', // Texte "Publique" ou "Membre FTO"
  REPORT_ACCESSIBLE: '[data-reports="accessible"]', // Visible si accessible
  REPORT_NOT_ACCESSIBLE: '[data-reports="not-accessible"]', // Visible si non accessible
} as const;

// ============================================
// State
// ============================================

let itemTemplate: HTMLElement | null = null;
let checkboxTemplate: HTMLElement | null = null; // Template pour les checkboxes catégories
let currentFilters: ReportsFilters = { active: true };
let selectedCategoryNames: string[] = []; // Pour les checkboxes multichoix
let selectedAccessTypes: string[] = []; // Pour les checkboxes accès (Publique / Membre FTO)
let categories: CategoryResponse[] = [];
let allReports: ReportResponse[] = [];

// ============================================
// Initialization
// ============================================

/**
 * Initialise l'affichage des rapports
 */
export async function initReportsDisplay(): Promise<void> {
  // Vérifier si on est sur la bonne page
  const listContainer = document.querySelector(SELECTORS.LIST_CONTAINER);
  if (!listContainer) return;

  // Sauvegarder le template (une seule fois)
  if (!itemTemplate) {
    const template = listContainer.querySelector<HTMLElement>(SELECTORS.ITEM_TEMPLATE);
    if (template) {
      itemTemplate = template.cloneNode(true) as HTMLElement;
      template.style.display = 'none';
      template.setAttribute('data-reports', 'template');
    }
  }

  // Initialiser les filtres (une seule fois)
  initFilters();

  // Écouter les événements d'authentification pour refetch
  initAuthEventListeners();

  // Charger les données (accessible même sans authentification)
  await loadAllData();
}

/**
 * Charge toutes les données (catégories + rapports)
 */
async function loadAllData(): Promise<void> {
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
    clearAllCache();
    loadAllData();
  });

  // Quand l'utilisateur se déconnecte → vider le cache et refetch (URLs vides pour non-public)
  window.addEventListener('auth:logged-out', () => {
    clearAllCache();
    loadAllData();
  });
}

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
    populateCategoryFilter();
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

  showLoading();

  try {
    const response = await getFilteredReports(filtersToApply);

    if (response.success && response.data) {
      let reports = response.data;

      // Stocker tous les rapports (non filtrés) pour les checkboxes catégories
      if (allReports.length === 0) {
        allReports = reports;
        populateCategoryCheckboxes();
      }

      // Filtre accès (Publique / Membre FTO)
      if (selectedAccessTypes.length > 0) {
        reports = reports.filter((r) => {
          const accessType = r.public ? 'Publique' : 'Membre FTO';
          return selectedAccessTypes.includes(accessType);
        });
      }

      renderReports(reports);
      updateCount(reports.length);

      // Empty state accès : visible uniquement si 0 résultats
      document.querySelectorAll<HTMLElement>(SELECTORS.FILTER_ACCESS_EMPTY).forEach((el) => {
        el.style.display = reports.length === 0 ? '' : 'none';
      });

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

  // Icône de la catégorie (masquer si null)
  const categoryIconEl = item.querySelector<HTMLImageElement>(SELECTORS.REPORT_CATEGORY_ICON);
  if (categoryIconEl) {
    const category = categories.find((c) => c.id === report.category_id);
    if (category?.image_url) {
      categoryIconEl.src = category.image_url;
      categoryIconEl.alt = category.name;
      categoryIconEl.style.display = '';
    } else {
      categoryIconEl.style.display = 'none';
    }
  }

  const imageEl = item.querySelector<HTMLImageElement>(SELECTORS.REPORT_IMAGE);
  if (imageEl && report.image_url) {
    imageEl.src = report.image_url;
    imageEl.alt = report.name;
  }

  const userAuthenticated = isAuthenticated();
  const isClickable = report.public || userAuthenticated;

  const linkEl = item.querySelector<HTMLAnchorElement>(SELECTORS.REPORT_LINK);
  if (linkEl) {
    if (isClickable) {
      linkEl.href = generateReportUrl(report);
      linkEl.style.pointerEvents = '';
      linkEl.style.cursor = '';
    } else {
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

  // Afficher/masquer selon l'accessibilité du rapport
  item.querySelectorAll<HTMLElement>(SELECTORS.REPORT_ACCESSIBLE).forEach((el) => {
    el.style.display = isClickable ? '' : 'none';
  });
  item.querySelectorAll<HTMLElement>(SELECTORS.REPORT_NOT_ACCESSIBLE).forEach((el) => {
    el.style.display = isClickable ? 'none' : '';
  });

  // Afficher le texte d'accès (Publique ou Membre FTO)
  const accessEl = item.querySelector<HTMLElement>(SELECTORS.REPORT_ACCESS);
  if (accessEl) {
    accessEl.textContent = report.public ? 'Publique' : 'Membre FTO';
  }

  // Description Power BI (masquer si null)
  const descriptionEl = item.querySelector<HTMLElement>(SELECTORS.REPORT_DESCRIPTION);
  if (descriptionEl) {
    if (report.powerbi_description) {
      descriptionEl.textContent = report.powerbi_description;
      descriptionEl.style.display = '';
    } else {
      descriptionEl.style.display = 'none';
    }
  }

  // Date de dernière mise à jour Power BI (masquer le wrapper si null)
  const dateWrapperEl = item.querySelector<HTMLElement>(SELECTORS.REPORT_DATE_WRAPPER);
  const dateEl = item.querySelector<HTMLElement>(SELECTORS.REPORT_DATE);
  if (report.powerbi_lastupdate) {
    if (dateWrapperEl) dateWrapperEl.style.display = '';
    if (dateEl) {
      const date = new Date(report.powerbi_lastupdate);
      dateEl.textContent = date.getFullYear().toString();
    }
  } else {
    if (dateWrapperEl) dateWrapperEl.style.display = 'none';
  }

  // Rendre l'élément visible (au cas où le template était caché)
  item.style.display = '';
  item.setAttribute('data-reports', 'item-rendered');

  return item;
}

// ============================================
// Helpers
// ============================================

/**
 * Reset une checkbox Webflow (input + indicateur visuel custom)
 */
function uncheckWebflowCheckbox(input: HTMLInputElement): void {
  input.checked = false;
  // Webflow custom checkbox : retirer la classe visuelle sur le sibling div
  const indicator = input.parentElement?.querySelector('.w-checkbox-input');
  if (indicator) indicator.classList.remove('w--redirected-checked');
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
  }

  // Filtre par accès (Publique / Membre FTO)
  const accessWrapper = document.querySelector(SELECTORS.FILTER_ACCESS);
  if (accessWrapper) {
    const checkboxes = accessWrapper.querySelectorAll<HTMLInputElement>(
      'input[data-access]:not([data-access="empty"]):not([data-access="clear"])'
    );

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        updateSelectedAccessTypes();
        loadReports();
      });
    });

    // Bouton reset filtre accès (peut être en dehors du wrapper)
    document.querySelectorAll(SELECTORS.FILTER_ACCESS_CLEAR).forEach((btn) => {
      btn.addEventListener('click', () => {
        clearFilters();
      });
    });
  }

  // Masquer le empty state accès au démarrage
  document.querySelectorAll<HTMLElement>(SELECTORS.FILTER_ACCESS_EMPTY).forEach((el) => {
    el.style.display = 'none';
  });

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
}

/**
 * Met à jour la liste des types d'accès sélectionnés (checkboxes)
 */
function updateSelectedAccessTypes(): void {
  const accessWrapper = document.querySelector(SELECTORS.FILTER_ACCESS);
  if (!accessWrapper) return;

  const checkboxes = accessWrapper.querySelectorAll<HTMLInputElement>(
    'input[data-access]:not([data-access="empty"]):not([data-access="clear"])'
  );

  selectedAccessTypes = [];

  checkboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      const accessType = checkbox.getAttribute('data-access');
      if (accessType) {
        selectedAccessTypes.push(accessType);
      }
    }
  });
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
      return;
    }
  }

  // Vider le wrapper (sauf éléments sans data-reports-filter)
  const existingCheckboxes = wrapper.querySelectorAll(SELECTORS.FILTER_CATEGORY_TEMPLATE);
  existingCheckboxes.forEach((el) => el.remove());

  // Filtrer les catégories présentes dans les rapports
  const usedCategoryIds = new Set(allReports.map((r) => r.category_id));
  const visibleCategories = categories.filter((cat) => usedCategoryIds.has(cat.id));

  // Créer une checkbox pour chaque catégorie présente
  visibleCategories.forEach((cat) => {
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

      wrapper.appendChild(checkboxItem);
    }
  });
}

/**
 * Efface tous les filtres
 */
function clearFilters(): void {
  currentFilters = { active: true };
  selectedCategoryNames = [];
  selectedAccessTypes = [];

  // Reset le select
  const categoryFilter = document.querySelector<HTMLSelectElement>(SELECTORS.FILTER_CATEGORY);
  if (categoryFilter) categoryFilter.value = '';

  // Reset les checkboxes catégories
  document
    .querySelectorAll<HTMLInputElement>(`${SELECTORS.FILTER_CATEGORY_CHECKBOX}`)
    .forEach((cb) => uncheckWebflowCheckbox(cb));

  // Reset les checkboxes accès
  document
    .querySelectorAll<HTMLInputElement>(
      'input[data-access]:not([data-access="empty"]):not([data-access="clear"])'
    )
    .forEach((cb) => uncheckWebflowCheckbox(cb));

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

// ============================================
// Export
// ============================================

export default initReportsDisplay;
