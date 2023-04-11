import { useEffect, useState } from "react";
import ControlGroup from "./ControlGroup";
import { SmorSynth } from "./Smor";
import "./Sequencer.css";
import { RadioButton } from "./RadioButton";
import ToggleButton from "./ToggleButton";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sequences = [
  [36, 39, 43, 48, 51, 48, 43, 39],
  [36, null, null, 36, 39, 36, 39, 36, 31, null, null, 31, 34, 31, 34, 31],
  [36, 48, 39, 36, 75, 51, 48, 51 ],
];

async function playSequence(
  smor: SmorSynth,
  {
    noteLength,
    sequence,
    abortSignal,
  }: {
    noteLength: number;
    sequence: (number | null)[];
    abortSignal: AbortSignal;
  }
) {
  while (true) {
    for (const note of sequence) {
      if (note) smor.attack(note);
      await sleep(noteLength);
      if (note) smor.release(note);
    if (abortSignal.aborted) return;
    }
    if (abortSignal.aborted) return;
  }
}

export function Sequencer({ smor }: { smor: SmorSynth }) {
  const [isPlaying, setPlaying] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState(0);

  function toggle() {
    setPlaying((playing) => !playing);
  }

  useEffect(() => {
    const abortController = new AbortController();
    if (isPlaying) {
      playSequence(smor, {
        noteLength: 200,
        sequence: sequences[selectedSequence],
        abortSignal: abortController.signal,
      });
    }
    return () => {
      abortController.abort();
    };
  }, [selectedSequence, isPlaying]);

  return (
    <ControlGroup label="SEQUENCER">
      <div className="sequencer">
        <div className="sequencer__sequences">
          {sequences.map((_, index) => (
            <RadioButton
              key={index}
              label={`${index + 1}`}
              checked={index === selectedSequence}
              onChange={() => setSelectedSequence(index)}
            />
          ))}
        </div>
        <ToggleButton active={isPlaying} onClick={toggle}>
          {isPlaying ? "⏸" : "⏵"}
        </ToggleButton>
      </div>
    </ControlGroup>
  );
}
