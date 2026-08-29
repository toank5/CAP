import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  X,
  Box,
  Loader2,
  Eye,
} from 'lucide-react'
import type { ApartmentDto } from '@/types'
import { DIRECTION_LABELS } from '@/lib/constants'

function formatPrice(v?: number) {
  if (!v) return '—'
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} triệu`
  return `${Number(v).toLocaleString('vi-VN')} VNĐ`
}

interface Apartment3DViewerProps {
  apartment: ApartmentDto | null
  isOpen: boolean
  onClose: () => void
}

export function Apartment3DViewer({ apartment, isOpen, onClose }: Apartment3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'3d' | 'top' | 'front'>('3d')

  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOpen || !apartment) return

    const container = containerRef.current
    if (!container) return

    setLoading(true)

    // 1. Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a101d) // Deep architectural slate
    sceneRef.current = scene

    // 2. Camera setup
    const width = container.clientWidth || 700
    const height = container.clientHeight || 450
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(13, 11, 15)
    cameraRef.current = camera

    // 3. Renderer setup - Ultra-optimized with logarithmicDepthBuffer for zero z-fighting
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    rendererRef.current = renderer
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 1.4 // Độ nhạy xoay mượt mà, phản hồi tức thì
    controls.zoomSpeed = 1.2
    controls.panSpeed = 1.15
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    controls.minDistance = 3.5
    controls.maxDistance = 40
    controls.target.set(0, 0.9, 0)
    controlsRef.current = controls

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xfff8ee, 2.2)
    mainLight.position.set(14, 22, 14)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 1024
    mainLight.shadow.mapSize.height = 1024
    mainLight.shadow.bias = -0.0001
    mainLight.shadow.normalBias = 0.02
    scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8)
    fillLight.position.set(-14, 12, -14)
    scene.add(fillLight)

    // 6. Ground pedestal & architectural grid (Phân tầng rõ ràng, chống giật chớp nháy)
    const floorPlateGeo = new THREE.BoxGeometry(19, 0.4, 16)
    const floorPlateMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.9,
    })
    const floorPlate = new THREE.Mesh(floorPlateGeo, floorPlateMat)
    floorPlate.position.y = -0.3
    floorPlate.receiveShadow = true
    scene.add(floorPlate)

    const grid = new THREE.GridHelper(26, 26, 0x0d9488, 0x1e293b)
    grid.position.y = -0.09
    scene.add(grid)

    // Function to build high-end procedural furnished 3D apartment layout
    const buildProceduralLayout = () => {
      const roomGroup = new THREE.Group()
      const numBeds = apartment.numberOfBedrooms ?? 2

      // Reusable Premium Architectural Materials
      const oakParquetMat = new THREE.MeshStandardMaterial({
        color: 0x9a6b43, // Gỗ sồi vàng ấm áp vân Chevron
        roughness: 0.3,
        metalness: 0.02,
      })

      const marbleTileMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9, // Gạch đá Calacatta cẩm thạch bóng mờ
        roughness: 0.15,
        metalness: 0.05,
      })

      const slateTileMat = new THREE.MeshStandardMaterial({
        color: 0x334155, // Đá granite chống trượt phòng tắm
        roughness: 0.45,
        metalness: 0.05,
      })

      const deckWoodMat = new THREE.MeshStandardMaterial({
        color: 0x78350f, // Gỗ nhựa ngoài trời WPC ban công
        roughness: 0.6,
      })

      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc, // Tường trắng kiến trúc sang trọng
        roughness: 0.85,
      })

      const accentTealMat = new THREE.MeshStandardMaterial({
        color: 0x0f766e, // Mảng tường nhấn xanh ngọc Teal thời thượng
        roughness: 0.75,
      })

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.45,
        transmission: 0.88,
        roughness: 0.05,
        ior: 1.45,
      })

      const walnutMat = new THREE.MeshStandardMaterial({
        color: 0x451a03, // Gỗ óc chó Walnut nâu trầm cao cấp
        roughness: 0.4,
      })

      const whiteGlossMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, // Sơn trắng bóng hiện đại
        roughness: 0.15,
      })

      const blackQuartzMat = new THREE.MeshStandardMaterial({
        color: 0x09090b, // Mặt đá thạch anh đen kim sa
        roughness: 0.18,
        metalness: 0.25,
      })

      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9, // Inox / Chrome mạ bóng
        metalness: 0.95,
        roughness: 0.08,
      })

      const goldBrassMat = new THREE.MeshStandardMaterial({
        color: 0xd97706, // Kim loại mạ vàng đồng Brass sang trọng
        metalness: 0.85,
        roughness: 0.25,
      })

      const sofaFabricMat = new THREE.MeshStandardMaterial({
        color: 0x334155, // Vải nỉ xám chì cao cấp
        roughness: 0.88,
      })

      const pillowTealMat = new THREE.MeshStandardMaterial({
        color: 0x0d9488,
        roughness: 0.65,
      })

      const pillowMustardMat = new THREE.MeshStandardMaterial({
        color: 0xeab308,
        roughness: 0.7,
      })

      const rugMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0, // Thảm dệt sợi tự nhiên cao cấp
        roughness: 0.95,
      })

      const bedLinenMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.75,
      })

      const bedRunnerMat = new THREE.MeshStandardMaterial({
        color: 0x1e3a8a, // Khăn trải giường màu xanh Navy hoàng gia
        roughness: 0.7,
      })

      const screenGlowMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.45,
        roughness: 0.1,
      })

      const warmLedMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
      })

      // 1. DISJOINT ROOM FLOORS (Mỗi phòng là 1 khối độc lập, không trùng lặp toạ độ)
      const floorThick = 0.15
      const floorY = floorThick / 2 // = 0.075, mặt trên phẳng tại Y = 0.15

      // Khối 1: Sàn Bếp & Phòng khách (X từ -5.8 đến -1.4, Z từ -4.2 đến 3.0)
      const livingFloor = new THREE.Mesh(new THREE.BoxGeometry(4.4, floorThick, 7.2), oakParquetMat)
      livingFloor.position.set(-3.6, floorY, -0.6)
      livingFloor.receiveShadow = true
      roomGroup.add(livingFloor)

      // Khối 2: Sàn Khu ăn uống & Hành lang (X từ -1.4 đến 1.6, Z từ -1.4 đến 3.0)
      const diningFloor = new THREE.Mesh(new THREE.BoxGeometry(3.0, floorThick, 4.4), oakParquetMat)
      diningFloor.position.set(0.1, floorY, 0.8)
      diningFloor.receiveShadow = true
      roomGroup.add(diningFloor)

      // Khối 3: Sàn Phòng tắm WC (X từ -1.4 đến 1.6, Z từ -4.2 đến -1.4)
      const bathFloor = new THREE.Mesh(new THREE.BoxGeometry(3.0, floorThick, 2.8), slateTileMat)
      bathFloor.position.set(0.1, floorY, -2.8)
      bathFloor.receiveShadow = true
      roomGroup.add(bathFloor)

      // Khối 4: Sàn Ban công ngoài trời (X từ -5.8 đến -1.4, Z từ 3.0 đến 4.2)
      const balconyFloor = new THREE.Mesh(new THREE.BoxGeometry(4.4, floorThick, 1.2), deckWoodMat)
      balconyFloor.position.set(-3.6, floorY, 3.6)
      balconyFloor.receiveShadow = true
      roomGroup.add(balconyFloor)

      // Khối 5: Sàn Phòng ngủ Master (X từ 1.6 đến 6.2, Z từ -4.2 đến 0.4)
      const bed1Floor = new THREE.Mesh(new THREE.BoxGeometry(4.6, floorThick, 4.6), oakParquetMat)
      bed1Floor.position.set(3.9, floorY, -1.9)
      bed1Floor.receiveShadow = true
      roomGroup.add(bed1Floor)

      // Khối 6: Sàn Phòng ngủ 2 / Phòng đa năng (X từ 1.6 đến 6.2, Z từ 0.4 đến 4.2)
      const bed2Floor = new THREE.Mesh(new THREE.BoxGeometry(4.6, floorThick, 3.8), oakParquetMat)
      bed2Floor.position.set(3.9, floorY, 2.3)
      bed2Floor.receiveShadow = true
      roomGroup.add(bed2Floor)

      // 2. ARCHITECTURAL WALLS (Chiều cao tiêu chuẩn 1.55m, đặt phẳng trên Y = 0.15)
      const wallHeight = 1.55
      const wallThick = 0.2

      const addWall = (w: number, d: number, x: number, z: number, mat = wallMat) => {
        const geo = new THREE.BoxGeometry(w, wallHeight, d)
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(x, wallHeight / 2 + 0.15, z)
        mesh.castShadow = true
        mesh.receiveShadow = true
        roomGroup.add(mesh)
      }

      // Tường bao chu vi
      addWall(12.0, wallThick, 0.2, -4.2, accentTealMat) // Tường lưng trang trí
      addWall(wallThick, 8.4, -5.8, 0)                   // Tường trái
      addWall(wallThick, 8.4, 6.2, 0)                    // Tường phải

      // Vách ngăn nội bộ
      addWall(wallThick, 4.6, 1.6, -1.9)                 // Ngăn Master Bed
      addWall(4.6, wallThick, 3.9, 0.4)                  // Ngăn Bed 1 & Bed 2
      addWall(wallThick, 2.8, -1.4, -2.8)                // Ngăn Bathroom
      addWall(1.8, wallThick, -0.5, -1.4)                // Tường trước Bathroom (chừa lối đi)

      // Lan can kính ban công & tay vịn kim loại sang trọng
      const balconyRail = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.95, 0.04), glassMat)
      balconyRail.position.set(-3.6, 0.63, 4.2)
      roomGroup.add(balconyRail)

      const railHandrail = new THREE.Mesh(new THREE.BoxGeometry(4.44, 0.05, 0.08), chromeMat)
      railHandrail.position.set(-3.6, 1.11, 4.2)
      roomGroup.add(railHandrail)

      // Cửa lùa kính ra ban công
      const slidingFrame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.45, 0.04), glassMat)
      slidingFrame.position.set(-3.6, 0.88, 2.98)
      roomGroup.add(slidingFrame)

      // 3. LIVING ROOM (PHÒNG KHÁCH THỜI THƯỢNG)
      // Thảm dệt hình học cao cấp
      const rug = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.015, 2.6), rugMat)
      rug.position.set(-3.5, 0.158, 1.1)
      rug.receiveShadow = true
      roomGroup.add(rug)

      // Sofa chữ L đệm dày êm ái
      const sofaGroup = new THREE.Group()
      const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 1.0), sofaFabricMat)
      sofaMain.position.set(-3.8, 0.36, 1.1)
      sofaMain.castShadow = true
      sofaGroup.add(sofaMain)

      const sofaL = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.42, 1.4), sofaFabricMat)
      sofaL.position.set(-4.5, 0.36, 2.3)
      sofaL.castShadow = true
      sofaGroup.add(sofaL)

      const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 2.4), sofaFabricMat)
      sofaBack.position.set(-5.12, 0.63, 1.8)
      sofaBack.castShadow = true
      sofaGroup.add(sofaBack)

      // Gối tựa trang trí nhiều màu sắc
      const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.15), pillowTealMat)
      pillow1.position.set(-4.9, 0.63, 1.05)
      pillow1.rotation.y = 0.25
      sofaGroup.add(pillow1)

      const pillow2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.15), pillowMustardMat)
      pillow2.position.set(-4.9, 0.63, 2.5)
      pillow2.rotation.y = -0.3
      sofaGroup.add(pillow2)

      // Khăn vắt sofa (Throw blanket)
      const throwBlanket = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.85), bedRunnerMat)
      throwBlanket.position.set(-3.2, 0.38, 1.1)
      sofaGroup.add(throwBlanket)
      roomGroup.add(sofaGroup)

      // Bộ đôi bàn trà tròn lồng nhau (Nesting Coffee Tables)
      const table1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 28), marbleTileMat)
      table1.position.set(-2.8, 0.42, 1.05)
      table1.castShadow = true
      roomGroup.add(table1)
      const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8), goldBrassMat)
      leg1.position.set(-2.8, 0.28, 1.05)
      roomGroup.add(leg1)

      const table2 = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 28), walnutMat)
      table2.position.set(-2.2, 0.35, 1.5)
      table2.castShadow = true
      roomGroup.add(table2)

      // Đồ decor trên bàn trà: Tách trà & Cuốn tạp chí
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.08, 12), whiteGlossMat)
      cup.position.set(-2.8, 0.48, 1.05)
      roomGroup.add(cup)

      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.3), pillowTealMat)
      mag.position.set(-2.2, 0.38, 1.5)
      mag.rotation.y = 0.4
      roomGroup.add(mag)

      // Kệ Tivi treo tường nan gỗ óc chó & Tivi OLED 65 inch
      const tvConsole = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 2.6), walnutMat)
      tvConsole.position.set(-0.2, 0.34, 1.1)
      tvConsole.castShadow = true
      roomGroup.add(tvConsole)

      const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 1.8), screenGlowMat)
      tvScreen.position.set(-0.2, 1.15, 1.1)
      tvScreen.castShadow = true
      roomGroup.add(tvScreen)

      const soundbar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 1.1), blackQuartzMat)
      soundbar.position.set(-0.2, 0.58, 1.1)
      roomGroup.add(soundbar)

      // Đèn cây đứng đọc sách uốn cong phong cách Bắc Âu
      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16), goldBrassMat)
      lampBase.position.set(-5.3, 0.165, -0.2)
      roomGroup.add(lampBase)
      const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.45, 8), goldBrassMat)
      lampPole.position.set(-5.3, 0.88, -0.2)
      roomGroup.add(lampPole)
      const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.28, 16), whiteGlossMat)
      lampShade.position.set(-5.15, 1.55, -0.2)
      roomGroup.add(lampShade)

      // Chậu cây cảnh lá xanh trong góc
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.45, 16), whiteGlossMat)
      pot.position.set(-5.3, 0.38, 3.3)
      roomGroup.add(pot)
      const plantLeaves = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 })
      )
      plantLeaves.position.set(-5.3, 0.75, 3.3)
      roomGroup.add(plantLeaves)

      // 4. KITCHEN & DINING (BẾP & KHU ĂN UỐNG)
      // Tủ bếp dưới gỗ óc chó & Mặt đá thạch anh Nero Marquina
      const kitchenBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 0.65), walnutMat)
      kitchenBase.position.set(-4.4, 0.58, -3.75)
      kitchenBase.castShadow = true
      roomGroup.add(kitchenBase)

      const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.08, 0.7), blackQuartzMat)
      counterTop.position.set(-4.4, 1.02, -3.75)
      counterTop.receiveShadow = true
      roomGroup.add(counterTop)

      // Tủ bếp trên màu trắng bóng kèm dải đèn LED hắt sáng
      const upperCabinets = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.52, 0.38), whiteGlossMat)
      upperCabinets.position.set(-4.4, 1.52, -3.9)
      roomGroup.add(upperCabinets)

      const underCabinetLed = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.02, 0.04), warmLedMat)
      underCabinetLed.position.set(-4.4, 1.25, -3.75)
      roomGroup.add(underCabinetLed)

      // Bồn rửa Inox & Vòi cổ ngỗng
      const sink = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.02, 0.42), chromeMat)
      sink.position.set(-3.7, 1.07, -3.75)
      roomGroup.add(sink)

      const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 8), chromeMat)
      faucet.position.set(-3.7, 1.18, -3.95)
      roomGroup.add(faucet)

      // Bếp từ & Máy hút mùi kính cong
      const cooktop = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.02, 0.42),
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.1 })
      )
      cooktop.position.set(-4.9, 1.07, -3.75)
      roomGroup.add(cooktop)

      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.42), chromeMat)
      hood.position.set(-4.9, 1.44, -3.75)
      roomGroup.add(hood)

      // Tủ lạnh 4 cánh Side-by-Side
      const fridge = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 1.55, 0.72),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 })
      )
      fridge.position.set(-5.3, 0.93, -2.5)
      fridge.castShadow = true
      roomGroup.add(fridge)

      // Bàn ăn 4 người gỗ sồi
      const diningTable = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.72, 0.9), oakParquetMat)
      diningTable.position.set(-3.2, 0.51, -1.6)
      diningTable.castShadow = true
      roomGroup.add(diningTable)

      // Bộ 4 ghế ăn bọc nệm
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.5 })
      const chairPositions = [
        [-3.65, 0.36, -2.2],
        [-2.75, 0.36, -2.2],
        [-3.65, 0.36, -1.0],
        [-2.75, 0.36, -1.0],
      ]
      chairPositions.forEach(([cx, cy, cz]) => {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), chairMat)
        chair.position.set(cx, cy, cz)
        chair.castShadow = true
        roomGroup.add(chair)
      })

      // Đèn thả bàn ăn 3 bóng mạ vàng
      const pendantBar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.03), goldBrassMat)
      pendantBar.position.set(-3.2, 1.58, -1.6)
      roomGroup.add(pendantBar)

      // 5. MASTER BEDROOM (PHÒNG NGỦ CHÍNH)
      const masterBedGroup = new THREE.Group()
      masterBedGroup.position.set(3.9, 0, -1.9)

      // Khung giường & Nệm cao cấp
      const bedBase = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.32, 2.25), walnutMat)
      bedBase.position.y = 0.31
      bedBase.castShadow = true
      masterBedGroup.add(bedBase)

      const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.3, 2.05), bedLinenMat)
      mattress.position.y = 0.58
      mattress.castShadow = true
      masterBedGroup.add(mattress)

      // Chăn ga trắng & Khăn trải giường Navy
      const duvet = new THREE.Mesh(new THREE.BoxGeometry(2.07, 0.08, 1.45), bedLinenMat)
      duvet.position.set(0, 0.7, 0.3)
      masterBedGroup.add(duvet)

      const bedRunner = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.09, 0.45), bedRunnerMat)
      bedRunner.position.set(0, 0.71, 0.75)
      masterBedGroup.add(bedRunner)

      // Bộ 4 gối ngủ cao cấp + 2 gối tựa
      const pillowGeo = new THREE.BoxGeometry(0.68, 0.15, 0.4)
      const p1 = new THREE.Mesh(pillowGeo, bedLinenMat)
      p1.position.set(-0.5, 0.75, -0.62)
      masterBedGroup.add(p1)
      const p2 = p1.clone()
      p2.position.x = 0.5
      masterBedGroup.add(p2)

      const pAcc1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.28), pillowTealMat)
      pAcc1.position.set(-0.5, 0.8, -0.38)
      masterBedGroup.add(pAcc1)
      const pAcc2 = pAcc1.clone()
      pAcc2.position.x = 0.5
      masterBedGroup.add(pAcc2)

      // Táp đầu giường & Đèn ngủ
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.05, 0.12), walnutMat)
      headboard.position.set(0, 0.8, -1.1)
      headboard.castShadow = true
      masterBedGroup.add(headboard)

      const nsGeo = new THREE.BoxGeometry(0.46, 0.38, 0.4)
      const ns1 = new THREE.Mesh(nsGeo, whiteGlossMat)
      ns1.position.set(-1.42, 0.34, -1.0)
      ns1.castShadow = true
      masterBedGroup.add(ns1)
      const lamp1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.16), warmLedMat)
      lamp1.position.set(-1.42, 0.63, -1.0)
      masterBedGroup.add(lamp1)

      const ns2 = ns1.clone()
      ns2.position.x = 1.42
      masterBedGroup.add(ns2)
      const lamp2 = lamp1.clone()
      lamp2.position.x = 1.42
      masterBedGroup.add(lamp2)

      // Tủ quần áo kịch trần
      const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.55, 2.4), walnutMat)
      wardrobe.position.set(2.0, 0.93, 0)
      wardrobe.castShadow = true
      masterBedGroup.add(wardrobe)

      const mirrorDoor = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 1.35, 0.75),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.05 })
      )
      mirrorDoor.position.set(1.67, 0.93, 0)
      masterBedGroup.add(mirrorDoor)

      roomGroup.add(masterBedGroup)

      // 6. SECONDARY BEDROOM / STUDY LOUNGE (PHÒNG NGỦ 2 / GÓC LÀM VIỆC)
      if (numBeds >= 2) {
        const bed2Group = new THREE.Group()
        bed2Group.position.set(3.9, 0, 2.3)

        const bed2 = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.38, 2.0), oakParquetMat)
        bed2.position.y = 0.34
        bed2.castShadow = true
        bed2Group.add(bed2)

        const bed2Mattress = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.22, 1.9), bedLinenMat)
        bed2Mattress.position.y = 0.6
        bed2Group.add(bed2Mattress)

        const bed2Duvet = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.08, 1.25), pillowTealMat)
        bed2Duvet.position.set(0, 0.69, 0.3)
        bed2Group.add(bed2Duvet)

        const pil3 = new THREE.Mesh(pillowGeo, bedLinenMat)
        pil3.position.set(0, 0.73, -0.6)
        bed2Group.add(pil3)
        roomGroup.add(bed2Group)

        // Bàn làm việc & Laptop
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.7, 0.58), walnutMat)
        desk.position.set(2.4, 0.5, 3.55)
        desk.castShadow = true
        roomGroup.add(desk)

        const laptop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.24), chromeMat)
        laptop.position.set(2.4, 0.86, 3.55)
        roomGroup.add(laptop)

        const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.02), screenGlowMat)
        laptopScreen.position.set(2.4, 0.97, 3.44)
        roomGroup.add(laptopScreen)

        const deskChair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), sofaFabricMat)
        deskChair.position.set(2.4, 0.35, 3.0)
        roomGroup.add(deskChair)
      } else {
        // Căn hộ 1 phòng ngủ: Bố trí Góc thư giãn & Làm việc hiện đại (Home Office Lounge)
        const loungeGroup = new THREE.Group()
        loungeGroup.position.set(3.9, 0, 2.3)

        // Sofa bành thư giãn
        const loungeChair = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 1.1), sofaFabricMat)
        loungeChair.position.set(-0.6, 0.36, 0)
        loungeChair.castShadow = true
        loungeGroup.add(loungeChair)

        const loungePillow = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.15), pillowMustardMat)
        loungePillow.position.set(-0.6, 0.62, -0.2)
        loungeGroup.add(loungePillow)

        // Bàn làm việc Studio & Đèn bàn
        const studioDesk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.72, 0.6), walnutMat)
        studioDesk.position.set(0.8, 0.51, 1.1)
        studioDesk.castShadow = true
        loungeGroup.add(studioDesk)

        const laptop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.24), chromeMat)
        laptop.position.set(0.8, 0.88, 1.1)
        loungeGroup.add(laptop)

        const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.02), screenGlowMat)
        laptopScreen.position.set(0.8, 0.99, 0.99)
        loungeGroup.add(laptopScreen)

        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), sofaFabricMat)
        chair.position.set(0.8, 0.35, 0.55)
        loungeGroup.add(chair)

        // Kệ sách nghệ thuật
        const bookshelf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.45, 1.2), walnutMat)
        bookshelf.position.set(2.0, 0.88, -0.5)
        bookshelf.castShadow = true
        loungeGroup.add(bookshelf)

        roomGroup.add(loungeGroup)
      }

      // 7. LUXURY BATHROOM (PHÒNG TẮM KÍNH)
      const bathGroup = new THREE.Group()
      bathGroup.position.set(0.1, 0, -2.8)

      // Vách kính tắm đứng cách sàn 5cm (chống tuyệt đối chớp nháy)
      const showerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.35, 1.3), glassMat)
      showerGlass.position.set(-0.35, 0.88, -0.5)
      bathGroup.add(showerGlass)

      // Sen tắm đứng mưa Rainfall
      const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), chromeMat)
      showerHead.position.set(-0.85, 1.48, -0.9)
      bathGroup.add(showerHead)

      // Tủ Lavabo treo tường & Gương LED
      const vanity = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.5), walnutMat)
      vanity.position.set(0.6, 0.58, 0.75)
      vanity.castShadow = true
      bathGroup.add(vanity)

      const sinkBowl = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.38), whiteGlossMat)
      sinkBowl.position.set(0.6, 0.83, 0.75)
      bathGroup.add(sinkBowl)

      const mirror = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.75, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x93c5fd, metalness: 0.98, roughness: 0.04 })
      )
      mirror.position.set(0.6, 1.25, 0.98)
      bathGroup.add(mirror)

      // Bồn cầu nguyên khối
      const toilet = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.48, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1 })
      )
      toilet.position.set(-0.85, 0.42, 0.65)
      toilet.castShadow = true
      bathGroup.add(toilet)

      // Giá treo khăn tắm Inox
      const towelRack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.06), chromeMat)
      towelRack.position.set(-0.85, 1.05, 0.98)
      bathGroup.add(towelRack)

      roomGroup.add(bathGroup)

      // 8. BALCONY & LAUNDRY (BAN CÔNG & KHU GIẶT PHƠI)
      // Máy giặt cửa trước thông minh
      const washer = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.8, 0.65), whiteGlossMat)
      washer.position.set(-2.2, 0.55, 3.6)
      washer.castShadow = true
      roomGroup.add(washer)

      const washerDoor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 })
      )
      washerDoor.rotation.x = Math.PI / 2
      washerDoor.position.set(-2.2, 0.55, 3.28)
      roomGroup.add(washerDoor)

      // Bồn hoa tiểu cảnh ban công
      const planter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.3), walnutMat)
      planter.position.set(-4.5, 0.26, 3.6)
      roomGroup.add(planter)

      const flowers = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.18, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 })
      )
      flowers.position.set(-4.5, 0.42, 3.6)
      roomGroup.add(flowers)

      scene.add(roomGroup)
      setLoading(false)
    }

    // Check if 3D model URL exists
    if (apartment.model3DUrl && apartment.model3DUrl.endsWith('.glb')) {
      const loader = new GLTFLoader()
      loader.load(
        apartment.model3DUrl,
        (gltf) => {
          const model = gltf.scene
          const box = new THREE.Box3().setFromObject(model)
          const size = box.getSize(new THREE.Vector3())
          const center = box.getCenter(new THREE.Vector3())

          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = 10 / (maxDim || 1)
          model.scale.set(scale, scale, scale)

          model.position.x = -center.x * scale
          model.position.y = -box.min.y * scale
          model.position.z = -center.z * scale

          scene.add(model)
          setLoading(false)
        },
        undefined,
        (error) => {
          console.warn('Error loading GLTF model, falling back to procedural layout', error)
          buildProceduralLayout()
        }
      )
    } else {
      buildProceduralLayout()
    }

    // 7. Optimized Animation Loop
    let framesToRender = 60
    controls.addEventListener('change', () => {
      framesToRender = 30
    })

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      const updated = controls.update()
      if (updated || framesToRender > 0) {
        renderer.render(scene, camera)
        if (framesToRender > 0) framesToRender--
      }
    }
    animate()

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      framesToRender = 20
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [isOpen, apartment])

  if (!isOpen || !apartment) return null

  const setCameraPreset = (mode: '3d' | 'top' | 'front') => {
    setViewMode(mode)
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    if (mode === '3d') {
      camera.position.set(13, 11, 15)
      controls.target.set(0, 1.0, 0)
    } else if (mode === 'top') {
      camera.position.set(0, 20, 0.1)
      controls.target.set(0, 0, 0)
    } else if (mode === 'front') {
      camera.position.set(0, 3.5, 18)
      controls.target.set(0, 1.0, 0)
    }
    controls.update()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[85vh] rounded-3xl border border-slate-700/80 bg-slate-900 text-white shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600/20 border border-teal-500/30 text-teal-400">
              <Box className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Mô hình 3D Căn hộ {apartment.unitName}</h3>
                {apartment.unitGroup?.toUpperCase() === 'PRIORITY' && (
                  <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    Suất ưu tiên ⭐
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Tòa {apartment.buildingBlock || 'Block A'} · Tầng {apartment.floorNumber ?? 1} · {apartment.area} m² ({apartment.numberOfBedrooms ?? 2} Phòng ngủ)
              </p>
            </div>
          </div>

          {/* Preset Buttons & Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-2xl bg-slate-800 p-1 border border-slate-700/60">
              <button
                type="button"
                onClick={() => setCameraPreset('3d')}
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${viewMode === '3d' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
              >
                Phối cảnh 3D
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('top')}
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${viewMode === 'top' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
              >
                Mặt bằng tầng
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('front')}
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${viewMode === 'front' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
              >
                Mặt đứng
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
              title="Đóng cửa sổ"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 3D Canvas Area */}
        <div className="relative flex-1 bg-slate-950">
          <div ref={containerRef} className="h-full w-full" />

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-teal-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-xs font-bold">Đang nạp không gian 3D căn hộ…</span>
            </div>
          )}

          {/* Floating Instructions */}
          <div className="absolute bottom-4 left-4 rounded-2xl bg-slate-900/90 px-4 py-2 border border-slate-800 text-[11px] text-slate-400 backdrop-blur-md flex items-center gap-3 shadow-lg">
            <span>🖱️ <strong>Chuột trái:</strong> Xoay không gian</span>
            <span>📜 <strong>Lăn chuột:</strong> Phóng to / Thu nhỏ</span>
            <span>🖱️ <strong>Chuột phải:</strong> Di chuyển góc nhìn</span>
          </div>

          {/* Floating Quick Specs */}
          <div className="absolute bottom-4 right-4 rounded-2xl bg-slate-900/90 p-4 border border-teal-500/30 text-xs text-slate-300 backdrop-blur-md shadow-2xl flex flex-col gap-2 max-w-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Giá bán niêm yết:</span>
              <span className="text-sm font-black text-teal-400">{formatPrice(apartment.price)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-[11px]">
              <span className="text-slate-400">Hướng cửa:</span>
              <span className="font-semibold text-slate-200">
                {apartment.mainDoorDirection ? DIRECTION_LABELS[apartment.mainDoorDirection] || apartment.mainDoorDirection : 'Đông Nam'}
              </span>
            </div>
            {apartment.balconyDirection && (
              <div className="flex items-center justify-between gap-4 text-[11px]">
                <span className="text-slate-400">Hướng ban công:</span>
                <span className="font-semibold text-slate-200">
                  {DIRECTION_LABELS[apartment.balconyDirection] || apartment.balconyDirection}
                </span>
              </div>
            )}
            {apartment.virtualTourUrl && (
              <a
                href={apartment.virtualTourUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-1.5 text-xs font-bold text-white shadow-md hover:from-indigo-500 hover:to-indigo-600"
              >
                <Eye className="h-3.5 w-3.5" /> Tham quan thực tế ảo VR 360
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
