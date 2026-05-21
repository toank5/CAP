import { request } from './http'
import type {
  ApiResult,
  ChangePasswordDto,
  ForgotPasswordDto,
  GoogleLoginDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from '../types'

export const authApi = {
  register: (body: RegisterDto) =>
    request<ApiResult>('/api/Auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: LoginDto) =>
    request<ApiResult>('/api/Auth/login', { method: 'POST', body: JSON.stringify(body) }),

  googleLogin: (body: GoogleLoginDto) =>
    request<ApiResult>('/api/Auth/google-login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verifyOtp: (body: VerifyOtpDto) =>
    request<ApiResult>('/api/Auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  resendOtp: (email: string) =>
    request<ApiResult>('/api/Auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(email),
    }),

  refreshToken: (body: RefreshTokenDto) =>
    request<ApiResult>('/api/Auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: (body: RefreshTokenDto) =>
    request<ApiResult>('/api/Auth/logout', { method: 'POST', body: JSON.stringify(body) }),

  forgotPassword: (body: ForgotPasswordDto) =>
    request<ApiResult>('/api/Auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  resetPassword: (body: ResetPasswordDto) =>
    request<ApiResult>('/api/Auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  changePassword: (body: ChangePasswordDto) =>
    request<ApiResult>('/api/Auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),
}
