function exponetialEase(value: number) {
  return Math.pow(2, 10 * value - 10);
}

export enum ParameterType {
  OSCILLATOR_FREQUENCY,
  OSCILLATOR_MIX,
  OSCILLATOR_DETUNE,
  OSCILLATOR_COARSE,
  FILTER_CUTOFF,
  FILTER_RESONANCE,
  FILTER_CONTOUR,
  FILTER_FEEDBACK,
  FILTER_ENVELOPE_DECAY,
  FILTER_ENVELOPE_ATTACK,
  FILTER_ENVELOPE_SUSTAIN,
  FILTER_ENVELOPE_ENERGY,
  FILTER_ENVELOPE_STIFFNESS,
  FILTER_ENVELOPE_DAMPING,
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

export class SpringEnvelope {
  audioContext: AudioContext;
  energy: number;
  stiffness: number;
  damping: number;
  filterFrequency: number;
  gain: GainNode;
  source: ConstantSourceNode;
  scheduledAnimationFrame: number | null;
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.energy = 1;
    this.stiffness = 1;
    this.damping = 0.5;
    this.filterFrequency = 1000;
    this.gain = audioContext.createGain();
    this.source = audioContext.createConstantSource();
    this.source.start();
    this.source.connect(this.gain);
    this.scheduledAnimationFrame = null;
  }

  attack() {
    const stiffness = Math.max(this.stiffness * 10, 1);
    const damping = Math.max(this.damping, 0.2);
    let velocity = (this.energy - 0.5) * 2;
    console.log("attack", {
      stiffness,
      damping,
      velocity,
    });

    let tweenValue = 0;
    let acceleration = 0;

    const tick = () => {
      const diff = 0 - tweenValue;

      velocity += acceleration;
      tweenValue += velocity;

      acceleration = diff * (stiffness / 100) - velocity * damping;
      // equilibrium
      if (Math.abs(tweenValue) < 0.001 && Math.abs(velocity) < 0.001) {
        return;
      }

      const offset = this.filterFrequency * (Math.pow(2, tweenValue) - 1);
      console.log("offset", tweenValue, offset);
      this.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
      this.gain.gain.linearRampToValueAtTime(
        offset,
        // tweenValue * 1000,
        this.audioContext.currentTime + 1
      );
      this.scheduledAnimationFrame = requestAnimationFrame(tick);
    };
    if (this.scheduledAnimationFrame) {
      cancelAnimationFrame(this.scheduledAnimationFrame);
    }
    this.scheduledAnimationFrame = requestAnimationFrame(tick);
  }

  release() {}

  setFilterFrequency(frequency: number) {
    this.filterFrequency = frequency;
  }
}

