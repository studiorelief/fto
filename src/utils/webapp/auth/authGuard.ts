/**
 * Auth Guard - Protection des pages authentifiées
 *
 * Vérifie l'authentification et ouvre le popup de login si nécessaire
 */

import { openAuthPopup } from '$utils/components/auth';

import { checkSession } from './authService';
import { getTokens, isAuthenticated } from './authState';

// Configuration
const CONFIG = {
  // Pages protégées (nécessitent une authentification)
  PROTECTED_PATHS: ['/dashboard', '/admin'],
  // Délai avant expiration pour rafraîchir le token (5 minutes)
  REFRESH_THRESHOLD_MS: 5 * 60 * 1000,
};

/**
 * Vérifie si la page actuelle nécessite une authentification
 */
export function isProtectedPage(): boolean {
  const currentPath = window.location.pathname;
  return CONFIG.PROTECTED_PATHS.some((path) => currentPath.startsWith(path));
}

/**
 * Ouvre le popup de login
 */
export function promptLogin(): void {
  console.log('[FTO Auth Guard] Opening login popup...');
  openAuthPopup();
}

// Note: Plus besoin de redirection après login car on utilise un popup
// La page reste la même, on refetch juste les données via les events auth

/**
 * Vérifie si le token est proche de l'expiration
 */
export function isTokenExpiringSoon(): boolean {
  const tokens = getTokens();
  if (!tokens?.access_token) return true;

  try {
    // Décoder le JWT (sans vérifier la signature côté client)
    const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convertir en ms
    const now = Date.now();

    return expirationTime - now < CONFIG.REFRESH_THRESHOLD_MS;
  } catch {
    // Si on ne peut pas décoder, considérer comme expiré
    return true;
  }
}

/**
 * Vérifie si le token est expiré
 */
export function isTokenExpired(): boolean {
  const tokens = getTokens();
  if (!tokens?.access_token) return true;

  try {
    const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
    const expirationTime = payload.exp * 1000;
    return Date.now() >= expirationTime;
  } catch {
    return true;
  }
}

/**
 * Guard principal - à appeler au chargement des pages protégées
 */
export async function authGuard(): Promise<boolean> {
  // Si la page n'est pas protégée, autoriser
  if (!isProtectedPage()) {
    return true;
  }

  // Vérifier si authentifié
  if (!isAuthenticated()) {
    console.log('[FTO Auth Guard] Not authenticated, opening login popup');
    promptLogin();
    return false;
  }

  // Vérifier si le token est expiré
  if (isTokenExpired()) {
    console.log('[FTO Auth Guard] Token expired, checking session...');
    const user = await checkSession();
    if (!user) {
      console.log('[FTO Auth Guard] Session invalid, opening login popup');
      promptLogin();
      return false;
    }
  }

  console.log('[FTO Auth Guard] Access granted');
  return true;
}

/**
 * Initialise la vérification automatique de session
 */
export function initAuthGuard(): void {
  // Vérifier au chargement
  authGuard();

  // Vérifier périodiquement (toutes les minutes)
  setInterval(async () => {
    if (isProtectedPage() && isTokenExpiringSoon()) {
      console.log('[FTO Auth Guard] Token expiring soon, refreshing...');
      await checkSession();
    }
  }, 60 * 1000);

  // Vérifier quand l'onglet redevient visible
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && isProtectedPage()) {
      if (isTokenExpired()) {
        console.log('[FTO Auth Guard] Tab visible, checking session...');
        const user = await checkSession();
        if (!user) {
          promptLogin();
        }
      }
    }
  });
}

export default authGuard;
