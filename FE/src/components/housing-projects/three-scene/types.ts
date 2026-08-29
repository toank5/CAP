import type { ApartmentDto } from '@/types'

export type TimeOfDay = 'DAY' | 'SUNSET' | 'NIGHT'

export type CameraPreset = 'overview' | 'top' | 'front' | 'street' | 'playground'

export interface MasterplanBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  centerOffsetX: number
  totalBuildingWidth: number
  totalBuildingDepth: number
  buildingHeight: number
  blockBoxes: {
    blockName: string
    x: number
    z: number
    width: number
    depth: number
    height: number
  }[]
}

export interface ThreeSceneProps {
  projectId: string
  apartments?: ApartmentDto[]
  onSelectApartment?: (apt: ApartmentDto) => void
  selectedApartmentId?: string
}
