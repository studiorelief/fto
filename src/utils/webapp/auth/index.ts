/**
 * Auth Module - France Tourisme Observation
 *
 * Module d'authentification complet
 */

// Services
export { authService, checkSession, getCurrentUser, login, logout } from './authService';
export { forgotPassword, resetPassword } from './authService';

// State
export {
  getStoredUser,
  getTokens,
  hasPermission,
  isAdmin,
  isAuthenticated,
  onAuthEvent,
} from './authState';

// Form Handler
export { initAuthForm } from './authForm';
export { default as authForm } from './authForm';

// Auth Guard - Protection des pages
export {
  authGuard,
  initAuthGuard,
  isProtectedPage,
  isTokenExpired,
  isTokenExpiringSoon,
  redirectToLogin,
  redirectAfterLogin,
} from './authGuard';
