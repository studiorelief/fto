/**
 * API Endpoints Configuration
 * France Tourisme Observation API
 */

// Base URL de l'API
export const API_BASE_URL = 'https://fto.api.aosis.net:9090';

// Endpoints d'authentification
export const AUTH_ENDPOINTS = {
  LOGIN: '/login',
  REGISTER: '/register',
  LOGOUT: '/logout',
  REFRESH: '/refresh',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
} as const;

// Endpoints utilisateur
export const USER_ENDPOINTS = {
  ME: '/users/me',
} as const;

// Endpoints catégories
export const CATEGORY_ENDPOINTS = {
  LIST: '/categories',
  BY_ID: (id: number) => `/categories/${id}`,
} as const;

// Endpoints rapports
export const REPORT_ENDPOINTS = {
  LIST: '/reports',
  BY_ID: (id: number) => `/reports/${id}`,
  EMBED_TOKEN: (id: number) => `/reports/${id}/embedtoken`,
  EMBED_CONFIG: (id: number) => `/reports/${id}/embedconfig`,
} as const;

// Endpoints entreprises (admin)
export const COMPANY_ENDPOINTS = {
  LIST: '/companies',
  BY_ID: (id: number) => `/companies/${id}`,
} as const;

// Endpoints admin
export const ADMIN_ENDPOINTS = {
  USER_PERMISSIONS: (userId: number) => `/admin/users/${userId}/permissions`,
  LOGIN_ATTEMPTS: '/admin/login-attempts',
  SUSPICIOUS_LOGINS: '/admin/login-attempts/suspicious',
  ACTIVE_SESSIONS: '/admin/refresh-tokens/active',
  REVOKE_SESSION: (tokenId: number) => `/admin/refresh-tokens/${tokenId}/revoke`,
  REVOKE_ALL_USER_SESSIONS: (userId: number) => `/admin/users/${userId}/revoke-all-sessions`,
} as const;

/**
 * Construit l'URL complète d'un endpoint
 */
export const buildUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};
