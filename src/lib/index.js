/* teensy-loader.js -- ...
 * Copyright (C) 2019  Keyboard.io, Inc.
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

import usb from "usb";
import fs from "fs";
import intel_hex from "intel-hex";

class TeensyLoader {
  constructor() {
    this.write_info = {
      code_size: 32256,
      block_size: 128
    };
  }

  __loadFile(filename) {
    this.__hex = intel_hex.parse(fs.readFileSync(filename));
  }

  __hexBytesInRange(addr) {
    const { block_size, code_size } = this.write_info;
    for (let i = addr; i < addr + block_size && i < code_size; i++) {
      if (this.__hex[i] != 255) return true;
    }
    return false;
  }

  __isMemoryBlank(addr) {
    const { block_size, code_size } = this.write_info;

    for (let i = addr; i < addr + block_size && i < code_size; i++) {
      if (this.__hex.data[i] != 0xff) return false;
    }
    return true;
  }

  __getHexData(addr) {
    const { block_size, code_size } = this.write_info;

    if (addr < 0 || addr + block_size > code_size) {
      return Buffer.alloc(block_size, 0xff);
    }

    let data = Buffer.alloc(block_size + 2, 0xff);
    data[0] = addr & 0xff;
    data[1] = (addr >> 8) & 0xff;

    for (let i = addr; i < addr + block_size && i < code_size; i++) {
      data[i - addr + 2] = this.__hex.data[i];
    }

    return data;
  }

  __reboot() {
    const buf = Buffer.alloc(this.write_info.block_size + 2, 0);
    buf[0] = 0xff;
    buf[1] = 0xff;
    buf[2] = 0xff;
    this.__write(buf);
  }

  async upload(vid, pid, filename, progress) {
    const { code_size, block_size } = this.write_info;

    this.__loadFile(filename);

    await this.__open(vid, pid);

    let first_block = true;
    for (
      let addr = 0;
      addr < code_size && addr < this.__hex.data.length;
      addr += block_size
    ) {
      if (!first_block && !this.__hexBytesInRange(addr)) {
        continue;
      }
      if (!first_block && this.__isMemoryBlank(addr)) continue;

      if (progress) {
        progress(addr, this.__hex.data.length);
      }

      const buf = this.__getHexData(addr);
      await this.__write(buf);
      first_block = false;
    }
    if (progress) {
      progress(this.__hex.data.length, this.__hex.data.length);
    }

    await this.__reboot();
    await this.__close();
  }

  async __close() {
    if (!this.__device) return;

    return new Promise(resolve => {
      this.__device.interfaces[0].release(true, () => {
        setTimeout(() => {
          this.__device.close();
          this.__device = null;
          resolve();
        }, 1000);
      });
    });
  }

  async __open(vid, pid) {
    const delay = ms => new Promise(res => setTimeout(res, ms));

    while (!this.___open(vid, pid)) {
      await delay(250);
    }
  }

  ___open(vid, pid) {
    this.__close();

    let device = usb.findByIds(vid, pid);

    if (!device) return null;

    device.open();
    try {
      if (device.interfaces[0].isKernelDriverActive()) {
        device.interfaces[0].detachKernelDriver();
      }
      device.interfaces[0].claim();
    } catch (_) {
      return null;
    }

    this.__device = device;
    return device;
  }

  async __write(buffer) {
    return new Promise((resolve, reject) => {
      this.__device.controlTransfer(0x21, 9, 0x0200, 0, buffer, (_, error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

const loader = new TeensyLoader();

export { loader as default };
