import React from 'react';
import { TeamRoster, ParlayLeg } from '../types';
import { Users, PlusCircle, CheckCircle2, TrendingUp, Shield, History } from 'lucide-react';

interface RosterListProps {
  teamA: TeamRoster;
  teamB: TeamRoster;
  pinnedLegs: ParlayLeg[];
  onTogglePin: (leg: ParlayLeg) => void;
}

const RosterList: React.FC<RosterListProps> = ({ teamA, teamB, pinnedLegs, onTogglePin }) => {
  
  const renderTeam = (team: TeamRoster) => (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden h-full">
      <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex items-center gap-2">
        <Users className="text-indigo-400" size={18} />
        <h3 className="font-bold text-white">{team.teamName} <span className="text-slate-400 text-sm font-normal">Starters & Props</span></h3>
      </div>
      
      <div className="p-4 space-y-4">
        {team.players.map((player, idx) => (
          <div key={idx} className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-3 hover:border-slate-600 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded">{player.position}</span>
                        <span className="font-bold text-white text-sm">{player.name}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <TrendingUp size={10} /> Avg: {player.avgStats}
                    </div>
                </div>
            </div>

            {/* Last 5 Games History */}
            {player.last5Games && player.last5Games.length > 0 && (
                <div className="mb-3 bg-slate-950/50 rounded p-2 border border-slate-800/50">
                    <div className="flex items-center gap-1 mb-1.5">
                        <History size={10} className="text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last 5 Games</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {player.last5Games.map((game, gIdx) => (
                            <span key={gIdx} className="text-[10px] text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap">
                                {game}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Suggested Legs for Player */}
            <div className="space-y-2">
                {player.suggestedLegs?.map((leg) => {
                    const isPinned = pinnedLegs.some(l => l.id === leg.id);
                    return (
                        <div key={leg.id} className="flex items-center justify-between bg-slate-900/50 rounded border border-slate-700/50 p-2">
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-emerald-400">{leg.propType} Over {leg.line}</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Shield size={8} /> Def Rank: {leg.defenseAllowedVsPos}
                                </span>
                            </div>
                            <button
                                onClick={() => onTogglePin(leg)}
                                className={`p-1.5 rounded-full transition-all ${
                                    isPinned 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                                }`}
                                title={isPinned ? "Remove from Parlay" : "Add to Parlay"}
                            >
                                {isPinned ? <CheckCircle2 size={14} /> : <PlusCircle size={14} />}
                            </button>
                        </div>
                    );
                })}
                {(!player.suggestedLegs || player.suggestedLegs.length === 0) && (
                    <div className="text-[10px] text-slate-600 italic text-center py-1">
                        No props available
                    </div>
                )}
            </div>
          </div>
        ))}
        
        {team.players.length === 0 && (
            <div className="text-center py-6 text-slate-600 italic text-sm">
                No roster data available
            </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      {renderTeam(teamA)}
      {renderTeam(teamB)}
    </div>
  );
};

export default RosterList;