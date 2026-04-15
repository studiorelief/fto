/**
 * Reports Service
 * Gère la récupération des rapports Power BI depuis l'API
 */

import { get } from '../api/client';
import { CATEGORY_ENDPOINTS, REPORT_ENDPOINTS } from '../api/endpoints';
import type {
  ApiResponse,
  CategoryResponse,
  EmbedConfigResponse,
  ReportResponse,
} from '../api/types';

// ============================================
// Types
// ============================================

export interface ReportWithCategory extends ReportResponse {
  category?: CategoryResponse;
}

export interface ReportsFilters {
  categoryId?: number;
  categoryNames?: string[]; // Pour les checkboxes multichoix (noms en minuscules)
  search?: string;
  active?: boolean;
}

// ============================================
// Cache
// ============================================

let categoriesCache: CategoryResponse[] | null = null;
let reportsCache: ReportResponse[] | null = null;

// ============================================
// API Calls
// ============================================

/**
 * Récupère toutes les catégories (accessible sans authentification)
 */
export async function getCategories(): Promise<ApiResponse<CategoryResponse[]>> {
  // Utiliser le cache si disponible
  if (categoriesCache) {
    return { success: true, data: categoriesCache };
  }

  const response = await get<CategoryResponse[]>(CATEGORY_ENDPOINTS.LIST, false);

  if (response.success && response.data) {
    categoriesCache = response.data;
  }

  return response;
}

/**
 * Récupère tous les rapports (accessible sans authentification)
 * Note: Les rapports non publics auront powerbi_report_guid vide si non connecté
 */
export async function getReports(): Promise<ApiResponse<ReportResponse[]>> {
  // Utiliser le cache si disponible
  if (reportsCache) {
    return { success: true, data: reportsCache };
  }

  const response = await get<ReportResponse[]>(REPORT_ENDPOINTS.LIST, false);

  if (response.success && response.data) {
    // Tri par ordre croissant (les reports sans "order" sont placés à la fin)
    response.data.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
    reportsCache = response.data;
  }

  return response;
}

/**
 * Récupère un rapport par son ID (accessible sans authentification)
 * Note: Les rapports non publics auront powerbi_report_guid vide si non connecté
 */
export async function getReportById(id: number): Promise<ApiResponse<ReportResponse>> {
  return get<ReportResponse>(REPORT_ENDPOINTS.BY_ID(id), false);
}

/**
 * Récupère les rapports avec filtres
 */
export async function getFilteredReports(
  filters?: ReportsFilters
): Promise<ApiResponse<ReportResponse[]>> {
  const response = await getReports();

  if (!response.success || !response.data) {
    return response;
  }

  let reports = response.data;

  // Appliquer les filtres
  if (filters) {
    // Filtre par catégorie (ID - pour select)
    if (filters.categoryId !== undefined) {
      reports = reports.filter((r) => r.category_id === filters.categoryId);
    }

    // Filtre par catégories (noms - pour checkboxes multichoix)
    if (filters.categoryNames && filters.categoryNames.length > 0) {
      reports = reports.filter((r) => {
        const reportCategoryName = r.category_name?.toLowerCase() || '';
        return filters.categoryNames!.some((name) => reportCategoryName.includes(name));
      });
    }

    // Filtre par recherche (nom)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      reports = reports.filter((r) => r.name.toLowerCase().includes(searchLower));
    }

    // Filtre par statut actif
    if (filters.active !== undefined) {
      reports = reports.filter((r) => r.active === filters.active);
    }
  }

  return { success: true, data: reports };
}

/**
 * Récupère la config d'embed Power BI pour un rapport (requiert authentification)
 * Retourne l'objet JSON complet à passer au SDK Power BI
 */
export async function getReportEmbedConfig(id: number): Promise<ApiResponse<EmbedConfigResponse>> {
  return get<EmbedConfigResponse>(REPORT_ENDPOINTS.EMBED_CONFIG(id));
}

// ============================================
// Embed Access Check
// ============================================

/** Cache des IDs de rapports inaccessibles (embed token refusé) */
let inaccessibleReportIds: Set<number> | null = null;

/**
 * Vérifie si l'embed token est accessible pour un rapport donné.
 * Retourne true si accessible, false si l'API renvoie une erreur.
 */
async function checkSingleReportAccess(reportId: number): Promise<boolean> {
  const response = await getReportEmbedConfig(reportId);
  return response.success;
}

/**
 * Vérifie l'accès embed pour une liste de rapports (en parallèle).
 * Retourne un Set des IDs inaccessibles. Les résultats sont mis en cache.
 */
export async function checkReportsEmbedAccess(reports: ReportResponse[]): Promise<Set<number>> {
  if (inaccessibleReportIds) return inaccessibleReportIds;

  const inaccessible = new Set<number>();

  // Ne vérifier que les rapports non-publics (les publics n'ont pas besoin d'embed token)
  const reportsToCheck = reports.filter((r) => !r.public);

  const results = await Promise.allSettled(
    reportsToCheck.map(async (report) => {
      const accessible = await checkSingleReportAccess(report.id);
      return { id: report.id, accessible };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && !result.value.accessible) {
      inaccessible.add(result.value.id);
    }
    // En cas d'erreur réseau, on considère le rapport comme inaccessible
    if (result.status === 'rejected') {
      // On ne peut pas récupérer l'ID ici, on ignore
    }
  }

  inaccessibleReportIds = inaccessible;
  return inaccessible;
}

/**
 * Vérifie si un rapport est dans la liste des inaccessibles (depuis le cache)
 */
export function isReportInaccessible(reportId: number): boolean {
  return inaccessibleReportIds?.has(reportId) ?? false;
}

/**
 * Vide le cache des rapports (utile après une modification)
 */
export function clearReportsCache(): void {
  reportsCache = null;
}

/**
 * Vide le cache des catégories
 */
export function clearCategoriesCache(): void {
  categoriesCache = null;
}

/**
 * Vide tous les caches
 */
/**
 * Vide le cache d'accès embed
 */
export function clearEmbedAccessCache(): void {
  inaccessibleReportIds = null;
}

export function clearAllCache(): void {
  clearReportsCache();
  clearCategoriesCache();
  clearEmbedAccessCache();
}

export default {
  getCategories,
  getReports,
  getReportById,
  getFilteredReports,
  clearReportsCache,
  clearCategoriesCache,
  clearAllCache,
};
