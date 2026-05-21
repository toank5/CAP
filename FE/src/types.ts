export interface RegisterDto {
  email: string
  password: string
  fullName: string
  phoneNumber?: string | null
  role: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface GoogleLoginDto {
  googleIdToken: string
  role?: string | null
}

export interface VerifyOtpDto {
  email: string
  otpCode: string
}

export interface RefreshTokenDto {
  refreshToken: string
}

export interface ForgotPasswordDto {
  email: string
}

export interface ResetPasswordDto {
  email: string
  otpCode: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface UpdateProfileDto {
  fullName: string
  phoneNumber?: string | null
}

export type ApiResult = unknown

export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string[]>
}
