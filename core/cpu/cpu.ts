import { Config } from '../config';
import { getSaveStateMemoryOffset } from '../core';
import {
  eightBitStoreIntoGBMemoryWithTraps,
  eightBitStoreIntoGBMemory,
  eightBitLoadFromGBMemoryWithTraps,
  eightBitLoadFromGBMemory,
  initializeCartridge,
  initializeDma,
  loadBooleanDirectlyFromWasmMemory,
  storeBooleanDirectlyToWasmMemory
} from '../memory/index';

import { log, hexLog } from '../helpers/index';

// Everything Static as class instances just aren't quite there yet
// https://github.com/AssemblyScript/assemblyscript/blob/master/tests/compiler/showcase.ts
export class Cpu {
  // Status to track if we are in Gameboy Color Mode, and GBC State
  static GBCEnabled: boolean = false;
  static GBCDoubleSpeed: boolean = false;

  // 8-bit Cpu.registers
  static registerA: u8 = 0;
  static registerB: u8 = 0;
  static registerC: u8 = 0;
  static registerD: u8 = 0;
  static registerE: u8 = 0;
  static registerH: u8 = 0;
  static registerL: u8 = 0;
  static registerF: u8 = 0;

  // 16-bit Cpu.registers
  static stackPointer: u16 = 0;
  // Boot rom from 0x00 to 0x99, all games start at 0x100
  static programCounter: u16 = 0x00;

  // Current number of cycles, shouldn't execeed max number of cycles
  static currentCycles: i32 = 0;
  static CLOCK_SPEED(): i32 {
    if (Cpu.GBCDoubleSpeed) {
      // 2^23, thanks binji!
      return 8388608;
    }

    return 4194304;
  }

  // Cycles Per Frame = Clock Speed / fps
  // So: 4194304 / 59.73
  static MAX_CYCLES_PER_FRAME(): i32 {
    if (Cpu.GBCDoubleSpeed) {
      return 140448;
    }

    return 70224;
  }

  // HALT and STOP instructions need to stop running opcodes, but simply check timers
  // https://github.com/nakardo/node-gameboy/blob/master/lib/cpu/opcodes.js
  // Matt said is should work to, so it must work!
  static isHalted: boolean = false;
  static isStopped: boolean = false;

  // Memory Location for the GBC Speed switch
  static readonly memoryLocationSpeedSwitch: u16 = 0xff4d;

  // Save States
  static readonly saveStateSlot: u16 = 0;

  // Function to save the state of the class
  static saveState(): void {
    // Registers
    store<u8>(getSaveStateMemoryOffset(0x00, Cpu.saveStateSlot), Cpu.registerA);
    store<u8>(getSaveStateMemoryOffset(0x01, Cpu.saveStateSlot), Cpu.registerB);
    store<u8>(getSaveStateMemoryOffset(0x02, Cpu.saveStateSlot), Cpu.registerC);
    store<u8>(getSaveStateMemoryOffset(0x03, Cpu.saveStateSlot), Cpu.registerD);
    store<u8>(getSaveStateMemoryOffset(0x04, Cpu.saveStateSlot), Cpu.registerE);
    store<u8>(getSaveStateMemoryOffset(0x05, Cpu.saveStateSlot), Cpu.registerH);
    store<u8>(getSaveStateMemoryOffset(0x06, Cpu.saveStateSlot), Cpu.registerL);
    store<u8>(getSaveStateMemoryOffset(0x07, Cpu.saveStateSlot), Cpu.registerF);

    store<u16>(getSaveStateMemoryOffset(0x08, Cpu.saveStateSlot), Cpu.stackPointer);
    store<u16>(getSaveStateMemoryOffset(0x0a, Cpu.saveStateSlot), Cpu.programCounter);

    store<i32>(getSaveStateMemoryOffset(0x0c, Cpu.saveStateSlot), Cpu.currentCycles);

    storeBooleanDirectlyToWasmMemory(getSaveStateMemoryOffset(0x11, Cpu.saveStateSlot), Cpu.isHalted);
    storeBooleanDirectlyToWasmMemory(getSaveStateMemoryOffset(0x12, Cpu.saveStateSlot), Cpu.isStopped);
  }

  // Function to load the save state from memory
  static loadState(): void {
    // Registers
    Cpu.registerA = load<u8>(getSaveStateMemoryOffset(0x00, Cpu.saveStateSlot));
    Cpu.registerB = load<u8>(getSaveStateMemoryOffset(0x01, Cpu.saveStateSlot));
    Cpu.registerC = load<u8>(getSaveStateMemoryOffset(0x02, Cpu.saveStateSlot));
    Cpu.registerD = load<u8>(getSaveStateMemoryOffset(0x03, Cpu.saveStateSlot));
    Cpu.registerE = load<u8>(getSaveStateMemoryOffset(0x04, Cpu.saveStateSlot));
    Cpu.registerH = load<u8>(getSaveStateMemoryOffset(0x05, Cpu.saveStateSlot));
    Cpu.registerL = load<u8>(getSaveStateMemoryOffset(0x06, Cpu.saveStateSlot));
    Cpu.registerF = load<u8>(getSaveStateMemoryOffset(0x07, Cpu.saveStateSlot));

    Cpu.stackPointer = load<u16>(getSaveStateMemoryOffset(0x08, Cpu.saveStateSlot));
    Cpu.programCounter = load<u16>(getSaveStateMemoryOffset(0x0a, Cpu.saveStateSlot));

    Cpu.currentCycles = load<i32>(getSaveStateMemoryOffset(0x0c, Cpu.saveStateSlot));

    Cpu.isHalted = loadBooleanDirectlyFromWasmMemory(getSaveStateMemoryOffset(0x11, Cpu.saveStateSlot));
    Cpu.isStopped = loadBooleanDirectlyFromWasmMemory(getSaveStateMemoryOffset(0x12, Cpu.saveStateSlot));
  }
}

export function initializeCpu(): void {
  if (Cpu.GBCEnabled) {
    // CPU Registers
    Cpu.registerA = 0x11;
    Cpu.registerF = 0x80;
    Cpu.registerB = 0x00;
    Cpu.registerC = 0x00;
    Cpu.registerD = 0xff;
    Cpu.registerE = 0x56;
    Cpu.registerH = 0x00;
    Cpu.registerL = 0x0d;

    // Cpu Control Flow
    Cpu.programCounter = 0x100;
    Cpu.stackPointer = 0xfffe;
  } else {
    // Cpu Registers
    Cpu.registerA = 0x01;
    Cpu.registerF = 0xb0;
    Cpu.registerB = 0x00;
    Cpu.registerC = 0x13;
    Cpu.registerD = 0x00;
    Cpu.registerE = 0xd8;
    Cpu.registerH = 0x01;
    Cpu.registerL = 0x4d;

    // Cpu Control Flow
    Cpu.programCounter = 0x100;
    Cpu.stackPointer = 0xfffe;
  }
}
