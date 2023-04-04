import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { SmorSynth } from "./Smor";
import { updateRAMPreset } from "./MIDIControl";

document.addEventListener(
  "keydown",
  async () => {
    const audioContext = new AudioContext();
    const smor = new SmorSynth(audioContext);
    smor.connect(audioContext.destination);

    updateRAMPreset();

    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <App smor={smor} />
      </React.StrictMode>
    );
  },
  { once: true }
);
