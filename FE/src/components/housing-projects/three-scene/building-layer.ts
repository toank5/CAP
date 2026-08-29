import * as THREE from 'three'
import type { ApartmentDto, FloorPlanBlockDto } from '@/types'
import type { MaterialPalette } from './materials'
import type { MasterplanBounds, TimeOfDay } from './types'

export class BuildingLayer {
  public group: THREE.Group
  public apartmentMeshes: Map<string, THREE.Mesh>
  public floorGroups: Map<number, THREE.Group>
  public bounds: MasterplanBounds

  constructor(
    blocksData: FloorPlanBlockDto[],
    selectedFloor: number | 'ALL',
    selectedBlock: string,
    explodedView: boolean,
    selectedApt: ApartmentDto | null,
    hoveredApt: ApartmentDto | null,
    selectedApartmentId: string | undefined,
    timeOfDay: TimeOfDay,
    materials: MaterialPalette
  ) {
    this.group = new THREE.Group()
    this.apartmentMeshes = new Map()
    this.floorGroups = new Map()

    const FLOOR_HEIGHT = 3.6
    const SLAB_THICKNESS = 0.35
    const EXPLODED_MULTIPLIER = explodedView ? 2.2 : 1
    const BLOCK_SPACING = 32

    // 1. Tính toán Bounding Box từ dữ liệu BE
    let activeBlocks = blocksData
    if (selectedBlock !== 'ALL') {
      activeBlocks = blocksData.filter((b) => b.blockName === selectedBlock)
    }
    const totalBlocks = activeBlocks.length || 1

    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    let maxHeight = 0
    const blockBoxes: MasterplanBounds['blockBoxes'] = []

    activeBlocks.forEach((block, bIdx) => {
      const blockOffsetX = (bIdx - (totalBlocks - 1) / 2) * BLOCK_SPACING
      const floors = block.floors || []
      const floorCount = floors.length || 1
      maxHeight = Math.max(maxHeight, floorCount * FLOOR_HEIGHT)

      const firstFloorApts = floors[0]?.apartments || []
      const count = firstFloorApts.length
      const isSingle = count <= 1
      const cols = isSingle ? 1 : Math.max(2, Math.ceil(Math.sqrt(count)))
      const rows = isSingle ? 1 : Math.max(2, Math.ceil(count / cols))
      const unitWidth = 6.2
      const unitDepth = 6.2

      const bWidth = isSingle ? 11 : Math.max(18, cols * (unitWidth + 1.4) + 2)
      const bDepth = isSingle ? 11 : Math.max(18, rows * (unitDepth + 1.4) + 2)

      const bMinX = blockOffsetX - bWidth / 2
      const bMaxX = blockOffsetX + bWidth / 2
      const bMinZ = -bDepth / 2
      const bMaxZ = bDepth / 2

      minX = Math.min(minX, bMinX)
      maxX = Math.max(maxX, bMaxX)
      minZ = Math.min(minZ, bMinZ)
      maxZ = Math.max(maxZ, bMaxZ)

      blockBoxes.push({
        blockName: block.blockName || `Block ${bIdx + 1}`,
        x: blockOffsetX,
        z: 0,
        width: bWidth,
        depth: bDepth,
        height: floorCount * FLOOR_HEIGHT,
      })
    })

    if (minX === Infinity) {
      minX = -8
      maxX = 8
      minZ = -8
      maxZ = 8
    }

    this.bounds = {
      minX,
      maxX,
      minZ,
      maxZ,
      centerOffsetX: (minX + maxX) / 2,
      totalBuildingWidth: maxX - minX,
      totalBuildingDepth: maxZ - minZ,
      buildingHeight: maxHeight || 12,
      blockBoxes,
    }

    const isNightOrSunset = timeOfDay === 'NIGHT' || timeOfDay === 'SUNSET'

    // 2. Dựng các Tòa nhà kiến trúc cao cấp & Tầng căn hộ
    activeBlocks.forEach((block, bIdx) => {
      const blockOffsetX = (bIdx - (totalBlocks - 1) / 2) * BLOCK_SPACING
      const floors = block.floors || []
      const maxFloorNum = floors.reduce((max, f) => Math.max(max, f.floorNumber), 1)

      floors.forEach((floor) => {
        const fNum = floor.floorNumber
        const isFloorVisible = selectedFloor === 'ALL' || selectedFloor === fNum
        const isGroundFloor = fNum === 1

        const floorGroup = new THREE.Group()
        const floorY = (fNum - 1) * FLOOR_HEIGHT * EXPLODED_MULTIPLIER
        floorGroup.position.set(blockOffsetX, floorY, 0)
        this.floorGroups.set(fNum, floorGroup)
        this.group.add(floorGroup)

        const aptsOnFloor = floor.apartments || []
        const count = aptsOnFloor.length

        const isSingleUnit = count <= 1
        const cols = isSingleUnit ? 1 : Math.max(2, Math.ceil(Math.sqrt(count)))
        const rows = isSingleUnit ? 1 : Math.max(2, Math.ceil(count / cols))
        const unitWidth = 6.2
        const unitHeight = FLOOR_HEIGHT - 0.45
        const unitDepth = 6.2

        const slabWidth = isSingleUnit ? 11 : Math.max(18, cols * (unitWidth + 1.4) + 2)
        const slabDepth = isSingleUnit ? 11 : Math.max(18, rows * (unitDepth + 1.4) + 2)

        // 2.1 Sàn tầng bê tông kiến trúc có gờ phào chỉ
        const slabGeo = new THREE.BoxGeometry(slabWidth, SLAB_THICKNESS, slabDepth)
        const slabMesh = new THREE.Mesh(slabGeo, materials.concreteSlabMat)
        slabMesh.position.y = 0
        slabMesh.receiveShadow = true
        slabMesh.castShadow = isFloorVisible
        floorGroup.add(slabMesh)

        // Gờ LED hắt sáng dưới sàn ban công ban đêm
        if (isNightOrSunset && isFloorVisible) {
          const ledGeo = new THREE.BoxGeometry(slabWidth * 0.9, 0.06, 0.06)
          const ledMat = new THREE.MeshBasicMaterial({ color: 0xfef08a })
          const ledStrip = new THREE.Mesh(ledGeo, ledMat)
          ledStrip.position.set(0, -0.15, slabDepth / 2 + 0.05)
          floorGroup.add(ledStrip)
        }

        // Mái che sảnh đón tầng 1 (Grand Entrance Canopy)
        if (isGroundFloor) {
          const canopy = new THREE.Mesh(
            new THREE.BoxGeometry(9.2, 0.28, 5.2),
            materials.canopyFrameMat
          )
          canopy.position.set(0, unitHeight + 0.1, slabDepth / 2 + 2.1)
          canopy.castShadow = isFloorVisible
          floorGroup.add(canopy)

          const glassCanopy = new THREE.Mesh(
            new THREE.BoxGeometry(8.6, 0.06, 4.6),
            materials.canopyGlassMat
          )
          glassCanopy.position.set(0, unitHeight + 0.28, slabDepth / 2 + 2.1)
          floorGroup.add(glassCanopy)

          // Cột sảnh đón inox
          const colGeo = new THREE.CylinderGeometry(0.18, 0.18, unitHeight, 16)
          const col1 = new THREE.Mesh(colGeo, materials.inoxPoleMat)
          col1.position.set(-4.0, unitHeight / 2, slabDepth / 2 + 4.2)
          col1.castShadow = true
          floorGroup.add(col1)

          const col2 = col1.clone()
          col2.position.x = 4.0
          floorGroup.add(col2)

          // Cửa kính lớn sảnh lễ tân
          const lobbyDoor = new THREE.Mesh(
            new THREE.BoxGeometry(4.5, unitHeight * 0.8, 0.1),
            isNightOrSunset ? materials.windowGlassMatNight : materials.windowGlassMatDay
          )
          lobbyDoor.position.set(0, unitHeight * 0.4 + SLAB_THICKNESS, slabDepth / 2 + 0.05)
          floorGroup.add(lobbyDoor)
        }

        // 2.2 Buồng thang máy & hành lang trung tâm (khi >= 4 căn/tầng)
        if (count >= 4) {
          const coreGeo = new THREE.BoxGeometry(4.0, FLOOR_HEIGHT - 0.2, 4.0)
          const coreMesh = new THREE.Mesh(coreGeo, materials.roofMechMat)
          coreMesh.position.y = (FLOOR_HEIGHT - 0.2) / 2
          floorGroup.add(coreMesh)
        }

        // 2.3 Khối từng Căn Hộ Hiện Đại (Apartment Units with Louvers, Glass Windows, Balconies)
        aptsOnFloor.forEach((apt, aIdx) => {
          const col = aIdx % cols
          const row = Math.floor(aIdx / cols)

          const posX = isSingleUnit ? 0 : (col - (cols - 1) / 2) * (unitWidth + 1.2)
          const posZ = isSingleUnit ? 0 : (row - (rows - 1) / 2) * (unitDepth + 1.2)

          const isAssigned = String(apt.status).toUpperCase() === 'ASSIGNED'
          const isPriority = apt.unitGroup?.toUpperCase() === 'PRIORITY'
          const isSelected = selectedApt?.id === apt.id || selectedApartmentId === apt.id
          const isHovered = hoveredApt?.id === apt.id

          // Màu sắc trạng thái nghiệp vụ
          let unitColor = 0x0d9488 // Teal-600: Còn trống
          if (isAssigned) unitColor = 0x64748b // Slate-500: Đã giao
          if (isPriority) unitColor = 0xf59e0b // Amber-500: Suất ưu tiên ⭐
          if (isSelected) unitColor = 0x06b6d4 // Cyan-400: Đang chọn
          if (isHovered) unitColor = 0x14b8a6 // Teal-500: Hover

          const unitGroup = new THREE.Group()
          unitGroup.position.set(posX, 0, posZ)

          // Khối nhà chính PBR
          const unitGeo = new THREE.BoxGeometry(unitWidth, unitHeight, unitDepth)
          const unitMat = new THREE.MeshStandardMaterial({
            color: unitColor,
            roughness: 0.35,
            metalness: 0.15,
            transparent: true,
            opacity: isFloorVisible ? (isSelected ? 1.0 : 0.92) : 0.12,
            emissive: isSelected ? 0x0891b2 : isHovered ? 0x0f766e : isNightOrSunset ? 0x1e293b : 0x000000,
            emissiveIntensity: isSelected ? 0.6 : isHovered ? 0.4 : isNightOrSunset ? 0.2 : 0,
          })

          const unitMesh = new THREE.Mesh(unitGeo, unitMat)
          unitMesh.position.set(0, unitHeight / 2 + SLAB_THICKNESS, 0)
          unitMesh.castShadow = isFloorVisible
          unitMesh.receiveShadow = isFloorVisible
          unitMesh.userData = { apartment: apt, floorNumber: fNum, blockName: block.blockName }
          unitGroup.add(unitMesh)

          // Lam nhôm trang trí kiến trúc (Architectural Louver Fins)
          const finMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 })
          const finGeo = new THREE.BoxGeometry(0.12, unitHeight, 0.4)
          const fin1 = new THREE.Mesh(finGeo, finMat)
          fin1.position.set(-unitWidth / 2 + 0.1, unitHeight / 2 + SLAB_THICKNESS, unitDepth / 2 + 0.2)
          unitGroup.add(fin1)
          const fin2 = fin1.clone()
          fin2.position.x = unitWidth / 2 - 0.1
          unitGroup.add(fin2)

          // Cửa sổ kính lớn (Ban ngày kính phản chiếu tự nhiên / Ban đêm phát sáng đèn vàng ấm)
          const winMat = isNightOrSunset ? materials.windowGlassMatNight : materials.windowGlassMatDay
          const windowMesh = new THREE.Mesh(
            new THREE.BoxGeometry(unitWidth * 0.65, unitHeight * 0.6, 0.08),
            winMat
          )
          windowMesh.position.set(0, unitHeight / 2 + SLAB_THICKNESS + 0.05, unitDepth / 2 + 0.05)
          unitGroup.add(windowMesh)

          // Khung nhôm cửa sổ (Aluminium Window Frame)
          const frameGeo = new THREE.BoxGeometry(unitWidth * 0.68, unitHeight * 0.63, 0.06)
          const frameMesh = new THREE.Mesh(frameGeo, materials.canopyFrameMat)
          frameMesh.position.set(0, unitHeight / 2 + SLAB_THICKNESS + 0.05, unitDepth / 2 + 0.02)
          unitGroup.add(frameMesh)

          // Ban công kiến trúc nhô ra
          const balconyFloor = new THREE.Mesh(
            new THREE.BoxGeometry(unitWidth * 0.72, 0.18, 1.4),
            materials.concreteSlabMat
          )
          balconyFloor.position.set(0, SLAB_THICKNESS + 0.09, unitDepth / 2 + 0.7)
          balconyFloor.castShadow = isFloorVisible
          unitGroup.add(balconyFloor)

          // Lan can ban công kính cường lực hiện đại
          const railMesh = new THREE.Mesh(
            new THREE.BoxGeometry(unitWidth * 0.72, 0.95, 0.05),
            materials.balconyRailMat
          )
          railMesh.position.set(0, SLAB_THICKNESS + 0.58, unitDepth / 2 + 1.38)
          unitGroup.add(railMesh)

          // Tay vịn Inox trên cùng lan can
          const handrail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, unitWidth * 0.72, 12),
            materials.inoxPoleMat
          )
          handrail.rotation.z = Math.PI / 2
          handrail.position.set(0, SLAB_THICKNESS + 1.08, unitDepth / 2 + 1.38)
          unitGroup.add(handrail)

          floorGroup.add(unitGroup)
          this.apartmentMeshes.set(apt.id || `apt-${fNum}-${aIdx}`, unitMesh)
        })

        // 2.4 Tầng mái thượng (Rooftop Pergola, Garden & Penthouse)
        if (fNum === maxFloorNum) {
          const roofGroup = new THREE.Group()
          roofGroup.position.set(0, FLOOR_HEIGHT, 0)

          const roofSlab = new THREE.Mesh(
            new THREE.BoxGeometry(slabWidth, SLAB_THICKNESS, slabDepth),
            materials.concreteSlabMat
          )
          roofSlab.position.y = 0
          roofSlab.receiveShadow = true
          roofGroup.add(roofSlab)

          // Lan can bảo vệ sân thượng
          const parapetGeo1 = new THREE.BoxGeometry(slabWidth, 1.0, 0.25)
          const p1 = new THREE.Mesh(parapetGeo1, materials.concreteSlabMat)
          p1.position.set(0, 0.5, slabDepth / 2)
          const p2 = p1.clone()
          p2.position.z = -slabDepth / 2
          roofGroup.add(p1)
          roofGroup.add(p2)

          // Tum kỹ thuật thang máy & dàn lam mái
          const mechMesh = new THREE.Mesh(
            new THREE.BoxGeometry(isSingleUnit ? 4.5 : 7, 2.4, isSingleUnit ? 4.5 : 7),
            materials.roofMechMat
          )
          mechMesh.position.y = 1.2
          mechMesh.castShadow = true
          roofGroup.add(mechMesh)

          // Dàn Pergola sân thượng hiện đại
          const pergolaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
          for (let pi = -3; pi <= 3; pi += 1.2) {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 5.5), pergolaMat)
            beam.position.set(pi, 2.5, 0)
            beam.castShadow = true
            roofGroup.add(beam)
          }

          floorGroup.add(roofGroup)
        }
      })
    })
  }

  public dispose() {
    this.apartmentMeshes.forEach((mesh) => {
      mesh.geometry.dispose()
    })
    this.apartmentMeshes.clear()
    this.floorGroups.clear()
    this.group.clear()
  }
}
