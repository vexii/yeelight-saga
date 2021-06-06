"use strict";
exports.__esModule = true;
exports.parseDevice = void 0;
function parseDevice(msg) {
    console.log(msg.toString());
    var headers = msg.toString().split("\r\n");
    var device = {};
    for (var _i = 0, headers_1 = headers; _i < headers_1.length; _i++) {
        var header = headers_1[_i];
        if (header.indexOf("id:") >= 0) {
            device.id = header.slice(4);
        }
        if (header.indexOf("Location:") >= 0) {
            device.location = header.slice(10);
            var tmp = device.location.split(":");
            device.host = tmp[1].replace("//", "");
            device.port = parseInt(tmp[2], 10);
        }
        if (header.indexOf("power:") >= 0) {
            device.power = header.slice(7) === "on";
        }
        if (header.indexOf("bright:") >= 0) {
            device.brightness = header.slice(8);
        }
        if (header.indexOf("model:") >= 0) {
            device.model = header.slice(7);
        }
        if (header.indexOf("rgb:") >= 0) {
            device.rgbDec = header.slice(5);
        }
        if (header.indexOf("hue:") >= 0) {
            device.hue = header.slice(5);
        }
        if (header.indexOf("sat:") >= 0) {
            device.saturation = header.slice(5);
        }
    }
    return device;
}
exports.parseDevice = parseDevice;
