function exponetialEase(value: number) {
  return Math.pow(2, 10 * value - 10);
}

export enum ParameterType {
  OSCILLATOR_FREQUENCY,
  OSCILLATOR_MIX,
  OSCILLATOR_DETUNE,
  FILTER_CUTOFF,
  FILTER_RESONANCE,
  FILTER_ENVELOPE_DECAY,
  FILTER_ENVELOPE_AMOUNT,
  LFO_FREQUENCY,
  LFO_CUTOFF_GAIN,
  LFO_OSCILLATOR_PITCH,
}

function createOscillator(
  audioContext: AudioContext,
  frequency: number,
  detune: number,
  type: OscillatorType
) {
  const oscillator = audioContext.createOscillator();
  oscillator.type = type;
  oscillator.detune.setValueAtTime(detune, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  return oscillator;
}

function createDecayEnvelope({
  onValueChange,
  initialDecay,
}: {
  onValueChange: (value: number) => void;
  initialDecay: number;
}) {
  let decay = initialDecay;

  return {
    setDecay(updatedDecay: number) {
      decay = updatedDecay;
    },

    attack() {
      if (decay === 0) return;
      let value = 1;

      // param.setValue;
      onValueChange(value);

      let previousTimestamp = performance.now();
      function tween(timestamp: number) {
        const timediff = timestamp - previousTimestamp;
        const valueDecrease = timediff / decay;

        value -= valueDecrease;

        if (value > 0) {
          onValueChange(value);
          previousTimestamp = timestamp;
          requestAnimationFrame(tween);
        } else {
          onValueChange(0);
        }
      }

      requestAnimationFrame(tween);
    },
  };
}

export class Oscillator {
  audioContext: AudioContext;
  oscillators: OscillatorNode[] | null;
  oscillatorMix: number;
  oscillatorGlide: number;
  oscillatorDetune: number;
  oscillatorOutput: GainNode;
  gainNodes: GainNode[];
  keysPressed: number[];
  parameterEventEmitter: (arg0: ParameterType, arg1: number) => void;

  constructor(
    audioContext: AudioContext,
    parameterEventEmitter: (arg0: ParameterType, arg1: number) => void
  ) {
    this.audioContext = audioContext;
    this.parameterEventEmitter = parameterEventEmitter;
    this.oscillators = null;
    this.oscillatorMix = 0.5;
    this.oscillatorGlide = 0;
    this.oscillatorDetune = 0;
    this.oscillatorCoarseTune = 0;
    this.oscillatorOutput = this.audioContext.createGain();
    this.gainNodes = [
      this.audioContext.createGain(),
      this.audioContext.createGain(),
    ];
    this.gainNodes.forEach((gainNode) => {
      gainNode.gain.setValueAtTime(
        this.oscillatorMix,
        this.audioContext.currentTime
      );
      gainNode.connect(this.oscillatorOutput);
    });
    this.keysPressed = [];
  }

  setOscillatorMix(value: number) {
    this.parameterEventEmitter(ParameterType.OSCILLATOR_MIX, value);
    this.oscillatorMix = value;
    this.gainNodes[0].gain.setValueAtTime(value, this.audioContext.currentTime);
    this.gainNodes[1].gain.setValueAtTime(
      1 - value,
      this.audioContext.currentTime
    );
  }

  setOscillatorDetune(value: number) {
    this.parameterEventEmitter(ParameterType.OSCILLATOR_DETUNE, value);
    this.oscillatorDetune = value;
    if (this.oscillators) {
      this.oscillators[0].detune.setValueAtTime(
        value,
        this.audioContext.currentTime
      );
      this.oscillators[1].detune.setValueAtTime(
        -value,
        this.audioContext.currentTime
      );
    }
  }

  connect(output: AudioNode) {
    this.gainNodes.forEach((gainNode) => gainNode.connect(output));
  }

  attack(note: number) {
    this.keysPressed.push(note);
    const frequency = MIDINoteToHertz(note);
    this.parameterEventEmitter(ParameterType.OSCILLATOR_FREQUENCY, frequency);

    if (!this.oscillators) {
      this.oscillators = [
        createOscillator(
          this.audioContext,
          frequency,
          -this.oscillatorDetune,
          "square"
        ),
        createOscillator(
          this.audioContext,
          frequency,
          this.oscillatorDetune,
          "sawtooth"
        ),
      ];
      this.oscillators.forEach((oscillator, index) => {
        oscillator.connect(this.gainNodes[index]);
        oscillator.start();
      });
    } else {
      this.oscillators.forEach((oscillator) => {
        oscillator.frequency.cancelScheduledValues(
          this.audioContext.currentTime
        );
        oscillator.frequency.linearRampToValueAtTime(
          frequency,
          this.audioContext.currentTime + this.oscillatorGlide
        );
      });
    }
  }

  release(note: number) {
    this.keysPressed = this.keysPressed.filter((key) => key !== note);
    if (this.keysPressed.length === 0) {
      this.oscillators?.forEach((oscillator) => oscillator.stop());
      this.oscillators = null;
      // this.filter.frequency.setValueAtTime(
      //   this.filterCutoff,
      //   this.audioContext.currentTime
      // );
    } else {
      const frequency = MIDINoteToHertz(this.keysPressed.at(-1));
      this.parameterEventEmitter(ParameterType.OSCILLATOR_FREQUENCY, frequency);
      this.oscillators?.forEach((oscillator) => {
        oscillator.frequency.linearRampToValueAtTime(
          frequency,
          this.audioContext.currentTime + this.oscillatorGlide
        );
      });
    }
  }
}

class LowPassFilter {
  audioContext: AudioContext;
  filterCutoff: number;
  filter: BiquadFilterNode;
  envelopeFilterOffset: number;
  envelopeFrequencyOffset: number;
  envelope: { setDecay: (arg: number) => void; attack: () => void };
  parameterEventEmitter: (arg0: ParameterType, arg1: number) => void;

  constructor(
    audioContext: AudioContext,
    parameterEventEmitter: (arg0: ParameterType, arg1: number) => void
  ) {
    this.parameterEventEmitter = parameterEventEmitter;
    this.audioContext = audioContext;
    this.filterCutoff = 1000;
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.setValueAtTime(
      this.filterCutoff,
      this.audioContext.currentTime
    );
    this.filter.gain.setValueAtTime(25, audioContext.currentTime);

    this.envelopeFilterOffset = 0;
    this.envelopeFrequencyOffset = 5000;

    this.envelope = createDecayEnvelope({
      initialDecay: 200,
      onValueChange: (value) => {
        this.envelopeFilterOffset =
          exponetialEase(value) * this.envelopeFrequencyOffset;
        this.filter.frequency.setValueAtTime(
          Math.max(
            Math.min(this.filterCutoff + this.envelopeFilterOffset, 20000),
            0
          ),
          this.audioContext.currentTime
        );
      },
    });
  }

  attack() {
    this.envelope.attack();
  }

  release() {}

  setCutoff(value: number) {
    const easedValue = exponetialEase(value);
    const minFreq = 0;
    const maxFreq = 20000;
    const freq = minFreq + (maxFreq - minFreq) * easedValue;

    this.parameterEventEmitter(ParameterType.FILTER_CUTOFF, value);

    this.filterCutoff = freq;
    this.filter.frequency.setValueAtTime(
      freq + this.envelopeFilterOffset,
      this.audioContext.currentTime
    );
  }

  setResonance(value: number) {
    const resonance = value * 25;

    this.parameterEventEmitter(ParameterType.FILTER_RESONANCE, value);
    this.filter.Q.setValueAtTime(resonance, this.audioContext.currentTime);
  }

  setEnvelopeDecay(value: number) {
    this.parameterEventEmitter(ParameterType.FILTER_ENVELOPE_DECAY, value);
    const ms = value * 1000;
    this.envelope.setDecay(ms);
  }

  setEnvelopeAmount(value: number) {
    this.parameterEventEmitter(ParameterType.FILTER_ENVELOPE_AMOUNT, value);
    const offset = value * 10000 - 5000;
    this.envelopeFrequencyOffset = offset;
  }
}

class LFO {
  audioContext: AudioContext;
  oscillator: Oscillator;
  lfo: OscillatorNode;
  lfoCutOffGain: GainNode;
  parameterEventEmitter: (arg0: ParameterType, arg1: number) => void;

  constructor(
    audioContext: AudioContext,
    oscillator: Oscillator,
    lowpassFilter: LowPassFilter,
    parameterEventEmitter: (arg0: ParameterType, arg1: number) => void
  ) {
    this.parameterEventEmitter = parameterEventEmitter;
    this.audioContext = audioContext;
    this.oscillator = oscillator;

    this.lfo = this.audioContext.createOscillator();
    this.lfo.type = "triangle";
    this.lfo.frequency.setValueAtTime(0, this.audioContext.currentTime);

    this.lfoCutOffGain = this.audioContext.createGain();
    this.lfoCutOffGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.lfo.connect(this.lfoCutOffGain);
    this.lfoCutOffGain.connect(lowpassFilter.filter.frequency);

    this.lfo.start();
  }

  setFrequency(value: number) {
    this.parameterEventEmitter(ParameterType.LFO_FREQUENCY, value);
    const frequency = value * 50;
    this.lfo.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
  }

  setCutoffGain(value: number) {
    const gain = value * 1000;
    this.parameterEventEmitter(ParameterType.LFO_CUTOFF_GAIN, value);
    this.lfoCutOffGain.gain.setValueAtTime(gain, this.audioContext.currentTime);
  }
}

export class SmorSynth extends EventTarget {
  oscillator: Oscillator;
  lowpassFilter: LowPassFilter;
  lfo: LFO;

  parameters: Record<ParameterType, (value: number) => void> = {
    [ParameterType.OSCILLATOR_MIX]: (value: number) => {
      this.oscillator.setOscillatorMix(value);
    },
    [ParameterType.OSCILLATOR_DETUNE]: (value: number) => {
      this.oscillator.setOscillatorDetune(value);
    },
    [ParameterType.OSCILLATOR_FREQUENCY]: (_: number) => {
      // this.oscillator.setOscillatorDetune(value);
    },
    [ParameterType.FILTER_CUTOFF]: (value: number) => {
      this.lowpassFilter.setCutoff(value);
    },
    [ParameterType.FILTER_RESONANCE]: (value: number) => {
      this.lowpassFilter.setResonance(value);
    },
    [ParameterType.FILTER_ENVELOPE_DECAY]: (value: number) => {
      this.lowpassFilter.setEnvelopeDecay(value);
    },
    [ParameterType.FILTER_ENVELOPE_AMOUNT]: (value: number) => {
      this.lowpassFilter.setEnvelopeAmount(value);
    },
    [ParameterType.FILTER_ENVELOPE_AMOUNT]: (value: number) => {
      this.lowpassFilter.setEnvelopeAmount(value);
    },
    [ParameterType.LFO_FREQUENCY]: (value: number) => {
      this.lfo.setFrequency(value);
    },
    [ParameterType.LFO_CUTOFF_GAIN]: (value: number) => {
      this.lfo.setCutoffGain(value);
    },
    [ParameterType.LFO_OSCILLATOR_PITCH]: (_: number) => {
      // this.lfo.setCutoffGain(value);
    },
  };
  constructor(audioContext: AudioContext) {
    super();
    const synth = this;

    function parameterEventEmitter(
      parameterType: ParameterType,
      value: number
    ) {
      const event = new CustomEvent("parameterChange", {
        detail: {
          parameterType,
          value,
        },
      });
      synth.dispatchEvent(event);
    }

    this.oscillator = new Oscillator(audioContext, parameterEventEmitter);
    this.lowpassFilter = new LowPassFilter(audioContext, parameterEventEmitter);
    this.lfo = new LFO(
      audioContext,
      this.oscillator,
      this.lowpassFilter,
      parameterEventEmitter
    );

    this.oscillator.connect(this.lowpassFilter.filter);
  }

  attack(MIDINote: number) {
    console.log("attack note");
    this.oscillator.attack(MIDINote);
    this.lowpassFilter.attack();
  }
  release(MIDINote: number) {
    this.oscillator.release(MIDINote);
    this.lowpassFilter.release();
  }

  connect(output: AudioNode) {
    this.lowpassFilter.filter.connect(output);
  }
}

// function init() {
//   const audioContext = new window.AudioContext({ sampleRate: 44100 });
//   const synth = new SmorSynth(audioContext);
//
//   synth.connect(audioContext.destination);
//   const { analyser, setFrequency } = createOscilloscope(
//     audioContext,
//     document.getElementById("oscilloscope") as HTMLCanvasElement
//   );
//
//   synth.connect(analyser);
//
//   const { analyser: oscillatorAnalyser, setFrequency: setOscillatorAnalyser } =
//     createOscilloscope(
//       audioContext,
//       document.getElementById("oscillator-canvas") as HTMLCanvasElement
//     );
//   synth.oscillator.connect(oscillatorAnalyser);
//
//   synth.oscillator.addEventListener("frequencyChange", ((event: CustomEvent) => {
//     setFrequency(event.detail);
//     setOscillatorAnalyser(event.detail);
//   }) as EventListener);
//
//   drawFilterReponse(
//     document.getElementById("filter-response"),
//     synth.lowpassFilter.filter
//   );
//
//   function createKnobMapping({ inputId, synthObject, method, changeEvent }) {
//     return {
//       inputId,
//       synthObject,
//       method,
//       changeEvent,
//     };
//   }
//   const knobMappings = [
//     createKnobMapping({
//       inputId: "oscillator-mix",
//       synthObject: synth.oscillator,
//       method: "setOscillatorMix",
//       changeEvent: "oscillatorMixChange",
//     }),
//
//     createKnobMapping({
//       inputId: "oscillator-detune",
//       synthObject: synth.oscillator,
//       method: "setOscillatorDetune",
//       changeEvent: "oscillatorDetuneChange",
//     }),
//     createKnobMapping({
//       inputId: "filter-cutoff",
//       synthObject: synth.lowpassFilter,
//       method: "setCutoff",
//       changeEvent: "filterCutoffChange",
//     }),
//     createKnobMapping({
//       inputId: "filter-resonance",
//       synthObject: synth.lowpassFilter,
//       method: "setResonance",
//       changeEvent: "filterResonanceChange",
//     }),
//     createKnobMapping({
//       inputId: "filter-envelope-decay",
//       synthObject: synth.lowpassFilter,
//       method: "setEnvelopeDecay",
//       changeEvent: "filterEnvelopeDecayChange",
//     }),
//     createKnobMapping({
//       inputId: "filter-envelope-amount",
//       synthObject: synth.lowpassFilter,
//       method: "setEnvelopeAmount",
//       changeEvent: "filterEnvelopeAmountChange",
//     }),
//     createKnobMapping({
//       inputId: "lfo-frequency",
//       synthObject: synth.lfo,
//       method: "setFrequency",
//       changeEvent: "LFOFrequencyChange",
//     }),
//     createKnobMapping({
//       inputId: "lfo-cutoff",
//       synthObject: synth.lfo,
//       method: "setCutoffGain",
//       changeEvent: "LFOCutoffGainChange",
//     }),
//   ];
//
//   for (const knobMapping of knobMappings) {
//     const { inputId, synthObject, method, changeEvent } = knobMapping;
//
//     const element = document.getElementById(inputId);
//     if (!element) {
//       console.log("unable to find knob", id);
//       continue;
//     }
//     element.addEventListener("input", (event) => {
//       const value = event.target.value / 100;
//       synthObject[method](value);
//     });
//     synthObject.addEventListener(changeEvent, function (paramChangeEvent) {
//       element.value = Math.round(paramChangeEvent.detail * 127);
//     });
//   }
//
//   function updateSynth(control, value) {
//     if (control === 0) {
//       synth.oscillator.setOscillatorMix(value / 127);
//     } else if (control === 1) {
//       synth.oscillator.setOscillatorDetune((value / 127) * 100);
//     } else if (control === 2) {
//       synth.lowpassFilter.setCutoff(value / 127);
//     } else if (control === 3) {
//       synth.lowpassFilter.setResonance(value / 127);
//     } else if (control === 4) {
//       synth.oscillator.setOscillatorGlide(value / 127);
//     } else if (control === 5) {
//       // synth.setSawDetune((value / 127) * 100);
//     } else if (control === 6) {
//       synth.lowpassFilter.setEnvelopeDecay(value / 127);
//     } else if (control === 7) {
//       synth.lowpassFilter.setEnvelopeAmount(value / 127);
//     } else if (control === 8) {
//       synth.lfo.setFrequency((value / 127) * 40);
//     } else if (control === 9) {
//       synth.lfo.setLFOCutOffGain((value / 127) * 400);
//     } else if (control === 10) {
//       synth.lfo.setLFOResonanceGain((value / 127) * 25);
//     } else if (control === 11) {
//       synth.lfo.setLFOOscillatorGain(value / 127);
//     } else {
//     }
//
//     // if (control >= 0 && control <= 7) {
//     //   document.getElementById(knobMapping[control]).value = Math.round(
//     //     (value / 127) * 100
//     //   );
//     // }
//   }
//   initMIDI({
//     onNoteDown: (note) => {
//       synth.attack(note);
//     },
//     onNoteUp: (note) => {
//       synth.release(note);
//     },
//     onKnobChange: (control, value) => {
//       updateSynth(control, value);
//     },
//     onDrumPad: (_) => {},
//   });
//
//   const offset = 0;
//   const keymapping = {
//     z: 36,
//     s: 37,
//     x: 38,
//     d: 39,
//     c: 40,
//     v: 41,
//     g: 42,
//     b: 43,
//     h: 44,
//     n: 45,
//     j: 46,
//     m: 47,
//     ",": 48,
//   };
//   document.addEventListener("keydown", (event) => {
//     if (keymapping[event.key] && !event.repeat) {
//       synth.attack(keymapping[event.key] + offset);
//     }
//   });
//   document.addEventListener("keyup", (event) => {
//     if (keymapping[event.key] && !event.repeat) {
//       synth.release(keymapping[event.key] + offset);
//     }
//   });
// }

// document.addEventListener(
//   "keydown",
//   () => {
//     init();
//   },
//   { once: true }
// );

function initMIDI({ onNoteUp, onNoteDown, onKnobChange, onDrumPad }) {
  if (!navigator.requestMIDIAccess) {
    console.warn("No midi access");
    return;
  }
  navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
  function onMIDISuccess(midiAccess) {
    for (const input of midiAccess.inputs.values()) {
      input.onmidimessage = getMIDIMessage;
    }
  }

  function getMIDIMessage(midiMessage) {
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
  function onMIDIFailure(error) {
    console.log("failed to initialize midi", error);
  }
}

// initButton.addEventListener("click", function () {
//   init();
//   return;
// });

function MIDINoteToHertz(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function drawFilterReponse(canvas, filter) {
  const frequencySteps = 200;
  const minFrequency = 0;
  const maxFrequency = 20000;

  const frequencyArray = new Float32Array(frequencySteps);
  const magResponseOutput = new Float32Array(frequencySteps);
  const phaseResponseOutput = new Float32Array(frequencySteps);

  for (let i = 0; i < frequencySteps; ++i) {
    frequencyArray[i] =
      minFrequency +
      exponetialEase(i / frequencySteps) * (maxFrequency - minFrequency);
  }

  const canvasCtx = canvas.getContext("2d");

  function draw() {
    filter.getFrequencyResponse(
      frequencyArray,
      magResponseOutput,
      phaseResponseOutput
    );
    requestAnimationFrame(draw);

    canvasCtx.fillStyle = "#333";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "#F2C94C";
    canvasCtx.shadowColor = "#F2C94C";
    canvasCtx.shadowBlur = 5;

    let x = 0;
    const sliceWidth = canvas.width / frequencySteps;
    canvasCtx.beginPath();

    for (let i = 0; i < frequencySteps; ++i) {
      const y = canvas.height - (magResponseOutput[i] * canvas.height) / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }
    canvasCtx.stroke();
  }
  requestAnimationFrame(draw);
}

function createOscilloscope(
  audioContext: AudioContext,
  canvas: HTMLCanvasElement
) {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 4096;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const canvasCtx = canvas.getContext("2d");
  if (canvasCtx === null) {
    throw new Error("Unable to get canvas context");
  }
  let noteFrequency = 440;

  const sampleRate = 44100;

  function draw() {
    if (canvasCtx === null) return;
    const sampleTime = audioContext.currentTime * sampleRate;
    const period = Math.round(sampleRate / noteFrequency);
    const offsetX = sampleTime % period;
    const startIndex = period - offsetX;
    const periodsToShow = Math.min(Math.floor(bufferLength / period) - 1, 2);

    const endIndex = startIndex + periodsToShow * period;

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "#333";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "#F2C94C";
    canvasCtx.shadowColor = "#F2C94C";
    canvasCtx.shadowBlur = 5;

    canvasCtx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / (endIndex - startIndex);
    let x = 0;

    for (let i = period - offsetX; i < endIndex; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === startIndex) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    // canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
    requestAnimationFrame(draw);
  }

  draw();
  return {
    analyser,
    setFrequency: (newFrequency: number) => {
      noteFrequency = newFrequency;
    },
  };
}

// (async () => {
//   const audioContext = new window.AudioContext({ sampleRate: 44100 });
//   const { analyser, setFrequency } = createOscilloscope(
//     audioContext,
//     document.getElementById("testscope") as HTMLCanvasElement
//   );
//
//   const freq = 200;
//   setFrequency(freq);
//
//   const oscillator = audioContext.createOscillator();
//   oscillator.type = "sine";
//   oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
//   oscillator.connect(analyser);
//   oscillator.start();
// })();
