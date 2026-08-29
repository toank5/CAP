import * as THREE from 'three'

/**
 * Creates official Vietnamese Flag texture (Cờ đỏ sao vàng)
 */
function createVietnamFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 170
  const ctx = canvas.getContext('2d')!

  // Red background
  ctx.fillStyle = '#da251d'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 5-pointed gold star
  ctx.fillStyle = '#ffff00'
  ctx.beginPath()
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const outerR = canvas.height * 0.3
  const innerR = outerR * 0.382
  const spikes = 5
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes

  ctx.moveTo(cx, cy - outerR)
  for (let i = 0; i < spikes; i++) {
    const x1 = cx + Math.cos(rot) * outerR
    const y1 = cy + Math.sin(rot) * outerR
    ctx.lineTo(x1, y1)
    rot += step

    const x2 = cx + Math.cos(rot) * innerR
    const y2 = cy + Math.sin(rot) * innerR
    ctx.lineTo(x2, y2)
    rot += step
  }
  ctx.lineTo(cx, cy - outerR)
  ctx.closePath()
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/**
 * High-Performance, Super-Lightweight Material Palette
 */
export class MaterialPalette {
  // Flag
  public flagTexture: THREE.CanvasTexture
  public vietnamFlagMat: THREE.MeshStandardMaterial

  // Landscape
  public grassMat: THREE.MeshStandardMaterial
  public asphaltMat: THREE.MeshStandardMaterial
  public roadLineMat: THREE.MeshBasicMaterial
  public zebraMat: THREE.MeshBasicMaterial
  public sidewalkMat: THREE.MeshStandardMaterial
  public curbMat: THREE.MeshStandardMaterial
  public plazaTileMat: THREE.MeshStandardMaterial
  public parkPathMat: THREE.MeshStandardMaterial

  // Swimming Pool & Back Amenities
  public poolWaterMat: THREE.MeshStandardMaterial
  public poolDeckMat: THREE.MeshStandardMaterial
  public poolCurbMat: THREE.MeshStandardMaterial
  public sunLoungerMat: THREE.MeshStandardMaterial
  public umbrellaMat: THREE.MeshStandardMaterial
  public sportsCourtBlueMat: THREE.MeshStandardMaterial
  public sportsCourtGreenMat: THREE.MeshStandardMaterial
  public courtLineMat: THREE.MeshBasicMaterial
  public gazeboWoodMat: THREE.MeshStandardMaterial
  public bollardBulbMat: THREE.MeshBasicMaterial

  // Playground & Amenities
  public playgroundRubberMat: THREE.MeshStandardMaterial
  public playgroundSlideMat: THREE.MeshStandardMaterial
  public playgroundSwingMat: THREE.MeshStandardMaterial
  public benchWoodMat: THREE.MeshStandardMaterial
  public metalDarkMat: THREE.MeshStandardMaterial
  public inoxPoleMat: THREE.MeshStandardMaterial
  public hydrantMat: THREE.MeshStandardMaterial
  public guardBoothMat: THREE.MeshStandardMaterial
  public barrierBarMat: THREE.MeshStandardMaterial
  public lampBulbMatDay: THREE.MeshBasicMaterial
  public lampBulbMatNight: THREE.MeshBasicMaterial

  // People / Pedestrians
  public skinMat: THREE.MeshStandardMaterial
  public hairDarkMat: THREE.MeshStandardMaterial
  public clothesBlueMat: THREE.MeshStandardMaterial
  public clothesRedMat: THREE.MeshStandardMaterial
  public clothesWhiteMat: THREE.MeshStandardMaterial
  public clothesYellowMat: THREE.MeshStandardMaterial
  public pantsDarkMat: THREE.MeshStandardMaterial

  // Vehicles
  public carGlassMat: THREE.MeshStandardMaterial
  public tireMat: THREE.MeshStandardMaterial
  public busMat: THREE.MeshStandardMaterial

  // Architecture & Building
  public concreteSlabMat: THREE.MeshStandardMaterial
  public canopyFrameMat: THREE.MeshStandardMaterial
  public canopyGlassMat: THREE.MeshStandardMaterial
  public windowGlassMatDay: THREE.MeshStandardMaterial
  public windowGlassMatNight: THREE.MeshStandardMaterial
  public balconyRailMat: THREE.MeshStandardMaterial
  public roofMechMat: THREE.MeshStandardMaterial

