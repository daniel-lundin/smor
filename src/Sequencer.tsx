import { useEffect, useState } from "react";
import ControlGroup from "./ControlGroup";
import { SmorSynth } from "./Smor";
import "./Sequencer.css";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sequences = [
  [36, 39, 43, 48, 51, 48, 43, 39],
  [36, 43, 39, 48, 36, 51],
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
    <ControlGroup label="SEQUENCES">
      {sequences.map((_, index) => (
          <label key={index} className="sequence-label" htmlFor={`sequence-${index}`}>
            {index + 1}
            <input
              type="radio"
              id={`sequence-${index}`}
              name="sequence"
              checked={index === selectedSequence}
              onChange={() => setSelectedSequence(index)}
            />
          </label>
      ))}
      <button onClick={toggle}>{isPlaying ? "STOP" : "PLAY"}</button>
    </ControlGroup>
  );
}
