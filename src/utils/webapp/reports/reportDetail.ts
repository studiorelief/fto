/**
 * Report Detail Component
 * Affiche les détails d'un rapport Power BI sur la page /rapport
 *
 * Utilise le SDK Power BI (powerbi-client) pour l'incorporation des rapports.
 * Le SDK est chargé dynamiquement depuis le CDN et gère l'iframe automatiquement.
 *
 * Attributs Webflow requis :
 * - [data-report-detail="container"]  : Container principal
 * - [data-report-detail="name"]       : Titre du rapport
 * - [data-report-detail="category"]   : Catégorie
 * - [data-report-detail="image"]      : Image
 * - [data-report-detail="description"]: Description (optionnel)
 * - [data-report-detail="embed"]      : Container div pour le SDK Power BI
 * - [data-report-detail="embed-locked"]: Message "Connectez-vous pour voir le rapport"
 * - [data-report-detail="loading"]    : État de chargement
 * - [data-report-detail="error"]      : État d'erreur
 * - [data-report-detail="back"]       : Bouton retour
 */

import type { EmbedConfigResponse, ReportResponse } from '../api/types';
import { isAuthenticated } from '../auth';
import { getReportById, getReportEmbedConfig } from './reportsService';

// ============================================
// Power BI SDK types (chargé dynamiquement)
// ============================================

declare global {
  interface Window {
    powerbi: {
      embed: (container: HTMLElement, config: Record<string, unknown>) => PowerBiReport;
      reset: (container: HTMLElement) => void;
    };
  }
}

interface PowerBiReport {
  on: (event: string, callback: () => void) => void;
  setAccessToken: (token: string) => Promise<void>;
}

// ============================================
// Constants
// ============================================

const POWERBI_SDK_URL = 'https://cdn.jsdelivr.net/npm/powerbi-client@2.23.1/dist/powerbi.min.js';

const SELECTORS = {
  CONTAINER: '[data-report-detail="container"]',
  NAME: '[data-report-detail="name"]',
  CATEGORY: '[data-report-detail="category"]',
  IMAGE: '[data-report-detail="image"]',
  DESCRIPTION: '[data-report-detail="description"]',
  EMBED: '[data-report-detail="embed"]',
  EMBED_LOCKED: '[data-report-detail="embed-locked"]',
  LOADING: '[data-report-detail="loading"]',
  ERROR: '[data-report-detail="error"]',
  BACK: '[data-report-detail="back"]',
} as const;

// ============================================
// State
// ============================================

let authListenersInitialized = false;
let sdkLoaded = false;
let sdkLoading = false;
let currentReport: PowerBiReport | null = null;
let currentReportId: number | null = null;

// ============================================
// Initialization
// ============================================

/**
 * Initialise l'affichage du détail d'un rapport
 */
export async function initReportDetail(): Promise<void> {
  const container = document.querySelector(SELECTORS.CONTAINER);
  if (!container) return;

  // État initial : cacher embed-locked
  const embedLockedEls = document.querySelectorAll<HTMLElement>(SELECTORS.EMBED_LOCKED);
  embedLockedEls.forEach((el) => {
    el.style.setProperty('display', 'none', 'important');
  });

  initBackButton();
  initAuthEventListeners();

  await loadReport();
}

/**
 * Écoute les événements d'authentification
 */
function initAuthEventListeners(): void {
  if (authListenersInitialized) return;
  authListenersInitialized = true;

  // Quand l'utilisateur se connecte → recharger (embed disponible)
  window.addEventListener('auth:tokens-updated', () => {
    loadReport();
  });

  // Quand l'utilisateur se déconnecte → recharger (masquer embed si privé)
  window.addEventListener('auth:logged-out', () => {
    // Reset le rapport Power BI embarqué
    if (currentReport) {
      const embedEl = document.querySelector<HTMLElement>(SELECTORS.EMBED);
      if (embedEl) {
        try {
          window.powerbi?.reset(embedEl);
        } catch {
          // Ignorer si SDK pas chargé
        }
      }
      currentReport = null;
    }
    loadReport();
  });
}

/**
 * Charge le rapport (accessible même sans authentification)
 */
async function loadReport(): Promise<void> {
  const reportId = getReportIdFromUrl();
  if (!reportId) {
    console.error('[FTO Report Detail] No report ID found in URL');
    showError('Rapport non trouvé');
    return;
  }

  currentReportId = reportId;
  hideError();
  await fetchAndRenderReport(reportId);
}

// ============================================
// URL Handling
// ============================================

/**
 * Récupère l'ID du rapport depuis l'URL
 * Format attendu : /rapport?id=123
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Génère l'URL complète pour un rapport
 */
export function generateReportUrl(report: ReportResponse): string {
  return `/rapport?id=${report.id}`;
}

// ============================================
// Power BI SDK
// ============================================

/**
 * Charge le SDK Power BI depuis le CDN (une seule fois)
 */
