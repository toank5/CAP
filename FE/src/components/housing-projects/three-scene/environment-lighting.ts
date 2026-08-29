import * as THREE from 'three'
import type { TimeOfDay } from './types'

export class EnvironmentLightingManager {
  private scene: THREE.Scene
  private sunLight: THREE.DirectionalLight
  private skyLight: THREE.DirectionalLight
  private hemiLight: THREE.HemisphereLight
  private ambientLight: THREE.AmbientLight

  // Celestial Bodies (Mặt trời ban ngày, Hoàng hôn, Mặt trăng, Sao, Mây)
  private celestialGroup: THREE.Group
  private daySunMesh: THREE.Mesh
  private daySunGlow: THREE.Mesh
  private sunsetSunMesh: THREE.Mesh
  private sunsetSunGlow: THREE.Mesh
  private moonMesh: THREE.Mesh
  private moonGlow: THREE.Mesh
  private starfield: THREE.Points

  // Cloud System
  private cloudsGroup: THREE.Group
  private cloudItems: { mesh: THREE.Group; speed: number }[] = []
  private cloudMaterial: THREE.MeshStandardMaterial

  constructor(scene: THREE.Scene) {
    this.scene = scene

    // 1. Ambient Light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
    this.scene.add(this.ambientLight)

    // 2. Optimized Sun Directional Light with Lightweight Shadows
    this.sunLight = new THREE.DirectionalLight(0xfff8ee, 2.2)
    this.sunLight.position.set(25, 70, -65) // Phía sau tòa nhà (Z < 0)
    this.sunLight.castShadow = true
    this.sunLight.shadow.mapSize.width = 1024
    this.sunLight.shadow.mapSize.height = 1024
    this.sunLight.shadow.camera.near = 1
    this.sunLight.shadow.camera.far = 240
    this.sunLight.shadow.camera.left = -65
    this.sunLight.shadow.camera.right = 65
    this.sunLight.shadow.camera.top = 65
    this.sunLight.shadow.camera.bottom = -65
    this.sunLight.shadow.bias = -0.0005
    this.scene.add(this.sunLight)

    // 3. Sky Bounce Light
    this.skyLight = new THREE.DirectionalLight(0x7dd3fc, 0.9)
    this.skyLight.position.set(0, 40, 40)
    this.scene.add(this.skyLight)

    // 4. Hemisphere Light
    this.hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x224c38, 0.8)
    this.scene.add(this.hemiLight)

    // 5. Celestial Bodies (Vị trí đặt ở phía sau nhà: Z < 0)
    this.celestialGroup = new THREE.Group()

    // 5.1 Day Sun (Mặt trời ban ngày phía sau tòa nhà)
    const daySunGeo = new THREE.SphereGeometry(4.8, 16, 16)
    const daySunMat = new THREE.MeshBasicMaterial({ color: 0xfffaed })
    this.daySunMesh = new THREE.Mesh(daySunGeo, daySunMat)
    this.daySunMesh.position.set(20, 75, -80)
    this.celestialGroup.add(this.daySunMesh)

