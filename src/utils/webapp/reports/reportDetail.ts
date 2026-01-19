/**
 * Report Detail Component
 * Affiche les détails d'un rapport Power BI sur la page /rapport
 *
 * Attributs Webflow requis :
 * - [data-report-detail="container"]  : Container principal
 * - [data-report-detail="name"]       : Titre du rapport
 * - [data-report-detail="category"]   : Catégorie
 * - [data-report-detail="image"]      : Image
 * - [data-report-detail="description"]: Description (optionnel)
 * - [data-report-detail="embed"]      : Iframe Power BI
 * - [data-report-detail="loading"]    : État de chargement
 * - [data-report-detail="error"]      : État d'erreur
 * - [data-report-detail="back"]       : Bouton retour
 */

import type { ReportResponse } from '../api/types';
import { isAuthenticated } from '../auth';
import { getReportById } from './reportsService';

// ============================================
// Selectors
// ============================================

const SELECTORS = {
  CONTAINER: '[data-report-detail="container"]',
  NAME: '[data-report-detail="name"]',
  CATEGORY: '[data-report-detail="category"]',
  IMAGE: '[data-report-detail="image"]',
  DESCRIPTION: '[data-report-detail="description"]',
  EMBED: '[data-report-detail="embed"]',
  LOADING: '[data-report-detail="loading"]',
  ERROR: '[data-report-detail="error"]',
  BACK: '[data-report-detail="back"]',
} as const;

// ============================================
// Initialization
// ============================================

let authListenersInitialized = false;

/**
 * Initialise l'affichage du détail d'un rapport
 */
export async function initReportDetail(): Promise<void> {
  console.log('[FTO Report Detail] Initializing...');

  // Vérifier si on est sur la bonne page
  const container = document.querySelector(SELECTORS.CONTAINER);
  if (!container) {
    console.log('[FTO Report Detail] No report detail container found on this page');
    return;
  }

  // Initialiser le bouton retour
  initBackButton();

  // Écouter les événements d'authentification
  initAuthEventListeners();

  // Charger le rapport si authentifié
  await loadReportIfAuthenticated();
}

/**
 * Écoute les événements d'authentification
 */
function initAuthEventListeners(): void {
  if (authListenersInitialized) return;
  authListenersInitialized = true;

  // Quand l'utilisateur se connecte → charger le rapport
  window.addEventListener('auth:tokens-updated', () => {
    console.log('[FTO Report Detail] Auth tokens updated, loading report...');
    loadReportIfAuthenticated();
  });

  // Quand l'utilisateur se déconnecte → afficher erreur
  window.addEventListener('auth:logged-out', () => {
    console.log('[FTO Report Detail] User logged out');
    showError('Connectez-vous pour voir ce rapport');
  });
}

/**
 * Charge le rapport si l'utilisateur est authentifié
 */
async function loadReportIfAuthenticated(): Promise<void> {
  // Vérifier l'authentification
  if (!isAuthenticated()) {
    console.log('[FTO Report Detail] User not authenticated');
    showError('Connectez-vous pour voir ce rapport');
    return;
  }

  // Récupérer l'ID du rapport depuis l'URL
  const reportId = getReportIdFromUrl();
  if (!reportId) {
    console.error('[FTO Report Detail] No report ID found in URL');
    showError('Rapport non trouvé');
    return;
  }

  console.log('[FTO Report Detail] Loading report ID:', reportId);
  hideError();

  // Charger le rapport
  await loadReport(reportId);
}

// ============================================
// URL Handling
// ============================================

/**
 * Récupère l'ID du rapport depuis l'URL
 * Format attendu : /rapport/slug-du-rapport?id=123
 */
function getReportIdFromUrl(): number | null {
  const urlParams = new URLSearchParams(window.location.search);
  const idParam = urlParams.get('id');

  if (idParam) {
    const id = parseInt(idParam, 10);
    if (!isNaN(id)) {
      return id;
    }
  }

  return null;
}

/**
 * Génère un slug à partir d'un nom (pour affichage ou SEO futur)
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9\s-]/g, '') // Garder que lettres, chiffres, espaces, tirets
    .replace(/\s+/g, '-') // Espaces → tirets
    .replace(/-+/g, '-') // Plusieurs tirets → un seul
    .replace(/^-|-$/g, ''); // Supprimer tirets début/fin
}

/**
 * Génère l'URL complète pour un rapport
 * Format : /rapport?id=123
 * (Webflow ne supporte pas les routes dynamiques, on utilise les query params)
 */
