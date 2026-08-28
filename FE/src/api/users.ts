import { request } from './http'
import type { ApiResult, UpdateCitizenProfileDto, UpdateProfileDto } from '../types'

export interface UserDocumentDto {
  id: string
  documentType: string
  fileName: string
  fileUrl?: string | null
  status?: string | null
}

export interface UserHouseholdMemberDto {
  memberId: string
  fullName: string
  citizenId?: string | null
  dateOfBirth?: string | null
  relationship: string
  occupation?: string | null
  monthlyIncome?: number | null
  isDependent: boolean
  dependentReason?: string | null
  dependentReasonLabel?: string | null
  hasMeritService?: boolean
  meritDetails?: string | null
  note?: string | null
}

export interface UserHouseholdMemberRequestDto {
  fullName: string
  citizenId?: string | null
  dateOfBirth?: string | null
  relationship: string
  occupation?: string | null
  monthlyIncome?: number | null
  isDependent: boolean
  dependentReason?: string | null
  hasMeritService: boolean
  meritDetails?: string | null
  note?: string | null
}

export const usersApi = {
  getProfile: () => request<ApiResult>('/api/Users/profile', { auth: true }),

  getFullProfile: () => request<ApiResult>('/api/Users/profile/full', { auth: true }),

  getApplicationPrefill: () => request<ApiResult>('/api/Users/profile/prefill', { auth: true }),

  updateProfile: (body: UpdateProfileDto) =>
    request<ApiResult>('/api/Users/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
    }),

  updateCitizenProfile: (body: UpdateCitizenProfileDto) =>
    request<ApiResult>('/api/Users/profile/citizen', {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
    }),

  getDocuments: () => request<unknown>('/api/Users/documents', { auth: true }),

  getHouseholdMembers: () => request<unknown>('/api/Users/household-members', { auth: true }),

  createHouseholdMember: (body: UserHouseholdMemberRequestDto) =>
    request<ApiResult>('/api/Users/household-members', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  updateHouseholdMember: (memberId: string, body: UserHouseholdMemberRequestDto) =>
    request<ApiResult>(`/api/Users/household-members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
    }),

  deleteHouseholdMember: (memberId: string) =>
    request<ApiResult>(`/api/Users/household-members/${memberId}`, {
      method: 'DELETE',
      auth: true,
    }),

  uploadDocument: (documentType: string, file: File, description?: string) => {
    const fd = new FormData()
    fd.append('DocumentType', documentType)
    fd.append('File', file)
    if (description?.trim()) fd.append('Description', description.trim())
    return request<ApiResult>('/api/Users/documents', {
      method: 'POST',
      body: fd,
      auth: true,
    })
  },

  deleteDocument: (documentId: string) =>
    request<ApiResult>(`/api/Users/documents/${documentId}`, {
      method: 'DELETE',
      auth: true,
    }),

  uploadProfileImage: (file: File) => {
    const fd = new FormData()
    fd.append('Image', file)
    return request<ApiResult>('/api/Users/profile/image', {
      method: 'POST',
      body: fd,
      auth: true,
    })
  },

  deleteProfileImage: () =>
    request<ApiResult>('/api/Users/profile/image', {
      method: 'DELETE',
      auth: true,
    }),

  adminOnly: () => request<ApiResult>('/api/Users/admin-only', { auth: true }),

  officerOnly: () => request<ApiResult>('/api/Users/officer-only', { auth: true }),

  deleteAccount: (body: { password: string; reason?: string }) =>
    request<ApiResult>('/api/Users/delete-account', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),
}