    const dayGlowGeo = new THREE.SphereGeometry(7.5, 16, 16)
    const dayGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.35,
    })
    this.daySunGlow = new THREE.Mesh(dayGlowGeo, dayGlowMat)
    this.daySunGlow.position.copy(this.daySunMesh.position)
    this.celestialGroup.add(this.daySunGlow)

    // 5.2 Sunset Sun (Mặt trời hoàng hôn to tròn màu cam lửa ở chân trời phía sau)
    const sunsetSunGeo = new THREE.SphereGeometry(6.5, 16, 16)
    const sunsetSunMat = new THREE.MeshBasicMaterial({ color: 0xf97316 })
    this.sunsetSunMesh = new THREE.Mesh(sunsetSunGeo, sunsetSunMat)
    this.sunsetSunMesh.position.set(-30, 20, -85)
    this.celestialGroup.add(this.sunsetSunMesh)

    const sunsetGlowGeo = new THREE.SphereGeometry(9.5, 16, 16)
    const sunsetGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfb923c,
      transparent: true,
      opacity: 0.45,
    })
    this.sunsetSunGlow = new THREE.Mesh(sunsetGlowGeo, sunsetGlowMat)
    this.sunsetSunGlow.position.copy(this.sunsetSunMesh.position)
    this.celestialGroup.add(this.sunsetSunGlow)

    // 5.3 Night Crescent Moon (Mặt trăng khuyết nghệ thuật ban đêm phía sau nhà)
    const moonShape = new THREE.Shape()
    const outerRadius = 4.2
    const innerRadius = 3.75
    const offset = 1.55

    // Cung tròn ngoài
    moonShape.absarc(0, 0, outerRadius, -Math.PI / 2, Math.PI / 2, false)
    // Cung tròn trong tạo hình lưỡi liềm khuyết
    moonShape.absarc(offset, 0.15, innerRadius, Math.PI / 2, -Math.PI / 2, true)

    const moonExtrudeSettings = {
      depth: 0.8,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.2,
      bevelThickness: 0.2,
    }
    const moonGeo = new THREE.ExtrudeGeometry(moonShape, moonExtrudeSettings)
    moonGeo.center()

    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb, // Ánh vàng kem trăng sáng
      emissive: 0xfef08a, // Soft warm moonlight glow
      emissiveIntensity: 1.35,
      roughness: 0.25,
      metalness: 0.1,
    })
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat)
    this.moonMesh.position.set(-28, 25, -70)
    // Nghiêng nhẹ góc trăng khuyết thơ mộng
    this.moonMesh.rotation.set(0.1, 0.35, -0.45)
    this.celestialGroup.add(this.moonMesh)

    const moonGlowGeo = new THREE.SphereGeometry(6.2, 16, 16)
    const moonGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.22,
    })
    this.moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat)
    this.moonGlow.position.copy(this.moonMesh.position)
    this.celestialGroup.add(this.moonGlow)

    // 5.4 Starfield (Vòm sao lấp lánh ban đêm)
    const starCount = 180
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 0.8 + 0.2)
      const r = 110 + Math.random() * 20
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.cos(phi)
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.3,
      transparent: true,
      opacity: 0.95,
    })
    this.starfield = new THREE.Points(starGeo, starMat)
    this.celestialGroup.add(this.starfield)

    // 5.5 Cloud System (Cụm mây bồng bềnh chuyển màu theo thời gian)
    this.cloudsGroup = new THREE.Group()
    this.cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.05,
      transparent: true,
      opacity: 0.9,
    })

    const cloudConfigs = [
      { x: -55, y: 22, z: -52, scale: 1.1, speed: 0.45 },
      { x: -22, y: 25, z: -64, scale: 1.3, speed: 0.35 }, // Ngang độ cao mặt trăng
      { x: 8, y: 19, z: -48, scale: 0.95, speed: 0.5 },
      { x: 38, y: 24, z: -56, scale: 1.2, speed: 0.38 },
      { x: 62, y: 23, z: -68, scale: 1.25, speed: 0.32 },
      { x: -42, y: 17, z: -44, scale: 0.85, speed: 0.48 }, // Thấp hơn mặt trăng
      { x: 22, y: 25, z: -70, scale: 1.35, speed: 0.3 },
      { x: -8, y: 20, z: -58, scale: 1.05, speed: 0.42 },
    ]

    const sphereGeo = new THREE.SphereGeometry(1, 8, 8)
    const puffs = [
      { x: 0, y: 0, z: 0, sx: 3.8, sy: 2.2, sz: 3.2 },
      { x: -2.8, y: -0.4, z: 0.2, sx: 2.6, sy: 1.8, sz: 2.4 },
      { x: 2.8, y: -0.3, z: -0.2, sx: 2.7, sy: 1.9, sz: 2.5 },
      { x: -1.2, y: 1.1, z: 0.1, sx: 2.5, sy: 1.8, sz: 2.3 },
      { x: 1.2, y: 0.9, z: -0.1, sx: 2.4, sy: 1.7, sz: 2.2 },
    ]

    cloudConfigs.forEach((cfg) => {
      const cloud = new THREE.Group()
      puffs.forEach((p) => {
        const mesh = new THREE.Mesh(sphereGeo, this.cloudMaterial)
        mesh.position.set(p.x, p.y, p.z)
        mesh.scale.set(p.sx, p.sy, p.sz)
        cloud.add(mesh)
      })
      cloud.position.set(cfg.x, cfg.y, cfg.z)
      cloud.scale.setScalar(cfg.scale)
      this.cloudsGroup.add(cloud)
      this.cloudItems.push({ mesh: cloud, speed: cfg.speed })
    })

    this.celestialGroup.add(this.cloudsGroup)
    this.scene.add(this.celestialGroup)

    // Set initial DAY lighting
    this.setTimeOfDay('DAY')
  }

  public setTimeOfDay(time: TimeOfDay) {
    if (time === 'DAY') {
      this.scene.background = new THREE.Color(0x7ec8f8)
      this.scene.fog = new THREE.FogExp2(0x7ec8f8, 0.0025)

      this.ambientLight.color.setHex(0xffffff)
      this.ambientLight.intensity = 1.0

      this.sunLight.color.setHex(0xfff8ee)
      this.sunLight.intensity = 2.2
      this.sunLight.position.set(20, 75, -80)

      this.skyLight.color.setHex(0x7dd3fc)
      this.skyLight.intensity = 0.9
      this.skyLight.position.set(0, 40, 40)

      this.hemiLight.color.setHex(0xbae6fd)
      this.hemiLight.groundColor.setHex(0x224c38)
      this.hemiLight.intensity = 0.75

      // Mây trắng ban ngày bồng bềnh
      this.cloudMaterial.color.setHex(0xffffff)
      this.cloudMaterial.emissive.setHex(0xffffff)
      this.cloudMaterial.emissiveIntensity = 0.2
      this.cloudMaterial.opacity = 0.92

      this.daySunMesh.visible = true
      this.daySunGlow.visible = true
      this.sunsetSunMesh.visible = false
      this.sunsetSunGlow.visible = false
      this.moonMesh.visible = false
      this.moonGlow.visible = false
      this.starfield.visible = false
    } else if (time === 'SUNSET') {
      this.scene.background = new THREE.Color(0xd97736)
      this.scene.fog = new THREE.FogExp2(0xd97736, 0.003)

      this.ambientLight.color.setHex(0xfef08a)
      this.ambientLight.intensity = 1.1

      this.sunLight.color.setHex(0xf97316)
      this.sunLight.intensity = 2.8
      this.sunLight.position.set(-30, 20, -85)

      this.skyLight.color.setHex(0xc084fc)
      this.skyLight.intensity = 0.9
      this.skyLight.position.set(0, 30, 40)

      this.hemiLight.color.setHex(0xfdba74)
      this.hemiLight.groundColor.setHex(0x431407)
      this.hemiLight.intensity = 0.8

      // Mây hoàng hôn ánh hồng cam rực rỡ
      this.cloudMaterial.color.setHex(0xfecdd3)
      this.cloudMaterial.emissive.setHex(0xf97316)
      this.cloudMaterial.emissiveIntensity = 0.65
      this.cloudMaterial.opacity = 0.92

      this.daySunMesh.visible = false
      this.daySunGlow.visible = false
      this.sunsetSunMesh.visible = true
      this.sunsetSunGlow.visible = true
      this.moonMesh.visible = false
      this.moonGlow.visible = false
      this.starfield.visible = false
    } else if (time === 'NIGHT') {
      // Ban đêm ấm cúng, êm dịu, bầu trời xanh đêm sâu lắng (độ sáng vừa phải)
      this.scene.background = new THREE.Color(0x0c1527) // Deep Midnight Navy Sky
      this.scene.fog = new THREE.FogExp2(0x0c1527, 0.0035)

      this.ambientLight.color.setHex(0x60a5fa) // Ánh sáng ambient đêm xanh dịu
      this.ambientLight.intensity = 0.65

      this.sunLight.color.setHex(0x93c5fd) // Ánh trăng soi sáng
      this.sunLight.intensity = 0.8
      this.sunLight.position.set(-28, 25, -70)

      this.skyLight.color.setHex(0x2563eb)
      this.skyLight.intensity = 0.45
      this.skyLight.position.set(0, 35, 35)

      this.hemiLight.color.setHex(0x1e3a8a)
      this.hemiLight.groundColor.setHex(0x064e3b)
      this.hemiLight.intensity = 0.45

      // Mây đêm huyền ảo ánh trăng bạc
      this.cloudMaterial.color.setHex(0x1e293b)
      this.cloudMaterial.emissive.setHex(0x334155)
      this.cloudMaterial.emissiveIntensity = 0.4
      this.cloudMaterial.opacity = 0.65

      this.daySunMesh.visible = false
      this.daySunGlow.visible = false
      this.sunsetSunMesh.visible = false
      this.sunsetSunGlow.visible = false
      this.moonMesh.visible = true
      this.moonGlow.visible = true
      this.starfield.visible = true
    }
  }

  public update(delta: number = 0.03) {
    this.cloudItems.forEach((c) => {
      c.mesh.position.x += c.speed * delta * 5.0
      if (c.mesh.position.x > 90) {
        c.mesh.position.x = -90
      }
    })
  }

  public registerNightLight(_light: THREE.PointLight) {
    // No-op for performance
  }

  public dispose() {
    this.scene.remove(this.celestialGroup)
    this.cloudMaterial.dispose()
  }
}
