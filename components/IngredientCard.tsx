
import React from 'react';

interface IngredientCardProps {
  name: string;
  amount: number;
  unit: string;
  decimals?: number;
}

export const IngredientCard: React.FC<IngredientCardProps> = ({ name, amount, unit, decimals = 1 }) => {
  const isKg = amount >= 1000 && unit === 'g';
  
  // Se for KG, mostramos 2 decimais para precisão (ex: 1,25 kg)
  // Se for G, respeitamos a propriedade decimals passada
  const formatted = isKg 
    ? (amount / 1000).toFixed(2).replace('.', ',') 
    : decimals === 0 
      ? Math.round(amount).toString() 
      : amount.toFixed(decimals).replace('.', ',');

  const displayUnit = isKg ? 'kg' : unit;

  return (
    <div className="flex flex-col p-6 bg-[#1d263b] text-[#edece3] rounded-sm shadow-md">
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3 opacity-60">{name}</span>
      <div className="text-3xl font-serif font-black flex items-baseline gap-1">
        {formatted}
        <span className="text-xs font-sans font-medium opacity-40 uppercase">{displayUnit}</span>
      </div>
    </div>
  );
};
