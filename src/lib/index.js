/* teensy-loader.js -- ...
 * Copyright (C) 2019-2022  Keyboard.io, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { findByIds } from "usb";
import fs from "fs";
import intel_hex from "intel-hex";

const TeensyLoader = ((props_) => {
  const props = Object.assign(
    {},
    {
      code_size: 32256,
      block_size: 128,
    },
    props_
  );

  const loadFile = (filename) => {
    return intel_hex.parse(fs.readFileSync(filename));
  };

  const hexBytesInRange = (hex, addr) => {
    const { block_size, code_size } = props;
    for (let i = addr; i < addr + block_size && i < code_size; i++) {
      if (hex[i] != 0xff) return true;
    }
    return false;
  };

  const isMemoryBlank = (hex, addr) => {
    return !hexBytesInRange(hex, addr);
  };

  const getHexData = (hex, addr) => {
    const { block_size, code_size } = props;

    if (addr < 0 || addr + block_size > code_size) {
      return Buffer.alloc(block_size, 0xff);
    }

    let data = Buffer.alloc(block_size + 2, 0xff);
    data[0] = addr & 0xff;
    data[1] = (addr >> 8) & 0xff;

    for (let i = addr; i < addr + block_size && i < code_size; i++) {
      data[i - addr + 2] = hex.data[i];
    }

    return data;
  };

  const write = async (device, buffer) => {
    return new Promise((resolve, reject) => {
      device.controlTransfer(0x21, 9, 0x0200, 0, buffer, (_, error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  };

  const close = async (device) => {
    if (!device) return;

    return new Promise((resolve) => {
      device.interfaces[0].release(true, () => {
        setTimeout(() => {
          device.close();
          resolve();
        }, 1000);
      });
    });
  };

  const _open = async (vid, pid) => {
    const device = await findByIds(vid, pid);

    if (!device) return null;

    await device.open();
    try {
      if (process.platform != "win32") {
        if (device.interfaces[0].isKernelDriverActive()) {
          await device.interfaces[0].detachKernelDriver();
        }
      }
      if (process.platform != "darwin") {
        await device.interfaces[0].claim();
      }
    } catch (_) {
      return null;
    }

    return device;
  };

  const open = async (vid, pid) => {
    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    let device = null;
    while ((device = await _open(vid, pid)) == null) {
      await close(device);
      await delay(250);
    }
    return device;
  };

  const reboot = async (device) => {
    const buf = Buffer.alloc(props.block_size + 2, 0);
    buf[0] = 0xff;
    buf[1] = 0xff;
    buf[2] = 0xff;

    await write(device, buf);
    return await close(device);
  };

  const upload = async (device, filename, progress) => {
    const { code_size, block_size } = props;
    const hex = await loadFile(filename);

    let first_block = true;
    for (
      let addr = 0;
      addr < code_size && addr < hex.data.length;
      addr += block_size
    ) {
      if (!first_block && !hexBytesInRange(hex, addr)) {
        continue;
      }
      if (!first_block && isMemoryBlank(hex, addr)) continue;

      if (progress) {
        progress(addr, hex.data.length);
      }

      const buf = getHexData(hex, addr);
      await write(device, buf);
      first_block = false;
    }
    if (progress) {
      progress(hex.data.length, hex.data.length);
    }

    return device;
  };

  return {
    open: open,
    upload: upload,
    reboot: reboot,
  };
})();

export { TeensyLoader as default };
