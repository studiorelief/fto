/**
 * Reports Module - France Tourisme Observation
 * Gestion des rapports Power BI
 */

// Service
export {
  clearAllCache,
  clearCategoriesCache,
  clearReportsCache,
  getCategories,
  getFilteredReports,
  getReportById,
  getReports,
} from './reportsService';

// Display Component
export { initReportsDisplay } from './reportsDisplay';

// Detail Component
export { generateReportUrl, generateSlug, initReportDetail } from './reportDetail';
