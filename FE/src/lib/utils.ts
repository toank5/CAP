import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('vi-VN')
  } catch {
    return value
  }
}
