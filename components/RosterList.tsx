
import React, { useState } from 'react';
import { TeamRoster, ParlayLeg, GameLog } from '../types';
import { Users, PlusCircle, CheckCircle2, ChevronDown, ChevronUp, History, Shield, TrendingUp } from 'lucide-react';

interface RosterListProps {
  teamA: TeamRoster;
  teamB: TeamRoster;
  pinnedLegs: ParlayLeg[];
  onTogglePin: (leg: ParlayLeg) => void;
}

const RosterList: React.FC<RosterListProps> = ({ teamA, teamB, pinnedLegs, onTogglePin }) => {
  
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  const FALLBACK_LOGO = "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png";

  const togglePlayer = (playerId: string) => {
    setExpandedPlayers(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const renderLast5Table = (logs?: GameLog[]) => {
      if (!logs || logs.length === 0) return <div className="text-slate-500 text-xs italic p-2">No recent logs found.</div>;

      // Extract dynamic headers from the first log entry
      const firstLog = logs[0];
      const statKeys = Object.keys(firstLog.stats);

      return (
        <div className="overflow-hidden rounded-lg border border-slate-700/50 my-2 shadow-inner bg-slate-900/50">
            <div className="bg-slate-950/80 px-3 py-1.5 flex items-center gap-2 border-b border-slate-700/50">
                <History size={12} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last 5 Games Log</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900/80 text-slate-500 font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-3 py-2 text-[10px]">Opponent</th>
                            {statKeys.map(key => (
                                <th key={key} className="px-2 py-2 text-[10px] text-center">{key}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                        {logs.map((log, i) => (
                            <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-3 py-1.5 font-mono text-slate-300 font-medium whitespace-nowrap">{log.opponent}</td>
                                {statKeys.map(key => (
                                    <td key={key} className="px-2 py-1.5 text-center text-slate-200">
                                        {log.stats[key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      );
  };

  const renderDepthChartTable = (team: TeamRoster, teamSide: 'A' | 'B') => (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden h-full flex flex-col shadow-xl">
      <div className="bg-slate-800/80 px-4 py-4 border-b border-slate-700 flex items-center justify-between">
         <div className="flex items-center gap-3">
             <img 
                src={`https://a.espncdn.com/i/teamlogos/nfl/500/${team.teamAbbr?.toLowerCase() || 'nfl'}.png`}
                onError={(e) => { e.currentTarget.src = FALLBACK_LOGO }}
                alt={team.teamName} 
                className="w-10 h-10 object-contain drop-shadow" 
            />
            <div>
                <h3 className="text-lg font-bold text-white leading-none tracking-tight">{team.teamName}</h3>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">Official Depth Chart</span>
            </div>
         </div>
      </div>
      
      <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
              <thead>
                  <tr className="bg-slate-950/50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-800">
                      <th className="px-4 py-3 font-bold w-12 text-center">Pos</th>
                      <th className="px-4 py-3 font-bold">Starter</th>
                      <th className="px-4 py-3 font-bold text-right hidden sm:table-cell">Season Stats (Avg)</th>
                      <th className="px-2 py-3 w-8"></th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {team.players.map((player, idx) => {
                    const uniqueId = `${team.teamName}-${player.name}-${idx}`;
                    const isExpanded = expandedPlayers.has(uniqueId);
                    
                    // Depth chart color coding
                    let posBadgeColor = 'bg-slate-800 text-slate-400';
                    let posBorder = 'border-l-4 border-slate-700';
                    
                    if (player.position.startsWith('QB')) { posBadgeColor = 'bg-red-500/10 text-red-400'; posBorder = 'border-l-4 border-red-500'; }
                    else if (player.position.startsWith('RB')) { posBadgeColor = 'bg-blue-500/10 text-blue-400'; posBorder = 'border-l-4 border-blue-500'; }
                    else if (player.position.startsWith('WR')) { posBadgeColor = 'bg-emerald-500/10 text-emerald-400'; posBorder = 'border-l-4 border-emerald-500'; }
                    else if (player.position.startsWith('TE')) { posBadgeColor = 'bg-orange-500/10 text-orange-400'; posBorder = 'border-l-4 border-orange-500'; }

                    return (
                        <React.Fragment key={uniqueId}>
                            <tr 
                                onClick={() => togglePlayer(uniqueId)}
                                className={`cursor-pointer transition-all group ${isExpanded ? 'bg-slate-800/80' : 'hover:bg-slate-800/40'} ${posBorder}`}
                            >
                                <td className="px-2 py-3 text-center">
                                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${posBadgeColor}`}>
                                        {player.position}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-bold text-slate-200 text-sm group-hover:text-indigo-300 transition-colors">{player.name}</div>
                                    <div className="sm:hidden text-[10px] text-slate-500 mt-0.5">{player.avgStats}</div>
                                </td>
                                <td className="px-4 py-3 text-right hidden sm:table-cell">
                                    <span className="text-xs text-slate-400 font-mono bg-slate-900/50 px-2 py-1 rounded">{player.avgStats}</span>
                                </td>
                                <td className="px-2 py-3 text-center text-slate-500">
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </td>
                            </tr>
                            
                            {/* Expanded Content Row */}
                            {isExpanded && (
                                <tr className="bg-slate-800/30">
                                    <td colSpan={4} className="px-4 pb-4 pt-1 border-b border-slate-800 animate-fade-in relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/20"></div>
                                        <div className="pl-2">
                                            {/* Last 5 Games Table */}
                                            {renderLast5Table(player.last5Games)}

                                            {/* Suggested Legs */}
                                            <div className="space-y-2 mt-3">
                                                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <Shield size={10} /> AI Recommended Plays
                                                </h4>
                                                {player.suggestedLegs?.map((leg) => {
                                                    const isPinned = pinnedLegs.some(l => l.id === leg.id);
                                                    return (
                                                        <div key={leg.id} className="flex items-center justify-between bg-slate-900/80 rounded border border-slate-700 p-2 hover:border-slate-600 transition-colors">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-white">{leg.propType}</span>
                                                                    <span className="text-xs text-emerald-400 font-mono">Over {leg.line}</span>
                                                                </div>
                                                                <span className="text-[10px] text-slate-500 mt-0.5">
                                                                    Defense Rank: {leg.defenseAllowedVsPos}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onTogglePin(leg);
                                                                }}
                                                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                                                    isPinned 
                                                                    ? 'bg-indigo-600 text-white' 
                                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                                                                }`}
                                                            >
                                                                {isPinned ? (
                                                                    <><CheckCircle2 size={12} /> Added</>
                                                                ) : (
                                                                    <><PlusCircle size={12} /> Add</>
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                                {(!player.suggestedLegs || player.suggestedLegs.length === 0) && (
                                                    <div className="text-[10px] text-slate-600 italic py-1 px-1">
                                                        Checking matchups...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                })}
              </tbody>
          </table>
          
          {team.players.length === 0 && (
            <div className="p-8 text-center">
                 <div className="animate-pulse flex flex-col items-center">
                    <div className="h-2 w-24 bg-slate-800 rounded mb-2"></div>
                    <div className="h-2 w-32 bg-slate-800 rounded"></div>
                 </div>
            </div>
          )}
      </div>
    </div>
  );

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {renderDepthChartTable(teamA, 'A')}
      {renderDepthChartTable(teamB, 'B')}
    </div>
  );
};

export default RosterList;
