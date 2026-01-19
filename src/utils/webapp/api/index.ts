/**
 * API Module - France Tourisme Observation
 *
 * Export centralisé du module API
 */

// Client HTTP
export { apiRequest, get, post } from './client';

// Endpoints
export {
  ADMIN_ENDPOINTS,
  API_BASE_URL,
  AUTH_ENDPOINTS,
  buildUrl,
  CATEGORY_ENDPOINTS,
  COMPANY_ENDPOINTS,
  REPORT_ENDPOINTS,
  USER_ENDPOINTS,
} from './endpoints';

// Types
export type {
  ApiResponse,
  CategoryCreate,
  CategoryResponse,
  CategoryUpdate,
  CompanyCreate,
  CompanyResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  ReportCreate,
  ReportResponse,
  ReportUpdate,
  ResetPasswordRequest,
  TokenWithRefresh,
  User,
  UserCreate,
} from './types';
