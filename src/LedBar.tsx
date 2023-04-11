import { ChangeEvent } from "react";
import "./LedBar.css";

export default function LedBar({
  value,
  single,
  onChange,
}: {
  value: number;
  single?: boolean;
  onChange: (arg0: number) => void;
}) {
  return (
    <div className="led-bar">
      {Array.from({ length: 10 }).map((_, index) => {
        let modifierClass = " ";
        if (single) {
          if (index === Math.floor(value * 9)) {
            modifierClass += "led-bar__bar--on";
          }
        } else {
          if (index < Math.round(value * 10)) {
            modifierClass += "led-bar__bar--on";
          }
        }
        return (
          <>
            <div key={index} className={`led-bar__bar ${modifierClass}`}></div>
          </>
        );
      })}
      <input
        className="led-bar__slider"
        type="range"
        min="0"
        max="100"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(Number(event.target.value))
        }
      />
    </div>
  );
}
