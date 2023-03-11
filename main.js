const initButton = document.getElementById("init");

let audioContext;
const kKnobs = Array(8).fill(0);

let currentNote = null;
let keysPressed = [];

function slideDuration() {
  return kKnobs[7] / 127;
}

function lowshelfFrequency() {
  return (kKnobs[6] / 127) * 20000;
}

function Q() {
  return (kKnobs[5] / 127) * 10;
}

function createOscillator(audioContext, frequency, type = "sawtooth") {
  const oscillator = audioContext.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); // value in hertz

  return oscillator;
}

function createMonoSynth(audioContext, output) {
  let oscillators = null;

  let filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1000, audioContext.currentTime);
  filter.gain.setValueAtTime(25, audioContext.currentTime);
  filter.connect(output);

  drawFilterReponse(document.getElementById("filter-response"), filter);

  let gainNodes = [audioContext.createGain(), audioContext.createGain()];
  gainNodes.forEach((gainNode) => gainNode.connect(filter));

  let keysPressed = [];
  return {
    attack(note) {
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
            audioContext.currentTime + 0.3
          );
        });
      }
    },
    release(note) {
      keysPressed = keysPressed.filter((key) => key !== note);
      if (keysPressed.length === 0) {
        oscillators?.forEach((oscillator) => oscillator.stop());
        oscillators = null;
      } else {
        oscillators.forEach((oscillator) => {
          oscillator.frequency.linearRampToValueAtTime(
            MIDINoteToHertz(keysPressed.at(-1)),
            audioContext.currentTime + 0.3
          );
        });
      }
    },
    onKnobChange(control, value) {
      if (control === 0) {
        gainNodes[0].gain.setValueAtTime(value / 127, audioContext.currentTime);
      }
      if (control === 1) {
        gainNodes[1].gain.setValueAtTime(value / 127, audioContext.currentTime);
      }
      if (control === 2) {

        const easedValue =  Math.pow(2, 10 * (value / 127) - 10);
        const minFreq = 10;
        const maxFreq = 20000;
        const freq = minFreq + (maxFreq - minFreq) * (easedValue);
        filter.frequency.setValueAtTime(freq, audioContext.currentTime);
      }
      if (control === 3) {
        filter.Q.setValueAtTime(25 * (value / 127), audioContext.currentTime);
      }
    },
  };
}

function init() {
  const audioContext = new window.AudioContext();
  const analyser = createOscilloscope(audioContext);

  const synth = createMonoSynth(audioContext, analyser);
  analyser.connect(audioContext.destination);

  initMIDI({
    onNoteDown: (note) => {
      synth.attack(note);
    },
    onNoteUp: (note) => {
      synth.release(note);
    },
    onKnobChange: (control, value) => {
      synth.onKnobChange(control, value);
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
      minFrequency + i * (maxFrequency - minFrequency) / frequencySteps;
  }

  const canvasCtx = canvas.getContext("2d");

  function draw() {
    filter.getFrequencyResponse(
      frequencyArray,
      magResponseOutput,
      phaseResponseOutput
    );
    requestAnimationFrame(draw);

    canvasCtx.fillStyle = "rgb(200, 200, 200)";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(0, 200, 0)";

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

function createOscilloscope(audioContext) {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  // Connect the source to be analysed
  // inputNode.connect(analyser);

  // Get a canvas defined with ID "oscilloscope"
  const canvas = document.getElementById("oscilloscope");
  const canvasCtx = canvas.getContext("2d");

  // draw an oscilloscope of the current audio source

  function draw() {
    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "rgb(200, 200, 200)";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(0, 200, 0)";

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
