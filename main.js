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

function createEnvelope({
  audioContext,
  param,
  initialDecay,
  initialAttack,
  initialFilterAmount,
  onValueChange,
}) {
  let attack = initialAttack;
  let decay = initialDecay;
  let filterAmount = initialFilterAmount;
  return {
    setDecay(updatedDecay) {
      decay = updatedDecay;
    },
    setAttack(updatedAttack) {
      attack = updatedAttack;
    },
    setFilterAmount(updatedFilterAmount) {
      filterAmount = updatedFilterAmount;
    },

    attack() {
      if (decay === 0 && attack === 0) return;

      param.cancelScheduledValues(audioContext.currentTime);

      param.linearRampToValueAtTime(
        param.value + filterAmount,
        audioContext.currentTime + attack / 1000
      );

      param.linearRampToValueAtTime(
        param.value,
        audioContext.currentTime + attack / 1000 + decay / 1000
      );
    },

    _attack() {
      if (decay === 0 && attack === 0) return;
      let value = 1;

      param.setValue;
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

    release() {
      param.cancelScheduledValues(audioContext.currentTime);
    },
  };
}

const oscillatorTypes = ["sine", "square", "sawtooth", "triangle"];

class SmorSynth extends EventTarget {
  constructor(audioContext, output) {
    super();
    this.oscillators = null;
    this.audioContext = audioContext;
    this.output = output;

    this.filterCutoff = 1000;
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.setValueAtTime(
      this.filterCutoff,
      this.audioContext.currentTime
    );
    this.filter.gain.setValueAtTime(25, audioContext.currentTime);
    this.filter.connect(output);

    drawFilterReponse(document.getElementById("filter-response"), this.filter);

    this.envelopeFilterOffset = 0;
    //this.envelopeFrequencyOffset = 5000;

    this.envelope = createEnvelope({
      audioContext,
      param: this.filter.frequency,
      initialAttack: 200,
      initialDecay: 200,
      initialFilterAmount: 200,
      // onValueChange: (value) => {
      //   this.envelopeFilterOffset =
      //     exponetialEase(value) * this.envelopeFrequencyOffset;
      //   this.filter.frequency.setValueAtTime(
      //     this.filterCutoff + this.envelopeFilterOffset,
      //     this.audioContext.currentTime
      //   );
      // },
    });

    this.gainNodes = [
      this.audioContext.createGain(),
      this.audioContext.createGain(),
    ];
    this.gainNodes.forEach((gainNode) => gainNode.connect(this.filter));
    this.squareDetune = 0;
    this.sawDetune = 0;

    this.keysPressed = [];
  }

  _dispatchFrequencyChange(frequency) {
    const event = new CustomEvent("frequencyChange", { detail: frequency });
    this.dispatchEvent(event);
  }

  attack(note) {
    this.envelope.attack();
    this.keysPressed.push(note);
    const frequency = MIDINoteToHertz(note);
    this._dispatchFrequencyChange(frequency);

    if (!this.oscillators) {
      this.oscillators = [
        createOscillator(
          this.audioContext,
          frequency,
          this.squareDetune,
          "square"
        ),
        createOscillator(
          this.audioContext,
          frequency,
          this.sawDetune,
          "sawtooth"
        ),
      ];
      this.oscillators.forEach((oscillator, index) => {
        oscillator.connect(this.gainNodes[index]);
        oscillator.start();
      });
    } else {
      this.oscillators.forEach((oscillator) => {
        oscillator.frequency.linearRampToValueAtTime(
          frequency,
          this.audioContext.currentTime
        );
      });
    }
  }
  release(note) {
    this.envelope.release();
    this.keysPressed = this.keysPressed.filter((key) => key !== note);
    if (this.keysPressed.length === 0) {
      this.oscillators?.forEach((oscillator) => oscillator.stop());
      this.oscillators = null;
      this.filter.frequency.setValueAtTime(
        this.filterCutoff,
        this.audioContext.currentTime
      );
    } else {
      const frequency = MIDINoteToHertz(this.keysPressed.at(-1));
      this._dispatchFrequencyChange(frequency);
      this.oscillators.forEach((oscillator) => {
        oscillator.frequency.linearRampToValueAtTime(
          frequency,
          this.audioContext.currentTime
        );
      });
    }
  }
  setSquareAmplitude(value) {
    this.gainNodes[0].gain.setValueAtTime(value, this.audioContext.currentTime);
  }

  setSawAmplitude(value) {
    this.gainNodes[1].gain.setValueAtTime(value, this.audioContext.currentTime);
  }

  setFilterCutoff(freq) {
    this.filterCutoff = freq;
    this.filter.frequency.setValueAtTime(
      freq + this.envelopeFilterOffset,
      this.audioContext.currentTime
    );
  }

  setFilterResonance(value) {
    this.filter.Q.setValueAtTime(value, this.audioContext.currentTime);
  }
  setEnvelopeAttack(value) {
    this.envelope.setAttack(value);
  }
  setEnvelopeDecay(value) {
    this.envelope.setDecay(value);
  }
  setEnvelopeFrequencyOffset(freq) {
    this.envelope.setFilterAmount(freq);
    // this.envelopeFrequencyOffset = freq;
  }
  getSquareOscillator() {
    return this.gainNodes[0];
  }
  getSawOscillator() {
    return this.gainNodes[1];
  }
  setSawDetune(cents) {
    this.sawDetune = cents;
    if (this.oscillators)
      this.oscillators[1].detune.setValueAtTime(
        cents,
        this.audioContext.currentTime
      );
  }
  setSquareDetune(cents) {
    this.squareDetune = cents;
    if (this.oscillators)
      this.oscillators[0].detune.setValueAtTime(
        cents,
        this.audioContext.currentTime
      );
  }
}

function init() {
  const audioContext = new window.AudioContext({ sampleRate: 44100 });
  const { analyser, setFrequency } = createOscilloscope(
    audioContext,
    document.getElementById("oscilloscope")
  );
  // Oscillator analyers
  const { analyser: squareAnalyser, setFrequency: setSquareAnalyserFrequency } =
    createOscilloscope(audioContext, document.getElementById("square-canvas"));
  const { analyser: sawAnalyser, setFrequency: setSawAnalyzerFrequency } = createOscilloscope(
    audioContext,
    document.getElementById("saw-canvas")
  );

  const synth = new SmorSynth(audioContext, analyser);

  synth.addEventListener("frequencyChange", (event) => {
    setFrequency(event.detail);
    setSquareAnalyserFrequency(event.detail);
    setSawAnalyzerFrequency(event.detail);
  });

  analyser.connect(audioContext.destination);

  synth.getSquareOscillator().connect(squareAnalyser);
  synth.getSawOscillator().connect(sawAnalyser);

  const knobMapping = {
    0: "square-amplitude",
    1: "square-detune",
    4: "saw-amplitude",
    5: "saw-detune",
    2: "filter-cutoff",
    3: "filter-resonance",
    6: "filter-envelope-decay",
    7: "filter-envelope-amount",
    8: "filter-envelope-attack",
  };

  for (const knob of Object.entries(knobMapping)) {
    const [control, id] = knob;

    document.getElementById(id).addEventListener("input", (event) => {
      updateSynth(Number(control), Number(event.target.value));
    });
  }

  function updateSynth(control, value) {
    if (control === 0) {
      synth.setSquareAmplitude(value / 127);
    } else if (control === 4) {
      synth.setSawAmplitude(value / 127);
    } else if (control === 1) {
      synth.setSquareDetune((value / 127) * 100);
    } else if (control === 5) {
      synth.setSawDetune((value / 127) * 100);
    } else if (control === 2) {
      const easedValue = exponetialEase(value / 127);
      const minFreq = 0;
      const maxFreq = 20000;
      const freq = minFreq + (maxFreq - minFreq) * easedValue;
      synth.setFilterCutoff(freq);
    } else if (control === 3) {
      synth.setFilterResonance(25 * (value / 127));
    } else if (control === 6) {
      synth.setEnvelopeDecay((value / 127) * 1000);
    } else if (control === 8) {
      synth.setEnvelopeAttack((value / 127) * 1000);
    } else if (control === 7) {
      synth.setEnvelopeFrequencyOffset((value / 127) * 5000);
    } else {
    }

    if (control >= 0 && control <= 7) {
      document.getElementById(knobMapping[control]).value = Math.round(
        (value / 127) * 100
      );
    }
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
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const canvasCtx = canvas.getContext("2d");
  let noteFrequency = 440;

  const sampleRate = 44100;

  function draw() {
    const sampleTime = Math.round(audioContext.currentTime * sampleRate);
    const period = Math.round(sampleRate / noteFrequency);
    const offsetX = sampleTime % period;
    const startIndex = period - offsetX;
    const periodsToShow = Math.max(Math.floor(bufferLength / period) - 1, 1);

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