function createADSEnvelope({
  audioContext,
  initialAttack,
  initialDecay,
  initialSustain,
}: {
  audioContext: AudioContext;
  initialAttack: number;
  initialDecay: number;
  initialSustain: number;
}) {
  let decay = initialDecay;
  let attack = initialAttack;
  let sustain = initialSustain;
  const constantSource = audioContext.createConstantSource();
  const gainNode = audioContext.createGain();
  constantSource.connect(gainNode);
  constantSource.start();
  gainNode.gain.value = 0;

  return {
    setAttack(updatedAttack: number) {
      attack = updatedAttack;
    },
    setDecay(updatedDecay: number) {
      decay = updatedDecay;
    },
    setSustain(updatedSustain: number) {
      sustain = updatedSustain;
    },

    attack() {
      if (decay === 0 && attack === 0) {
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        return;
      }
      this.triggerEnvelope();
    },

    triggerEnvelope() {
      gainNode.gain.cancelScheduledValues(audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        1,
        audioContext.currentTime + attack
      );
      if (decay) {
        gainNode.gain.exponentialRampToValueAtTime(
          sustain + 0.001,
          audioContext.currentTime + attack + decay
        );
      }
    },

    release() {
      //this.triggerEnvelope();
      // gainNode.gain.cancelScheduledValues(audioContext.currentTime);
      // gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    },
    connect(audioNode: AudioNode) {
      gainNode.connect(audioNode);
    },
  };
}

export class Oscillator {
  audioContext: AudioContext;
  oscillators: OscillatorNode[] | null;
  oscillatorMix: number;
  oscillatorGlide: number;
  oscillatorDetune: number;
  oscillatorCoarseTune: number;
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
    this.oscillatorCoarseTune = 0.5;
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

  notifyParameters() {
    this.parameterEventEmitter(
      ParameterType.OSCILLATOR_MIX,
      this.oscillatorMix
    );
    this.parameterEventEmitter(
      ParameterType.OSCILLATOR_DETUNE,
      this.oscillatorDetune
    );
    this.parameterEventEmitter(
      ParameterType.OSCILLATOR_COARSE,
      this.oscillatorCoarseTune
    );
  }

  setOscillatorMix(value: number) {
    this.parameterEventEmitter(ParameterType.OSCILLATOR_MIX, value);
    this.oscillatorMix = value;
    this.gainNodes[0].gain.setValueAtTime(
      1 - value,
      this.audioContext.currentTime
    );
    this.gainNodes[1].gain.setValueAtTime(value, this.audioContext.currentTime);
  }

  setOscillatorDetune(value: number) {
    this.parameterEventEmitter(ParameterType.OSCILLATOR_DETUNE, value);
    this.oscillatorDetune = value;
    if (this.oscillators) {
      this.oscillators[0].detune.setValueAtTime(
        -this.oscillatorDetune * 100 + (this.oscillatorCoarseTune - 0.5) * 2400,
        this.audioContext.currentTime
      );
      this.oscillators[1].detune.setValueAtTime(
        value * 100,
        this.audioContext.currentTime
      );
    }
  }

  setOscillatorCoarse(value: number) {
    this.parameterEventEmitter(ParameterType.OSCILLATOR_COARSE, value);
    this.oscillatorCoarseTune = value;
    if (this.oscillators) {
      this.oscillators[0].detune.setValueAtTime(
        -this.oscillatorDetune * 100 + (value - 0.5) * 2400,
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
          -this.oscillatorDetune * 100 +
            (this.oscillatorCoarseTune - 0.5) * 2400,
          "square"
        ),
        createOscillator(
          this.audioContext,
          frequency,
          this.oscillatorDetune * 100,
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
      const lastKeyPress = this.keysPressed.at(-1);
      if (!lastKeyPress) return;
      const frequency = MIDINoteToHertz(lastKeyPress);
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
  cutoff: number;
  resonance: number;
  contour: number;
  // feedback: number;
  filter: BiquadFilterNode;
  contourController: GainNode;
  feedbackGain: GainNode;
  cutoffFrequency?: number;
  envelopeAttack: number;
  envelopeDecay: number;
  envelopeSustain: number;
  envelope: {
    setAttack: (arg: number) => void;
    setDecay: (arg: number) => void;
    setSustain: (arg: number) => void;
    attack: () => void;
    release: () => void;
    connect: (audioNode: AudioNode) => void;
  };
  // envelope: SpringEnvelope;
  parameterEventEmitter: (arg0: ParameterType, arg1: number) => void;

  constructor(
    audioContext: AudioContext,
    parameterEventEmitter: (arg0: ParameterType, arg1: number) => void
  ) {
    this.parameterEventEmitter = parameterEventEmitter;
    this.audioContext = audioContext;
    this.cutoff = 0.4;
    this.resonance = 0.1;
    this.contour = 0.0;
    this.envelopeAttack = 0.0;
    this.envelopeDecay = 0.0;
    this.envelopeSustain = 0.0;

    this.filter = audioContext.createBiquadFilter();
    this.filter.type = "lowpass";

    this.setCutoff(this.cutoff);
    this.setResonance(this.resonance);

    this.contourController = audioContext.createGain();
    this.contourController.connect(this.filter.frequency);

    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = 0;
    this.filter.connect(this.feedbackGain);
    this.feedbackGain.connect(this.filter);

    this.envelope = createADSEnvelope({
      audioContext,
      initialAttack: 0,
      initialDecay: 0,
      initialSustain: 0,
    });

    this.envelope.connect(this.contourController);
  }

  notifyParameters() {
    this.parameterEventEmitter(ParameterType.FILTER_CUTOFF, this.cutoff);
    this.parameterEventEmitter(ParameterType.FILTER_RESONANCE, this.resonance);
    this.parameterEventEmitter(ParameterType.FILTER_CONTOUR, this.contour);
    // this.parameterEventEmitter(ParameterType.FILTER_FEEDBACK, this.feedback);
    this.parameterEventEmitter(
      ParameterType.FILTER_ENVELOPE_ATTACK,
      this.envelopeAttack
    );
    this.parameterEventEmitter(
      ParameterType.FILTER_ENVELOPE_DECAY,
      this.envelopeDecay
    );
    this.parameterEventEmitter(
      ParameterType.FILTER_ENVELOPE_SUSTAIN,
      this.envelopeSustain
    );
  }

  attack() {
    this.envelope.attack();
  }

  release() {
    this.envelope.release();
  }

  setCutoff(value: number) {
    const easedValue = exponetialEase(value);
    const minFreq = 0;
    const maxFreq = 20000;
    const freq = minFreq + (maxFreq - minFreq) * easedValue;

    this.parameterEventEmitter(ParameterType.FILTER_CUTOFF, value);

    this.cutoffFrequency = freq;
    this.filter.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    // this.envelope.setFilterFrequency(freq);
  }

  setResonance(value: number) {
    const resonance = value * 15;

    this.parameterEventEmitter(ParameterType.FILTER_RESONANCE, value);
    this.filter.Q.setValueAtTime(resonance, this.audioContext.currentTime);
  }

  setContour(value: number) {
    this.contour = value;
    this.parameterEventEmitter(ParameterType.FILTER_CONTOUR, value);
    this.contourController.gain.setValueAtTime(
      (this.cutoffFrequency ?? 0) * value * 50,
      this.audioContext.currentTime
    );
  }

  setFeedback(_: number) {
    /*
    this.feedback = value;
    this.parameterEventEmitter(ParameterType.FILTER_FEEDBACK, value);
    this.feedbackGain.gain.setValueAtTime(value, this.audioContext.currentTime);
    */
  }

  setEnvelopeDecay(value: number) {
    this.envelopeDecay = value;
    this.parameterEventEmitter(ParameterType.FILTER_ENVELOPE_DECAY, value);
    this.envelope.setDecay(value);
  }

  setEnvelopeAttack(value: number) {
    this.envelopeAttack = value;
    this.parameterEventEmitter(ParameterType.FILTER_ENVELOPE_ATTACK, value);
    this.envelope.setAttack(value);
  }

  setEnvelopeSustain(value: number) {
    this.envelopeSustain = value;
    this.parameterEventEmitter(ParameterType.FILTER_ENVELOPE_SUSTAIN, value);
    this.envelope.setSustain(value);
  }

  setEnvelopeEnergy(_: number) {
    /*
    this.parameterEventEmitter(ParameterType.FILTER_ENVELOPE_ENERGY, value);
    this.envelope.energy = value;
    */
  }

  setEnvelopeStiffness(_: number) {
    /*
    this.parameterEventEmitter(ParameterType.FILTER_ENVELOPE_STIFFNESS, value);
    this.envelope.stiffness = value;
    */
  }
  setEnvelopeDamping(_: number) {
    // this.parameterEventEmitter(ParameterType.FILTER_ENVELOPE_DAMPING, value);
    // this.envelope.damping = value;
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
  audioContext: AudioContext;
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
    [ParameterType.OSCILLATOR_COARSE]: (value: number) => {
      this.oscillator.setOscillatorCoarse(value);
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
    [ParameterType.FILTER_CONTOUR]: (value: number) => {
      this.lowpassFilter.setContour(value);
    },
    [ParameterType.FILTER_FEEDBACK]: (value: number) => {
      this.lowpassFilter.setFeedback(value);
    },
    [ParameterType.FILTER_ENVELOPE_ATTACK]: (value: number) => {
      this.lowpassFilter.setEnvelopeAttack(value);
    },
    [ParameterType.FILTER_ENVELOPE_DECAY]: (value: number) => {
      this.lowpassFilter.setEnvelopeDecay(value);
    },
    [ParameterType.FILTER_ENVELOPE_SUSTAIN]: (value: number) => {
      this.lowpassFilter.setEnvelopeSustain(value);
    },
    // Spring envelop
    [ParameterType.FILTER_ENVELOPE_ENERGY]: (value: number) => {
      this.lowpassFilter.setEnvelopeEnergy(value);
    },
    [ParameterType.FILTER_ENVELOPE_STIFFNESS]: (value: number) => {
      this.lowpassFilter.setEnvelopeStiffness(value);
    },
    [ParameterType.FILTER_ENVELOPE_DAMPING]: (value: number) => {
      this.lowpassFilter.setEnvelopeDamping(value);
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
    this.audioContext = audioContext;

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

  notifyParameters() {
    this.oscillator.notifyParameters();
    this.lowpassFilter.notifyParameters();
  }

  attack(MIDINote: number) {
    this.oscillator.attack(MIDINote);
    this.lowpassFilter.attack();
  }
  release(MIDINote: number) {
    this.oscillator.release(MIDINote);
    this.lowpassFilter.release();
  }

  connect(output: AudioNode) {
    const gain = this.audioContext.createGain();
    gain.gain.value = 0.5;
    this.lowpassFilter.filter.connect(gain);
    gain.connect(output);
  }
}

export function MIDINoteToHertz(note: number) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export function drawFilterReponse(
  canvas: HTMLCanvasElement,
  filter: BiquadFilterNode
) {
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
    if (!canvasCtx) return;
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

export function createOscilloscope(
  canvas: HTMLCanvasElement,
  audioContext: AudioContext
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

export function drawFrequencyResponse(
  canvas: HTMLCanvasElement,
  audioContext: AudioContext
) {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 4096;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const canvasCtx = canvas.getContext("2d");
  if (canvasCtx === null) {
    throw new Error("Unable to get canvas context");
  }
  let stopped = false;

  function draw() {
    if (canvasCtx === null) return;
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = "#333";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "#F2C94C";
    canvasCtx.shadowColor = "#F2C94C";
    canvasCtx.shadowBlur = 5;

    canvasCtx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; ++i) {
      const y = (1 - dataArray[i] / 256) * canvas.height;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.stroke();
    if (!stopped) {
      requestAnimationFrame(draw);
    }
  }

  draw();
  return {
    analyser,
    stop: () => {
      stopped = true;
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
