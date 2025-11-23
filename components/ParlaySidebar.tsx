import React from 'react';
import { ParlayLeg } from '../types';
import { Trash2, Receipt, ExternalLink } from 'lucide-react';

interface ParlaySidebarProps {
  legs: ParlayLeg[];
  onRemoveLeg: (id: string) => void;
}

const ParlaySidebar: React.FC<ParlaySidebarProps> = ({ legs, onRemoveLeg }) => {
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
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800 w-full lg:w-80 sticky top-0">
      <div className="p-4 border-b border-slate-800 bg-slate-900 z-10">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Receipt className="text-indigo-500" size={20} />
          My Parlay
        </h2>
        <p className="text-xs text-slate-500 mt-1">{legs.length} legs selected</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {legs.length === 0 ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-500 text-sm mb-2">Your slip is empty</p>
            <p className="text-xs text-slate-600">Browse matchups and pin high-confidence legs here.</p>
          </div>
        ) : (
          legs.map((leg) => (
            <div key={leg.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700 relative group animate-fade-in">
              <button 
                onClick={() => onRemoveLeg(leg.id!)}
                className="absolute top-2 right-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
              <div className="pr-4">
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
    </div>
  );
};

export default ParlaySidebar;