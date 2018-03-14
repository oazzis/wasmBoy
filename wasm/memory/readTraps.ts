import {
  Memory
} from './memory';
import {
  Graphics
} from '../graphics/graphics';
import {
  eightBitStoreIntoGBMemorySkipTraps
} from './store';
import {
  Joypad,
  getJoypadState
} from '../joypad/index'

// Returns -1 if no trap found, otherwise returns a value that should be fed for the address
export function checkReadTraps(offset: u16): i32 {

  // Cache globals used multiple times for performance
  let videoRamLocation: u16 = Memory.videoRamLocation;

  // Try to break early for most common scenario
  if (offset < videoRamLocation) {
    return -1;
  }

  // Check the graphics mode to see if we can write to VRAM
  // http://gbdev.gg8.se/wiki/articles/Video_Display#Accessing_VRAM_and_OAM
  if(offset >= videoRamLocation && offset < Memory.cartridgeRamLocation) {
    // Can only read/write from VRAM During Modes 0 - 2
    // See graphics/lcd.ts
    if (Graphics.currentLcdMode > 2) {
      return 0xFF;
    }
  }

  // Also check for individal writes
  // Can only read/write from OAM During Modes 0 - 1
  // See graphics/lcd.ts
  if(offset >= Memory.spriteInformationTableLocation && offset <= Memory.spriteInformationTableLocationEnd) {
    // Can only read/write from OAM During Mode 2
    // See graphics/lcd.ts
    if (Graphics.currentLcdMode !== 2) {
      return 0xFF;
    }
  }

  if(offset === Joypad.memoryLocationJoypadRegister) {
    return getJoypadState();
  }

  return -1;
}