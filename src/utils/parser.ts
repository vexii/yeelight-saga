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

export function parseDevice(msg: string): YeelightDevice {
  const headers = msg.toString().split("\r\n")
  const device: any = {}
  for (const header of headers) {
    if (header.indexOf("id:") >= 0) {
      device.id = header.slice(4)
    }
    if (header.indexOf("Location:") >= 0) {
      device.location = header.slice(10)
      const tmp = device.location.split(":")
      device.host = tmp[1].replace("//", "")
      device.port = parseInt(tmp[2], 10)
    }
    if (header.indexOf("power:") >= 0) {
      device.power = header.slice(7) === "on"
    }
    if (header.indexOf("bright:") >= 0) {
      device.brightness = header.slice(8)
    }
    if (header.indexOf("model:") >= 0) {
      device.model = header.slice(7)
    }
    if (header.indexOf("rgb:") >= 0) {
      device.rgbDec = header.slice(5)
    }
    if (header.indexOf("hue:") >= 0) {
      device.hue = header.slice(5)
    }
    if (header.indexOf("sat:") >= 0) {
      device.saturation = header.slice(5)
    }
  }
  return device
}

