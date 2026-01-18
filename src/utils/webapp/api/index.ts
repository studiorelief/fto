/**
 * API Module - France Tourisme Observation
 *
 * Client API et configuration
 */

// Client
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
  APIError,
  ApiResponse,
  CategoryResponse,
  CompanyResponse,
  RefreshTokenRequest,
  ReportResponse,
  TokenWithRefresh,
  User,
  UserCreate,
  UserLogin,
} from './types';
