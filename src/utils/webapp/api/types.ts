/**
 * Types TypeScript pour l'API France Tourisme Observation
 * Générés à partir de l'OpenAPI spec
 */

// ============================================
// Auth Types
// ============================================

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserCreate {
  email: string;
  name: string;
  password: string;
  company_id: number;
}

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
  name: string;
  email: string;
  company_id: number;
  company_name: string;
  custom_permissions: string; // JSON string of permissions array
}

export interface UserPermissions {
  permissions: string[];
}

// ============================================
// Category Types
// ============================================

export interface CategoryCreate {
  name: string;
  image_url: string;
  active?: boolean;
}

export interface CategoryResponse {
  id: number;
  name: string;
  image_url: string;
  active: boolean;
}

export interface CategoryUpdate {
  name?: string | null;
  image_url?: string | null;
  active?: boolean | null;
}

// ============================================
// Report Types
// ============================================

export interface ReportCreate {
  category_id: number;
  name: string;
  powerbi_report_guid: string;
  powerbi_workspace_guid: string;
  report_url: string;
  image_url: string;
  active?: boolean;
}

export interface ReportResponse {
  id: number;
  category_id: number;
  category_name: string;
  name: string;
  powerbi_report_guid: string;
  powerbi_workspace_guid: string;
  report_url: string;
  image_url: string;
  active: boolean;
}

export interface ReportUpdate {
  category_id?: number | null;
  name?: string | null;
  powerbi_report_guid?: string | null;
  powerbi_workspace_guid?: string | null;
  report_url?: string | null;
  image_url?: string | null;
  active?: boolean | null;
}

// ============================================
// Company Types
// ============================================

export interface CompanyCreate {
  name: string;
  default_permissions: string[];
}

export interface CompanyResponse {
  id: number;
  name: string;
  default_permissions: string;
}

// ============================================
// Admin Types
// ============================================

export interface LoginAttemptResponse {
  id: number;
  email: string;
  ip_address: string;
  success: boolean;
  timestamp: string;
  user_agent: string | null;
}

// ============================================
// API Error Types
// ============================================

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationError[];
}

export interface APIError {
  detail: string;
}

// ============================================
// API Response Wrapper
// ============================================

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number };
