/**
 * API Types - France Tourisme Observation
 *
 * Interfaces TypeScript pour les requêtes et réponses API
 */

// ============================================
// Generic API Response
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

// ============================================
// Auth Types
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

// Alias pour login
export type UserLogin = LoginRequest;

export interface TokenWithRefresh {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

// ============================================
// User Types
// ============================================

export interface User {
  id: number;
  email: string;
  name: string;
  company_name?: string;
  custom_permissions: string; // JSON string with array of permissions
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  password: string;
  name: string;
  company_id?: number;
  custom_permissions?: string;
}

// ============================================
// Company Types
// ============================================

export interface CompanyResponse {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyCreate {
  name: string;
  description?: string;
}

// ============================================
// Category Types
// ============================================

export interface CategoryResponse {
  id: number;
  name: string;
  image_url: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  description?: string;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
}

// ============================================
// Report Types
// ============================================

export interface ReportResponse {
  id: number;
  name: string;
  description?: string;
  category_id: number;
  category_name?: string;
  powerbi_report_guid?: string; // GUID du rapport dans le service Power BI (vide si non connecté et public: false)
  powerbi_description?: string; // Description Power BI (enrichi si authentifié)
  powerbi_lastupdate?: string; // Date de dernière mise à jour Power BI (enrichi si authentifié)
  image_url?: string;
  public: boolean; // true = rapport public, false = réservé aux membres
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ReportCreate {
  name: string;
  description?: string;
  category_id: number;
  image_url?: string;
  active?: boolean;
}

export interface ReportUpdate {
  name?: string;
  description?: string;
  category_id?: number;
  image_url?: string;
  active?: boolean;
}

// ============================================
// Power BI Embed
// ============================================

export interface EmbedTokenResponse {
  token: string;
  tokenId?: string;
  expiration?: string;
}

/**
 * Réponse de GET /reports/{id}/embedconfig
 * Objet JSON complet à passer au SDK Power BI pour l'incorporation
 */
export interface EmbedConfigResponse {
  type: string; // 'report'
  id: string; // Power BI report GUID
  embedUrl: string; // URL d'embed Power BI complète
  accessToken: string; // Embed token JWT
  tokenType: string; // 'Embed'
  settings?: {
    navContentPaneEnabled?: boolean;
    filterPaneEnabled?: boolean;
  };
}

// ============================================
// Admin Types
// ============================================

export interface LoginAttempt {
  id: number;
  email: string;
  ip_address: string;
  success: boolean;
  failure_reason?: string;
  created_at: string;
}

export interface ActiveSession {
  id: number;
  user_id: number;
  user_email: string;
  created_at: string;
  expires_at: string;
}
