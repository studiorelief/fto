/**
 * Reports Service
 * Gère la récupération des rapports Power BI depuis l'API
 */

import { get } from '../api/client';
import { CATEGORY_ENDPOINTS, REPORT_ENDPOINTS } from '../api/endpoints';
import type { ApiResponse, CategoryResponse, ReportResponse } from '../api/types';

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
 * Récupère toutes les catégories
 */
export async function getCategories(): Promise<ApiResponse<CategoryResponse[]>> {
  // Utiliser le cache si disponible
  if (categoriesCache) {
    return { success: true, data: categoriesCache };
  }

  const response = await get<CategoryResponse[]>(CATEGORY_ENDPOINTS.LIST, true);

  if (response.success && response.data) {
    categoriesCache = response.data;
  }

  return response;
}

/**
 * Récupère tous les rapports
 */
export async function getReports(): Promise<ApiResponse<ReportResponse[]>> {
  // Utiliser le cache si disponible
  if (reportsCache) {
    return { success: true, data: reportsCache };
  }

  const response = await get<ReportResponse[]>(REPORT_ENDPOINTS.LIST, true);

  if (response.success && response.data) {
    reportsCache = response.data;
  }

  return response;
}

/**
 * Récupère un rapport par son ID
 */
export async function getReportById(id: number): Promise<ApiResponse<ReportResponse>> {
  return get<ReportResponse>(REPORT_ENDPOINTS.BY_ID(id), true);
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
export function clearAllCache(): void {
  clearReportsCache();
  clearCategoriesCache();
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
