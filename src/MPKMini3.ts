/* Offsets from the beginning of the SYSEX message */
export const offsets = {
  SYSEX_START: 0 /* Exclusive message start: 0xf0 */,
  MF_ID: 1 /* Manufacturer ID: 0x47 (Akai)*/,
  ADDR: 2 /* Address/direction, 0x7f for sending, 0x00 from device */,
  PROD_ID: 3 /* Product ID: 0x49 (MPKmini MK3)*/,
  COMMAND: 4 /* Command, 0x64 send, 0x66 query, 0x67 data receive */,
  MSG_LEN: 5 /* Two 7-bit values determinig the length of message */,
  PGM_NUM: 7 /* Program number 0x0 is RAM */,
  PGM_NAME: 8 /* Program name: 16 bytes of ASCII data */,
  PAD_MIDI_CH: 24 /* Pad MIDI Channel, starts from 0 */,
  AFTERTOUCH: 25 /* Aftertouch setting, 0x0 off, 0x1, channel, 0x2 polyphonic */,
  KEYBED_CH: 26 /* Keybed channel (from 0) */,
  KEYBED_OCTAVE: 27 /* Keybed octave, default 0x04 */,
  ARP_SWITCH: 28 /* Arpeggiator, 0x0 off, 0x7f on */,
  ARP_MODE: 29 /* Arpeggiatior mode, 0x0 - 0x05 */,
  ARP_DIVISION: 30 /* Arpeggiator time division */,
  CLK_SOURCE: 31 /* Clock source 0x0 internal 0x1 external */,
  LATCH: 32 /* Arpeggiator latch on/off */,
  ARP_SWING: 33 /* Arpeggiator swing setting 0x0 is 50 %, 0x19 is 75 % (max) */,
  TEMPO_TAPS: 34 /* Tempo taps (2, 3, 4) */,
  TEMPO_BPM: 35 /* Two 7 bit values for BPM (60 - 240) */,
  ARP_OCTAVE: 37 /* Arpeggiatior octave setting */,
  JOY_HORIZ_MODE: 38 /* Joystick horizontal mode: 0x0 pitchbend, 0x1 single, 0x2 dual */,
  JOY_HORIZ_POSITIVE_CH: 39 /* Joystick horizontal positive channel */,
  JOY_HORIZ_NEGATIVE_CH: 40 /* Joystick horizontal positive channel */,
  JOY_VERT_MODE: 41 /* Joystick vertical mode: 0x0 pitchbend, 0x1 single, 0x2 dual */,
  JOY_VERT_POSITIVE_CH: 42 /* Joystick vertical positive channel */,
  JOY_VERT_NEGATIVE_CH: 43 /* Joystick vertical positive channel */,
  PAD_1_NOTE: 44 /* Pad 1 note */,
  PAD_1_PC: 45 /* Pad 1 PC */,
  PAD_1_CC: 46 /* Pad 1 CC */,
  PAD_2_NOTE: 47 /* Pad 2 note */,
  PAD_2_PC: 48 /* Pad 2 PC */,
  PAD_2_CC: 49 /* Pad 2 CC */,
  PAD_3_NOTE: 50 /* Pad 3 note */,
  PAD_3_PC: 51 /* Pad 3 PC */,
  PAD_3_CC: 52 /* Pad 3 CC */,
  PAD_4_NOTE: 53 /* Pad 4 note */,
  PAD_4_PC: 54 /* Pad 4 PC */,
  PAD_4_CC: 55 /* Pad 4 CC */,
  PAD_5_NOTE: 56 /* Pad 5 note */,
  PAD_5_PC: 57 /* Pad 5 PC */,
  PAD_5_CC: 58 /* Pad 5 CC */,
  PAD_6_NOTE: 59 /* Pad 6 note */,
  PAD_6_PC: 60 /* Pad 6 PC */,
  PAD_6_CC: 61 /* Pad 6 CC */,
  PAD_7_NOTE: 62 /* Pad 7 note */,
  PAD_7_PC: 63 /* Pad 7 PC */,
  PAD_7_CC: 64 /* Pad 7 CC */,
  PAD_8_NOTE: 65 /* Pad 8 note */,
  PAD_8_PC: 66 /* Pad 8 PC */,
  PAD_8_CC: 67 /* Pad 8 CC */,
  PAD_9_NOTE: 68 /* Pad 9 note */,
  PAD_9_PC: 69 /* Pad 9 PC */,
  PAD_9_CC: 70 /* Pad 9 CC */,
  PAD_10_NOTE: 71 /* Pad 10 note */,
  PAD_10_PC: 72 /* Pad 10 PC */,
  PAD_10_CC: 73 /* Pad 10 CC */,
  PAD_11_NOTE: 74 /* Pad 11 note */,
  PAD_11_PC: 75 /* Pad 11 PC */,
  PAD_11_CC: 76 /* Pad 11 CC */,
  PAD_12_NOTE: 77 /* Pad 12 note */,
  PAD_12_PC: 78 /* Pad 12 PC */,
  PAD_12_CC: 79 /* Pad 12 CC */,
  PAD_13_NOTE: 80 /* Pad 13 note */,
  PAD_13_PC: 81 /* Pad 13 PC */,
  PAD_13_CC: 82 /* Pad 13 CC */,
  PAD_14_NOTE: 83 /* Pad 14 note */,
  PAD_14_PC: 84 /* Pad 14 PC */,
  PAD_14_CC: 85 /* Pad 14 CC */,
  PAD_15_NOTE: 86 /* Pad 15 note */,
  PAD_15_PC: 87 /* Pad 15 PC */,
  PAD_15_CC: 88 /* Pad 15 CC */,
  PAD_16_NOTE: 89 /* Pad 16 note */,
  PAD_16_PC: 90 /* Pad 16 PC */,
  PAD_16_CC: 91 /* Pad 16 CC */,
  KNOB_1_MODE: 92 /* Knob 1 abs/rel */,
  KNOB_1_CC: 93 /* Knob 1 CC */,
  KNOB_1_MIN: 94 /* Knob 1 min value */,
  KNOB_1_MAX: 95 /* Knob 1 max value */,
  KNOB_1_NAME: 96 /* Knob 1 name (16 chars) */,
  KNOB_2_MODE: 112 /* Knob 2 abs/rel */,
  KNOB_2_CC: 113 /* Knob 2 CC */,
  KNOB_2_MIN: 114 /* Knob 2 min value */,
  KNOB_2_MAX: 115 /* Knob 2 max value */,
  KNOB_2_NAME: 116 /* Knob 2 name (16 chars) */,
  KNOB_3_MODE: 132 /* Knob 3 abs/rel */,
  KNOB_3_CC: 133 /* Knob 3 CC */,
  KNOB_3_MIN: 134 /* Knob 3 min value */,
  KNOB_3_MAX: 135 /* Knob 3 max value */,
  KNOB_3_NAME: 136 /* Knob 3 name (16 chars) */,
  KNOB_4_MODE: 152 /* Knob 4 abs/rel */,
  KNOB_4_CC: 153 /* Knob 4 CC */,
  KNOB_4_MIN: 154 /* Knob 4 min value */,
  KNOB_4_MAX: 155 /* Knob 4 max value */,
  KNOB_4_NAME: 156 /* Knob 4 name (16 chars) */,
  KNOB_5_MODE: 172 /* Knob 5 abs/rel */,
  KNOB_5_CC: 173 /* Knob 5 CC */,
  KNOB_5_MIN: 174 /* Knob 5 min value */,
  KNOB_5_MAX: 175 /* Knob 5 max value */,
  KNOB_5_NAME: 176 /* Knob 5 name (16 chars) */,
  KNOB_6_MODE: 192 /* Knob 6 abs/rel */,
  KNOB_6_CC: 193 /* Knob 6 CC */,
  KNOB_6_MIN: 194 /* Knob 6 min value */,
  KNOB_6_MAX: 195 /* Knob 6 max value */,
  KNOB_6_NAME: 196 /* Knob 6 name (16 chars) */,
  KNOB_7_MODE: 212 /* Knob 7 abs/rel */,
  KNOB_7_CC: 213 /* Knob 7 CC */,
  KNOB_7_MIN: 214 /* Knob 7 min value */,
  KNOB_7_MAX: 215 /* Knob 7 max value */,
  KNOB_7_NAME: 216 /* Knob 7 name (16 chars) */,
  KNOB_8_MODE: 232 /* Knob 8 abs/rel */,
  KNOB_8_CC: 233 /* Knob 8 CC */,
  KNOB_8_MIN: 234 /* Knob 8 min value */,
  KNOB_8_MAX: 235 /* Knob 8 max value */,
  KNOB_8_NAME: 236 /* Knob 8 name (16 chars) */,
  TRANSPOSE: 252 /* Transposition 0x0c is C4, +/-12 semitones */,
  SYSEX_END: 253 /* SYSEX end, 0xf7 */,
};

