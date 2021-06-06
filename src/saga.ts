import { createSlice, createAction, PayloadAction } from "@reduxjs/toolkit"
import { eventChannel, EventChannel } from "redux-saga"
import { take, fork, put, call } from "redux-saga/effects"
import { DgramAsPromised, SocketAsPromised } from "dgram-as-promised"
import { Socket } from "net"

import { parseDevice, normaliseProps } from "./utils/parser"
import { YeelightDevice } from "./types"

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
      state.isDiscovering = true
    },
    stopDiscovery(state) {
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
        ...(device.id === payload.deviceId && normaliseProps(payload.params)),
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
  return eventChannel(emit => {
    socket.socket
      .on("advertise-alive", msg => {
        emit(parseDevice(msg.toString()))
      })
      .on("message", msg => {
        emit(parseDevice(msg.toString()))
      })

    socket.bind(port, "0.0.0.0").then(() => {
      socket.setBroadcast(true)
      socket.addMembership("239.255.255.250")
    })

    return socket.destroy
  })
}

function* discover() {
  const socket = DgramAsPromised.createSocket("udp4")
  yield fork(
    function* (socket: SocketAsPromised, port: number) {
      const discoveryChannel: EventChannel<YeelightDevice> = yield call(
        createDiscoverChannel,
        socket,
        port
      )
      while (true) {
        try {
          const device: YeelightDevice = yield take(discoveryChannel)
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
    if (device.port) {
      yield fork(function* (device: any) {
        const socket = new Socket()
        const deviceChannel: EventChannel<any> = yield call(
          createDeviceChannel,
          socket
        )

        socket.connect(device.port, device.host)
        yield fork(function* sendChanges(socket) {
          const { payload } = yield take(updateDevice.toString())
          if (payload.id === device.id) {
            console.log("PAYLOAD", {payload})
            socket.write(JSON.stringify(payload) + "\r\n")
          }
        }, socket)
        yield fork(function* listenForChanges() {
          while (true) {
            try {
              const deviceMessage: any = JSON.parse(yield take(deviceChannel))

              if (deviceMessage?.result) {
              }

              if (deviceMessage?.params) {
                yield put(
                  deviceStateChanged({
                    deviceId: device.id,
                    ...deviceMessage,
                  })
                )
              }
            } catch (e) {}
          }
        })
      }, device)
    }
  }
}
