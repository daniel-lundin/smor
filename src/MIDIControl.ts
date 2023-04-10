import React from "react";
import {
  overwriteKnob1ToRelative,
  queryRamMessage,
  setKnobsToRelative,
} from "./MPKMini3";
import { SmorSynth } from "./Smor";

function initMIDIControls({
  onNoteUp,
  onNoteDown,
  onKnobChange,
  onDrumPad,
}: {
  onNoteUp: (note: number, velocity?: number) => void;
  onNoteDown: (note: number, velocity?: number) => void;
  onKnobChange: (control: number, value: number) => void;
  onDrumPad: (note: number, velocity?: number) => void;
}) {
  if (!navigator.requestMIDIAccess) {
    console.warn("No midi access");
    return;
  }
  let cancelled = false;
  navigator
    .requestMIDIAccess({ sysex: true })
    .then(onMIDISuccess, onMIDIFailure);

  let disconnect = () => {};

  function onMIDISuccess(midiAccess: WebMidi.MIDIAccess) {
    console.log("hello success");
    if (cancelled) return;
    for (const input of midiAccess.inputs.values()) {
      const oldHandler = input.onmidimessage;
      input.onmidimessage = getMIDIMessage;
      disconnect = () => {
        console.log("disconnecting");
        input.onmidimessage = oldHandler;
      };
    }
  }

  function getMIDIMessage(midiMessage: WebMidi.MIDIMessageEvent) {
    if (midiMessage.data[0] === 144) {
      onNoteDown(midiMessage.data[1], midiMessage.data[2]);
    } else if (midiMessage.data[0] === 128) {
      onNoteUp(midiMessage.data[1]);
    } else if (midiMessage.data[0] === 176) {
      const value = midiMessage.data[2];
      const knobIndex = midiMessage.data[1] - 70;
      onKnobChange(knobIndex, value);
    } else if (midiMessage.data[0] === 201) {
      onDrumPad(midiMessage.data[1]);
    } else {
      console.log("unknown message", midiMessage.data);
    }
  }
  function onMIDIFailure(error: Error) {
    console.log("failed to initialize midi", error);
  }

  return function () {
    cancelled = true;
    disconnect();
  };
}

export async function updateRAMPreset() {
  const midiAccess = await navigator.requestMIDIAccess({ sysex: true });

  // Assumes one input and one output
  //
  const input = midiAccess.inputs.values().next().value;
  const output = midiAccess.outputs.values().next().value;

  let presetReceivedResolver: (data: Uint8Array) => void;
  let presetReceived = new Promise<Uint8Array>((resolve) => {
    presetReceivedResolver = resolve;
  });
  input.onmidimessage = (message: WebMidi.MIDIMessageEvent) => {
    if (message.data[0] === 0xf0) {
      presetReceivedResolver(message.data);
    }
  };

  output.send(queryRamMessage());

  const preset = await presetReceived;

  const updatedPreset = setKnobsToRelative(preset);
  output.send(updatedPreset);
}

export default function connectMidi(smor: SmorSynth) {
  initMIDIControls({
    onNoteDown: (note: number) => {
      smor.attack(note);
    },
    onNoteUp: (note: number) => {
      smor.release(note);
    },
    onKnobChange: (control: number, value: number) => {
      if (control === 0) {
        smor.oscillator.setOscillatorMix(value / 127);
      } else if (control === 1) {
        // smor.oscillator.setOscillatorDetune((value / 127) * 100);
      } else if (control === 2) {
        smor.lowpassFilter.setCutoff(value / 127);
      } else if (control === 3) {
        smor.lowpassFilter.setResonance(value / 127);
      } else if (control === 4) {
        // smor.oscillator.setOscillatorGlide(value / 127);
      } else if (control === 5) {
        // smor.setSawDetune((value / 127) * 100);
      } else if (control === 6) {
        smor.lowpassFilter.setEnvelopeDecay(value / 127);
      } else if (control === 7) {
        smor.lowpassFilter.setEnvelopeAmount(value / 127);
      } else if (control === 8) {
        smor.lfo.setFrequency((value / 127) * 40);
      } else if (control === 9) {
        smor.lfo.setCutoffGain((value / 127) * 400);
      } else if (control === 10) {
        //smor.lfo.setR((value / 127) * 25);
      } else if (control === 11) {
        // smor.lfo.setLFOOscillatorGain(value / 127);
      } else {
      }
    },
    onDrumPad: () => {},
  });
}

export function useMidi({
  onKnobChange,
  onNoteDown,
  onNoteUp,
}: {
  onKnobChange: (knob: number, value: number) => void;
  onNoteDown: (note: number) => void;
  onNoteUp: (note: number) => void;
}) {
  const currentKnobChange = React.useRef(onKnobChange);
  currentKnobChange.current = onKnobChange;

  React.useEffect(() => {
    return initMIDIControls({
      onNoteUp,
      onNoteDown,
      onKnobChange: (knob, value) => {
          currentKnobChange.current(knob, value);
      },
      onDrumPad: () => {},
    });
  }, []);
}
