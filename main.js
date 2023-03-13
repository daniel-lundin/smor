const initButton = document.getElementById("init");

function exponetialEase(value) {
  return Math.pow(2, 10 * value - 10);
}

function createOscillator(audioContext, frequency, type = "sawtooth") {
  const oscillator = audioContext.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); // value in hertz

  return oscillator;
}

function createEnvelope({ initialDecay, onValueChange }) {
  let decay = initialDecay;
  return {
    setDecay(updatedDecay) {
      decay = updatedDecay;
    },

    attack() {
      if (decay === 0) return;
      let value = 1;

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

function createMonoSynth(audioContext, output) {
  let oscillators = null;

  let filterCutoff = 1000;
  let filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterCutoff, audioContext.currentTime);
  filter.gain.setValueAtTime(25, audioContext.currentTime);
  filter.connect(output);

  drawFilterReponse(document.getElementById("filter-response"), filter);

  let envelopeFilterOffset = 0;
  let envelopeFrequencyOffset = 5000;

  const envelope = createEnvelope({
    initialDecay: 200,
    onValueChange: (value) => {
      envelopeFilterOffset = exponetialEase(value) * envelopeFrequencyOffset;
      filter.frequency.setValueAtTime(
        filterCutoff + envelopeFilterOffset,
        audioContext.currentTime
      );
    },
  });

  let gainNodes = [audioContext.createGain(), audioContext.createGain()];
  gainNodes.forEach((gainNode) => gainNode.connect(filter));

  let keysPressed = [];
  return {
    attack(note) {
      envelope.attack();
      keysPressed.push(note);
      const frequency = MIDINoteToHertz(note);
      if (!oscillators) {
        oscillators = [
          createOscillator(audioContext, frequency, "square"),
          createOscillator(audioContext, frequency, "sawtooth"),
        ];
        oscillators.forEach((oscillator, index) => {
          oscillator.connect(gainNodes[index]);
          oscillator.start();
        });
      } else {
        oscillators.forEach((oscillator) => {
          oscillator.frequency.linearRampToValueAtTime(
            frequency,
            audioContext.currentTime
          );
        });
      }
    },
    release(note) {
      envelope.release();
      keysPressed = keysPressed.filter((key) => key !== note);
      if (keysPressed.length === 0) {
        oscillators?.forEach((oscillator) => oscillator.stop());
        oscillators = null;
      } else {
        oscillators.forEach((oscillator) => {
          oscillator.frequency.linearRampToValueAtTime(
            MIDINoteToHertz(keysPressed.at(-1)),
            audioContext.currentTime
          );
        });
      }
    },
    setSquareAmplitude(value) {
      gainNodes[0].gain.setValueAtTime(value, audioContext.currentTime);
    },
    setSawAmplitude(value) {
      gainNodes[1].gain.setValueAtTime(value, audioContext.currentTime);
    },
    setFilterCutoff(freq) {
      console.log("filter cutoff", freq);
      filterCutoff = freq;
      filter.frequency.setValueAtTime(
        freq + envelopeFilterOffset,
        audioContext.currentTime
      );
    },
    setFilterResonance(value) {
      filter.Q.setValueAtTime(value, audioContext.currentTime);
    },
    setEnvelopeDecay(value) {
      envelope.setDecay(value);
    },
    setEnvelopeFrequencyOffset(freq) {
      envelopeFrequencyOffset = freq;
    },
    getSquareOscillator() {
      return gainNodes[0];
    },
    getSawOscillator() {
      return gainNodes[1];
    },
  };
}

function init() {
  const audioContext = new window.AudioContext();
  const analyser = createOscilloscope(
    audioContext,
    document.getElementById("oscilloscope")
  );

  const synth = createMonoSynth(audioContext, analyser);

  analyser.connect(audioContext.destination);

  // Oscillator analyers
  const squareAnalyser = createOscilloscope(
    audioContext,
    document.getElementById("square-canvas")
  );
  synth.getSquareOscillator().connect(squareAnalyser);
  const sawAnalyser = createOscilloscope(
    audioContext,
    document.getElementById("saw-canvas")
  );
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
  };
  initMIDI({
    onNoteDown: (note) => {
      synth.attack(note);
    },
    onNoteUp: (note) => {
      synth.release(note);
    },
    onKnobChange: (control, value) => {
      if (control === 0) {
        synth.setSquareAmplitude(value / 127);
      }
      if (control === 4) {
        synth.setSawAmplitude(value / 127);
      }
      if (control === 2) {
        const easedValue = exponetialEase(value / 127);
          // console.log('eased value', easedValue, value);
        const minFreq = 0;
        const maxFreq = 20000;
        const freq = minFreq + (maxFreq - minFreq) * easedValue;
        synth.setFilterCutoff(freq);
      }
      if (control === 3) {
        synth.setFilterResonance(25 * (value / 127));
      }
      if (control === 6) {
        synth.setEnvelopeDecay((value / 127) * 1000);
      }
      if (control === 7) {
        synth.setEnvelopeFrequencyOffset((value / 127) * 5000);
      }

      if (control >= 0 && control <= 7) {
        document.getElementById(knobMapping[control]).value = Math.round(
          (value / 127) * 100
        );
      }
    },
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      synth.attack(440);
    }
  });
  document.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      synth.release();
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

function initMIDI({ onNoteUp, onNoteDown, onKnobChange }) {
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
  analyser.getByteTimeDomainData(dataArray);

  const canvasCtx = canvas.getContext("2d");

  function draw() {
    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "#333";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "#F2C94C";
    canvasCtx.shadowColor = "#F2C94C";
    canvasCtx.shadowBlur = 5;

    canvasCtx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }

  draw();
  return analyser;
}
