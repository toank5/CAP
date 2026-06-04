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

export interface UserProfileDto {
  id?: string
  email: string
  fullName: string
  phoneNumber?: string | null
  role?: string
  profileImageUrl?: string
  createdAt?: string
  updatedAt?: string
}

export type ApiResult = unknown

export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string[]>
}

export interface HousingProjectDto {
  id?: string
  name: string
  location: string
  description?: string
  totalUnits: number
  availableUnits: number
  pricePerUnit: number
  constructionStartDate?: string
  expectedCompletionDate?: string
  status?: string
  imageUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateHousingProjectRequestDto {
  name: string
  location: string
  description?: string
  totalUnits: number
  availableUnits: number
  pricePerUnit: number
  constructionStartDate?: string
  expectedCompletionDate?: string
}

export interface ProjectFilterDto {
  search?: string
  location?: string
  minPrice?: number
  maxPrice?: number
  minAvailable?: number
  status?: string
}

export interface CreatePaymentDto {
  projectId: string
  amount: number
  description?: string
  returnUrl?: string
}

export interface PaymentInfoDto {
  orderId: string
  amount: number
  description?: string
  status?: string
  createdAt?: string
  paymentUrl?: string
}

export interface PaymentResponseDto {
  paymentUrl: string
  orderId: string
}
