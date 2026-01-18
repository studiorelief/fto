/**
 * API Client pour France Tourisme Observation
 *
 * Client HTTP avec :
 * - Gestion automatique des headers Bearer
 * - Refresh token automatique si access token expiré
 * - Gestion centralisée des erreurs
 */

import { clearTokens, getTokens, setTokens } from '../auth/authState';
import { AUTH_ENDPOINTS, buildUrl } from './endpoints';
import type { ApiResponse, TokenWithRefresh } from './types';

/**
 * Options pour les requêtes API
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

/**
 * Effectue une requête à l'API avec gestion automatique des tokens
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, requiresAuth = true } = options;

  // Construire les headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Ajouter le token d'authentification si nécessaire
  if (requiresAuth) {
    const tokens = getTokens();
    if (tokens?.access_token) {
      requestHeaders['Authorization'] = `Bearer ${tokens.access_token}`;
    }
  }

  // Construire la requête
  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(buildUrl(endpoint), requestInit);

    // Si le token est expiré, tenter un refresh
    if (response.status === 401 && requiresAuth) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        // Retry la requête avec le nouveau token
        return apiRequest<T>(endpoint, options);
      }
      // Refresh échoué, déconnecter l'utilisateur
      clearTokens();
      return { success: false, error: 'Session expirée. Veuillez vous reconnecter.', status: 401 };
    }

    // Gérer les erreurs HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `Erreur ${response.status}`;
      return { success: false, error: errorMessage, status: response.status };
    }

    // Parser la réponse JSON
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('API Request Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur réseau',
    };
  }
}

/**
 * Tente de rafraîchir le token d'accès
 */
async function attemptTokenRefresh(): Promise<boolean> {
  const tokens = getTokens();
  if (!tokens?.refresh_token) {
    return false;
  }

  try {
    const response = await fetch(buildUrl(AUTH_ENDPOINTS.REFRESH), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });

    if (!response.ok) {
      return false;
    }

    const newTokens: TokenWithRefresh = await response.json();
    setTokens(newTokens);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Méthodes HTTP simplifiées
// ============================================

/**
 * Effectue une requête GET
 */
export function get<T>(endpoint: string, requiresAuth = true): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET', requiresAuth });
}

/**
 * Effectue une requête POST
 */
export function post<T>(
  endpoint: string,
  body?: unknown,
  requiresAuth = true
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'POST', body, requiresAuth });
}

/**
 * Effectue une requête PUT
 * NOTE: Actuellement désactivé selon les instructions (ne pas toucher PUT/DELETE)
 */
// export function put<T>(endpoint: string, body?: unknown, requiresAuth = true): Promise<ApiResponse<T>> {
//   return apiRequest<T>(endpoint, { method: 'PUT', body, requiresAuth });
// }

/**
 * Effectue une requête DELETE
 * NOTE: Actuellement désactivé selon les instructions (ne pas toucher PUT/DELETE)
 */
// export function del<T>(endpoint: string, requiresAuth = true): Promise<ApiResponse<T>> {
//   return apiRequest<T>(endpoint, { method: 'DELETE', requiresAuth });
// }
