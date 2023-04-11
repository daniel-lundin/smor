import { useEffect, useRef, useState } from "react";
import "./App.css";
import ControlGroup from "./ControlGroup";
import LedBar from "./LedBar";
import {
  createOscilloscope,
  drawFrequencyResponse,
  ParameterType,
  SmorSynth,
} from "./Smor";
import SmorLogo from "./SmorLogo";
import { useMidi } from "./MIDIControl";
import { Sequencer } from "./Sequencer";
import Presets from "./Presets";

function Parameter({
  label,
  parameterValue,
  selectedControl,
  single,
  onChange,
}: {
  label: string;
  parameterValue: number;
  selectedControl: string;
  single?: boolean;
  onChange: (arg0: number) => void;
}) {
  return (
    <div className="parameter">
      <label>
        <input
          name="parameter"
          type="radio"
          checked={label === selectedControl}
          readOnly
        />
        <div>
          <div className="parameter__name">{label}</div>
          <LedBar value={parameterValue} single={single} onChange={onChange} />
        </div>
      </label>
    </div>
  );
}

const controls = [
  ["OSC SHAPE", ParameterType.OSCILLATOR_MIX],
  ["DETUNE", ParameterType.OSCILLATOR_DETUNE],
  ["COARSE", ParameterType.OSCILLATOR_COARSE],
  ["CUTOFF", ParameterType.FILTER_CUTOFF],
  ["RESONANCE", ParameterType.FILTER_RESONANCE],
  ["CONTOUR", ParameterType.FILTER_CONTOUR],
  ["ATTACK", ParameterType.FILTER_ENVELOPE_ATTACK],
  ["DECAY", ParameterType.FILTER_ENVELOPE_DECAY],
  ["ENERGY", ParameterType.FILTER_ENVELOPE_ENERGY],
  ["STIFFNESS", ParameterType.FILTER_ENVELOPE_STIFFNESS],
  ["DAMPING", ParameterType.FILTER_ENVELOPE_DAMPING],
  ["FREQUENCY", ParameterType.LFO_FREQUENCY],
  ["FILTER", ParameterType.LFO_CUTOFF_GAIN],
];

