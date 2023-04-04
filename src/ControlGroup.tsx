import { ReactNode } from "react";
import './ControlGroup.css';

export default function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="control-group">
      <h3>{label}</h3>
      {children}
    </div>
  );
}
