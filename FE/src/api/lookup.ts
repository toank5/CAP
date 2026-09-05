import { request } from './http'

/**
 * Lookup APIs (public, không cần auth).
 *  - GET /api/lookup/document-types                  : tất cả loại giấy tờ
 *  - GET /api/lookup/document-types/required         : giấy tờ bắt buộc theo priorityGroup
 *  - GET /api/lookup/priority-groups                 : nhóm đối tượng NOXH
 */

export interface DocumentTypeDto {
  code: string
  label: string
}

export type ProfileDocumentTypeDto = DocumentTypeDto

export type HouseholdRelationshipDto = DocumentTypeDto

export interface PriorityGroupDto {
  code: string
  label: string
  requiresIncomeCertificate?: boolean
  isPovertyGroup?: boolean
  requiredDocumentType?: string | null
  requiredDocumentLabel?: string | null
}

function pickArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    const items = o.items ?? o.Items ?? o.data ?? o.Data
    if (Array.isArray(items)) return items
  }
  return []
}

export const lookupApi = {
  documentTypes: () => request<unknown>('/api/lookup/document-types'),

  profileDocumentTypes: () => request<unknown>('/api/lookup/profile-document-types'),

  householdRelationships: () => request<unknown>('/api/lookup/household-relationships'),

  requiredProfileDocumentTypes: (params: {
    maritalStatus?: string
    housingStatus?: string
    hasDependentMembers?: boolean
  } = {}) => {
    const query = new URLSearchParams()
    if (params.maritalStatus) query.set('maritalStatus', params.maritalStatus)
    if (params.housingStatus) query.set('housingStatus', params.housingStatus)
    if (params.hasDependentMembers) query.set('hasDependentMembers', 'true')
    const qs = query.toString()
    return request<unknown>(`/api/lookup/profile-document-types/required${qs ? `?${qs}` : ''}`)
  },

  requiredDocumentTypes: (priorityGroup?: string) => {
    const qs = priorityGroup ? `?priorityGroup=${encodeURIComponent(priorityGroup)}` : ''
    return request<unknown>(`/api/lookup/document-types/required${qs}`)
  },

  priorityGroups: () => request<unknown>('/api/lookup/priority-groups'),

  dependentReasons: () => request<unknown>('/api/lookup/dependent-reasons'),
}

export interface DependentReasonDto {
  code: string
  label: string
}

export function parseDependentReasons(data: unknown): DependentReasonDto[] {
  return pickArray(data).map((it) => {
    const x = it as Record<string, unknown>
    return {
      code: String(x.code ?? x.Code ?? ''),
      label: String(x.label ?? x.Label ?? x.code ?? ''),
    }
  })
}

export function parseDocumentTypes(data: unknown): DocumentTypeDto[] {
  return pickArray(data).map((it) => {
    const x = it as Record<string, unknown>
    return {
      code: String(x.code ?? x.Code ?? ''),
      label: String(x.label ?? x.Label ?? x.code ?? ''),
    }
  })
}

export function parsePriorityGroups(data: unknown): PriorityGroupDto[] {
  return pickArray(data).map((it) => {
    const x = it as Record<string, unknown>
    return {
      code: String(x.code ?? x.Code ?? ''),
      label: String(x.label ?? x.Label ?? x.code ?? ''),
      requiresIncomeCertificate: Boolean(x.requiresIncomeCertificate ?? x.RequiresIncomeCertificate),
      isPovertyGroup: Boolean(x.isPovertyGroup ?? x.IsPovertyGroup),
      requiredDocumentType: (x.requiredDocumentType ?? x.RequiredDocumentType) as string | null | undefined,
      requiredDocumentLabel: (x.requiredDocumentLabel ?? x.RequiredDocumentLabel) as string | null | undefined,
    }
  })
}

