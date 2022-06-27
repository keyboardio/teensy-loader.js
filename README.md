teensy-loader.js
================

This is a JavaScript library to upload firmware to Teensy-powered devices,
without calling out to any external tools. It currently only supports
`atmega32u4`-based teensies.

## Usage

```javascript
import TeensyLoader from "teensy-loader";

const device = TeensyLoader.open(0x16c0, 0x0478);

TeensyLoader.upload(device , "./firmware.hex", (addr, size) => {
  process.stdout.write(".");
});

TeensyLoader.reboot(device);
```

## API

### `TeensyLoader.open(vendorId, productId)`

Waits for the device with `vendorId` and `productId` to appear, and opens it.
Returns the opened device.

### `TeensyLoader.upload(device, firmwareFile[, progress])`

Uploads the firmware from `firmwareFile` (an Intel Hex format file) to the
previously opened `device`. If the optional `progress` callback is present, it
will be called for every block written, with two arguments: the current address
being written, and the size of the firmware.

Returns `device`.

### `TeensyLoader.reboot(device)`

Reboots an opened device.

### `TeensyLoader.close(device)`

Closes an opened device, without rebooting it.
