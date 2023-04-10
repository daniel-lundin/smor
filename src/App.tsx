import { useEffect, useRef, useState } from "react";
import "./App.css";
import ControlGroup from "./ControlGroup";
import LedBar from "./LedBar";
import { drawFrequencyResponse, ParameterType, SmorSynth } from "./Smor";
import SmorLogo from "./SmorLogo";
import { Knob } from "react-rotary-knob";
import { useMidi } from "./MIDIControl";

function Parameter({
  label,
  parameterValue,
  selectedControl,
  single,
}: {
  label: string;
  parameterValue: number;
  selectedControl: string;
  single?: boolean;
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
        {label}
      </label>
      <LedBar value={parameterValue} single={single}/>
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
  // ["FEEDBACK", ParameterType.FILTER_FEEDBACK],
  ["ATTACK", ParameterType.FILTER_ENVELOPE_ATTACK],
  ["DECAY", ParameterType.FILTER_ENVELOPE_DECAY],
  // ["ENV AMOUNT", ParameterType.FILTER_ENVELOPE_AMOUNT],
  ["ENERGY", ParameterType.FILTER_ENVELOPE_ENERGY],
  ["STIFFNESS", ParameterType.FILTER_ENVELOPE_STIFFNESS],
  ["DAMPING", ParameterType.FILTER_ENVELOPE_DAMPING],
  ["FREQUENCY", ParameterType.LFO_FREQUENCY],
  ["FILTER", ParameterType.LFO_CUTOFF_GAIN],
];

function App({ smor }: { smor: SmorSynth }) {
  const [parameters, setParameters] = useState<Record<ParameterType, number>>(
    {}
  );

  const [selectedControl, setSelectedControl] = useState<number>(0);

  function handleParameterKnobChange(value: number) {
    const control = Math.floor((value / 100) * controls.length);
    setSelectedControl(control);
  }

  function handleParameterValueChange(value: number) {
    const currentParameter = controls[selectedControl][1] as ParameterType;
    smor.parameters[currentParameter](value / 100);
  }

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
      <FrequencyMeter smor={smor}/>
      <div className="smor">
        <div className="smor__row">
          <div>
            <ControlGroup label="OSC">
              <Parameter
                label="OSC SHAPE"
                parameterValue={parameters[ParameterType.OSCILLATOR_MIX]}
                selectedControl={controls[selectedControl][0] as string}
              />
              <Parameter
                label="DETUNE"
                parameterValue={parameters[ParameterType.OSCILLATOR_DETUNE]}
                selectedControl={controls[selectedControl][0] as string}
                single
              />
              <Parameter
                label="COARSE"
                parameterValue={parameters[ParameterType.OSCILLATOR_COARSE]}
                selectedControl={controls[selectedControl][0] as string}
                single
              />
            </ControlGroup>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SmorLogo />
          </div>
        </div>
        <div className="smor__row">
          <div>
            <ControlGroup label="FILTER">
              <Parameter
                label="CUTOFF"
                parameterValue={parameters[ParameterType.FILTER_CUTOFF]}
                selectedControl={controls[selectedControl][0] as string}
              />
              <Parameter
                label="RESONANCE"
                parameterValue={parameters[ParameterType.FILTER_RESONANCE]}
                selectedControl={controls[selectedControl][0] as string}
              />
              <Parameter
                label="CONTOUR"
                parameterValue={parameters[ParameterType.FILTER_CONTOUR]}
                selectedControl={controls[selectedControl][0] as string}
              />
            </ControlGroup>
          </div>
          <div>
            <ControlGroup label="PRESETS">
              <button className="preset-button">1</button>
              <button className="preset-button">2</button>
              <button className="preset-button">3</button>
              <button className="preset-button">4</button>
            </ControlGroup>
          </div>
        </div>
        <div className="smor__row">
          <div>
            <ControlGroup label="ENVELOPE">
              <Parameter
                label="ATTACK"
                parameterValue={
                  parameters[ParameterType.FILTER_ENVELOPE_ATTACK]
                }
                selectedControl={controls[selectedControl][0] as string}
              />
              <Parameter
                label="DECAY"
                parameterValue={
                  parameters[ParameterType.FILTER_ENVELOPE_DECAY]
                }
                selectedControl={controls[selectedControl][0] as string}
              />
            </ControlGroup>
          </div>
          <div>
            <div className="knobs">
              <Knob
                className="knobs__inner"
                min={0}
                max={100}
                onChange={handleParameterKnobChange}
              />
              <Knob
                className="knobs__outer"
                min={0}
                max={100}
                onChange={handleParameterValueChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FrequencyMeter({ smor }: { smor: SmorSynth }) {
  const canvas = useRef(null);

  useEffect(() => {
    const { analyser, stop } = drawFrequencyResponse(
      canvas.current,
      smor.audioContext
    );

    smor.lowpassFilter.filter.connect(analyser);

    return () => stop();
  }, [smor]);

  return <canvas ref={canvas}></canvas>;
}

function useKeyboard(smor: SmorSynth) {
  useEffect(() => {
    let down = false;
    function keydownHandler(event: KeyboardEvent) {
      if (down) return;

      if (event.key === "z") {
        smor.attack(31);
      }
      down = true;
    }
    function keyupnHandler(event: KeyboardEvent) {
      if (event.key === "z") {
        smor.release(31);
      }
      down = false;
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
