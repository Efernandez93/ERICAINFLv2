import React from 'react';
import { ParlayLeg } from '../types';
import { TrendingUp, ShieldAlert, PlusCircle, CheckCircle2 } from 'lucide-react';

interface LegCardProps {
  leg: ParlayLeg;
  onTogglePin?: (leg: ParlayLeg) => void;
  isPinned?: boolean;
}

const LegCard: React.FC<LegCardProps> = ({ leg, onTogglePin, isPinned = false }) => {
  const isHighConfidence = leg.confidence >= 80;
  const isMediumConfidence = leg.confidence >= 60 && leg.confidence < 80;
  
  const borderColor = isPinned 
    ? 'border-indigo-500 ring-1 ring-indigo-500' 
    : isHighConfidence 
        ? 'border-emerald-500' 
        : isMediumConfidence ? 'border-yellow-500' : 'border-slate-700';

  const shadowColor = isHighConfidence && !isPinned ? 'shadow-emerald-900/20' : 'shadow-none';

  return (
    <div className={`bg-slate-800 rounded-xl border ${borderColor} p-5 shadow-lg ${shadowColor} mb-4 transition-all hover:bg-slate-800/80 relative group`}>
      
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {leg.player} <span className="text-sm font-normal text-slate-400">({leg.position} • {leg.team})</span>
          </h3>
          <p className="text-emerald-400 font-mono font-bold text-lg mt-1">
            {leg.propType} <span className="text-white">Over {leg.line}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
             <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${isHighConfidence ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {leg.confidence}% Conf
            </div>
            {onTogglePin && (
                <button 
                    onClick={() => onTogglePin(leg)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        isPinned 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                >
                    {isPinned ? (
                        <><CheckCircle2 size={14} /> Added</>
                    ) : (
                        <><PlusCircle size={14} /> Add to Parlay</>
                    )}
                </button>
            )}
        </div>
      </div>

      {/* Stats Visualization */}
      <div className="bg-slate-900/50 rounded-lg p-3 mb-4 grid grid-cols-2 gap-4">
        <div className="flex flex-col">
            <span className="text-xs text-slate-400 mb-1 flex items-center gap-1"><TrendingUp size={12} /> Season Avg</span>
            <span className="text-lg font-semibold text-white">{leg.playerAvg}</span>
        </div>
        <div className="flex flex-col border-l border-slate-700 pl-4">
            <span className="text-xs text-slate-400 mb-1 flex items-center gap-1"><ShieldAlert size={12} /> Defense Allows</span>
            <span className="text-lg font-semibold text-white">{leg.defenseAllowedVsPos}</span>
        </div>
      </div>

      <p className="text-slate-300 text-sm leading-relaxed">
        <span className="text-slate-500 font-bold mr-2">AI ANALYSIS:</span>
        {leg.reasoning}
      </p>
    </div>
  );
};

export default LegCard;