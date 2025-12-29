
import React from 'react';

interface InputGroupProps {
  label: string;
  value: number;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
}

export const InputGroup: React.FC<InputGroupProps> = ({ 
  label, value, unit, step = 1, min = 0, max = 1000, onChange
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange(val);
    }
  };

  return (
    <div className="flex flex-col py-4 border-b border-navy">
      <div className="flex justify-between items-baseline mb-1">
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
          {label}
        </label>
        <div className="flex items-baseline mono font-semibold">
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            step={step}
            min={min}
            max={max}
            className="bg-transparent border-none text-right w-16 focus:outline-none focus:ring-0 p-0 m-0"
          />
          <span className="text-[10px] ml-0.5 opacity-50 select-none">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
};