  // Vegetation & Flowers
  public trunkMat: THREE.MeshStandardMaterial
  public leafMatDark: THREE.MeshStandardMaterial
  public leafMatMedium: THREE.MeshStandardMaterial
  public leafMatLight: THREE.MeshStandardMaterial
  public bushMat: THREE.MeshStandardMaterial
  public flowerRedMat: THREE.MeshStandardMaterial
  public flowerYellowMat: THREE.MeshStandardMaterial
  public flowerPinkMat: THREE.MeshStandardMaterial

  constructor() {
    // 0. Flag
    this.flagTexture = createVietnamFlagTexture()
    this.vietnamFlagMat = new THREE.MeshStandardMaterial({
      map: this.flagTexture,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide,
    })

    // 1. Landscape
    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x3d7042,
      roughness: 0.9,
    })

    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1e2631,
      roughness: 0.92,
    })

    this.roadLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc })
    this.zebraMat = new THREE.MeshBasicMaterial({ color: 0xffffff })

    this.sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.8,
    })

    this.curbMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.8,
    })

    this.plazaTileMat = new THREE.MeshStandardMaterial({
      color: 0x85929e,
      roughness: 0.7,
    })

    this.parkPathMat = new THREE.MeshStandardMaterial({
      color: 0xc8b89e,
      roughness: 0.85,
    })

    // 2. Swimming Pool & Back Amenities
    this.poolWaterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Sparkling turquoise water
      emissive: 0x0369a1,
      emissiveIntensity: 0.45,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.88,
    })

    this.poolDeckMat = new THREE.MeshStandardMaterial({
      color: 0x9a5a2a, // Warm teak wood decking
      roughness: 0.6,
    })

    this.poolCurbMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // White marble pool edge
      roughness: 0.2,
    })

    this.sunLoungerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
    })

    this.umbrellaMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, // Orange resort umbrella
      roughness: 0.4,
    })

    this.sportsCourtBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vibrant blue court paint
      roughness: 0.7,
    })

    this.sportsCourtGreenMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Forest green court border
      roughness: 0.7,
    })

    this.courtLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff })

    this.gazeboWoodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Deep mahogany wood
      roughness: 0.5,
    })

    this.bollardBulbMat = new THREE.MeshBasicMaterial({ color: 0xfff07c })

    // 3. Playground & Amenities
    this.playgroundRubberMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.9,
    })

    this.playgroundSlideMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.4,
    })

    this.playgroundSwingMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.4,
    })

    this.benchWoodMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e,
      roughness: 0.6,
    })

    this.metalDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
    })

    this.inoxPoleMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.8,
    })

    this.hydrantMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.4,
    })

    this.guardBoothMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.4,
    })

    this.barrierBarMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.3,
    })

    this.lampBulbMatDay = new THREE.MeshBasicMaterial({ color: 0xfef08a })
    this.lampBulbMatNight = new THREE.MeshBasicMaterial({ color: 0xfff07c })

    // 4. People / Pedestrians
    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xf5cba7, roughness: 0.8 })
    this.hairDarkMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 })
    this.clothesBlueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.8 })
    this.clothesRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.8 })
    this.clothesWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 })
    this.clothesYellowMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.8 })
    this.pantsDarkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 })

    // 5. Vehicles
    this.carGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
    })

    this.tireMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.95,
    })

    this.busMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.4,
    })

    // 6. Architecture
    this.concreteSlabMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
    })

    this.canopyFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
    })

    this.canopyGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
    })

    this.windowGlassMatDay = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.65,
      roughness: 0.15,
    })

    this.windowGlassMatNight = new THREE.MeshStandardMaterial({
      color: 0xffd166, // Rực rỡ vàng ấm
      emissive: 0xffb703,
      emissiveIntensity: 1.0,
      roughness: 0.2,
    })

    this.balconyRailMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2,
    })

    this.roofMechMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
    })

    // 7. Vegetation & Flowers
    this.trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a3525,
      roughness: 0.95,
    })

    this.leafMatDark = new THREE.MeshStandardMaterial({
      color: 0x225e2e,
      roughness: 0.7,
      flatShading: true,
    })

    this.leafMatMedium = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.7,
      flatShading: true,
    })

    this.leafMatLight = new THREE.MeshStandardMaterial({
      color: 0x43a047,
      roughness: 0.7,
      flatShading: true,
    })

    this.bushMat = new THREE.MeshStandardMaterial({
      color: 0x3b823e,
      roughness: 0.7,
      flatShading: true,
    })

    this.flowerRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 })
    this.flowerYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 })
    this.flowerPinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.6 })
  }

  public dispose() {
    this.flagTexture.dispose()
    Object.values(this).forEach((mat) => {
      if (mat && typeof mat.dispose === 'function') {
        mat.dispose()
      }
    })
  }
}
