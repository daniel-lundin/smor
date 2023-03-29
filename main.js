const initButton = document.getElementById("init");

function exponetialEase(value) {
  return Math.pow(2, 10 * value - 10);
}

function createOscillator(audioContext, frequency, detune, type) {
  const oscillator = audioContext.createOscillator();
  oscillator.type = type;
  oscillator.detune.setValueAtTime(detune, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  return oscillator;
}

function createEnvelope({ onValueChange, initialDecay }) {
  let decay = initialDecay;
  return {
    setDecay(updatedDecay) {
      decay = updatedDecay;
    },
    setFilterAmount(updatedFilterAmount) {
      filterAmount = updatedFilterAmount;
    },

    attack() {
      if (decay === 0) return;
      let value = 1;

      // param.setValue;
      onValueChange(value);

      let previousTimestamp = performance.now();
      function tween(timestamp) {
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

    release() {},
  };
}

const oscillatorTypes = ["sine", "square", "sawtooth", "triangle"];

class Oscillator extends EventTarget {
  constructor(audioContext) {
    super();
    this.audioContext = audioContext;
    this.oscillators = null;
    this.oscillatorMix = 0.5;
    this.oscillatorGlide = 0;
    this.oscillatorDetune = 0;
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

  _dispatch(eventName, value) {
    const event = new CustomEvent(eventName, { detail: value });
    this.dispatchEvent(event);
  }

  setOscillatorMix(value) {
    this._dispatch("oscillatorMixChange", value);
    this.oscillatorMix = value;
    this.gainNodes[0].gain.setValueAtTime(value, this.audioContext.currentTime);
    this.gainNodes[1].gain.setValueAtTime(
      1 - value,
      this.audioContext.currentTime
    );
  }

  connect(output) {
    this.gainNodes.forEach((gainNode) => gainNode.connect(output));
  }

  attack(note) {
    this.keysPressed.push(note);
    const frequency = MIDINoteToHertz(note);
    this._dispatch("frequencyChange", frequency);

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

  release(note) {
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
      this._dispatch("frequencyChange", frequency);
      this.oscillators.forEach((oscillator) => {
        oscillator.frequency.linearRampToValueAtTime(
          frequency,
          this.audioContext.currentTime + this.oscillatorGlide
        );
      });
    }
  }
}

class LowPassFilter extends EventTarget {
  constructor(audioContext) {
    super();
    this.audioContext = audioContext;
    this.filterCutoff = 1000;
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.setValueAtTime(
      this.filterCutoff,
      this.audioContext.currentTime
    );
    this.filter.gain.setValueAtTime(25, audioContext.currentTime);
    // this.filter.connect(output);

    this.envelopeFilterOffset = 0;
    this.envelopeFrequencyOffset = 5000;

    this.envelope = createEnvelope({
      audioContext,
      param: this.filter.frequency,
      initialDecay: 200,
      initialFilterAmount: 200,
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

  _dispatch(eventName, value) {
    const event = new CustomEvent(eventName, { detail: value });
    this.dispatchEvent(event);
  }

  attack() {
    this.envelope.attack();
  }

  release() {}

  setCutoff(value) {
    const easedValue = exponetialEase(value);
    const minFreq = 0;
    const maxFreq = 20000;
    const freq = minFreq + (maxFreq - minFreq) * easedValue;

    this._dispatch("filterCutoffChange", value);

    this.filterCutoff = freq;
    this.filter.frequency.setValueAtTime(
      freq + this.envelopeFilterOffset,
      this.audioContext.currentTime
    );
  }

  setResonance(value) {
    const resonance = value * 25;

    this._dispatch("filterResonanceChange", value);
    this.filter.Q.setValueAtTime(resonance, this.audioContext.currentTime);
  }

  setEnvelopeDecay(value) {
    this._dispatch("filterEnvelopeDecayChange", value);
    const ms = value * 1000;
    this.envelope.setDecay(ms);
  }

  setEnvelopeAmount(value) {
    this._dispatch("filterEnvelopeAmountChange", value);
    const offset = value * 10000 - 5000;
    console.log("offset", offset);
    this.envelopeFrequencyOffset = offset;
  }
}

class LFO extends EventTarget {
  constructor(audioContext, oscillator, lowpassFilter) {
    super();
    this.audioContext = audioContext;
    this.oscillator = oscillator;

    this.lfo = this.audioContext.createOscillator();
    this.lfo.type = "triangle";
    this.lfo.frequency.setValueAtTime(0, this.audioContext.currentTime);

    this.lfoCutOffGain = this.audioContext.createGain();
    this.lfoCutOffGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.lfo.connect(this.lfoCutOffGain);
    this.lfoCutOffGain.connect(lowpassFilter.frequency);

    // this.lfoResonanceGain = this.audioContext.createGain();
    // this.lfoResonanceGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    // this.lfo.connect(this.lfoResonanceGain);
    // this.lfoResonanceGain.connect(this.filter.Q);

    // this.lfoOscillatorGain = this.audioContext.createGain();
    // this.lfoResonanceGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    // this.lfo.connect(this.lfoOscillatorGain);
    // this.lfoOscillatorGain.connect(this.gainNodes[0].gain);
    // this.lfoOscillatorGain.connect(this.gainNodes[1].gain);

    this.lfo.start();
  }

  _dispatch(eventName, value) {
    const event = new CustomEvent(eventName, { detail: value });
    this.dispatchEvent(event);
  }

  setFrequency(value) {
    this._dispatch("LFOFrequencyChange", value);
    const frequency = value * 50;
    this.lfo.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
  }

  setCutoffGain(value) {
    const gain = value * 1000;
    this._dispatch("LFOCutoffGainChange", value);
    this.lfoCutOffGain.gain.setValueAtTime(gain, this.audioContext.currentTime);
  }
}

class SmorSynth extends EventTarget {
  constructor(audioContext) {
    super();

    this.oscillator = new Oscillator(audioContext);
    this.lowpassFilter = new LowPassFilter(audioContext);
    this.lfo = new LFO(
      audioContext,
      this.oscillator,
      this.lowpassFilter.filter
    );

    this.oscillator.connect(this.lowpassFilter.filter);
  }

  attack(MIDINote) {
    this.oscillator.attack(MIDINote);
    this.lowpassFilter.attack(MIDINote);
  }
  release(MIDINote) {
    this.oscillator.release(MIDINote);
    this.lowpassFilter.release(MIDINote);
  }

  connect(output) {
    this.lowpassFilter.filter.connect(output);
  }
}

function init() {
  const audioContext = new window.AudioContext({ sampleRate: 44100 });
  const synth = new SmorSynth(audioContext);

  synth.connect(audioContext.destination);
  const { analyser, setFrequency } = createOscilloscope(
    audioContext,
    document.getElementById("oscilloscope")
  );

  synth.connect(analyser);

  const { analyser: oscillatorAnalyser, setFrequency: setOscillatorAnalyser } =
    createOscilloscope(
      audioContext,
      document.getElementById("oscillator-canvas")
    );
  synth.oscillator.connect(oscillatorAnalyser);

  synth.oscillator.addEventListener("frequencyChange", (event) => {
    setFrequency(event.detail);
    setOscillatorAnalyser(event.detail);
  });

  drawFilterReponse(
    document.getElementById("filter-response"),
    synth.lowpassFilter.filter
  );

  function createKnobMapping({ inputId, synthObject, method, changeEvent }) {
    return {
      inputId,
      synthObject,
      method,
      changeEvent,
    };
  }
  const knobMappings = [
    createKnobMapping({
      inputId: "oscillator-mix",
      synthObject: synth.oscillator,
      method: "setOscillatorMix",
      changeEvent: "oscillatorMixChange",
    }),

    createKnobMapping({
      inputId: "oscillator-detune",
      synthObject: synth.oscillator,
      method: "setOscillatorDetune",
      changeEvent: "oscillatorDetuneChange",
    }),
    createKnobMapping({
      inputId: "filter-cutoff",
      synthObject: synth.lowpassFilter,
      method: "setCutoff",
      changeEvent: "filterCutoffChange",
    }),
    createKnobMapping({
      inputId: "filter-resonance",
      synthObject: synth.lowpassFilter,
      method: "setResonance",
      changeEvent: "filterResonanceChange",
    }),
    createKnobMapping({
      inputId: "filter-envelope-decay",
      synthObject: synth.lowpassFilter,
      method: "setEnvelopeDecay",
      changeEvent: "filterEnvelopeDecayChange",
    }),
    createKnobMapping({
      inputId: "filter-envelope-amount",
      synthObject: synth.lowpassFilter,
      method: "setEnvelopeAmount",
      changeEvent: "filterEnvelopeAmountChange",
    }),
    createKnobMapping({
      inputId: "lfo-frequency",
      synthObject: synth.lfo,
      method: "setFrequency",
      changeEvent: "LFOFrequencyChange",
    }),
    createKnobMapping({
      inputId: "lfo-cutoff",
      synthObject: synth.lfo,
      method: "setCutoffGain",
      changeEvent: "LFOCutoffGainChange",
    }),
  ];

  for (const knobMapping of knobMappings) {
    const { inputId, synthObject, method, changeEvent } = knobMapping;

    const element = document.getElementById(inputId);
    if (!element) {
      console.log("unable to find knob", id);
      continue;
    }
    element.addEventListener("input", (event) => {
      const value = event.target.value / 100;
      synthObject[method](value);
    });
    synthObject.addEventListener(changeEvent, function (paramChangeEvent) {
      element.value = Math.round(paramChangeEvent.detail * 127);
    });
  }

  function updateSynth(control, value) {
    if (control === 0) {
      synth.oscillator.setOscillatorMix(value / 127);
    } else if (control === 1) {
      synth.oscillator.setOscillatorDetune((value / 127) * 100);
    } else if (control === 2) {
      synth.lowpassFilter.setCutoff(value / 127);
    } else if (control === 3) {
      synth.lowpassFilter.setResonance(value / 127);
    } else if (control === 4) {
      synth.oscillator.setOscillatorGlide(value / 127);
    } else if (control === 5) {
      // synth.setSawDetune((value / 127) * 100);
    } else if (control === 6) {
      synth.lowpassFilter.setEnvelopeDecay(value / 127);
    } else if (control === 7) {
      synth.lowpassFilter.setEnvelopeAmount(value / 127);
    } else if (control === 8) {
      synth.lfo.setFrequency((value / 127) * 40);
    } else if (control === 9) {
      synth.lfo.setLFOCutOffGain((value / 127) * 400);
    } else if (control === 10) {
      synth.lfo.setLFOResonanceGain((value / 127) * 25);
    } else if (control === 11) {
      synth.lfo.setLFOOscillatorGain(value / 127);
    } else {
    }

    // if (control >= 0 && control <= 7) {
    //   document.getElementById(knobMapping[control]).value = Math.round(
    //     (value / 127) * 100
    //   );
    // }
  }
  initMIDI({
    onNoteDown: (note) => {
      synth.attack(note);
    },
    onNoteUp: (note) => {
      synth.release(note);
    },
    onKnobChange: (control, value) => {
      updateSynth(control, value);
    },
    onDrumPad: (_) => {},
  });

  const offset = 0;
  const keymapping = {
    z: 36,
    s: 37,
    x: 38,
    d: 39,
    c: 40,
    v: 41,
    g: 42,
    b: 43,
    h: 44,
    n: 45,
    j: 46,
    m: 47,
    ",": 48,
  };
  document.addEventListener("keydown", (event) => {
    if (keymapping[event.key] && !event.repeat) {
      synth.attack(keymapping[event.key] + offset);
    }
  });
  document.addEventListener("keyup", (event) => {
    if (keymapping[event.key] && !event.repeat) {
      synth.release(keymapping[event.key] + offset);
    }
  });
}

document.addEventListener(
  "keydown",
  () => {
    init();
  },
  { once: true }
);

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

initButton.addEventListener("click", function () {
  init();
  return;
});

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

function createOscilloscope(audioContext, canvas) {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 4096;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const canvasCtx = canvas.getContext("2d");
  let noteFrequency = 440;

  const sampleRate = 44100;

  function draw() {
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
    setFrequency: (newFrequency) => {
      noteFrequency = newFrequency;
    },
  };
}

(async () => {
  const audioContext = new window.AudioContext({ sampleRate: 44100 });
  const { analyser, setFrequency } = createOscilloscope(
    audioContext,
    document.getElementById("testscope")
  );

  const freq = 200;
  setFrequency(freq);

  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
  oscillator.connect(analyser);
  oscillator.start();
})();
