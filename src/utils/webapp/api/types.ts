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
  description?: string;
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
  slug?: string;
  description?: string;
  category_id: number;
  category_name?: string;
  embed_url?: string;
  image_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportCreate {
  name: string;
  description?: string;
  category_id: number;
  embed_url?: string;
  image_url?: string;
  active?: boolean;
}

export interface ReportUpdate {
  name?: string;
  description?: string;
  category_id?: number;
  embed_url?: string;
  image_url?: string;
  active?: boolean;
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