export const SYSEX_START = 0xf0;
export const SYSEX_END = 0xf7;
export const MANUFACTURER_ID = 0x47;
export const PRODUCT_ID = 0x49;
export const DATA_MSG_LEN = 254;
export const MSG_PAYLOAD_LEN = 246;
export const QUERY_MSG_LEN = 9;
export const CHANNEL_MIN = 0;
export const CHANNEL_MAX = 127;

/* Message direction */
export const MSG_DIRECTION_OUT = 0x7f;
export const MSG_DIRECTION_IN = 0x00;

/* Command values */
export const CMD_WRITE_DATA = 0x64;
export const CMD_QUERY_DATA = 0x66;
export const CMD_INCOMING_DATA = 0x67;

export function queryRamMessage() {
  const message = [
    SYSEX_START,
    MANUFACTURER_ID,
    0,
    PRODUCT_ID,
    CMD_QUERY_DATA,
    0,
    1,
    0, // RAM
    SYSEX_END,
  ];
  console.log("message", message);

  return message;
}

export function setKnobsToRelative(preset: Uint8Array) {
  console.log(preset[offsets.KNOB_1_MODE]);
  preset[offsets.COMMAND] = CMD_WRITE_DATA;
  preset[offsets.KNOB_1_MODE] = 1;
  preset[offsets.KNOB_2_MODE] = 1;
  preset[offsets.KNOB_3_MODE] = 1;
  preset[offsets.KNOB_4_MODE] = 1;
  preset[offsets.KNOB_5_MODE] = 1;
  preset[offsets.KNOB_6_MODE] = 1;
  preset[offsets.KNOB_7_MODE] = 1;
  preset[offsets.KNOB_8_MODE] = 1;
  return preset;
}
