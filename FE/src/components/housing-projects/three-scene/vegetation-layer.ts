import * as THREE from 'three'
import type { MaterialPalette } from './materials'
import type { MasterplanBounds } from './types'

export class VegetationLayer {
  public group: THREE.Group

  constructor(bounds: MasterplanBounds, materials: MaterialPalette) {
    this.group = new THREE.Group()

    const z0 = bounds.maxZ
    const sidewalkZ = z0 + 7.5 // Nằm gọn gàng trên vỉa hè nội khu

    // 1. Cụm cây bóng mát dọc vỉa hè nội khu (Hoàn toàn nằm sau gờ vỉa hè, không bao giờ lấn ra lòng đường)
    const frontTreeXs = [
      bounds.minX - 22,
      bounds.minX - 12,
      bounds.minX - 4,
      bounds.maxX + 4,
      bounds.maxX + 12,
      bounds.maxX + 22,
    ]

    frontTreeXs.forEach((tx, i) => {
      this.addCanopyTree(tx, sidewalkZ, 1.05 + (i % 3) * 0.1, (i % 3), materials)
    })

    // 2. Cây xanh sân vườn hai bên và phía sau tòa nhà (Nằm hoàn toàn trong khuôn viên nội khu)
    const gardenTrees: [number, number, number, number][] = [
      // Bên trái tòa nhà
      [bounds.minX - 12, bounds.minZ + 2, 1.2, 0],
      [bounds.minX - 18, bounds.minZ - 8, 1.35, 1],
      [bounds.minX - 22, bounds.minZ - 18, 1.4, 2],
      [bounds.minX - 24, z0 - 4, 1.25, 0],

      // Phía sau tòa nhà (Sân vườn tĩnh lặng gần hồ bơi & sân thể thao)
      [bounds.centerOffsetX - 16, bounds.minZ - 20, 1.3, 1],
      [bounds.centerOffsetX, bounds.minZ - 20, 1.45, 0],
      [bounds.centerOffsetX + 16, bounds.minZ - 20, 1.3, 2],
      [bounds.minX - 8, bounds.minZ - 24, 1.2, 0],
      [bounds.maxX + 8, bounds.minZ - 24, 1.2, 1],

      // Bên phải tòa nhà
      [bounds.maxX + 12, bounds.minZ + 2, 1.2, 2],
      [bounds.maxX + 18, bounds.minZ - 8, 1.35, 0],
      [bounds.maxX + 22, bounds.minZ - 18, 1.4, 1],
      [bounds.maxX + 24, z0 - 4, 1.25, 2],

      // Vòng ngoài góc sau
      [bounds.minX - 32, bounds.minZ - 24, 1.5, 0],
      [bounds.maxX + 32, bounds.minZ - 24, 1.5, 1],
    ]

    gardenTrees.forEach(([gx, gz, gs, gt]) => {
      this.addCanopyTree(gx, gz, gs, gt, materials)
    })

    // 3. Cây bụi cảnh quan & Bồn hoa viền quảng trường (Nằm hoàn toàn ở quảng trường, cách xa đường)
    this.buildShrubsAndHedges(bounds, materials)
  }

  /** Tạo cây bóng mát tán xum xuê (Canopy Tree) */
  private addCanopyTree(
    x: number,
    z: number,
    scale: number,
    type: number,
    mat: MaterialPalette
  ) {
    const tree = new THREE.Group()
    tree.position.set(x, 0, z)
    tree.rotation.y = (x * 37 + z * 19) % (Math.PI * 2)

    // Thân cây gỗ tự nhiên
    const trunkGeo = new THREE.CylinderGeometry(0.2 * scale, 0.35 * scale, 2.8 * scale, 7)
    const trunk = new THREE.Mesh(trunkGeo, mat.trunkMat)
    trunk.position.y = 1.4 * scale
    trunk.castShadow = true
    tree.add(trunk)

    const leafMat = type === 0 ? mat.leafMatMedium : type === 1 ? mat.leafMatDark : mat.leafMatLight

    if (type === 0) {
      // Cây tán tròn nhiều tầng
      const s1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8 * scale, 1), leafMat)
      s1.position.y = 3.2 * scale
      s1.castShadow = true
      tree.add(s1)

      const s2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 * scale, 1), mat.leafMatLight)
      s2.position.set(0.3 * scale, 4.3 * scale, 0.2 * scale)
      s2.castShadow = true
      tree.add(s2)
    } else if (type === 1) {
      // Cây bàng tán tầng
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.9 * scale, 1.5 * scale, 7), leafMat)
      c1.position.y = 2.5 * scale
      c1.castShadow = true
      tree.add(c1)

      const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.4 * scale, 1.3 * scale, 7), mat.leafMatMedium)
      c2.position.y = 3.6 * scale
      c2.castShadow = true
      tree.add(c2)

      const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.9 * scale, 1.1 * scale, 7), mat.leafMatLight)
      c3.position.y = 4.6 * scale
      c3.castShadow = true
      tree.add(c3)
    } else {
      // Cây tán rộng sum suê
      const s1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0 * scale, 1), leafMat)
      s1.position.y = 3.5 * scale
      s1.castShadow = true
      tree.add(s1)
    }

    this.group.add(tree)
  }

  /** Cây bụi trang trí trong quảng trường sảnh đón */
  private buildShrubsAndHedges(bounds: MasterplanBounds, mat: MaterialPalette) {
    const bushGeo = new THREE.DodecahedronGeometry(0.55, 1)

    const bushPositions: [number, number][] = [
      [bounds.centerOffsetX - 11, bounds.maxZ + 4],
      [bounds.centerOffsetX - 7, bounds.maxZ + 4],
      [bounds.centerOffsetX + 7, bounds.maxZ + 4],
      [bounds.centerOffsetX + 11, bounds.maxZ + 4],
    ]

    bushPositions.forEach(([bx, bz]) => {
      const bush = new THREE.Mesh(bushGeo, mat.bushMat)
      bush.position.set(bx, 0.35, bz)
      bush.castShadow = true
      this.group.add(bush)
    })
  }

  public dispose() {
    this.group.clear()
  }
}
