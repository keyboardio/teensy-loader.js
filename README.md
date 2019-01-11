teensy-loader.js
================

This is a JavaScript library to upload firmware to Teensy-powered devices,
without calling out to any external tools. It currently only supports
`atmega32u4`-based teensies.

## Usage

```javascript
import TeensyLoader from "teensy-loader";

TeensyLoader.upload(0x16C0, 0x0478, "./firmware.hex", (addr, size) => {
  process.stdout.write(".");
});
```

## API

### `TeensyLoader.upload(vendorId, productId, firmwareFile[, progress])`

Waits for the device with `vendorId` and `productId` to appear, then opens it
and uploads the firmware from `firmwareFile` (an Intel Hex format file). If the
optional `progress` callback is present, it will be called for every block
written, with two arguments: the current address being written, and the size of
the firmware.
