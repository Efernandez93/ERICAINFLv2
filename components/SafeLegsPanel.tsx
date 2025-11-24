import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Shield, TrendingUp, X } from 'lucide-react';
import { TeamRoster, ParlayLeg, DefenseStat } from '../types';
import { StatParser } from '../services/statParser';

interface SafeLegsPanelProps {
  homeTeam?: TeamRoster;
  awayTeam?: TeamRoster;
  onAddLeg: (leg: ParlayLeg) => void;
  disabled?: boolean;
  defenseStats?: DefenseStat[];
  onClose?: () => void;
}

const SafeLegsPanel: React.FC<SafeLegsPanelProps> = ({
  homeTeam,
  awayTeam,
  onAddLeg,
  disabled = false,
  defenseStats = [],
  onClose
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [customLines, setCustomLines] = useState<{ [key: string]: number }>({});

  // Generate unique key for a leg
  const getLegKey = (player: string, team: string, statName: string): string =>
    `${team}-${player}-${statName}`;

  // Find defense rank for a position
  const getDefenseRankForPosition = (position: string): string | number | undefined => {
    const defStat = defenseStats.find(stat =>
      position.includes(stat.position) || stat.position.includes(position)
    );
    return defStat?.rank;
  };

  // Get all safe leg recommendations
  const getSafeLegs = () => {
    const allLegs: any[] = [];

    if (homeTeam) {
      homeTeam.players.forEach(player => {
        const defenseRank = getDefenseRankForPosition(player.position);
        const legs = StatParser.getTopSafeLegs(player, homeTeam.teamName, 3, defenseRank);
        allLegs.push(...legs);
      });
    }

    if (awayTeam) {
      awayTeam.players.forEach(player => {
        const defenseRank = getDefenseRankForPosition(player.position);
        const legs = StatParser.getTopSafeLegs(player, awayTeam.teamName, 3, defenseRank);
        allLegs.push(...legs);
      });
    }

    // Filter to only show legs with significant defense advantage (>50%)
    const filteredLegs = allLegs.filter(leg => leg.defenseAdvantage > 50);

    // Sort by combined score descending and limit to 5
    return filteredLegs.sort((a, b) => {
      const scoreA = (a.safetyScore * 0.6) + (a.defenseAdvantage * 0.4);
      const scoreB = (b.safetyScore * 0.6) + (b.defenseAdvantage * 0.4);
      return scoreB - scoreA;
    }).slice(0, 5);
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
      reasoning: `Safe leg: ${leg.average.toFixed(1)} avg (${leg.safetyScore}% consistent) vs weak defense (${leg.defenseAdvantage}% advantage)`,
      playerAvg: leg.average,
      defenseAllowedVsPos: leg.defenseAdvantage,
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 hover:bg-slate-900/50 transition-colors"
        >
          <Shield size={16} className="text-amber-500" />
          <span className="font-bold text-white">Safe Legs</span>
          <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-300">
            {safeLegs.length}
          </span>
          {isExpanded ? (
            <ChevronUp size={16} className="text-slate-400 ml-auto" />
          ) : (
            <ChevronDown size={16} className="text-slate-400 ml-auto" />
          )}
        </button>
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
          title="Close Safe Legs panel"
        >
          <X size={16} />
        </button>
      </div>

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
                      <div className="text-right space-y-1">
                        <div className="text-xs font-bold text-amber-400">
                          {leg.safetyScore}% Safe
                        </div>
                        {leg.defenseAdvantage > 0 && (
                          <div className="flex items-center justify-end gap-1 text-xs font-bold text-emerald-400">
                            <Shield size={12} />
                            {leg.defenseAdvantage}% Adv
                          </div>
                        )}
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
