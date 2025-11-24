import React, { useState } from 'react';
import { ParlayLeg } from '../types';
import { Trash2, Receipt, ExternalLink, ChevronDown, ChevronUp, X } from 'lucide-react';

interface ParlaySidebarProps {
  legs: ParlayLeg[];
  onRemoveLeg: (id: string) => void;
  onClose?: () => void;
}

const ParlaySidebar: React.FC<ParlaySidebarProps> = ({ legs, onRemoveLeg, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  // Simple mock odds calculation (not real betting math, but effective for UI demo)
  // Assuming -110 for each leg for simplicity in a parlay multiplier
  const calculateOdds = (count: number) => {
    if (count === 0) return "+0";
    if (count === 1) return "-110";
    // Rough parlay multiplier approximation
    const multipliers = [2.6, 6.0, 12.0, 24.0, 45.0];
    const mult = multipliers[Math.min(count, 5) - 2] || Math.pow(2, count);
    return `+${Math.floor((mult - 1) * 100)}`;
  };

  const openSportsbook = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 w-full sticky top-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 z-10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 hover:bg-slate-900/50 transition-colors rounded"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="text-indigo-500" size={20} />
              My Parlay
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/30 text-indigo-300">
              {legs.length}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp size={16} className="text-slate-400 ml-auto" />
          ) : (
            <ChevronDown size={16} className="text-slate-400 ml-auto" />
          )}
        </button>
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
          title="Close My Parlay panel"
        >
          <X size={16} />
        </button>
      </div>

      {isExpanded && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {legs.length === 0 ? (
              <div className="text-center py-10 px-4 border-2 border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-500 text-sm mb-2">Your slip is empty</p>
                <p className="text-xs text-slate-600">Browse matchups and pin high-confidence legs here.</p>
              </div>
            ) : (
              legs.map((leg) => (
                <div key={leg.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700 relative group animate-fade-in">
                  {leg.isSafeLeg && (
                    <div className="absolute top-1 left-1 text-[8px] font-bold text-amber-400 bg-amber-900/40 px-1.5 py-0.5 rounded border border-amber-700/50">
                      SAFE LEG
                    </div>
                  )}
                  <button
                    onClick={() => onRemoveLeg(leg.id!)}
                    className="absolute top-2 right-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className={`pr-4 ${leg.isSafeLeg ? 'pt-2' : ''}`}>
                    <div className="font-bold text-white text-sm">{leg.player}</div>
                    <div className="text-xs text-indigo-400 font-mono mt-0.5">{leg.propType} &gt; {leg.line}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{leg.team} • {leg.confidence}% Conf</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {legs.length > 0 && (
            <div className="p-4 bg-slate-800 border-t border-slate-700 space-y-3">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-400">Est. Odds</span>
                    <span className="text-xl font-mono font-bold text-emerald-400">{calculateOdds(legs.length)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => openSportsbook('https://sportsbook.fanduel.com/navigation/nfl')}
                        className="bg-sky-500 hover:bg-sky-400 text-white py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors shadow-lg shadow-sky-900/20"
                    >
                        FanDuel <ExternalLink size={12} />
                    </button>
                    <button
                        onClick={() => openSportsbook('https://sportsbook.draftkings.com/leagues/football/nfl')}
                        className="bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors shadow-lg shadow-green-900/20"
                    >
                        DraftKings <ExternalLink size={12} />
                    </button>
                </div>
                <p className="text-[10px] text-slate-600 text-center leading-tight">
                    Direct bet placement via API is restricted. Links open sportsbook to build manually.
                </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ParlaySidebar;