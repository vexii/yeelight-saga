export interface YeelightDevice {
  id: string
  location: string
  host: string
  port: number
  connected: boolean
  power: boolean
  brightness: number
  model: string
  rgbDec: number
  hue: number
  saturation: number
}

