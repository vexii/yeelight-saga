import { DgramAsPromised, SocketAsPromised } from "dgram-as-promised"
import { EventEmitter } from "events"
import ip from "ip"
import net from "net"
import { AddressInfo } from "net"
import { Socket } from "net"

export interface IYeelightOptionFields {
  listenPort?: number
  listenAddress?: string

  discoveryPort?: number
  discoveryAddress?: string
  discoveryMsg?: string
  discoveryTimeoutSeconds?: number
}

export interface IYeelightDeviceFields {
  id: string
  location: string
  host: string
  port: number
  socket: Socket | null

  connected: boolean

  power: any
  brightness: any
  model: any
  rgbDec: any
  hue: any
  saturation: any
}
class YeelightDevice implements IYeelightDeviceFields {
  public id!: string
  public location!: string
  public host!: string
  public port!: number

  public socket: Socket | null = null

  public connected: boolean = false
  public brightness: any
  public hue: any
  public model: any
  public power: boolean = false
  public rgbDec: any
  public saturation: any

  constructor(params?: {
    id: string
    location: string
    host: string
    port: number
  }) {
    if (params) {
      this.id = params.id
      this.location = params.location
      this.host = params.host
      this.port = params.port
    }
  }

  public async turnOn() {
    const request = {
      id: 1,
      method: "set_power",
      params: ["on", "smooth", 300],
    }

    await this.sendCommand(request)
    this.power = true
  }

  public async turnOff() {
    const request = {
      id: 1,
      method: "set_power",
      params: ["off", "smooth", 300],
    }

    await this.sendCommand(request)
    this.power = false
  }

  public toggle(): Promise<void> {
    if (this.power) {
      return this.turnOff()
    } else {
      return this.turnOn()
    }
  }

  public async connect(): Promise<boolean> {
    if (this.connected === false) {
      this.socket = new net.Socket()
      return new Promise((resolve, reject) => {
        if (this.socket) {
          try {
            this.socket.connect(this.port, this.host, () => {
              resolve(void 0)
            })
          } catch (e) {
            reject()
          }
        }
      })
      .then(() => {
        this.connected = true
        return true
      })
      .catch(() => {
        return false
      })
    } else {
      return true
    }
  }

  public async sendCommand(command: any) {
    if (this.connected === false || this.socket === null) {
      // console.log(`${this.id} is not connected, can't send command`);
      return
    }
    const message = JSON.stringify(command)
    this.socket.write(message + "\r\n")
  }

  //
  // Yeelight.prototype.setBrightness = function (device, percentage, speed) {
  //     speed = speed || 300;
  //
  //     if (device.power == 'off') {
  //         device.brightness = '0';
  //         this.setPower(device, true, 0);
  //     }
  //
  //     device.brightness = percentage;
  //
  //     var request = {
  //         id: 1,
  //         method: 'set_bright',
  //         params: [percentage, 'smooth', speed],
  //     };
  //
  //     this.sendCommand(device, request, function (device) {
  //         this.emit('brightnessupdated', device);
  //     }.bind(this));
  // };
  //
  // Yeelight.prototype.setRGB = function (device, rgb, speed) {
  //     speed = speed || 300;
  //
  //     var rgb_dec = (rgb[0] * 65536) + (rgb[1] * 256) + rgb[2];
  //
  //     device.rgb = rgb_dec;
  //
  //     var request = {
  //         id: 1,
  //         method: 'set_rgb',
  //         params: [rgb_dec, 'smooth', speed],
  //     };
  //
  //     this.sendCommand(device, request, function (device) {
  //         this.emit('rgbupdated', device);
  //     }.bind(this));
  // };
}

class YeelightOptions implements IYeelightOptionFields {
  public listenPort: number
  public listenAddress: string

  public discoveryPort: number
  public discoveryAddress: string
  public discoveryMsg: string
  public discoveryTimeoutSeconds: number

  constructor(fields: IYeelightOptionFields = {}) {
    this.listenPort = fields.listenPort ? fields.listenPort : 45065
    this.listenAddress = fields.listenAddress ? fields.listenAddress : "0.0.0.0"
    this.discoveryPort = fields.discoveryPort ? fields.discoveryPort : 1982
    this.discoveryAddress = fields.discoveryAddress
      ? fields.discoveryAddress
      : "239.255.255.250"
      this.discoveryMsg = fields.discoveryMsg
        ? fields.discoveryMsg
        : 'M-SEARCH * HTTP/1.1\r\nMAN: "ssdp:discover"\r\nST: wifi_bulb\r\n'
        this.discoveryTimeoutSeconds = fields.discoveryTimeoutSeconds
          ? fields.discoveryTimeoutSeconds
          : 5
  }
}
export class Yeelight extends EventEmitter {
  public options: YeelightOptions
  public devices: YeelightDevice[] = [];

  private socket: SocketAsPromised | undefined
  private discoveryTimeout: number | null = null

  constructor(options: IYeelightOptionFields = {}) {
    super()
    this.options = new YeelightOptions(options)
  }

  public init() {
    this.socket = DgramAsPromised.createSocket("udp4")
    this.socket.socket.on("message", this.messageCallback.bind(this))
  }

  public async listen() {
    try {
      this.init()
      if (this.socket) {
        const promise = this.socket.bind(
          this.options.listenPort,
          this.options.listenAddress
        )
        return promise.then(() => {
          if (this.socket) {
            this.socket.setBroadcast(true)
          }
        })
      }
    } catch (e) {
      throw e
    }
  }

  public async close() {
    if (this.socket) {
      return this.socket.close()
    }
  }

  public async discover() {
    this.init()
    await this.listen()
    await this.sendMessage(
      this.options.discoveryMsg,
      this.options.discoveryAddress
    )
    return new Promise(resolve => {
      setTimeout(async () => {
        this.emit("discoverycompleted")
        await this.close()
        this.discoveryTimeout = null
        resolve(void 0)
      }, this.options.discoveryTimeoutSeconds * 1000)
    })
  }

  public async sendMessage(message: string, address: string) {
    const buffer = Buffer.from(message)
    if (this.socket) {
      return this.socket.send(
        buffer,
        0,
        buffer.length,
        this.options.discoveryPort,
        address
      )
    }
  }

  public addDevice(device: YeelightDevice) {
    let index = this.devices.findIndex((item) => item.id === device.id);
    let event = "";

    if (index >= 0) {
      this.devices[index] = device;
      event = "deviceupdated";
    } else {
      index = this.devices.push(device);
      event = "deviceadded";
    }

    this.emit(event, { index, device });
  }

  private handleDiscovery(message: string) {
    const headers = message.toString().split("\r\n")
    const device = new YeelightDevice();

    device.connected = false
    device.socket = null

    // build device params
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
        // console.log(rgb_dec);
        // if (rgb_dec > 0) {
        //     var rgb = [
        //         (rgb_dec >> 16) & 0xff,
        //         (rgb_dec >> 8) & 0xff,
        //         rgb_dec & 0xff,
        //     ];
        //     device.rgb = rgb;
        // }
      }
      if (header.indexOf("hue:") >= 0) {
        device.hue = header.slice(5)
      }
      if (header.indexOf("sat:") >= 0) {
        device.saturation = header.slice(5)
      }
    }

    this.addDevice(device);
    if (this.discoveryTimeout) {
      clearTimeout(this.discoveryTimeout)
    }
  }

  private messageCallback(message: string, address: AddressInfo) {
    if (ip.address() === address.address) {
      return
    }

    // handle socket discovery message
    this.handleDiscovery(message)

    this.emit("message", { message, address })
  }
}