function App({ smor }: { smor: SmorSynth }) {
  const [parameters, setParameters] = useState<{ [key: number]: number }>({});

  const [selectedControl] = useState<number>(0);

  useMidi({
    onKnobChange: (knob: number, value: number) => {
      const currentParameter = controls[knob][1] as ParameterType;
      const delta = value === 1 ? 0.01 : -0.01;
      const updatedValue = Math.max(
        Math.min((parameters[currentParameter] || 0) + delta, 1),
        0
      );
      smor.parameters[currentParameter](updatedValue);
    },
    onNoteDown: (note: number) => {
      smor.attack(note);
    },
    onNoteUp: (note: number) => {
      smor.release(note);
    },
  });

  useKeyboard(smor);

  useEffect(() => {
    const eventListener = ((event: CustomEvent) => {
      setParameters((currentParams) => {
        return {
          ...currentParams,
          [event.detail.parameterType]: event.detail.value,
        };
      });
    }) as EventListener;

    smor.addEventListener("parameterChange", eventListener);
    smor.notifyParameters();
    return () => smor.removeEventListener("parameterChange", eventListener);
  }, [smor]);

  return (
    <div className="synth">
      <div className="smor">
        <div className="smor__row">
          <div>
            <Sequencer smor={smor} />
          </div>
          <div>
            <ControlGroup label="PRESETS">
              <Presets smor={smor} />
            </ControlGroup>
          </div>
          <SmorLogo />
        </div>
        <div className="smor__row">
          <div>
            <ControlGroup label="OSCILLATORS">
              <Parameter
                label="OSC SHAPE"
                parameterValue={parameters[ParameterType.OSCILLATOR_MIX]}
                selectedControl={controls[selectedControl][0] as string}
                onChange={(value: number) => {
                  smor.parameters[ParameterType.OSCILLATOR_MIX](value / 100);
                }}
              />
              <Parameter
                label="DETUNE"
                parameterValue={parameters[ParameterType.OSCILLATOR_DETUNE]}
                selectedControl={controls[selectedControl][0] as string}
                single
                onChange={(value: number) => {
                  smor.parameters[ParameterType.OSCILLATOR_DETUNE](value / 100);
                }}
              />
              <Parameter
                label="COARSE"
                parameterValue={parameters[ParameterType.OSCILLATOR_COARSE]}
                selectedControl={controls[selectedControl][0] as string}
                single
                onChange={(value: number) => {
                  smor.parameters[ParameterType.OSCILLATOR_COARSE](value / 100);
                }}
              />
            </ControlGroup>
          </div>
          <div>
            <ControlGroup label="FILTER">
              <Parameter
                label="CUTOFF"
                parameterValue={parameters[ParameterType.FILTER_CUTOFF]}
                selectedControl={controls[selectedControl][0] as string}
                onChange={(value: number) => {
                  smor.parameters[ParameterType.FILTER_CUTOFF](value / 100);
                }}
              />
              <Parameter
                label="RESONANCE"
                parameterValue={parameters[ParameterType.FILTER_RESONANCE]}
                selectedControl={controls[selectedControl][0] as string}
                onChange={(value: number) => {
                  smor.parameters[ParameterType.FILTER_RESONANCE](value / 100);
                }}
              />
              <Parameter
                label="CONTOUR"
                parameterValue={parameters[ParameterType.FILTER_CONTOUR]}
                selectedControl={controls[selectedControl][0] as string}
                onChange={(value: number) => {
                  smor.parameters[ParameterType.FILTER_CONTOUR](value / 100);
                }}
              />
            </ControlGroup>
          </div>
          <div>
            <ControlGroup label="ENVELOPE">
              <Parameter
                label="ATTACK"
                parameterValue={
                  parameters[ParameterType.FILTER_ENVELOPE_ATTACK]
                }
                selectedControl={controls[selectedControl][0] as string}
                onChange={(value: number) => {
                  smor.parameters[ParameterType.FILTER_ENVELOPE_ATTACK](
                    value / 100
                  );
                }}
              />
              <Parameter
                label="DECAY"
                parameterValue={parameters[ParameterType.FILTER_ENVELOPE_DECAY]}
                selectedControl={controls[selectedControl][0] as string}
                onChange={(value: number) => {
                  smor.parameters[ParameterType.FILTER_ENVELOPE_DECAY](
                    value / 100
                  );
                }}
              />
              <Parameter
                label="SUSTAIN"
                parameterValue={parameters[ParameterType.FILTER_ENVELOPE_SUSTAIN]}
                selectedControl={controls[selectedControl][0] as string}
                onChange={(value: number) => {
                  smor.parameters[ParameterType.FILTER_ENVELOPE_SUSTAIN](
                    value / 100
                  );
                }}
              />
            </ControlGroup>
          </div>
        </div>
        <div className="smor__row">
          <ControlGroup label="OSCILLOSCOPE">
            <Oscilloscope smor={smor} />
          </ControlGroup >
          <ControlGroup label="FREQUENCIES">
            <FrequencyMeter smor={smor} />
          </ControlGroup>
        </div>
      </div>
    </div>
  );
}

function FrequencyMeter({ smor }: { smor: SmorSynth }) {
  const canvas = useRef(null);

  useEffect(() => {
    if (!canvas.current) return;
    const { analyser, stop } = drawFrequencyResponse(
      canvas.current,
      smor.audioContext
    );

    smor.lowpassFilter.filter.connect(analyser);

    return () => stop();
  }, [smor]);

  return <canvas ref={canvas}></canvas>;
}

function Oscilloscope({ smor }: { smor: SmorSynth }) {
  const canvas = useRef(null);

  useEffect(() => {
    if (!canvas.current) return;
    const { analyser, setFrequency } = createOscilloscope(
      canvas.current,
      smor.audioContext
    );

    smor.oscillator.connect(analyser);
    const eventListener = ((event: CustomEvent) => {
      if (event.detail.parameterType === ParameterType.OSCILLATOR_FREQUENCY) {
        setFrequency(event.detail.value);
      }
    }) as EventListener;

    smor.addEventListener("parameterChange", eventListener);

    return () => {
      smor.removeEventListener("parameterChange", eventListener);
    };
  }, [smor]);

  return <canvas ref={canvas}></canvas>;
}


const keyMapping: Record<string, number> = {
    z: 31,
    s: 32,
    x: 33,
    d: 34,
    c: 35,
    v: 36,
    g: 37,
    b: 38,
    h: 39,
    n: 40,
    j: 41,
    m: 42,
    ',': 43,
}
function useKeyboard(smor: SmorSynth) {
  useEffect(() => {
    function keydownHandler(event: KeyboardEvent) {
      if (event.key in keyMapping) {
        smor.attack(keyMapping[event.key]);
      }
    }
    function keyupnHandler(event: KeyboardEvent) {
      if (event.key in keyMapping) {
        smor.release(keyMapping[event.key]);
      }
    }
    document.addEventListener("keydown", keydownHandler);
    document.addEventListener("keyup", keyupnHandler);
    return () => {
      document.removeEventListener("keyup", keydownHandler);
      document.removeEventListener("keyup", keyupnHandler);
    };
  }, []);
}

export default App;
