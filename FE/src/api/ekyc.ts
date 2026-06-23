import { request } from './http'
import type { ApiResult, FaceMatchResultDto, LivenessResultDto, OcrResultDto } from '../types'

function unwrapData<T>(data: unknown): T | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const nested = o.data ?? o.Data
  if (nested && typeof nested === 'object') return nested as T
  return null
}

function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (v !== undefined && v !== null) return v as T
  }
  return undefined
}

export const ekycApi = {
  checkCitizenId: (citizenId: string) =>
    request<ApiResult>(`/api/EKyc/check-citizen-id?citizenId=${encodeURIComponent(citizenId)}`, {
      auth: true,
    }),

  ocr: (file: File) => {
    const fd = new FormData()
    fd.append('image', file)
    return request<ApiResult>('/api/EKyc/ocr', { method: 'POST', body: fd, auth: true })
  },

  faceMatch: (faceImage: File, idCardImage: File) => {
    const fd = new FormData()
    fd.append('faceImage', faceImage)
    fd.append('idCardImage', idCardImage)
    return request<ApiResult>('/api/EKyc/face-match', { method: 'POST', body: fd, auth: true })
  },

  liveness: (videoFile: File, cmndImage: File) => {
    const fd = new FormData()
    fd.append('videoFile', videoFile)
    fd.append('cmndImage', cmndImage)
    return request<ApiResult>('/api/EKyc/liveness', { method: 'POST', body: fd, auth: true })
  },
}

export function parseOcr(data: unknown): OcrResultDto | null {
  const raw = unwrapData<Record<string, unknown>>(data) ?? (data as Record<string, unknown> | null)
  if (!raw || typeof raw !== 'object') return null
  return {
    id: pick(raw, 'id', 'Id'),
    name: pick(raw, 'name', 'Name'),
    dob: pick(raw, 'dob', 'Dob'),
    sex: pick(raw, 'sex', 'Sex'),
    nationality: pick(raw, 'nationality', 'Nationality'),
    home: pick(raw, 'home', 'Home'),
    address: pick(raw, 'address', 'Address'),
    doe: pick(raw, 'doe', 'Doe'),
    issueDate: pick(raw, 'issueDate', 'IssueDate'),
    issueLoc: pick(raw, 'issueLoc', 'IssueLoc'),
    type: pick(raw, 'type', 'Type'),
    overallScore: Number(pick(raw, 'overallScore', 'OverallScore') ?? 0) || undefined,
  }
}

export function parseFaceMatch(data: unknown): FaceMatchResultDto | null {
  const raw = unwrapData<Record<string, unknown>>(data)
  if (!raw) return null
  return {
    isMatch: Boolean(pick(raw, 'isMatch', 'IsMatch')),
    similarity: Number(pick(raw, 'similarity', 'Similarity') ?? 0),
    isBothImgIdCard: Boolean(pick(raw, 'isBothImgIdCard', 'IsBothImgIdCard')),
    fptMessage: pick(raw, 'fptMessage', 'FptMessage'),
  }
}

export function parseLiveness(data: unknown): LivenessResultDto | null {
  const raw = unwrapData<Record<string, unknown>>(data)
  if (!raw) return null
  return {
    isLive: Boolean(pick(raw, 'isLive', 'IsLive')),
    spoofProbability: Number(pick(raw, 'spoofProbability', 'SpoofProbability') ?? 0),
    needToReview: Boolean(pick(raw, 'needToReview', 'NeedToReview')),
    isDeepfake: Boolean(pick(raw, 'isDeepfake', 'IsDeepfake')),
    warning: pick(raw, 'warning', 'Warning'),
    livenessCode: pick(raw, 'livenessCode', 'LivenessCode'),
    livenessMessage: pick(raw, 'livenessMessage', 'LivenessMessage'),
    fptMessage: pick(raw, 'fptMessage', 'FptMessage'),
  }
}
