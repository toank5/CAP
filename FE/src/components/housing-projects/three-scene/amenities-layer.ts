import * as THREE from 'three'
import type { MaterialPalette } from './materials'
import type { MasterplanBounds } from './types'
import type { EnvironmentLightingManager } from './environment-lighting'

export class AmenitiesLayer {
  public group: THREE.Group

  constructor(
    bounds: MasterplanBounds,
    materials: MaterialPalette,
    lightingManager: EnvironmentLightingManager
  ) {
    this.group = new THREE.Group()

    // 1. CỘT CỜ TỔ QUỐC VIỆT NAM (Vietnamese Flagpole with Gold Star Flag)
    this.buildVietnamFlagpole(bounds, materials)

    // 2. KHU VUI CHƠI TRẺ EM (Children's Playground - Nằm gọn trong sân vườn bên trái, không lấn đường)
    const playX = bounds.minX - 16
    const playZ = bounds.maxZ - 2
    this.buildPlayground(playX, playZ, materials)

    // 3. BÃI ĐỖ XE NGOÀI TRỜI (Parking Lot - Nằm gọn trong bãi nội bộ bên phải, không lấn đường)
    const parkX = bounds.maxX + 16
    const parkZ = bounds.maxZ - 2
    this.buildParkingLot(parkX, parkZ, materials)

    // 4. HỒ BƠI VÔ CỰC NGHỈ DƯỠNG (Resort Swimming Pool - Sân sau bên trái)
    const poolX = bounds.centerOffsetX - 18
    const poolZ = bounds.minZ - 14
    this.buildSwimmingPool(poolX, poolZ, materials)

    // 5. SÂN THỂ THAO PICKLEBALL / CẦU LÔNG (Sports Court - Sân sau bên phải)
    const courtX = bounds.centerOffsetX + 18
    const courtZ = bounds.minZ - 14
    this.buildSportsCourt(courtX, courtZ, materials)

    // 6. CHÒI NGHỈ & KHU TIỆC NƯỚNG BBQ (BBQ Pavilion & Gazebo - Sân sau trung tâm)
    const gazeboX = bounds.centerOffsetX
    const gazeboZ = bounds.minZ - 24
    this.buildBBQAndGazebo(gazeboX, gazeboZ, materials)

    // 7. HỆ THỐNG ĐÈN NẤM SÂN VƯỜN (Bollard Lights)
    this.buildGardenBollardLights(bounds, materials)

    // 8. TRẠM BẢO VỆ & CỔNG BARRIER AN NINH (Trên vỉa hè lối vào)
    this.buildGuardBoothAndBarrier(bounds, materials)

    // 9. CƯ DÂN & NGƯỜI ĐI BỘ (Pedestrians & Residents)
    this.buildPedestrians(bounds, materials)

    // 10. BỒN HOA CẢNH QUAN RỰC RỠ (Colorful Flowerbeds)
    this.buildFlowerbeds(bounds, materials)

    // 11. TRỤ CỨU HỎA ĐÔ THỊ (Fire Hydrants)
    this.buildFireHydrants(bounds, materials)

    // 12. ĐÈN ĐƯỜNG ĐÔ THỊ (Street Lamps)
    this.buildStreetLamps(bounds, materials, lightingManager)

    // 13. GHẾ NGHỈ CÔNG VIÊN & THÙNG RÁC (Benches & Trash Bins)
    this.buildBenchesAndBins(bounds, materials)

    // 14. BIỂN CHỈ DẪN DỰ ÁN (Wayfinding Totem)
    this.buildWayfindingSign(bounds, materials)
  }