function loadPowerBiSdk(): Promise<void> {
  if (sdkLoaded) return Promise.resolve();

  if (sdkLoading) {
    // Attendre que le chargement en cours se termine
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (sdkLoaded) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }

  sdkLoading = true;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = POWERBI_SDK_URL;
    script.onload = () => {
      sdkLoaded = true;
      sdkLoading = false;
      resolve();
    };
    script.onerror = () => {
      sdkLoading = false;
      reject(new Error('Impossible de charger le SDK Power BI'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Embarque un rapport Power BI dans le container
 */
async function embedPowerBiReport(
  container: HTMLElement,
  config: EmbedConfigResponse
): Promise<void> {
  await loadPowerBiSdk();

  if (!window.powerbi) {
    console.error('[FTO Report Detail] Power BI SDK not available');
    return;
  }

  // Construire la config pour le SDK (tokenType converti en number)
  const sdkConfig = {
    type: config.type,
    id: config.id,
    embedUrl: config.embedUrl,
    accessToken: config.accessToken,
    tokenType: 1, // models.TokenType.Embed (CDN expose models sur window['powerbi-client'], pas window.powerbi)
    settings: config.settings || {
      navContentPaneEnabled: false,
      filterPaneEnabled: false,
    },
  };

  // Embarquer le rapport
  currentReport = window.powerbi.embed(container, sdkConfig);

  // Gérer le renouvellement de token (expiration à 1h)
  currentReport.on('tokenExpired', async () => {
    if (!currentReportId) return;
    const refreshResponse = await getReportEmbedConfig(currentReportId);
    if (refreshResponse.success && refreshResponse.data) {
      await currentReport?.setAccessToken(refreshResponse.data.accessToken);
    }
  });
}

// ============================================
// Data Loading
// ============================================

/**
 * Charge et affiche un rapport depuis l'API
 */
async function fetchAndRenderReport(reportId: number): Promise<void> {
  showLoading();
  hideError();

  try {
    const response = await getReportById(reportId);

    if (response.success && response.data) {
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
 */
function renderReport(report: ReportResponse): void {
  // Titre
  document.querySelectorAll<HTMLElement>(SELECTORS.NAME).forEach((el) => {
    el.textContent = report.name;
  });

  // Catégorie
  document.querySelectorAll<HTMLElement>(SELECTORS.CATEGORY).forEach((el) => {
    el.textContent = report.category_name || 'Non catégorisé';
  });

  // Image
  document.querySelectorAll<HTMLImageElement>(SELECTORS.IMAGE).forEach((el) => {
    if (report.image_url) {
      el.src = report.image_url;
      el.alt = report.name;
    }
  });

  // Embed Power BI
  const embedEls = document.querySelectorAll<HTMLElement>(SELECTORS.EMBED);
  const embedLockedEls = document.querySelectorAll<HTMLElement>(SELECTORS.EMBED_LOCKED);

  const hasEmbedAccess = isAuthenticated() || report.public;

  if (hasEmbedAccess) {
    // Rapport accessible : afficher le container embed, masquer le message "locked"
    embedEls.forEach((el) => {
      el.style.removeProperty('display');
    });
    embedLockedEls.forEach((el) => {
      el.style.setProperty('display', 'none', 'important');
    });

    // Charger l'embed Power BI via le SDK
    const embedContainer = document.querySelector<HTMLElement>(SELECTORS.EMBED);
    if (embedContainer) {
      loadAndEmbedReport(embedContainer, report.id);
    }
  } else {
    // Rapport privé + non connecté : masquer embed, afficher le message
    embedEls.forEach((el) => {
      el.style.setProperty('display', 'none', 'important');
    });
    embedLockedEls.forEach((el) => {
      el.style.removeProperty('display');
    });
  }

  // Titre de la page
  document.title = `${report.name} | France Tourisme Observation`;
}

/**
 * Charge la config d'embed et lance le SDK Power BI
 */
async function loadAndEmbedReport(container: HTMLElement, reportId: number): Promise<void> {
  try {
    const configResponse = await getReportEmbedConfig(reportId);

    if (configResponse.success && configResponse.data) {
      await embedPowerBiReport(container, configResponse.data);
    } else {
      console.error('[FTO Report Detail] Error loading embed config:', configResponse.error);
    }
  } catch (error) {
    console.error('[FTO Report Detail] Exception loading embed:', error);
  }
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
      window.location.href = '/publications-et-rapports?tab=rapports';
    });
  });
}

// ============================================
// UI States
// ============================================

function showLoading(): void {
  document.querySelectorAll<HTMLElement>(SELECTORS.LOADING).forEach((el) => {
    el.style.setProperty('display', 'block', 'important');
  });
  const container = document.querySelector<HTMLElement>(SELECTORS.CONTAINER);
  if (container) container.style.opacity = '0.5';
}

function hideLoading(): void {
  document.querySelectorAll<HTMLElement>(SELECTORS.LOADING).forEach((el) => {
    el.style.setProperty('display', 'none', 'important');
  });
  const container = document.querySelector<HTMLElement>(SELECTORS.CONTAINER);
  if (container) container.style.opacity = '1';
}

function showError(message: string): void {
  document.querySelectorAll<HTMLElement>(SELECTORS.ERROR).forEach((el) => {
    const textEl = el.querySelector('p, span, div');
    if (textEl) {
      textEl.textContent = message;
    } else {
      el.textContent = message;
    }
    el.style.setProperty('display', 'block', 'important');
  });
}

function hideError(): void {
  document.querySelectorAll<HTMLElement>(SELECTORS.ERROR).forEach((el) => {
    el.style.setProperty('display', 'none', 'important');
  });
}

// ============================================
// Export
// ============================================

export default initReportDetail;
