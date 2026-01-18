/**
 * Auth State Management
 *
 * Gestion de l'état d'authentification via localStorage
 * - Stockage sécurisé des tokens
 * - Gestion de l'état connecté/déconnecté
 * - Événements pour mettre à jour l'UI
 */

import type { TokenWithRefresh, User } from '../api/types';

// ============================================
// Storage Keys
// ============================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'fto_access_token',
  REFRESH_TOKEN: 'fto_refresh_token',
  USER: 'fto_user',
} as const;

// ============================================
// Token Management
// ============================================

/**
 * Récupère les tokens stockés
 */
export function getTokens(): { access_token: string; refresh_token: string } | null {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

/**
 * Stocke les tokens après une authentification réussie
 */
export function setTokens(tokens: TokenWithRefresh): void {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
  dispatchAuthEvent('auth:tokens-updated');
}

/**
 * Supprime tous les tokens (déconnexion)
 */
export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  dispatchAuthEvent('auth:logged-out');
}

// ============================================
// User Management
// ============================================

/**
 * Récupère les informations de l'utilisateur connecté
 */
export function getStoredUser(): User | null {
  const userJson = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userJson) {
    return null;
  }

  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}

/**
 * Stocke les informations de l'utilisateur
 */
export function setStoredUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  dispatchAuthEvent('auth:user-updated');
}

/**
 * Supprime les informations de l'utilisateur
 */
export function clearStoredUser(): void {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// ============================================
// Auth State Helpers
// ============================================

/**
 * Vérifie si l'utilisateur est connecté
 */
export function isAuthenticated(): boolean {
  const tokens = getTokens();
  return tokens !== null && tokens.access_token !== '';
}

/**
 * Vérifie si l'utilisateur a une permission spécifique
 */
export function hasPermission(permission: string): boolean {
  const user = getStoredUser();
  if (!user) return false;

  try {
    const permissions: string[] = JSON.parse(user.custom_permissions);
    return permissions.includes(permission) || permissions.includes('admin');
  } catch {
    return false;
  }
}

/**
 * Vérifie si l'utilisateur est admin
 */
export function isAdmin(): boolean {
  return hasPermission('admin');
}

// ============================================
// Auth Events
// ============================================

type AuthEventType =
  | 'auth:logged-in'
  | 'auth:logged-out'
  | 'auth:tokens-updated'
  | 'auth:user-updated'
  | 'auth:error';

/**
 * Dispatch un événement d'authentification personnalisé
 */
export function dispatchAuthEvent(type: AuthEventType, detail?: unknown): void {
  const event = new CustomEvent(type, { detail });
  window.dispatchEvent(event);
}

/**
 * Écoute un événement d'authentification
 */
export function onAuthEvent(type: AuthEventType, callback: (detail?: unknown) => void): () => void {
  const handler = (event: Event) => {
    callback((event as CustomEvent).detail);
  };

  window.addEventListener(type, handler);

  // Retourne une fonction pour se désabonner
  return () => window.removeEventListener(type, handler);
}
