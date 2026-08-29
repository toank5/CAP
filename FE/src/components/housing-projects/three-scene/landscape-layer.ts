import * as THREE from 'three'
import type { MaterialPalette } from './materials'
import type { MasterplanBounds } from './types'

export class LandscapeLayer {
  public group: THREE.Group

  constructor(bounds: MasterplanBounds, materials: MaterialPalette) {
    this.group = new THREE.Group()

    const siteWidth = Math.max(125, bounds.totalBuildingWidth + 75)
    const siteDepth = Math.max(88, bounds.totalBuildingDepth + 68)

    // 1. Thảm cỏ tự nhiên bao phủ toàn bộ khuôn viên
    const grassGeo = new THREE.BoxGeometry(siteWidth, 0.6, siteDepth)
    const grass = new THREE.Mesh(grassGeo, materials.grassMat)
    grass.position.set(bounds.centerOffsetX, -0.3, 0)
    grass.receiveShadow = true
    this.group.add(grass)

    // 2. Tuyến đường giao thông riêng biệt hoàn toàn (Dedicated Clean Roadway Zone)
    const roadZ = bounds.maxZ + 16
    const roadWidth = siteWidth
    const roadDepth = 13.5 // Chiều rộng 13.5m thông thoáng, không có bất kỳ vật cản nào

    const roadGeo = new THREE.BoxGeometry(roadWidth, 0.08, roadDepth)
    const road = new THREE.Mesh(roadGeo, materials.asphaltMat)
    road.position.set(0, 0.04, roadZ)
    road.receiveShadow = true
    this.group.add(road)

    // Vạch kẻ đường tim đường đứt nét
    const halfW = roadWidth / 2 - 4
    for (let lx = -halfW; lx <= halfW; lx += 6) {
      const lineGeo = new THREE.BoxGeometry(3.0, 0.02, 0.3)
      const lineMesh = new THREE.Mesh(lineGeo, materials.roadLineMat)
      lineMesh.position.set(lx, 0.09, roadZ)
      this.group.add(lineMesh)
    }

    // Vạch đi bộ qua đường (Zebra Crossing)
    for (let zx = -4.5; zx <= 4.5; zx += 1.4) {
      const zGeo = new THREE.BoxGeometry(0.85, 0.02, roadDepth - 1.5)
      const zMesh = new THREE.Mesh(zGeo, materials.zebraMat)
      zMesh.position.set(zx, 0.09, roadZ)
      this.group.add(zMesh)
    }

    // 3. Vỉa hè ngăn cách giữa khu dân cư và lòng đường (Separation Sidewalk & Curb)
    const curbZ = roadZ - roadDepth / 2 // Z = bounds.maxZ + 9.25
    const sidewalkDepth = 3.5
    const sidewalkZ = curbZ - sidewalkDepth / 2 // Z = bounds.maxZ + 7.5

    const frontWalkGeo = new THREE.BoxGeometry(siteWidth - 4, 0.22, sidewalkDepth)
    const frontWalk = new THREE.Mesh(frontWalkGeo, materials.sidewalkMat)
    frontWalk.position.set(0, 0.11, sidewalkZ)
    frontWalk.receiveShadow = true
    this.group.add(frontWalk)

    // Gờ bó vỉa bê tông ngăn cách dứt khoát
    const curbGeo = new THREE.BoxGeometry(siteWidth - 4, 0.26, 0.3)
    const curbMesh = new THREE.Mesh(curbGeo, materials.curbMat)
    curbMesh.position.set(0, 0.13, curbZ)
    curbMesh.receiveShadow = true
    this.group.add(curbMesh)

    // 4. Quảng trường & Sảnh đón trước tòa nhà (Residential Plaza Zone)
    const plazaDepth = Math.max(10, bounds.maxZ + 4)
    const plazaWidth = Math.max(32, bounds.totalBuildingWidth + 18)
    const plazaZ = bounds.maxZ + 1.5

    const plazaGeo = new THREE.BoxGeometry(plazaWidth, 0.18, plazaDepth)
    const plaza = new THREE.Mesh(plazaGeo, materials.plazaTileMat)
    plaza.position.set(bounds.centerOffsetX, 0.09, plazaZ)
    plaza.receiveShadow = true
    this.group.add(plaza)

    // 5. Đường đi dạo kết nối sân trước, công viên, hồ bơi, sân thể thao và BBQ
    const addPathwaySegment = (px: number, pz: number, pw: number, pd: number) => {
      const pathMesh = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.1, pd), materials.parkPathMat)
      pathMesh.position.set(px, 0.05, pz)
      pathMesh.receiveShadow = true
      this.group.add(pathMesh)
    }

    // Đường dạo sườn trái
    addPathwaySegment(bounds.minX - 10, bounds.maxZ + 2, 2.4, 10)
    addPathwaySegment(bounds.minX - 18, bounds.minZ + 2, 2.4, bounds.totalBuildingDepth + 12)
    addPathwaySegment(bounds.minX - 10, bounds.minZ - 6, 18, 2.4)

    // Đường dạo sườn phải
    addPathwaySegment(bounds.maxX + 10, bounds.maxZ + 2, 2.4, 10)
    addPathwaySegment(bounds.maxX + 18, bounds.minZ + 2, 2.4, bounds.totalBuildingDepth + 12)
    addPathwaySegment(bounds.maxX + 10, bounds.minZ - 6, 18, 2.4)

    // Trục đường dạo sân sau kết nối hồ bơi - BBQ - sân thể thao
    addPathwaySegment(bounds.centerOffsetX, bounds.minZ - 6, bounds.totalBuildingWidth + 30, 2.4)
    addPathwaySegment(bounds.centerOffsetX, bounds.minZ - 18, 2.4, 22)
    addPathwaySegment(bounds.centerOffsetX, bounds.minZ - 28, 24, 2.4)

    // 6. Đài phun nước cảnh quan trung tâm sảnh đón (Nằm gọn trong quảng trường)
    const fountainZ = bounds.maxZ + 3.0
    const ringGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.45, 24)
    const ringMesh = new THREE.Mesh(ringGeo, materials.curbMat)
    ringMesh.position.set(bounds.centerOffsetX, 0.35, fountainZ)
    ringMesh.receiveShadow = true
    ringMesh.castShadow = true
    this.group.add(ringMesh)

    const waterGeo = new THREE.CylinderGeometry(3.0, 3.0, 0.12, 24)
    const waterMesh = new THREE.Mesh(waterGeo, materials.poolWaterMat)
    waterMesh.position.set(bounds.centerOffsetX, 0.55, fountainZ)
    this.group.add(waterMesh)

    // Vòi phun nước
    const spoutGeo = new THREE.CylinderGeometry(0.25, 0.4, 0.9, 12)
    const spoutMesh = new THREE.Mesh(spoutGeo, materials.metalDarkMat)
    spoutMesh.position.set(bounds.centerOffsetX, 0.85, fountainZ)
    spoutMesh.castShadow = true
    this.group.add(spoutMesh)
  }

  public dispose() {
    this.group.clear()
  }
}
