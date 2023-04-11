import "./RadioButton.css";
export function RadioButton({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
      <label className="radiobutton">
        {label}
        <input type="radio" checked={checked} onChange={onChange} />
      </label>
  );
}
