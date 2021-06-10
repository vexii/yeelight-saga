import { createAction } from "@reduxjs/toolkit"

import { rgbToDecimal } from "./utils/color"
import { YeelightDevice } from "./types"

const updateDevice = createAction<any>("yeelight/device/change")

export function powerDeviceOn(device: YeelightDevice) {
  return updateDevice({
    id: device.id,
    method: "set_power",
    params: ["off"],
  })
}

export function powerDeviceOff(device: YeelightDevice) {
  return updateDevice({
    id: device.id,
    method: "set_power",
    params: ["off"],
  })
}

export function setDeviceRgb(
  device: YeelightDevice,
  r: number,
  g: number,
  b: number
) {
  return updateDevice({
    id: device.id,
    method: "set_rgb",
    params: [rgbToDecimal(r,g,b)]
  })
}

export function setDeviceHsv(hue,sat) {
}
