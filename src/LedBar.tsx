import "./LedBar.css";

export default function LedBar({ value }: { value: number }) {
  return (
    <div className="led-bar">
      {Array.from({ length: 10 }).map((_, index) => {
        let modifierClass = " ";
        if (index < Math.round(value * 10)) {
          modifierClass += "led-bar__bar--on";
        }
        return <div key={index} className={`led-bar__bar ${modifierClass}`}></div>;
      })}
    </div>
  );
}
