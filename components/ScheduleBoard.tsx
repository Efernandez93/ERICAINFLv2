import React, { useEffect, useState } from 'react';
import { Calendar, Clock, ChevronRight, RefreshCw, ChevronDown, AlertTriangle, Database, Zap } from 'lucide-react';
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
  const [countdown, setCountdown] = useState<{ [key: string]: string }>({});

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

  // Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (!schedule?.games) return;

      const newCountdown: { [key: string]: string } = {};
      schedule.games.forEach(game => {
        const gameDateTime = getGameDateTime(game.date, game.time);
        const now = new Date();
        const diff = gameDateTime.getTime() - now.getTime();
        newCountdown[game.id] = formatCountdown(diff);
      });
      setCountdown(newCountdown);
    }, 1000);

    return () => clearInterval(interval);
  }, [schedule?.games]);

  // Convert ET time to CST
  const convertToCSTTime = (etTime: string): string => {
    try {
      // Parse time (e.g., "1:00 PM ET" or "1:00 PM")
      const timeStr = etTime.replace(' ET', '').trim();
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':');

      // Convert to 24-hour format
      let hour24 = parseInt(hours);
      if (period === 'PM' && hour24 !== 12) hour24 += 12;
      if (period === 'AM' && hour24 === 12) hour24 = 0;

      // Convert ET to CST (subtract 1 hour)
      let cstHour = hour24 - 1;
      if (cstHour < 0) cstHour += 24;

      // Convert back to 12-hour format
      const cstPeriod = cstHour >= 12 ? 'PM' : 'AM';
      const cstHour12 = cstHour === 0 ? 12 : cstHour > 12 ? cstHour - 12 : cstHour;

      return `${cstHour12}:${minutes} ${cstPeriod} CST`;
    } catch (e) {
      return etTime; // Return original if parsing fails
    }
  };

  // Get game datetime in UTC for countdown calculations
  const getGameDateTime = (gameDate: string, gameTime: string): Date => {
    try {
      // Parse time (e.g., "1:00 PM ET" or "1:00 PM")
      const timeStr = gameTime.replace(' ET', '').trim();
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':');

      // Convert to 24-hour format
      let hour24 = parseInt(hours);
      if (period === 'PM' && hour24 !== 12) hour24 += 12;
      if (period === 'AM' && hour24 === 12) hour24 = 0;

      // Parse date format: "Sunday, Nov 26" -> "Nov 26"
      // Remove the day name and get just "Nov 26"
      const cleanDate = gameDate.includes(',')
        ? gameDate.split(', ').pop() || gameDate
        : gameDate;

      // Add current year to make it parseable
      const currentYear = new Date().getFullYear();
      const dateStr = `${cleanDate}, ${currentYear}`;

      // Create date object
      const dateObj = new Date(`${dateStr} ${hour24}:${minutes}:00`);

      // If the parsed date is in the future but far away, and current date suggests it might be next season, use next year
      const now = new Date();
      if (dateObj < now && new Date().getMonth() >= 9) {
        // If we're in Oct/Nov/Dec and date is in past, assume it's next year
        return new Date(`${cleanDate}, ${currentYear + 1} ${hour24}:${minutes}:00`);
      }

      return dateObj;
    } catch (e) {
      console.warn('[SCHEDULE] Failed to parse game date/time:', { gameDate, gameTime, error: e });
      return new Date();
    }
  };

  // Format countdown time (e.g., "1d 3h 45m")
  const formatCountdown = (ms: number): string => {
    if (ms <= 0) return 'STARTING';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Check if a game has already started
  const isGameStarted = (gameDate: string, gameTime: string): boolean => {
    try {
      const gameDateTime = getGameDateTime(gameDate, gameTime);
      const now = new Date();
      return gameDateTime <= now;
    } catch (e) {
      return false;
    }
  };

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
                    const gameStarted = isGameStarted(game.date, game.time);

                    // Determine styles based on state
                    let containerClasses = 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-750';
                    let textClasses = 'text-slate-200';
                    let vsClasses = 'text-slate-500';

                    if (isSelected) {
                        containerClasses = 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/50 scale-[1.02]';
                        textClasses = 'text-white';
                        vsClasses = 'text-indigo-200';
                    } else if (gameStarted) {
                        // Gray style for games that have already started (marked as "read")
                        containerClasses = 'bg-slate-800/40 border-slate-600/40 hover:bg-slate-800/50 hover:border-slate-600/50 shadow-md shadow-slate-900/10 opacity-60';
                        textClasses = 'text-slate-400';
                        vsClasses = 'text-slate-500';
                    } else if (isCached) {
                        // Green style for cached items
                        containerClasses = 'bg-emerald-950/20 border-emerald-500/40 hover:bg-emerald-950/40 hover:border-emerald-500/60 shadow-md shadow-emerald-900/10';
                    }

                    return (
                        <button
                            key={game.id || idx}
                            onClick={() => onSelectGame(game)}
                            className={`flex flex-col p-2 rounded-xl border text-left transition-all relative ${containerClasses}`}
                            disabled={gameStarted}
                            title={gameStarted ? 'This game has already started' : ''}
                        >
                            {gameStarted && !isSelected && (
                                <div className="absolute top-1 right-1 text-[8px] font-bold text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-500/30">
                                    FINAL
                                </div>
                            )}

                            {isCached && !isSelected && !gameStarted && (
                                <div className="absolute top-1 right-1 flex items-center gap-0.5 text-[8px] font-bold text-emerald-400 bg-emerald-900/50 px-1 py-0.5 rounded border border-emerald-500/20">
                                    <Database size={8} /> READY
                                </div>
                            )}

                            <div className="flex flex-col gap-0.5 w-full mb-1">
                                <div className={`text-[8px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${gameStarted ? 'text-slate-500 bg-slate-800/50' : isSelected ? 'text-indigo-200 bg-indigo-700' : 'text-slate-400 bg-slate-900/50'}`}>
                                    <Clock size={8} /> {convertToCSTTime(game.time)}
                                </div>
                                {!gameStarted && (
                                    <div className={`text-[7px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isSelected ? 'text-indigo-100 bg-indigo-700/60' : 'text-amber-300 bg-amber-900/40'}`}>
                                        <Zap size={7} /> {countdown[game.id] || '...'}
                                    </div>
                                )}
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