  /** Xây dựng Cột cờ Tổ quốc Việt Nam */
  private buildVietnamFlagpole(bounds: MasterplanBounds, mat: MaterialPalette) {
    const flagGroup = new THREE.Group()
    const flagX = bounds.centerOffsetX - 7
    const flagZ = bounds.maxZ + 3.0
    flagGroup.position.set(flagX, 0, flagZ)

    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.25, 20), mat.plazaTileMat)
    base1.position.y = 0.125
    base1.receiveShadow = true
    flagGroup.add(base1)

    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.25, 20), mat.curbMat)
    base2.position.y = 0.375
    base2.receiveShadow = true
    flagGroup.add(base2)

    const base3 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.25, 20), mat.plazaTileMat)
    base3.position.y = 0.625
    base3.receiveShadow = true
    flagGroup.add(base3)

    const poleHeight = 10.0
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.16, poleHeight, 12),
      mat.inoxPoleMat
    )
    pole.position.y = 0.75 + poleHeight / 2
    pole.castShadow = true
    flagGroup.add(pole)

    const finial = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.95, roughness: 0.1 })
    )
    finial.position.y = 0.75 + poleHeight + 0.15
    finial.castShadow = true
    flagGroup.add(finial)

    const flagWidth = 3.6
    const flagHeight = 2.4
    const flagMesh = new THREE.Mesh(
      new THREE.BoxGeometry(flagWidth, flagHeight, 0.04),
      mat.vietnamFlagMat
    )
    flagMesh.position.set(flagWidth / 2 + 0.05, 0.75 + poleHeight - flagHeight / 2 - 0.2, 0)
    flagMesh.rotation.y = 0.15
    flagMesh.castShadow = true
    flagGroup.add(flagMesh)

    this.group.add(flagGroup)
  }

  /** Xây dựng Hồ bơi vô cực */
  private buildSwimmingPool(x: number, z: number, mat: MaterialPalette) {
    const poolGroup = new THREE.Group()
    poolGroup.position.set(x, 0, z)

    const deck = new THREE.Mesh(new THREE.BoxGeometry(18, 0.16, 13), mat.poolDeckMat)
    deck.position.y = 0.08
    deck.receiveShadow = true
    poolGroup.add(deck)

    const curb = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.22, 9.4), mat.poolCurbMat)
    curb.position.y = 0.11
    curb.receiveShadow = true
    poolGroup.add(curb)

    const water = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.1, 8.6), mat.poolWaterMat)
    water.position.y = 0.18
    poolGroup.add(water)

    const addLounger = (lx: number, lz: number) => {
      const lounger = new THREE.Group()
      lounger.position.set(lx, 0.16, lz)

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 1.8), mat.sunLoungerMat)
      body.position.y = 0.15
      body.castShadow = true
      lounger.add(body)

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.6), mat.sunLoungerMat)
      back.position.set(0, 0.35, -0.6)
      back.rotation.x = Math.PI / 6
      lounger.add(back)

      poolGroup.add(lounger)
    }

    addLounger(-4.5, 4.8)
    addLounger(-2.5, 4.8)
    addLounger(2.5, 4.8)
    addLounger(4.5, 4.8)

    const addUmbrella = (ux: number, uz: number) => {
      const umbrella = new THREE.Group()
      umbrella.position.set(ux, 0.16, uz)

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 8), mat.inoxPoleMat)
      pole.position.y = 1.4
      pole.castShadow = true
      umbrella.add(pole)

      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.7, 8), mat.umbrellaMat)
      canopy.position.y = 2.7
      canopy.castShadow = true
      umbrella.add(canopy)

      poolGroup.add(umbrella)
    }

    addUmbrella(-3.5, 5.4)
    addUmbrella(3.5, 5.4)

    const ladder = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), mat.inoxPoleMat)
    ladder.position.set(6.6, 0.45, 0)
    poolGroup.add(ladder)

    this.group.add(poolGroup)
  }

  /** Sân thể thao */
  private buildSportsCourt(x: number, z: number, mat: MaterialPalette) {
    const courtGroup = new THREE.Group()
    courtGroup.position.set(x, 0, z)

    const border = new THREE.Mesh(new THREE.BoxGeometry(18, 0.12, 13), mat.sportsCourtGreenMat)
    border.position.y = 0.06
    border.receiveShadow = true
    courtGroup.add(border)

    const inner = new THREE.Mesh(new THREE.BoxGeometry(15, 0.14, 10), mat.sportsCourtBlueMat)
    inner.position.y = 0.07
    inner.receiveShadow = true
    courtGroup.add(inner)

    const addCourtLine = (lw: number, ld: number, lx: number, lz: number) => {
      const line = new THREE.Mesh(new THREE.BoxGeometry(lw, 0.02, ld), mat.courtLineMat)
      line.position.set(lx, 0.15, lz)
      courtGroup.add(line)
    }

    addCourtLine(14.6, 0.15, 0, 4.8)
    addCourtLine(14.6, 0.15, 0, -4.8)
    addCourtLine(0.15, 9.8, -7.2, 0)
    addCourtLine(0.15, 9.8, 7.2, 0)
    addCourtLine(0.15, 9.8, 0, 0)

    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8)
    const post1 = new THREE.Mesh(postGeo, mat.metalDarkMat)
    post1.position.set(0, 0.7, 5.2)
    post1.castShadow = true
    courtGroup.add(post1)

    const post2 = post1.clone()
    post2.position.z = -5.2
    courtGroup.add(post2)

    const net = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.8, 10.4),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, transparent: true, opacity: 0.85 })
    )
    net.position.set(0, 0.7, 0)
    courtGroup.add(net)

    this.group.add(courtGroup)
  }

  /** Khu BBQ & Chòi nghỉ */
  private buildBBQAndGazebo(x: number, z: number, mat: MaterialPalette) {
    const gazeboGroup = new THREE.Group()
    gazeboGroup.position.set(x, 0, z)

    const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 8), mat.plazaTileMat)
    floor.position.y = 0.08
    floor.receiveShadow = true
    gazeboGroup.add(floor)

    const colGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8)
    const colOffsets = [[-5.4, -3.4], [5.4, -3.4], [-5.4, 3.4], [5.4, 3.4]]
    colOffsets.forEach(([cx, cz]) => {
      const col = new THREE.Mesh(colGeo, mat.inoxPoleMat)
      col.position.set(cx, 1.6, cz)
      col.castShadow = true
      gazeboGroup.add(col)
    })

    const roof = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.25, 8.6), mat.gazeboWoodMat)
    roof.position.y = 3.3
    roof.castShadow = true
    gazeboGroup.add(roof)

    const table = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.75, 1.2), mat.benchWoodMat)
    table.position.set(0, 0.48, 0)
    table.castShadow = true
    gazeboGroup.add(table)

    const bench1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.45, 0.45), mat.benchWoodMat)
    bench1.position.set(0, 0.33, 1.2)
    bench1.castShadow = true
    gazeboGroup.add(bench1)

    const bench2 = bench1.clone()
    bench2.position.z = -1.2
    gazeboGroup.add(bench2)

    const bbqGrill = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.95, 0.8), mat.metalDarkMat)
    bbqGrill.position.set(-4.0, 0.55, 0)
    bbqGrill.castShadow = true
    gazeboGroup.add(bbqGrill)

    const bbqHood = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.8, 4), mat.inoxPoleMat)
    bbqHood.position.set(-4.0, 1.4, 0)
    bbqHood.rotation.y = Math.PI / 4
    gazeboGroup.add(bbqHood)

    this.group.add(gazeboGroup)
  }

  /** Đèn nấm sân vườn */
  private buildGardenBollardLights(bounds: MasterplanBounds, mat: MaterialPalette) {
    const addBollard = (bx: number, bz: number) => {
      const bollard = new THREE.Group()
      bollard.position.set(bx, 0.1, bz)

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.75, 8), mat.metalDarkMat)
      post.position.y = 0.375
      post.castShadow = true
      bollard.add(post)

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat.bollardBulbMat)
      bulb.position.y = 0.75
      bollard.add(bulb)

      const glowPool = new THREE.Mesh(
        new THREE.CircleGeometry(1.2, 12),
        new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.35 })
      )
      glowPool.rotation.x = -Math.PI / 2
      glowPool.position.y = 0.02
      bollard.add(glowPool)

      this.group.add(bollard)
    }

    addBollard(bounds.centerOffsetX - 28, bounds.minZ - 10)
    addBollard(bounds.centerOffsetX - 28, bounds.minZ - 18)
    addBollard(bounds.centerOffsetX - 8, bounds.minZ - 10)
    addBollard(bounds.centerOffsetX - 8, bounds.minZ - 18)

    addBollard(bounds.centerOffsetX + 8, bounds.minZ - 10)
    addBollard(bounds.centerOffsetX + 8, bounds.minZ - 18)
    addBollard(bounds.centerOffsetX + 28, bounds.minZ - 10)
    addBollard(bounds.centerOffsetX + 28, bounds.minZ - 18)

    addBollard(bounds.centerOffsetX - 7, bounds.minZ - 24)
    addBollard(bounds.centerOffsetX + 7, bounds.minZ - 24)

    addBollard(bounds.centerOffsetX - 14, bounds.maxZ + 3)
    addBollard(bounds.centerOffsetX + 14, bounds.maxZ + 3)
  }

  /** Cư dân & Người đi bộ */
  private buildPedestrians(bounds: MasterplanBounds, mat: MaterialPalette) {
    const addPerson = (
      px: number,
      pz: number,
      rotY: number,
      clothesMat: THREE.Material,
      isSitting = false,
      scale = 1
    ) => {
      const person = new THREE.Group()
      person.position.set(px, 0.1, pz)
      person.rotation.y = rotY

      const h = 1.7 * scale

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18 * scale, 12, 12), mat.skinMat)
      head.position.y = h - 0.18 * scale
      head.castShadow = true
      person.add(head)

      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19 * scale, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat.hairDarkMat)
      hair.position.y = h - 0.16 * scale
      person.add(hair)

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.65 * scale, 0.25 * scale), clothesMat)
      body.position.y = isSitting ? h - 0.65 * scale : h - 0.55 * scale
      body.castShadow = true
      person.add(body)

      if (!isSitting) {
        const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.09 * scale, 0.75 * scale, 8), mat.pantsDarkMat)
        leg1.position.set(-0.12 * scale, 0.38 * scale, 0)
        leg1.castShadow = true
        person.add(leg1)

        const leg2 = leg1.clone()
        leg2.position.x = 0.12 * scale
        person.add(leg2)
      } else {
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.38 * scale, 0.18 * scale, 0.45 * scale), mat.pantsDarkMat)
        thigh.position.set(0, 0.45 * scale, 0.2 * scale)
        thigh.castShadow = true
        person.add(thigh)
      }

      this.group.add(person)
    }

    addPerson(bounds.centerOffsetX - 4, bounds.maxZ + 7.5, Math.PI / 2, mat.clothesBlueMat, false, 1.05)
    addPerson(bounds.centerOffsetX - 3, bounds.maxZ + 7.5, Math.PI / 2, mat.clothesRedMat, false, 0.95)

    addPerson(bounds.centerOffsetX + 6, bounds.maxZ + 2.0, -Math.PI / 4, mat.clothesWhiteMat, false, 1.0)
    addPerson(bounds.minX - 6, bounds.maxZ + 2.5, Math.PI / 3, mat.clothesYellowMat, false, 1.02)

    addPerson(bounds.centerOffsetX - 8, bounds.maxZ + 1.5, 0, mat.clothesBlueMat, true, 1.0)
    addPerson(bounds.centerOffsetX + 8, bounds.maxZ + 1.5, 0, mat.clothesWhiteMat, true, 0.98)

    addPerson(bounds.minX - 14, bounds.maxZ - 2, 0.5, mat.clothesRedMat, false, 1.0)
    addPerson(bounds.minX - 13, bounds.maxZ - 2.5, 0.8, mat.clothesYellowMat, false, 0.65)

    addPerson(bounds.centerOffsetX - 16, bounds.minZ - 8, 0, mat.clothesBlueMat, false, 1.0)
    addPerson(bounds.centerOffsetX - 14, bounds.minZ - 8, 0.2, mat.clothesWhiteMat, false, 0.98)
  }

  /** Trạm bảo vệ */
  private buildGuardBoothAndBarrier(bounds: MasterplanBounds, mat: MaterialPalette) {
    const boothGroup = new THREE.Group()
    const boothX = bounds.minX - 10
    const boothZ = bounds.maxZ + 7.5
    boothGroup.position.set(boothX, 0.1, boothZ)

    const boothBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 2.4), mat.guardBoothMat)
    boothBody.position.y = 1.3
    boothBody.castShadow = true
    boothGroup.add(boothBody)

    const boothRoof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 2.8), mat.metalDarkMat)
    boothRoof.position.y = 2.7
    boothRoof.castShadow = true
    boothGroup.add(boothRoof)

    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 2.45), mat.canopyGlassMat)
    glass.position.y = 1.6
    boothGroup.add(glass)

    const barrierPost = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.0, 12), mat.metalDarkMat)
    barrierPost.position.set(2.2, 0.5, 0)
    barrierPost.castShadow = true
    boothGroup.add(barrierPost)

    const barrierArm = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 0.1), mat.barrierBarMat)
    barrierArm.position.set(4.2, 0.9, 0)
    barrierArm.castShadow = true
    boothGroup.add(barrierArm)

    this.group.add(boothGroup)
  }

  /** Bồn hoa */
  private buildFlowerbeds(bounds: MasterplanBounds, mat: MaterialPalette) {
    const addFlowerCluster = (fx: number, fz: number, colorMat: THREE.Material) => {
      const flowerGroup = new THREE.Group()
      flowerGroup.position.set(fx, 0.15, fz)

      const bed = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.25, 16), mat.curbMat)
      bed.position.y = 0.125
      bed.receiveShadow = true
      flowerGroup.add(bed)

      const soil = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.26, 16), mat.trunkMat)
      soil.position.y = 0.13
      flowerGroup.add(soil)

      const flowerGeo = new THREE.DodecahedronGeometry(0.35, 1)
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2
        const r = i === 0 ? 0 : 0.7
        const fl = new THREE.Mesh(flowerGeo, colorMat)
        fl.position.set(Math.cos(angle) * r, 0.35, Math.sin(angle) * r)
        fl.castShadow = true
        flowerGroup.add(fl)
      }

      this.group.add(flowerGroup)
    }

    addFlowerCluster(bounds.centerOffsetX - 15, bounds.maxZ + 2.5, mat.flowerRedMat)
    addFlowerCluster(bounds.centerOffsetX + 15, bounds.maxZ + 2.5, mat.flowerYellowMat)
    addFlowerCluster(bounds.centerOffsetX - 7, bounds.minZ - 6, mat.flowerYellowMat)
    addFlowerCluster(bounds.centerOffsetX + 7, bounds.minZ - 6, mat.flowerPinkMat)
  }

  /** Trụ cứu hỏa */
  private buildFireHydrants(bounds: MasterplanBounds, mat: MaterialPalette) {
    const addHydrant = (hx: number, hz: number) => {
      const hyd = new THREE.Group()
      hyd.position.set(hx, 0.1, hz)

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.85, 12), mat.hydrantMat)
      body.position.y = 0.42
      body.castShadow = true
      hyd.add(body)

      const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), mat.hydrantMat)
      topCap.position.y = 0.85
      topCap.castShadow = true
      hyd.add(topCap)

      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8), mat.hydrantMat)
      nozzle.rotation.z = Math.PI / 2
      nozzle.position.y = 0.55
      hyd.add(nozzle)

      this.group.add(hyd)
    }

    addHydrant(bounds.minX - 4, bounds.maxZ + 8.5)
    addHydrant(bounds.maxX + 4, bounds.maxZ + 8.5)
  }

  /** Khu vui chơi trẻ em (Gọn gàng trong sân vườn) */
  private buildPlayground(x: number, z: number, mat: MaterialPalette) {
    const playGroup = new THREE.Group()
    playGroup.position.set(x, 0, z)

    const floorGeo = new THREE.BoxGeometry(14, 0.15, 10)
    const floor = new THREE.Mesh(floorGeo, mat.playgroundRubberMat)
    floor.position.y = 0.08
    floor.receiveShadow = true
    playGroup.add(floor)

    const insertMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.85 })
    const circleInsert = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.16, 24), insertMat)
    circleInsert.position.set(-2, 0.09, -1)
    circleInsert.receiveShadow = true
    playGroup.add(circleInsert)

    const tower = new THREE.Group()
    tower.position.set(-2.5, 0, -1.5)

    const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.8, 8)
    const postMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
    const postOffsets = [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]
    postOffsets.forEach(([px, pz]) => {
      const p = new THREE.Mesh(postGeo, postMat)
      p.position.set(px, 1.9, pz)
      p.castShadow = true
      tower.add(p)
    })

    const platform = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 2.6), mat.playgroundSlideMat)
    platform.position.y = 1.8
    platform.castShadow = true
    tower.add(platform)

    const roofGeo = new THREE.ConeGeometry(2.2, 1.5, 4)
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.y = 4.2
    roof.rotation.y = Math.PI / 4
    roof.castShadow = true
    tower.add(roof)

    const slideGeo = new THREE.BoxGeometry(1.2, 0.15, 3.2)
    const slide = new THREE.Mesh(slideGeo, mat.playgroundSlideMat)
    slide.position.set(0, 0.85, 2.0)
    slide.rotation.x = Math.PI / 6
    slide.castShadow = true
    tower.add(slide)

    playGroup.add(tower)

    const swingGroup = new THREE.Group()
    swingGroup.position.set(3.0, 0, 0)

    const frameMat = mat.playgroundSwingMat
    const barGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8)

    const leg1 = new THREE.Mesh(barGeo, frameMat)
    leg1.position.set(-1.8, 1.7, 0.6)
    leg1.rotation.x = 0.2
    leg1.castShadow = true
    swingGroup.add(leg1)

    const leg2 = new THREE.Mesh(barGeo, frameMat)
    leg2.position.set(-1.8, 1.7, -0.6)
    leg2.rotation.x = -0.2
    leg2.castShadow = true
    swingGroup.add(leg2)

    const leg3 = new THREE.Mesh(barGeo, frameMat)
    leg3.position.set(1.8, 1.7, 0.6)
    leg3.rotation.x = 0.2
    leg3.castShadow = true
    swingGroup.add(leg3)

    const leg4 = new THREE.Mesh(barGeo, frameMat)
    leg4.position.set(1.8, 1.7, -0.6)
    leg4.rotation.x = -0.2
    leg4.castShadow = true
    swingGroup.add(leg4)

    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.0, 8), frameMat)
    topBar.rotation.z = Math.PI / 2
    topBar.position.y = 3.3
    topBar.castShadow = true
    swingGroup.add(topBar)

    const seatMat = new THREE.MeshStandardMaterial({ color: 0xef4444 })
    const seat1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.35), seatMat)
    seat1.position.set(-0.7, 0.7, 0)
    seat1.castShadow = true
    swingGroup.add(seat1)

    const seat2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.35), seatMat)
    seat2.position.set(0.7, 0.7, 0)
    seat2.castShadow = true
    swingGroup.add(seat2)

    playGroup.add(swingGroup)

    this.group.add(playGroup)
  }

  /** Bãi đỗ xe nội bộ */
  private buildParkingLot(x: number, z: number, mat: MaterialPalette) {
    const lotGroup = new THREE.Group()
    lotGroup.position.set(x, 0, z)

    const lotGeo = new THREE.BoxGeometry(16, 0.12, 10)
    const lot = new THREE.Mesh(lotGeo, mat.asphaltMat)
    lot.position.y = 0.06
    lot.receiveShadow = true
    lotGroup.add(lot)

    const lineMat = mat.roadLineMat
    for (let pi = -5; pi <= 5; pi += 3.2) {
      const pLine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 4.2), lineMat)
      pLine.position.set(pi, 0.13, -1.8)
      lotGroup.add(pLine)
    }

    this.addCar(lotGroup, -3.5, -1.8, 0, 0xf8fafc, mat)
    this.addCar(lotGroup, -0.2, -1.8, 0, 0x0284c7, mat)
    this.addCar(lotGroup, 3.2, -1.8, 0, 0xdc2626, mat)

    const bikeMatBody = new THREE.MeshStandardMaterial({ color: 0x2563eb })
    for (let mi = -5; mi <= 5; mi += 1.4) {
      const bike = new THREE.Group()
      bike.position.set(mi, 0.1, 3.0)

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 1.4), bikeMatBody)
      body.position.y = 0.45
      body.castShadow = true
      bike.add(body)

      const wheelF = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10), mat.tireMat)
      wheelF.rotation.z = Math.PI / 2
      wheelF.position.set(0, 0.22, 0.5)
      wheelF.castShadow = true
      bike.add(wheelF)

      const wheelB = wheelF.clone()
      wheelB.position.z = -0.5
      bike.add(wheelB)

      lotGroup.add(bike)
    }

    this.group.add(lotGroup)
  }

  private addCar(parent: THREE.Group, cx: number, cz: number, rotY: number, colorHex: number, mat: MaterialPalette) {
    const car = new THREE.Group()
    car.position.set(cx, 0.12, cz)
    car.rotation.y = rotY

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.65, 3.8),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.6 })
    )
    body.position.y = 0.5
    body.castShadow = true
    car.add(body)

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.55, 2.1),
      mat.carGlassMat
    )
    cabin.position.set(0, 1.0, -0.2)
    cabin.castShadow = true
    car.add(cabin)

    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.25, 12)
    const wPositions = [
      [-0.95, 0.3, 1.1],
      [0.95, 0.3, 1.1],
      [-0.95, 0.3, -1.1],
      [0.95, 0.3, -1.1],
    ]
    wPositions.forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeo, mat.tireMat)
      w.rotation.z = Math.PI / 2
      w.position.set(wx, wy, wz)
      w.castShadow = true
      car.add(w)
    })

    parent.add(car)
  }

  /** Đèn đường */
  private buildStreetLamps(
    bounds: MasterplanBounds,
    mat: MaterialPalette,
    _lightingManager: EnvironmentLightingManager
  ) {
    const lampPositions: [number, number, number][] = [
      [bounds.minX - 12, bounds.maxZ + 8.5, 0],
      [bounds.maxX + 12, bounds.maxZ + 8.5, 0],
      [bounds.minX - 16, bounds.minZ, Math.PI / 2],
      [bounds.maxX + 16, bounds.minZ, -Math.PI / 2],
      [bounds.centerOffsetX - 8, bounds.maxZ + 1.5, 0],
      [bounds.centerOffsetX + 8, bounds.maxZ + 1.5, 0],
      [bounds.centerOffsetX - 12, bounds.minZ - 6, Math.PI],
      [bounds.centerOffsetX + 12, bounds.minZ - 6, Math.PI],
    ]

    lampPositions.forEach(([lx, lz, lrot]) => {
      const lamp = new THREE.Group()
      lamp.position.set(lx, 0, lz)
      lamp.rotation.y = lrot

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 5.4, 8),
        mat.metalDarkMat
      )
      pole.position.y = 2.7
      pole.castShadow = true
      lamp.add(pole)

      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 1.3),
        mat.metalDarkMat
      )
      arm.position.set(0, 5.3, 0.55)
      lamp.add(arm)

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.1, 0.5),
        mat.metalDarkMat
      )
      head.position.set(0, 5.25, 1.1)
      lamp.add(head)

      const bulb = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.05, 0.4),
        mat.lampBulbMatNight
      )
      bulb.position.set(0, 5.18, 1.1)
      lamp.add(bulb)

      const streetLightPool = new THREE.Mesh(
        new THREE.CircleGeometry(3.5, 16),
        new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.25 })
      )
      streetLightPool.rotation.x = -Math.PI / 2
      streetLightPool.position.set(0, 0.03, 1.1)
      lamp.add(streetLightPool)

      this.group.add(lamp)
    })
  }

  /** Ghế nghỉ & Thùng rác */
  private buildBenchesAndBins(bounds: MasterplanBounds, mat: MaterialPalette) {
    const benchPositions: [number, number, number][] = [
      [bounds.centerOffsetX - 8, bounds.maxZ + 1.5, 0],
      [bounds.centerOffsetX + 8, bounds.maxZ + 1.5, 0],
      [bounds.minX - 10, bounds.maxZ + 2.5, Math.PI / 4],
      [bounds.maxX + 10, bounds.maxZ + 2.5, -Math.PI / 4],
      [bounds.centerOffsetX - 6, bounds.minZ - 6, Math.PI],
      [bounds.centerOffsetX + 6, bounds.minZ - 6, Math.PI],
    ]

    benchPositions.forEach(([bx, bz, brot]) => {
      const bench = new THREE.Group()
      bench.position.set(bx, 0.15, bz)
      bench.rotation.y = brot

      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.6), mat.metalDarkMat)
      leg1.position.set(-0.9, 0.3, 0)
      leg1.castShadow = true
      bench.add(leg1)

      const leg2 = leg1.clone()
      leg2.position.x = 0.9
      bench.add(leg2)

      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.55), mat.benchWoodMat)
      seat.position.set(0, 0.55, 0)
      seat.castShadow = true
      bench.add(seat)

      const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 0.08), mat.benchWoodMat)
      back.position.set(0, 0.85, -0.24)
      back.castShadow = true
      bench.add(back)

      this.group.add(bench)

      const bin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.25, 0.8, 12),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 })
      )
      bin.position.set(bx + 1.6, 0.55, bz)
      bin.castShadow = true
      this.group.add(bin)
    })
  }

  /** Biển chỉ dẫn */
  private buildWayfindingSign(bounds: MasterplanBounds, mat: MaterialPalette) {
    const sign = new THREE.Group()
    sign.position.set(bounds.centerOffsetX - 12, 0.1, bounds.maxZ + 3.0)

    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 3.2, 0.3),
      mat.metalDarkMat
    )
    pole.position.y = 1.6
    pole.castShadow = true
    sign.add(pole)

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.4, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.4 })
    )
    board.position.set(0, 2.4, 0)
    board.castShadow = true
    sign.add(board)

    this.group.add(sign)
  }

  public dispose() {
    this.group.clear()
  }
}
