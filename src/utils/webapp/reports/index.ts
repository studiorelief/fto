/**
 * Reports Module - France Tourisme Observation
 * Gestion des rapports Power BI
 */

// Service
export {
  getCategories,
  getReports,
  getReportById,
  getFilteredReports,
  clearReportsCache,
  clearCategoriesCache,
  clearAllCache,
} from './reportsService';

// Display Component
export { initReportsDisplay } from './reportsDisplay';

// Detail Component
export { initReportDetail, generateReportUrl, generateSlug } from './reportDetail';
