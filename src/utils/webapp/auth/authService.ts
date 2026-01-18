/**
 * Auth Service
 *
 * Service d'authentification pour France Tourisme Observation
 * - Login / Logout
 * - Refresh token
 * - Récupération des infos utilisateur
 * - Mot de passe oublié / Reset
 */

import { get, post } from '../api/client';
import { AUTH_ENDPOINTS, USER_ENDPOINTS } from '../api/endpoints';
import type {
  ApiResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  TokenWithRefresh,
  User,
  UserLogin,
} from '../api/types';
import {
  clearTokens,
  dispatchAuthEvent,
  getStoredUser,
  getTokens,
  isAuthenticated,
  setStoredUser,
  setTokens,
} from './authState';

// ============================================
// Login
// ============================================

/**
 * Authentifie un utilisateur
 */
export async function login(credentials: UserLogin): Promise<ApiResponse<User>> {
  // 1. Appeler l'endpoint de login
  const tokenResponse = await post<TokenWithRefresh>(
    AUTH_ENDPOINTS.LOGIN,
    credentials,
    false // Pas besoin d'auth pour login
  );

  if (!tokenResponse.success) {
    return tokenResponse;
  }

  // 2. Stocker les tokens
  setTokens(tokenResponse.data);

  // 3. Récupérer les infos utilisateur
  const userResponse = await getCurrentUser();

  if (!userResponse.success) {
    // Si on ne peut pas récupérer l'utilisateur, on nettoie les tokens
    clearTokens();
    return userResponse;
  }

  // 4. Dispatcher l'événement de connexion
  dispatchAuthEvent('auth:logged-in', userResponse.data);

  return userResponse;
}

// ============================================
// Logout
// ============================================

/**
 * Déconnecte l'utilisateur
 */
export async function logout(): Promise<void> {
  const tokens = getTokens();

  // Appeler l'endpoint de logout si on a un refresh token
  if (tokens?.refresh_token) {
    await post(
      AUTH_ENDPOINTS.LOGOUT,
      { refresh_token: tokens.refresh_token },
      false // On n'a pas besoin d'access token pour logout
    );
  }

  // Nettoyer le localStorage dans tous les cas
  clearTokens();
}

// ============================================
// Get Current User
// ============================================

/**
 * Récupère les informations de l'utilisateur connecté
 */
export async function getCurrentUser(): Promise<ApiResponse<User>> {
  const response = await get<User>(USER_ENDPOINTS.ME);

  if (response.success) {
    setStoredUser(response.data);
  }

  return response;
}

// ============================================
// Password Reset
// ============================================

/**
 * Demande la réinitialisation du mot de passe
 */
export async function forgotPassword(email: string): Promise<ApiResponse<unknown>> {
  const request: ForgotPasswordRequest = { email };
  return post(AUTH_ENDPOINTS.FORGOT_PASSWORD, request, false);
}

/**
 * Réinitialise le mot de passe avec un token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ApiResponse<unknown>> {
  const request: ResetPasswordRequest = { token, new_password: newPassword };
  return post(AUTH_ENDPOINTS.RESET_PASSWORD, request, false);
}

// ============================================
// Session Check
// ============================================

/**
 * Vérifie si la session est valide et récupère les infos utilisateur
 * À appeler au chargement de la page
 */
export async function checkSession(): Promise<User | null> {
  if (!isAuthenticated()) {
    return null;
  }

  // Essayer de récupérer l'utilisateur en cache
  const cachedUser = getStoredUser();

  // Valider la session en appelant /users/me
  const response = await getCurrentUser();

  if (response.success) {
    return response.data;
  }

  // Session invalide
  return cachedUser; // On retourne quand même le cache si disponible
}

// ============================================
// Exports groupés
// ============================================

export const authService = {
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  checkSession,
};

export default authService;
