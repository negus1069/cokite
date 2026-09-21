interface Props {
  value: string; // 'YYYY-MM-DD'
  onChange: (v: string) => void;
  min: string;
  max: string;
}

export default function DatePicker({ value, onChange, min, max }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-slate-400">Date</label>
      <input
        type="date"
        className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
