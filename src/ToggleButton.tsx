import { ReactNode } from "react";

import "./ToggleButton.css";

export default function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`togglebutton ${active ? "togglebutton--active" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
