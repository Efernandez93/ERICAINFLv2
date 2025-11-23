import React, { useEffect, useState } from 'react';
import { Calendar, Clock, ChevronRight, RefreshCw, ChevronDown, AlertTriangle, Database } from 'lucide-react';
import { Game, ScheduleResponse } from '../types';
import { getNFLSchedule } from '../services/gemini';

interface ScheduleBoardProps {
  onSelectGame: (game: Game) => void;
  selectedGameId?: string;
  cachedGameIds?: string[];
}

const ScheduleBoard: React.FC<ScheduleBoardProps> = ({ onSelectGame, selectedGameId, cachedGameIds = [] }) => {
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string>('Current');
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async (week?: string) => {
    setLoading(true);
    setError(null);
    // If 'Current' is selected, pass undefined to let the AI find the current week
    const weekParam = week === 'Current' ? undefined : week;
    
    const { data, error: apiError } = await getNFLSchedule(weekParam);
    
    if (apiError) {
        setError(apiError);
    } else if (data) {
        setSchedule(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedule(selectedWeek);
  }, [selectedWeek]);

  const weeks = ['Current', ...Array.from({ length: 18 }, (_, i) => `Week ${i + 1}`)];
  const FALLBACK_LOGO = "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png";

  return (
    <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="text-indigo-500" size={20} />
                {loading ? 'Loading Schedule...' : schedule?.week || 'NFL Schedule'}
            </h2>
            
            <div className="flex items-center gap-2">
                <div className="relative">
                    <select 
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(e.target.value)}
                        className="appearance-none bg-slate-800 text-slate-200 border border-slate-700 pl-3 pr-8 py-1.5 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                    >
                        {weeks.map(week => (
                            <option key={week} value={week}>{week}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>

                <button 
                    onClick={() => fetchSchedule(selectedWeek)} 
                    className="p-1.5 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700"
                    title="Refresh Schedule"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center mb-6">
                <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
                <h3 className="text-red-400 font-bold text-lg mb-1">Configuration Error</h3>
                <p className="text-slate-300 text-sm mb-2">{error}</p>
                {error.includes("API Key") && (
                    <div className="text-xs text-slate-500 bg-slate-900/50 p-2 rounded inline-block mt-2">
                        Tip: Check your Vercel Environment Variables. The key should be named <code>API_KEY</code>.
                    </div>
                )}
            </div>
        )}

        {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {[1,2,3,4,5,6,7,8].map(i => (
                    <div key={i} className="h-20 bg-slate-800/50 rounded-xl animate-pulse border border-slate-800"></div>
                ))}
             </div>
        ) : !error ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {schedule?.games?.map((game, idx) => {
                    const isSelected = selectedGameId === game.id;
                    const isCached = cachedGameIds.includes(game.id);
                    
                    // Determine styles based on state
                    let containerClasses = 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-750';
                    let textClasses = 'text-slate-200';
                    let vsClasses = 'text-slate-500';

                    if (isSelected) {
                        containerClasses = 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/50 scale-[1.02]';
                        textClasses = 'text-white';
                        vsClasses = 'text-indigo-200';
                    } else if (isCached) {
                        // Green style for cached items
                        containerClasses = 'bg-emerald-950/20 border-emerald-500/40 hover:bg-emerald-950/40 hover:border-emerald-500/60 shadow-md shadow-emerald-900/10';
                    }

                    return (
                        <button
                            key={game.id || idx}
                            onClick={() => onSelectGame(game)}
                            className={`flex flex-col p-2 rounded-xl border text-left transition-all relative ${containerClasses}`}
                        >
                            {isCached && !isSelected && (
                                <div className="absolute top-1 right-1 flex items-center gap-0.5 text-[8px] font-bold text-emerald-400 bg-emerald-900/50 px-1 py-0.5 rounded border border-emerald-500/20">
                                    <Database size={8} /> READY
                                </div>
                            )}

                            <div className="flex justify-between items-start w-full mb-1">
                                <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${isSelected ? 'text-indigo-200 bg-indigo-700' : 'text-slate-400 bg-slate-900/50'}`}>
                                    <Clock size={9} /> {game.time}
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between w-full px-1">
                                <div className="flex flex-col items-center flex-1">
                                    <img 
                                        src={`https://a.espncdn.com/i/teamlogos/nfl/500/${game.awayTeamAbbr?.toLowerCase() || 'nfl'}.png`}
                                        onError={(e) => { e.currentTarget.src = FALLBACK_LOGO }}
                                        alt={game.awayTeam} 
                                        className="w-7 h-7 object-contain mb-1 drop-shadow-lg" 
                                    />
                                    <span className={`font-bold text-[10px] leading-tight text-center truncate w-full ${textClasses}`}>{game.awayTeam}</span>
                                </div>
                                
                                <div className={`px-1 text-[10px] font-bold ${vsClasses}`}>@</div>

                                <div className="flex flex-col items-center flex-1">
                                    <img 
                                        src={`https://a.espncdn.com/i/teamlogos/nfl/500/${game.homeTeamAbbr?.toLowerCase() || 'nfl'}.png`}
                                        onError={(e) => { e.currentTarget.src = FALLBACK_LOGO }}
                                        alt={game.homeTeam} 
                                        className="w-7 h-7 object-contain mb-1 drop-shadow-lg" 
                                    />
                                    <span className={`font-bold text-[10px] leading-tight text-center truncate w-full ${textClasses}`}>{game.homeTeam}</span>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>
        ) : null}
        
        {!loading && !error && (!schedule?.games || schedule.games.length === 0) && (
            <div className="p-6 text-center border border-dashed border-slate-700 rounded-xl text-slate-500">
                <p>No games found for this week or unable to load schedule.</p>
                <p className="text-xs mt-2">The AI might be taking a nap. Try hitting refresh.</p>
            </div>
        )}
    </div>
  );
};

export default ScheduleBoard;