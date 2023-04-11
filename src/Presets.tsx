import { useState } from "react";
import { RadioButton } from "./RadioButton";
import { ParameterType, SmorSynth } from "./Smor";

const presets = [
  [
    [ParameterType.OSCILLATOR_MIX, 0.7],
    [ParameterType.OSCILLATOR_DETUNE, 0.05],
    [ParameterType.OSCILLATOR_COARSE, 0],
    [ParameterType.FILTER_CUTOFF, 0.45],
    [ParameterType.FILTER_RESONANCE, 0.6],
    [ParameterType.FILTER_CONTOUR, 0],
    [ParameterType.FILTER_ENVELOPE_ATTACK, 0],
    [ParameterType.FILTER_ENVELOPE_DECAY, 0],
    [ParameterType.FILTER_ENVELOPE_SUSTAIN, 0],
  ],
  [
    [ParameterType.OSCILLATOR_MIX, 0.7],
    [ParameterType.OSCILLATOR_DETUNE, 0.05],
    [ParameterType.OSCILLATOR_COARSE, 0],
    [ParameterType.FILTER_CUTOFF, 0.3],
    [ParameterType.FILTER_RESONANCE, 0.6],
    [ParameterType.FILTER_CONTOUR, 0.2],
    [ParameterType.FILTER_ENVELOPE_ATTACK, 0],
    [ParameterType.FILTER_ENVELOPE_DECAY, 0.4],
    [ParameterType.FILTER_ENVELOPE_SUSTAIN, 0],
  ],
  [
    [ParameterType.OSCILLATOR_MIX, 0.4],
    [ParameterType.OSCILLATOR_DETUNE, 0],
    [ParameterType.OSCILLATOR_COARSE, 1],
    [ParameterType.FILTER_CUTOFF, 0.7],
    [ParameterType.FILTER_RESONANCE, 0.2],
    [ParameterType.FILTER_CONTOUR, 0.2],
    [ParameterType.FILTER_ENVELOPE_ATTACK, 0.3],
    [ParameterType.FILTER_ENVELOPE_DECAY, 0.2],
    [ParameterType.FILTER_ENVELOPE_SUSTAIN, 0],
  ],
  [
    [ParameterType.OSCILLATOR_MIX, 0.3],
    [ParameterType.OSCILLATOR_DETUNE, 0],
    [ParameterType.OSCILLATOR_COARSE, 1],
    [ParameterType.FILTER_CUTOFF, 0.4],
    [ParameterType.FILTER_RESONANCE, 0.4],
    [ParameterType.FILTER_CONTOUR, 0.9],
    [ParameterType.FILTER_ENVELOPE_ATTACK, 0.0],
    [ParameterType.FILTER_ENVELOPE_DECAY, 0.1],
    [ParameterType.FILTER_ENVELOPE_SUSTAIN, 0.2],
  ],
];
export default function Presets({ smor }: { smor: SmorSynth }) {
  const [selectedPreset, setSelectedPreset] = useState(0);

  function handlePresetChange(index: number) {
      const preset = presets[index]
      for (const parameter of preset) {
          const [type, value] = parameter;
          smor.parameters[type as ParameterType](value as number);
      }
      setSelectedPreset(index);
  }

  return (
    <>
    {presets.map((_, index) => (
      <RadioButton
      key={index}
        onChange={() => handlePresetChange(index)}
        checked={selectedPreset === index}
        label={`${index+1}`}
      />))}
    </>
  );
}
