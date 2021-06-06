"use strict";
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a, _b;
exports.__esModule = true;
exports.DiscoverAndListen = exports.startDiscovery = exports.deviceStateChanged = exports.deviceDiscovered = exports.reducer = void 0;
var toolkit_1 = require("@reduxjs/toolkit");
var redux_saga_1 = require("redux-saga");
var effects_1 = require("redux-saga/effects");
var dgram_as_promised_1 = require("dgram-as-promised");
var parser_1 = require("./utils/parser");
exports.reducer = (_a = toolkit_1.createSlice({
    name: "yeelight",
    initialState: {
        isDiscovering: false,
        devices: []
    },
    reducers: {
        startDiscovery: function (state) {
            console.log("discover start");
            state.isDiscovering = true;
        },
        stopDiscovery: function (state) {
            console.log("discover stop");
            state.isDiscovering = false;
        },
        deviceDiscovered: function (state, action) {
            var device = action.payload;
            if (state.devices.find(function (d) { return d.id === device.id; })) {
                console.log("found duplicate device");
                return;
            }
            state.devices.push(device);
        },
        deviceStateChanged: function (state, action) {
            var index = state.devices.findIndex(function (d) { return d.id === action.payload.deviceId; });
            console.log("changes to:", index);
        }
    }
}), _a.reducer), exports.deviceDiscovered = (_b = _a.actions, _b.deviceDiscovered), exports.deviceStateChanged = _b.deviceStateChanged, exports.startDiscovery = _b.startDiscovery;
var sendMessage = function (message, address, socket) {
    return socket.send(Buffer.from(message), 0, message.length, 1982, address);
};
function createDeviceChannel(socket) {
    return redux_saga_1.eventChannel(function (emit) {
        socket.on("data", function (d) {
            console.log("[createDeviceChannel]: " + d.toString());
            emit(d.toString());
        });
        return function () { };
    });
}
function createDiscoverChannel(socket, port) {
    console.log("discoveryChannel creating");
    return redux_saga_1.eventChannel(function (emit) {
        console.log("discoveryChannel start");
        socket.socket
            .on("advertise-alive", function (msg) {
            console.log("[createDiscoverChannel][advertise-alive]: " + msg.toString());
            emit(msg.toString());
        })
            .on("message", function (msg) {
            emit(msg.toString());
            console.log("[createDiscoverChannel][message]: " + msg.toString());
        });
        socket.bind(port, "0.0.0.0").then(function () {
            socket.setBroadcast(true);
            socket.addMembership("239.255.255.250");
        });
        return function () {
            console.log("eventChannel exit");
        };
    });
}
function discover() {
    var socket;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("discovery: start");
                socket = dgram_as_promised_1.DgramAsPromised.createSocket("udp4");
                return [4 /*yield*/, effects_1.fork(function (socket, port) {
                        var discoveryChannel, device, e_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log("listenForDiscovery");
                                    return [4 /*yield*/, effects_1.call(createDiscoverChannel, socket, port)];
                                case 1:
                                    discoveryChannel = _a.sent();
                                    _a.label = 2;
                                case 2:
                                    if (!true) return [3 /*break*/, 9];
                                    _a.label = 3;
                                case 3:
                                    _a.trys.push([3, 6, 7, 8]);
                                    console.log("ready for device");
                                    return [4 /*yield*/, effects_1.take(discoveryChannel)];
                                case 4:
                                    device = _a.sent();
                                    return [4 /*yield*/, effects_1.put(exports.deviceDiscovered(parser_1.parseDevice(device)))];
                                case 5:
                                    _a.sent();
                                    console.log("port", port);
                                    return [3 /*break*/, 8];
                                case 6:
                                    e_1 = _a.sent();
                                    console.log(e_1);
                                    return [3 /*break*/, 8];
                                case 7: return [7 /*endfinally*/];
                                case 8: return [3 /*break*/, 2];
                                case 9: return [2 /*return*/];
                            }
                        });
                    }, socket, 1982)];
            case 1:
                _a.sent();
                console.log("sending discover");
                return [4 /*yield*/, effects_1.call(sendMessage, 'M-SEARCH * HTTP/1.1\r\nMAN: "ssdp:discover"\r\nST: wifi_bulb\r\n', "239.255.255.250", socket)];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}
function DiscoverAndListen() {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, effects_1.fork(discover)
                /*
                while (true) {
                  const { payload: device } = yield take(deviceDiscovered.toString())
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
                      } catch (e) {
                        console.error(`[DiscoverAndListen]: ${e}`)
                      }
                    }
                  }, device)
                  console.log(`[DiscoverAndListen]: ${device.toString()}`)
                }
                */
            ];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}
exports.DiscoverAndListen = DiscoverAndListen;
