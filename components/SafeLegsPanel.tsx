import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Shield } from 'lucide-react';
import { TeamRoster, ParlayLeg } from '../types';
import { StatParser } from '../services/statParser';

interface SafeLegsPanelProps {
  homeTeam?: TeamRoster;
  awayTeam?: TeamRoster;
  onAddLeg: (leg: ParlayLeg) => void;
  disabled?: boolean;
}

const SafeLegsPanel: React.FC<SafeLegsPanelProps> = ({
  homeTeam,
  awayTeam,
  onAddLeg,
  disabled = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [customLines, setCustomLines] = useState<{ [key: string]: number }>({});

  // Generate unique key for a leg
  const getLegKey = (player: string, team: string, statName: string): string =>
    `${team}-${player}-${statName}`;

  // Get all safe leg recommendations
  const getSafeLegs = () => {
    const allLegs: any[] = [];

    if (homeTeam) {
      homeTeam.players.forEach(player => {
        const legs = StatParser.getTopSafeLegs(player, homeTeam.teamName, 3);
        allLegs.push(...legs);
      });
    }

    if (awayTeam) {
      awayTeam.players.forEach(player => {
        const legs = StatParser.getTopSafeLegs(player, awayTeam.teamName, 3);
        allLegs.push(...legs);
      });
    }

    // Sort by safety score descending
    return allLegs.sort((a, b) => b.safetyScore - a.safetyScore).slice(0, 15);
  };

  const safeLegs = getSafeLegs();

  const handleAddLeg = (leg: any) => {
    const legKey = getLegKey(leg.player, leg.team, leg.statName);
    const customLine = customLines[legKey] || leg.recommended;

    const parlayLeg: ParlayLeg = {
      id: legKey,
      player: leg.player,
      team: leg.team,
      position: leg.position,
      propType: leg.statName,
      line: customLine,
      confidence: leg.safetyScore,
      reasoning: `Safe leg based on ${leg.average.toFixed(1)} avg (${leg.safetyScore}% consistency)`,
      playerAvg: leg.average,
      defenseAllowedVsPos: '-',
      isSafeLeg: true,
      safetyScore: leg.safetyScore,
      playerMinAvg: leg.min,
      playerMaxAvg: leg.max,
      variance: leg.variance
    };

    onAddLeg(parlayLeg);
  };

  const handleLineChange = (legKey: string, newLine: number) => {
    setCustomLines(prev => ({
      ...prev,
      [legKey]: newLine
    }));
  };

  if (!homeTeam && !awayTeam) {
    return (
      <div className="p-4 text-slate-400 text-sm">
        Load a game to see safe leg recommendations
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 border-b border-slate-800 hover:bg-slate-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-amber-500" />
          <span className="font-bold text-white">Safe Legs</span>
          <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-300">
            {safeLegs.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4">
          {safeLegs.length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-8">
              No safe legs available
            </div>
          ) : (
            <div className="space-y-3">
              {safeLegs.map((leg, idx) => {
                const legKey = getLegKey(leg.player, leg.team, leg.statName);
                const customLine = customLines[legKey] || leg.recommended;

                return (
                  <div
                    key={idx}
                    className="bg-slate-800/30 border border-amber-900/40 rounded-lg p-3 hover:border-amber-700/60 transition-colors"
                  >
                    {/* Team & Player */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-white text-sm">{leg.player}</div>
                        <div className="text-xs text-slate-400">
                          {leg.team} • {leg.position}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-amber-400">
                          {leg.safetyScore}% Safe
                        </div>
                      </div>
                    </div>

                    {/* Stat Type */}
                    <div className="text-xs font-mono text-slate-300 mb-2">
                      {leg.statName}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                      <div className="bg-slate-900/50 rounded p-1.5">
                        <div className="text-slate-400">Avg</div>
                        <div className="font-bold text-white">
                          {leg.average.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded p-1.5">
                        <div className="text-slate-400">Min-Max</div>
                        <div className="font-bold text-white">
                          {leg.min.toFixed(0)}-{leg.max.toFixed(0)}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded p-1.5">
                        <div className="text-slate-400">Variance</div>
                        <div className="font-bold text-white">
                          {leg.variance.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {/* Line Input & Button */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-slate-400 block mb-1">
                          Your Line (Recommended: {leg.recommended.toFixed(1)})
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={customLine}
                          onChange={(e) =>
                            handleLineChange(legKey, parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => handleAddLeg(leg)}
                        disabled={disabled}
                        className="mt-5 px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Plus size={12} />
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SafeLegsPanel;
