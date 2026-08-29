import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CameraPreset, MasterplanBounds } from './types'

export class CameraController {
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private bounds: MasterplanBounds

  constructor(
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    bounds: MasterplanBounds
  ) {
    this.camera = camera
    this.controls = controls
    this.bounds = bounds
  }

  public updateBounds(bounds: MasterplanBounds) {
    this.bounds = bounds
  }

  public setPreset(preset: CameraPreset) {
    const cx = this.bounds.centerOffsetX
    const h = this.bounds.buildingHeight
    const maxZ = this.bounds.maxZ

    if (preset === 'overview') {
      // 3D Isometric View tổng quan toàn khu & trọn vẹn tuyến đường, hồ bơi, tòa nhà
      this.camera.position.set(cx + 38, Math.max(30, h * 1.4), maxZ + 48)
      this.controls.target.set(cx, Math.max(2.5, h * 0.2), 4)
    } else if (preset === 'top') {
      // Nhìn từ trên cao toàn bộ mặt bằng quy hoạch
      this.camera.position.set(cx, Math.max(75, h * 3.5), 0)
      this.controls.target.set(cx, 0, 0)
    } else if (preset === 'front') {
      // Mặt trước sảnh đón chính & toàn tuyến đường thông thoáng
      this.camera.position.set(cx, Math.max(20, h * 0.9), maxZ + 48)
      this.controls.target.set(cx, Math.max(3, h * 0.25), 6)
    } else if (preset === 'street') {
      // Góc nhìn người đi bộ từ đường nội khu
      this.camera.position.set(cx - 15, 3.5, maxZ + 26)
      this.controls.target.set(cx, Math.max(5, h * 0.4), 6)
    } else if (preset === 'playground') {
      // Góc nhìn khu vui chơi trẻ em & sân vườn
      this.camera.position.set(this.bounds.minX - 24, 5.0, maxZ + 10)
      this.controls.target.set(this.bounds.minX - 16, 2.0, maxZ - 2)
    }

    this.controls.update()
  }

  public reset() {
    this.setPreset('overview')
  }
}
