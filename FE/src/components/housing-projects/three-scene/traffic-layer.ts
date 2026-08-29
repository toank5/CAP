import * as THREE from 'three'
import type { MaterialPalette } from './materials'
import type { MasterplanBounds } from './types'

export interface DynamicVehicle {
  group: THREE.Group
  speed: number
  direction: 1 | -1
  laneZ: number
  minX: number
  maxX: number
}

export class TrafficLayer {
  public group: THREE.Group
  private vehicles: DynamicVehicle[] = []

  constructor(bounds: MasterplanBounds, materials: MaterialPalette) {
    this.group = new THREE.Group()

    const roadZ = bounds.maxZ + 16
    const siteWidth = Math.max(140, bounds.totalBuildingWidth + 80)
    const minX = -siteWidth / 2 - 10
    const maxX = siteWidth / 2 + 10

    // Lane 1: Đi từ Trái sang Phải trên làn ngoài mặt đường (Z = roadZ + 3.2)
    this.createMovingBus(minX + 15, roadZ + 3.2, 1, 0.12, minX, maxX, materials)
    this.createMovingCar(minX + 50, roadZ + 3.2, 1, 0.16, 0xf8fafc, minX, maxX, materials) // Xe trắng
    this.createMovingMotorbike(minX + 85, roadZ + 3.2, 1, 0.14, minX, maxX, materials)

    // Lane 2: Đi từ Phải sang Trái trên làn trong mặt đường (Z = roadZ - 3.2)
    this.createMovingCar(maxX - 20, roadZ - 3.2, -1, 0.17, 0x0284c7, minX, maxX, materials) // Xe xanh
    this.createMovingCar(maxX - 65, roadZ - 3.2, -1, 0.15, 0xdc2626, minX, maxX, materials) // Xe đỏ
    this.createMovingMotorbike(maxX - 100, roadZ - 3.2, -1, 0.14, minX, maxX, materials)
  }

  public update() {
    this.vehicles.forEach((v) => {
      v.group.position.x += v.speed * v.direction
      if (v.direction === 1 && v.group.position.x > v.maxX) {
        v.group.position.x = v.minX
      } else if (v.direction === -1 && v.group.position.x < v.minX) {
        v.group.position.x = v.maxX
      }
    })
  }

  private createMovingCar(
    startX: number,
    laneZ: number,
    dir: 1 | -1,
    speed: number,
    colorHex: number,
    minX: number,
    maxX: number,
    mat: MaterialPalette
  ) {
    const car = new THREE.Group()
    car.position.set(startX, 0.08, laneZ)
    car.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2

    // Thân xe
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.65, 4.0),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.6 })
    )
    body.position.y = 0.5
    body.castShadow = true
    car.add(body)

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), mat.carGlassMat)
    cabin.position.set(0, 1.0, -0.2)
    cabin.castShadow = true
    car.add(cabin)

    // Đèn pha trước
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.15, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    )
    headlight.position.set(-0.65, 0.5, 2.01)
    const hl2 = headlight.clone()
    hl2.position.x = 0.65
    car.add(headlight)
    car.add(hl2)

    // Đèn hậu đỏ
    const taillight = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.12, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    )
    taillight.position.set(-0.65, 0.5, -2.01)
    const tl2 = taillight.clone()
    tl2.position.x = 0.65
    car.add(taillight)
    car.add(tl2)

    // Bánh xe
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.25, 12)
    const wPositions = [
      [-0.95, 0.3, 1.2],
      [0.95, 0.3, 1.2],
      [-0.95, 0.3, -1.2],
      [0.95, 0.3, -1.2],
    ]
    wPositions.forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeo, mat.tireMat)
      w.rotation.z = Math.PI / 2
      w.position.set(wx, wy, wz)
      w.castShadow = true
      car.add(w)
    })

    this.group.add(car)
    this.vehicles.push({ group: car, speed, direction: dir, laneZ, minX, maxX })
  }

  private createMovingBus(
    startX: number,
    laneZ: number,
    dir: 1 | -1,
    speed: number,
    minX: number,
    maxX: number,
    mat: MaterialPalette
  ) {
    const bus = new THREE.Group()
    bus.position.set(startX, 0.08, laneZ)
    bus.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2

    // Thân xe buýt
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.0, 7.5),
      mat.busMat
    )
    body.position.y = 1.35
    body.castShadow = true
    bus.add(body)

    // Kính dải ngang xe buýt
    const windowStripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.45, 0.8, 6.8),
      mat.carGlassMat
    )
    windowStripe.position.set(0, 1.65, 0)
    bus.add(windowStripe)

    // Đèn pha
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.2, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    )
    headlight.position.set(-0.8, 0.7, 3.76)
    const hl2 = headlight.clone()
    hl2.position.x = 0.8
    bus.add(headlight)
    bus.add(hl2)

    // Bánh xe
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14)
    const wPositions = [
      [-1.15, 0.42, 2.2],
      [1.15, 0.42, 2.2],
      [-1.15, 0.42, -2.2],
      [1.15, 0.42, -2.2],
    ]
    wPositions.forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeo, mat.tireMat)
      w.rotation.z = Math.PI / 2
      w.position.set(wx, wy, wz)
      w.castShadow = true
      bus.add(w)
    })

    this.group.add(bus)
    this.vehicles.push({ group: bus, speed, direction: dir, laneZ, minX, maxX })
  }

  private createMovingMotorbike(
    startX: number,
    laneZ: number,
    dir: 1 | -1,
    speed: number,
    minX: number,
    maxX: number,
    mat: MaterialPalette
  ) {
    const bike = new THREE.Group()
    bike.position.set(startX, 0.08, laneZ)
    bike.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2

    // Người lái xe máy
    const driver = new THREE.Group()
    driver.position.set(0, 0.5, -0.1)

    // Mũ bảo hiểm
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
    )
    helmet.position.y = 1.05
    driver.add(helmet)

    // Áo
    const shirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.5, 0.28),
      mat.clothesYellowMat
    )
    shirt.position.y = 0.65
    driver.add(shirt)

    bike.add(driver)

    // Thân xe máy
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.55, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 })
    )
    body.position.y = 0.45
    body.castShadow = true
    bike.add(body)

    // Bánh xe máy
    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.1, 10)
    const wF = new THREE.Mesh(wheelGeo, mat.tireMat)
    wF.rotation.z = Math.PI / 2
    wF.position.set(0, 0.24, 0.6)
    wF.castShadow = true
    bike.add(wF)

    const wB = wF.clone()
    wB.position.z = -0.6
    bike.add(wB)

    this.group.add(bike)
    this.vehicles.push({ group: bike, speed, direction: dir, laneZ, minX, maxX })
  }

  public dispose() {
    this.vehicles = []
    this.group.clear()
  }
}
