
import React from 'react';

interface IngredientCardProps {
  name: string;
  amount: number;
  unit: string;
}

export const IngredientCard: React.FC<IngredientCardProps> = ({ name, amount, unit }) => {
  const formatted = amount >= 1000 ? (amount / 1000).toFixed(2) : Math.round(amount * 10) / 10;
  const displayUnit = amount >= 1000 && unit === 'g' ? 'kg' : unit;

  return (
    <div className="flex flex-col p-6 bg-[#1d263b] text-[#edece3] rounded-sm">
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3 opacity-60">{name}</span>
      <div className="text-3xl font-serif font-black flex items-baseline gap-1">
        {formatted}
        <span className="text-xs font-sans font-medium opacity-40 uppercase">{displayUnit}</span>
      </div>
    </div>
  );
};
