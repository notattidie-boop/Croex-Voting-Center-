import React, { useMemo } from 'react';
import { toWazehStylish, toNormalText, isAlreadyWazeh } from '../utils/stylishText';
import { Sparkles, RotateCcw, CheckCircle2 } from 'lucide-react';

interface StylishTextPickerProps {
  currentText: string;
  onSelectStyle: (newText: string) => void;
  label?: string;
}

export const StylishTextPicker: React.FC<StylishTextPickerProps> = ({
  currentText,
  onSelectStyle,
  label = 'واضح اسٹائل (Wazeh Style)',
}) => {
  const trimmed = (currentText || '').trim();

  const isStyled = useMemo(() => {
    return isAlreadyWazeh(trimmed);
  }, [trimmed]);

  const wazehPreview = useMemo(() => {
    if (!trimmed) return '';
    return isStyled ? trimmed : toWazehStylish(trimmed);
  }, [trimmed, isStyled]);

  // If input is empty, render nothing so UI stays uncluttered
  if (!trimmed) {
    return null;
  }

  const handleApplyWazeh = () => {
    const styled = toWazehStylish(trimmed);
    onSelectStyle(styled);
  };

  const handleRevertNormal = () => {
    const normal = toNormalText(trimmed);
    onSelectStyle(normal);
  };

  return (
    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 p-2 bg-indigo-50/70 border border-indigo-200/80 rounded-xl transition-all">
      <div className="flex items-center gap-1.5 min-w-0">
        {isStyled ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>واضح اسٹائل فعال ہے</span>
          </span>
        ) : (
          <span className="text-[11px] font-medium text-indigo-950 flex items-center gap-1">
            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
              {label}:
            </span>
            <span className="font-bold text-indigo-900 truncate max-w-[180px] sm:max-w-[260px] bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-2xs">
              {wazehPreview}
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!isStyled ? (
          <button
            type="button"
            onClick={handleApplyWazeh}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Aik click me text ko saaf aur wazeh banayein"
          >
            <Sparkles className="w-3 h-3 text-indigo-200" />
            <span>Wazeh Look Apply Karein</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRevertNormal}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition active:scale-95"
            title="Wapas aam text par convert karein"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Normal Text</span>
          </button>
        )}
      </div>
    </div>
  );
};
