import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  Layers,
  RotateCcw,
  Box,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react'
import { housingProjectsApi } from '@/api/housing-projects'
import type { ApartmentDto, FloorPlanResponseDto } from '@/types'
import { DIRECTION_LABELS } from '@/lib/constants'

import type { TimeOfDay, CameraPreset, MasterplanBounds } from './types'
import { MaterialPalette } from './materials'
import { EnvironmentLightingManager } from './environment-lighting'
import { LandscapeLayer } from './landscape-layer'
import { AmenitiesLayer } from './amenities-layer'
import { VegetationLayer } from './vegetation-layer'
import { TrafficLayer } from './traffic-layer'
import { BuildingLayer } from './building-layer'
import { CameraController } from './camera-controller'

function formatPrice(v?: number) {
  if (!v) return '—'
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} triệu`
  return `${Number(v).toLocaleString('vi-VN')} VNĐ`
}

interface Building3DViewerProps {
  projectId: string
  apartments?: ApartmentDto[]
  onSelectApartment?: (apt: ApartmentDto) => void
  selectedApartmentId?: string
}

export function Building3DViewer({
  projectId,
  apartments = [],
  onSelectApartment,
  selectedApartmentId,
}: Building3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [floorPlanData, setFloorPlanData] = useState<FloorPlanResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFloor, setSelectedFloor] = useState<number | 'ALL'>('ALL')
  const [selectedBlock, setSelectedBlock] = useState<string>('ALL')
  const [explodedView, setExplodedView] = useState(false)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('DAY')
  const [activePreset, setActivePreset] = useState<CameraPreset>('overview')
  const [hoveredApt, setHoveredApt] = useState<ApartmentDto | null>(null)
  const [selectedApt, setSelectedApt] = useState<ApartmentDto | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Three.js instances refs
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const materialsRef = useRef<MaterialPalette | null>(null)
  const lightingRef = useRef<EnvironmentLightingManager | null>(null)
  const cameraControllerRef = useRef<CameraController | null>(null)
  const buildingLayerRef = useRef<BuildingLayer | null>(null)
  const landscapeLayerRef = useRef<LandscapeLayer | null>(null)
  const amenitiesLayerRef = useRef<AmenitiesLayer | null>(null)
  const vegetationLayerRef = useRef<VegetationLayer | null>(null)
  const trafficLayerRef = useRef<TrafficLayer | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Fetch FloorPlan data from backend
  useEffect(() => {
    let isMounted = true
    async function loadFloorPlan() {
      setLoading(true)
      try {
        const res = (await housingProjectsApi.getFloorPlan(projectId)) as any
        const rawData = res?.data ?? res?.Data ?? res
        if (rawData && isMounted) {
          setFloorPlanData(rawData as FloorPlanResponseDto)
        }
      } catch (err) {
        console.warn('Could not load floor-plan API, fallback to local apartments list', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadFloorPlan()
    return () => {
      isMounted = false
    }
  }, [projectId])

  // Extract structured blocks from API response or synthesize from apartments prop
  const blocksData = floorPlanData?.blocks && floorPlanData.blocks.length > 0
    ? floorPlanData.blocks
    : (() => {
      const blockMap = new Map<string, Map<number, ApartmentDto[]>>()
      apartments.forEach((apt) => {
        const bName = apt.buildingBlock || 'Block A'
        const fNum = apt.floorNumber ?? 1
        if (!blockMap.has(bName)) blockMap.set(bName, new Map())
        const fMap = blockMap.get(bName)!
        if (!fMap.has(fNum)) fMap.set(fNum, [])
        fMap.get(fNum)!.push(apt)
      })

      return Array.from(blockMap.entries()).map(([blockName, fMap]) => ({
        blockName,
        totalApartmentsInBlock: Array.from(fMap.values()).reduce((sum, list) => sum + list.length, 0),
        floors: Array.from(fMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([floorNumber, apts]) => ({
            floorNumber,
            totalApartmentsOnFloor: apts.length,
            apartments: apts,
          })),
      }))
    })()

  // Available floors and blocks
  const availableFloorNumbers = Array.from(
    new Set(
      blocksData.flatMap((b) => (b.floors || []).map((f) => f.floorNumber))
    )
  ).sort((a, b) => a - b)

  const availableBlockNames = blocksData.map((b) => b.blockName || 'Block A')

  // Setup Three.js Base Canvas Scene
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 1. Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // 2. Camera
    const width = container.clientWidth || 800
    const height = container.clientHeight || 500
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000)
    camera.position.set(42, 34, 56)
    cameraRef.current = camera

    // 3. Renderer setup - Ultra-optimized for silky smooth framerate
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.BasicShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    rendererRef.current = renderer
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 1.4 // Tăng độ nhạy xoay mượt mà, phản hồi nhanh hơn theo yêu cầu
    controls.zoomSpeed = 1.2
    controls.panSpeed = 1.15
    controls.maxPolarAngle = Math.PI / 2 - 0.04
    controls.minDistance = 8
    controls.maxDistance = 150
    controls.target.set(0, 3, 6)
    controlsRef.current = controls

    // 5. Materials Palette & Lighting Manager
    const materials = new MaterialPalette()
    materialsRef.current = materials

    const lightingManager = new EnvironmentLightingManager(scene)
    lightingRef.current = lightingManager

    // Initial temporary bounds for camera
    const initialBounds: MasterplanBounds = {
      minX: -10,
      maxX: 10,
      minZ: -10,
      maxZ: 10,
      centerOffsetX: 0,
      totalBuildingWidth: 20,
      totalBuildingDepth: 20,
      buildingHeight: 15,
      blockBoxes: [],
    }
    const cameraController = new CameraController(camera, controls, initialBounds)
    cameraControllerRef.current = cameraController

    // 6. Raycasting for mouse interactions
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      setMousePos({ x: e.clientX, y: e.clientY })

      raycaster.setFromCamera(mouse, camera)
      const meshes = buildingLayerRef.current
        ? Array.from(buildingLayerRef.current.apartmentMeshes.values())
        : []
      const intersects = raycaster.intersectObjects(meshes, false)

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        const apt = hitMesh.userData.apartment as ApartmentDto
        setHoveredApt(apt)
        container.style.cursor = 'pointer'
      } else {
        setHoveredApt(null)
        container.style.cursor = 'default'
      }
    }

    const onPointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const meshes = buildingLayerRef.current
        ? Array.from(buildingLayerRef.current.apartmentMeshes.values())
        : []
      const intersects = raycaster.intersectObjects(meshes, false)

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        const apt = hitMesh.userData.apartment as ApartmentDto
        setSelectedApt(apt)
        onSelectApartment?.(apt)
      }
    }

    renderer.domElement.addEventListener('mousemove', onPointerMove)
    renderer.domElement.addEventListener('click', onPointerDown)

    // 7. Throttled Dynamic Animation Loop (Target 30-40 FPS to keep CPU/GPU cold and silky smooth)
    let isVisible = true
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry?.isIntersecting ?? true
    }, { threshold: 0.05 })
    observer.observe(container)

    let lastTime = performance.now()
    const targetInterval = 1000 / 35 // 35 FPS optimal for low CPU/GPU load

    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate)
      if (!isVisible) return

      const delta = time - lastTime
      if (delta >= targetInterval) {
        lastTime = time - (delta % targetInterval)

        if (trafficLayerRef.current) {
          trafficLayerRef.current.update()
        }
        if (lightingRef.current) {
          lightingRef.current.update(delta / 1000)
        }

        controls.update()
        renderer.render(scene, camera)
      }
    }
    animate(performance.now())

    // 8. Resize Handler with ResizeObserver
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth || 800
      const h = container.clientHeight || 500
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(container)
    window.addEventListener('resize', handleResize)

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      renderer.domElement.removeEventListener('mousemove', onPointerMove)
      renderer.domElement.removeEventListener('click', onPointerDown)
      materials.dispose()
      lightingManager.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Re-build Building, Landscape, Amenities, Vegetation, and Traffic on Data or View changes
  useEffect(() => {
    const scene = sceneRef.current
    const materials = materialsRef.current
    const lightingManager = lightingRef.current
    if (!scene || !materials || !lightingManager) return

    // Clean previous layers
    if (buildingLayerRef.current) {
      scene.remove(buildingLayerRef.current.group)
      buildingLayerRef.current.dispose()
      buildingLayerRef.current = null
    }
    if (landscapeLayerRef.current) {
      scene.remove(landscapeLayerRef.current.group)
      landscapeLayerRef.current.dispose()
      landscapeLayerRef.current = null
    }
    if (amenitiesLayerRef.current) {
      scene.remove(amenitiesLayerRef.current.group)
      amenitiesLayerRef.current.dispose()
      amenitiesLayerRef.current = null
    }
    if (vegetationLayerRef.current) {
      scene.remove(vegetationLayerRef.current.group)
      vegetationLayerRef.current.dispose()
      vegetationLayerRef.current = null
    }
    if (trafficLayerRef.current) {
      scene.remove(trafficLayerRef.current.group)
      trafficLayerRef.current.dispose()
      trafficLayerRef.current = null
    }

    // 1. Build Building Layer from BE Data
    const buildingLayer = new BuildingLayer(
      blocksData,
      selectedFloor,
      selectedBlock,
      explodedView,
      selectedApt,
      hoveredApt,
      selectedApartmentId,
      timeOfDay,
      materials
    )
    buildingLayerRef.current = buildingLayer
    scene.add(buildingLayer.group)

    const bounds = buildingLayer.bounds
    if (cameraControllerRef.current) {
      cameraControllerRef.current.updateBounds(bounds)
      cameraControllerRef.current.setPreset(activePreset)
    }

    // 2. Build Adaptive Landscape Layer
    const landscapeLayer = new LandscapeLayer(bounds, materials)
    landscapeLayerRef.current = landscapeLayer
    scene.add(landscapeLayer.group)

    // 3. Build Amenities Layer (Cột cờ Việt Nam, Khu vui chơi, Bãi xe, Đèn đường, Người dân)
    const amenitiesLayer = new AmenitiesLayer(bounds, materials, lightingManager)
    amenitiesLayerRef.current = amenitiesLayer
    scene.add(amenitiesLayer.group)

    // 4. Build Multi-tier Vegetation Layer
    const vegetationLayer = new VegetationLayer(bounds, materials)
    vegetationLayerRef.current = vegetationLayer
    scene.add(vegetationLayer.group)

    // 5. Build Dynamic Traffic Layer (Xe buýt, Ô tô con, Xe máy di chuyển)
    const trafficLayer = new TrafficLayer(bounds, materials)
    trafficLayerRef.current = trafficLayer
    scene.add(trafficLayer.group)

    // Sync lighting time of day
    lightingManager.setTimeOfDay(timeOfDay)
  }, [
    blocksData,
    selectedFloor,
    selectedBlock,
    explodedView,
    selectedApt,
    hoveredApt,
    selectedApartmentId,
    timeOfDay,
  ])

  // Handle Time of Day change
  const handleTimeChange = (t: TimeOfDay) => {
    setTimeOfDay(t)
    if (lightingRef.current) {
      lightingRef.current.setTimeOfDay(t)
    }
  }

  // Handle Camera Preset change
  const handlePresetChange = (preset: CameraPreset) => {
    setActivePreset(preset)
    if (cameraControllerRef.current) {
      cameraControllerRef.current.setPreset(preset)
    }
  }

  // Reset view
  const handleResetView = () => {
    setActivePreset('overview')
    setSelectedFloor('ALL')
    setSelectedBlock('ALL')
    setExplodedView(false)
    if (cameraControllerRef.current) {
      cameraControllerRef.current.reset()
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-950 text-white shadow-2xl dark:border-slate-800 h-full min-h-[480px] w-full select-none">
      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="h-full w-full" />

      {/* TOP FLOATING CONTROL BAR */}
      <div className="absolute left-4 top-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Title Badge & Floor / Block Selectors */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900/90 px-4 py-2 border border-slate-700/60 backdrop-blur-md shadow-lg">
            <Box className="h-4 w-4 text-teal-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-100">Khu Nhà Ở Xã Hội 3D</span>
            {loading && <span className="text-[10px] text-teal-400 font-semibold">Đang tải…</span>}
          </div>

          {/* Block Selector */}
          {availableBlockNames.length > 1 && (
            <div className="rounded-2xl bg-slate-900/90 p-1 border border-slate-700/60 backdrop-blur-md shadow-lg flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedBlock('ALL')}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${selectedBlock === 'ALL'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                Tất cả Block
              </button>
              {availableBlockNames.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBlock(b)}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${selectedBlock === b
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}

          {/* Floor Selector */}
          <div className="rounded-2xl bg-slate-900/90 p-1 border border-slate-700/60 backdrop-blur-md shadow-lg flex items-center gap-1">
            <span className="px-2 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-teal-400" /> Tầng:
            </span>
            <button
              type="button"
              onClick={() => setSelectedFloor('ALL')}
              className={`rounded-xl px-2 py-1 text-xs font-bold transition ${selectedFloor === 'ALL'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Tất cả
            </button>
            {availableFloorNumbers.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setSelectedFloor(f)}
                className={`rounded-xl px-2 py-1 text-xs font-bold transition ${selectedFloor === f
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                T{f}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Time of Day, Camera Presets, Exploded View */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* Time of Day Modes: DAY / SUNSET / NIGHT */}
          <div className="flex items-center rounded-2xl bg-slate-900/90 p-1 border border-slate-700/60 backdrop-blur-md shadow-lg">
            <button
              type="button"
              onClick={() => handleTimeChange('DAY')}
              title="Ban ngày (Bầu trời xanh & Ánh nắng tự nhiên)"
              className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition ${timeOfDay === 'DAY'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ngày</span>
            </button>
            <button
              type="button"
              onClick={() => handleTimeChange('SUNSET')}
              title="Hoàng hôn (Bầu trời cam & Golden Hour)"
              className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition ${timeOfDay === 'SUNSET'
                ? 'bg-orange-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <Sunset className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hoàng hôn</span>
            </button>
            <button
              type="button"
              onClick={() => handleTimeChange('NIGHT')}
              title="Ban đêm (Đèn đường & Cửa sổ phát sáng)"
              className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition ${timeOfDay === 'NIGHT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Đêm</span>
            </button>
          </div>

          {/* Exploded View Toggle */}
          <button
            type="button"
            onClick={() => setExplodedView(!explodedView)}
            title="Bóc tách các tầng"
            className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold border backdrop-blur-md transition shadow-lg ${explodedView
              ? 'bg-teal-500 border-teal-400 text-slate-950'
              : 'bg-slate-900/90 border-slate-700/60 text-slate-200 hover:bg-slate-800'
              }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Bóc tách tầng</span>
          </button>

          {/* Camera View Presets */}
          <div className="flex items-center rounded-2xl bg-slate-900/90 p-1 border border-slate-700/60 backdrop-blur-md shadow-lg">
            <button
              type="button"
              onClick={() => handlePresetChange('overview')}
              className={`rounded-xl px-2.5 py-1 text-xs font-medium transition ${activePreset === 'overview'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              title="Tổng quan đô thị Isometric"
            >
              Tổng quan
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('front')}
              className={`rounded-xl px-2.5 py-1 text-xs font-medium transition ${activePreset === 'front'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              title="Mặt trước sảnh đón"
            >
              Mặt đứng
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('street')}
              className={`rounded-xl px-2.5 py-1 text-xs font-medium transition ${activePreset === 'street'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              title="Góc nhìn người đi bộ trên đường nội khu"
            >
              Đi bộ
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('playground')}
              className={`rounded-xl px-2.5 py-1 text-xs font-medium transition ${activePreset === 'playground'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              title="Khu vui chơi trẻ em & Công viên"
            >
              Vui chơi
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('top')}
              className={`rounded-xl px-2.5 py-1 text-xs font-medium transition ${activePreset === 'top'
                ? 'bg-teal-600 text-white font-bold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              title="Mặt bằng từ trên cao"
            >
              Trên cao
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              title="Đặt lại góc nhìn ban đầu"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT LEGEND */}
      <div className="absolute bottom-4 left-4 pointer-events-auto rounded-2xl bg-slate-900/90 px-4 py-2.5 border border-slate-800/80 backdrop-blur-md shadow-lg flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-teal-500 shadow-sm shadow-teal-500/50" />
          <span className="text-slate-300 font-medium">Còn trống (Khả dụng)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-amber-500 shadow-sm shadow-amber-500/50" />
          <span className="text-slate-300 font-medium">Suất ưu tiên ⭐</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-slate-500 shadow-sm shadow-slate-500/50" />
          <span className="text-slate-300 font-medium">Đã cấp / Đã giao</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-cyan-400 shadow-sm shadow-cyan-400/50" />
          <span className="text-slate-300 font-medium">Đang chọn</span>
        </div>
      </div>

      {/* HOVER TOOLTIP FLOATING WITH CURSOR */}
      {hoveredApt && !selectedApt && (
        <div
          className="fixed pointer-events-none z-50 rounded-2xl bg-slate-950/95 p-3.5 text-xs text-white shadow-2xl border border-teal-500/40 backdrop-blur-md transition-all duration-75 max-w-xs animate-in fade-in zoom-in-95"
          style={{
            left: `${mousePos.x + 16}px`,
            top: `${mousePos.y + 16}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <div className="font-bold text-sm text-teal-300 flex items-center gap-1.5">
              <span>Căn hộ {hoveredApt.unitName}</span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${hoveredApt.unitGroup?.toUpperCase() === 'PRIORITY'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                }`}
            >
              {hoveredApt.unitGroup?.toUpperCase() === 'PRIORITY' ? 'Suất ưu tiên ⭐' : 'Thường'}
            </span>
          </div>

          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Vị trí:</span>
              <span className="font-semibold text-white">
                Tầng {hoveredApt.floorNumber} · {hoveredApt.buildingBlock || 'Block A'}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Diện tích:</span>
              <span className="font-semibold text-white">{hoveredApt.area ?? hoveredApt.grossArea ?? '—'} m²</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">Bố trí:</span>
              <span className="font-semibold text-white">
                {hoveredApt.numberOfBedrooms ?? 2} Phòng ngủ · {hoveredApt.numberOfBathrooms ?? 1} Phòng vệ sinh
              </span>
            </div>
            <div className="flex justify-between gap-3 pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Giá bán:</span>
              <span className="font-bold text-teal-400">{formatPrice(hoveredApt.price)}</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-teal-400/80 italic text-center">
            Click chuột để xem chi tiết căn này
          </div>
        </div>
      )}

      {/* SELECTED APARTMENT FLOATING DRAWER / PANEL */}
      {selectedApt && (
        <div className="absolute right-4 bottom-4 top-20 w-80 max-w-[calc(100%-2rem)] rounded-3xl bg-slate-900/95 p-5 border border-slate-700/80 backdrop-blur-xl shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right-4">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <div className="text-xl font-black text-white flex items-center gap-2">
                  <span>Căn {selectedApt.unitName}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tòa {selectedApt.buildingBlock || 'Block A'} · Tầng {selectedApt.floorNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApt(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span
                className={`rounded-xl px-2.5 py-1 text-xs font-bold ${String(selectedApt.status).toUpperCase() === 'AVAILABLE'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'bg-slate-700 text-slate-300'
                  }`}
              >
                {String(selectedApt.status).toUpperCase() === 'AVAILABLE' ? 'Còn trống' : 'Đã giao'}
              </span>
              {selectedApt.unitGroup?.toUpperCase() === 'PRIORITY' && (
                <span className="rounded-xl px-2.5 py-1 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Suất ưu tiên ⭐
                </span>
              )}
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-slate-950/60 p-3 border border-slate-800/80 text-xs mb-4">
              <div>
                <span className="text-[11px] text-slate-400">Diện tích thông thủy</span>
                <p className="font-bold text-white mt-0.5">{selectedApt.area ?? selectedApt.grossArea ?? '—'} m²</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Số phòng ngủ</span>
                <p className="font-bold text-white mt-0.5">{selectedApt.numberOfBedrooms ?? 2} Phòng ngủ</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Số phòng vệ sinh</span>
                <p className="font-bold text-white mt-0.5">{selectedApt.numberOfBathrooms ?? 1} Phòng vệ sinh</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Hướng cửa chính</span>
                <p className="font-bold text-white mt-0.5">
                  {selectedApt.mainDoorDirection ? DIRECTION_LABELS[selectedApt.mainDoorDirection] || selectedApt.mainDoorDirection : '—'}
                </p>
              </div>
              {selectedApt.balconyDirection && (
                <div className="col-span-2">
                  <span className="text-[11px] text-slate-400">Hướng ban công</span>
                  <p className="font-bold text-white mt-0.5">
                    {DIRECTION_LABELS[selectedApt.balconyDirection] || selectedApt.balconyDirection}
                  </p>
                </div>
              )}
            </div>

            {/* Price Box */}
            <div className="rounded-2xl bg-gradient-to-br from-teal-950/60 to-slate-950/80 p-3.5 border border-teal-500/30 mb-4">
              <span className="text-[11px] font-medium text-teal-300">Giá bán căn hộ (dự kiến)</span>
              <div className="text-xl font-extrabold text-teal-400 mt-1">
                {formatPrice(selectedApt.price)}
              </div>
              {selectedApt.area && selectedApt.price && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  ~{(Math.round((selectedApt.price / selectedApt.area) / 100_000) / 10).toFixed(1)} triệu/m²
                </p>
              )}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => onSelectApartment?.(selectedApt)}
            className="w-full rounded-2xl bg-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/30 hover:bg-teal-500 transition active:scale-[0.98]"
          >
            Chọn căn hộ này
          </button>
        </div>
      )}
    </div>
  )
}
