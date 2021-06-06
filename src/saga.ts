import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { eventChannel, EventChannel } from "redux-saga"
import { take, fork, put, call } from "redux-saga/effects"
import { DgramAsPromised, SocketAsPromised } from "dgram-as-promised"
import { Socket } from "net"

import { parseDevice, YeelightDevice } from "./utils/parser"

interface YeelightState {
  isDiscovering: boolean
  devices: YeelightDevice[]
}

const initialState = {
  isDiscovering: false,
  devices: [],
} as YeelightState

export const {
  reducer,
  actions: { deviceDiscovered, deviceStateChanged, startDiscovery },
} = createSlice({
  name: "yeelight",
  initialState,
  reducers: {
    startDiscovery(state) {
      console.log("discover start")
      state.isDiscovering = true
    },
    stopDiscovery(state) {
      console.log("discover stop")
      state.isDiscovering = false
    },
    deviceDiscovered(state, action: PayloadAction<YeelightDevice>) {
      const device: YeelightDevice = action.payload
      if (!state.devices.find(d => d.id === device.id)) {
        state.devices.push(device)
      }
    },
    deviceStateChanged(state, { payload }) {
      state.devices = state.devices.map(device => ({
        ...device,
        ...(device.id === payload.deviceId && payload.params),
      }))
    },
  },
})

const sendMessage = (
  message: string,
  address: string,
  socket: SocketAsPromised
) => {
  return socket.send(Buffer.from(message), 0, message.length, 1982, address)
}

function createDeviceChannel(socket: Socket): EventChannel<any> {
  return eventChannel(emit => {
    socket.on("data", data => {
      emit(data.toString())
    })
    return socket.destroy
  })
}

function createDiscoverChannel(
  socket: SocketAsPromised,
  port: number
): EventChannel<YeelightDevice> {
  // console.log("discoveryChannel creating")
  return eventChannel(emit => {
    // console.log("discoveryChannel start")

    socket.socket
      .on("advertise-alive", msg => {
        console.log(
          `[createDiscoverChannel][advertise-alive]: ${msg.toString()}`
        )
        emit(msg.toString())
      })
      .on("message", msg => {
        emit(parseDevice(msg.toString()))
        console.log(`[createDiscoverChannel][message]: ${msg.toString()}`)
      })

    socket.bind(port, "0.0.0.0").then(() => {
      socket.setBroadcast(true)
      socket.addMembership("239.255.255.250")
    })

    return socket.destroy
  })
}

function* discover() {
  // console.log("discovery: start")
  const socket = DgramAsPromised.createSocket("udp4")
  yield fork(
    function* (socket: SocketAsPromised, port: number) {
      // console.log("listenForDiscovery")
      const discoveryChannel = yield call(createDiscoverChannel, socket, port)
      while (true) {
        try {
          // console.log("ready for device")
          const device = yield take(discoveryChannel)
          yield put(deviceDiscovered(device))
        } catch (e) {
          console.log("[discover][error]:", e)
        } finally {
        }
      }
    },
    socket,
    1982
  )
  console.log("sending discover")
  yield call(
    sendMessage,
    'M-SEARCH * HTTP/1.1\r\nMAN: "ssdp:discover"\r\nST: wifi_bulb\r\n',
    "239.255.255.250",
    socket
  )
}

export function* DiscoverAndListen() {
  yield fork(discover)
  while (true) {
    const { payload: device } = yield take(deviceDiscovered.toString())
    console.log({ device })
    if (device.port) {
      yield fork(function* (device: any) {
        const socket = new Socket()
        const deviceChannel = yield call(createDeviceChannel, socket)

        socket.connect(device.port, device.host)
        while (true) {
          try {
            const changes = yield take(deviceChannel)
            yield put(
              deviceStateChanged({
                deviceId: device.id,
                ...JSON.parse(changes),
              })
            )
          } catch (e) {}
        }
      }, device)
    }
  }
}
