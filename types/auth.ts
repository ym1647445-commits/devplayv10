export interface RegisterFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthResult {
  success: boolean;
  message: string;
}