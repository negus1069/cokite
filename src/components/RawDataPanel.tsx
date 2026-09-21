interface Props {
  title: string;
  data: unknown;
}

export default function RawDataPanel({ title, data }: Props) {
  return (
    <details className="bg-slate-900 border border-slate-800 rounded p-3 text-xs">
      <summary className="cursor-pointer text-slate-300 select-none">
        📦 Raw JSON — {title}
      </summary>
      <pre className="mt-2 overflow-auto max-h-96 text-slate-400">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}