export function generateReportUrl(report: ReportResponse): string {
  return `/rapport?id=${report.id}`;
}

// ============================================
// Data Loading
// ============================================

/**
 * Charge et affiche un rapport
 */
async function loadReport(reportId: number): Promise<void> {
  showLoading();
  hideError();

  try {
    const response = await getReportById(reportId);

    if (response.success && response.data) {
      console.log('[FTO Report Detail] Report loaded:', response.data.name);
      renderReport(response.data);
    } else {
      console.error('[FTO Report Detail] Error loading report:', response.error);
      showError('Impossible de charger ce rapport');
    }
  } catch (error) {
    console.error('[FTO Report Detail] Exception:', error);
    showError('Une erreur est survenue');
  } finally {
    hideLoading();
  }
}

// ============================================
// Rendering
// ============================================

/**
 * Affiche les détails du rapport
 * Supporte plusieurs éléments avec le même attribut
 */
function renderReport(report: ReportResponse): void {
  // Titre (peut y avoir plusieurs éléments)
  const nameEls = document.querySelectorAll<HTMLElement>(SELECTORS.NAME);
  nameEls.forEach((el) => {
    el.textContent = report.name;
  });

  // Catégorie (peut y avoir plusieurs éléments)
  const categoryEls = document.querySelectorAll<HTMLElement>(SELECTORS.CATEGORY);
  categoryEls.forEach((el) => {
    el.textContent = report.category_name || 'Non catégorisé';
  });

  // Image (peut y avoir plusieurs éléments)
  const imageEls = document.querySelectorAll<HTMLImageElement>(SELECTORS.IMAGE);
  imageEls.forEach((el) => {
    if (report.image_url) {
      el.src = report.image_url;
      el.alt = report.name;
    }
  });

  // Description (peut y avoir plusieurs éléments)
  // Note: Le champ description n'est pas dans l'API actuelle
  // const descEls = document.querySelectorAll<HTMLElement>(SELECTORS.DESCRIPTION);
  // descEls.forEach((el) => {
  //   el.textContent = report.description || '';
  // });

  // Embed Power BI (peut y avoir plusieurs éléments)
  const embedEls = document.querySelectorAll<HTMLIFrameElement>(SELECTORS.EMBED);
  embedEls.forEach((el) => {
    if (report.embed_url) {
      el.src = report.embed_url;
      el.title = report.name;
    }
  });

  // Mettre à jour le titre de la page
  document.title = `${report.name} | France Tourisme Observation`;

  console.log('[FTO Report Detail] Report rendered');
}

// ============================================
// Navigation
// ============================================

/**
 * Initialise le bouton retour
 */
function initBackButton(): void {
  const backBtns = document.querySelectorAll(SELECTORS.BACK);
  backBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Retour à la page des rapports
      window.location.href = '/publications-et-rapports?tab=rapports';
    });
  });
}

// ============================================
// UI States
// ============================================

/**
 * Affiche l'état de chargement
 */
function showLoading(): void {
  const loadingEls = document.querySelectorAll<HTMLElement>(SELECTORS.LOADING);
  loadingEls.forEach((el) => {
    el.style.setProperty('display', 'block', 'important');
  });

  const container = document.querySelector<HTMLElement>(SELECTORS.CONTAINER);
  if (container) {
    container.style.opacity = '0.5';
  }
}

/**
 * Cache l'état de chargement
 */
function hideLoading(): void {
  const loadingEls = document.querySelectorAll<HTMLElement>(SELECTORS.LOADING);
  loadingEls.forEach((el) => {
    el.style.setProperty('display', 'none', 'important');
  });

  const container = document.querySelector<HTMLElement>(SELECTORS.CONTAINER);
  if (container) {
    container.style.opacity = '1';
  }
}

/**
 * Affiche l'état d'erreur
 */
function showError(message: string): void {
  const errorEls = document.querySelectorAll<HTMLElement>(SELECTORS.ERROR);
  errorEls.forEach((el) => {
    const textEl = el.querySelector('p, span, div');
    if (textEl) {
      textEl.textContent = message;
    } else {
      el.textContent = message;
    }
    el.style.setProperty('display', 'block', 'important');
  });
}

/**
 * Cache l'état d'erreur
 */
function hideError(): void {
  const errorEls = document.querySelectorAll<HTMLElement>(SELECTORS.ERROR);
  errorEls.forEach((el) => {
    el.style.setProperty('display', 'none', 'important');
  });
}

// ============================================
// Export
// ============================================

export default initReportDetail;
