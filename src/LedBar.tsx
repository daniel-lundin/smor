import "./LedBar.css";

export default function LedBar({
  value,
  single,
}: {
  value: number;
  single?: boolean;
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
          <div key={index} className={`led-bar__bar ${modifierClass}`}></div>
        );
      })}
    </div>
  );
}
