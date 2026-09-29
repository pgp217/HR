"use client";

interface BaseProps {
  label: string;
  required?: boolean;
}

export function FieldLabel({ label, required }: BaseProps) {
  return (
    <span className="text-gray-600">
      {label} {required && <span className="text-red-500">*</span>}
    </span>
  );
}

export function TextField({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <FieldLabel label={label} required={required} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

export function SelectField({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = "선택",
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <FieldLabel label={label} required={required} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextAreaField({
  label,
  required,
  value,
  onChange,
  placeholder,
  rows = 3,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <FieldLabel label={label} required={required} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="resize-none rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

export function CheckboxGroupField({
  label,
  required,
  options,
  selected,
  onChange,
}: BaseProps & {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  }
  return (
    <div className="flex flex-col gap-1 text-sm">
      <FieldLabel label={label} required={required} />
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-1.5 text-sm text-gray-700">
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

export function RadioGroupField({
  label,
  required,
  options,
  value,
  onChange,
}: BaseProps & {
  options: (string | number)[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <FieldLabel label={label} required={required} />
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="radio"
              checked={value === String(opt)}
              onChange={() => onChange(String(opt))}
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}
