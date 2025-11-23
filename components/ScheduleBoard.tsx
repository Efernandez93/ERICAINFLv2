import React, { useEffect, useState } from 'react';
import { Calendar, Clock, ChevronRight, RefreshCw, ChevronDown } from 'lucide-react';
import { Game, ScheduleResponse } from '../types';
import { getNFLSchedule } from '../services/gemini';

interface ScheduleBoardProps {
  onSelectGame: (game: Game) => void;
  selectedGameId?: string;
}

const ScheduleBoard: React.FC<ScheduleBoardProps> = ({ onSelectGame, selectedGameId }) => {
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string>('Current');

  const fetchSchedule = async (week?: string) => {
    setLoading(true);
    // If 'Current' is selected, pass undefined to let the AI find the current week
    const weekParam = week === 'Current' ? undefined : week;
    const { data } = await getNFLSchedule(weekParam);
    if (data) {
        setSchedule(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedule(selectedWeek);
  }, [selectedWeek]);

  const weeks = ['Current', ...Array.from({ length: 18 }, (_, i) => `Week ${i + 1}`)];

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

        {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-24 bg-slate-800/50 rounded-xl animate-pulse border border-slate-800"></div>
                ))}
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {schedule?.games?.map((game, idx) => {
                    const isSelected = selectedGameId === game.id;
                    return (
                        <button
                            key={game.id || idx}
                            onClick={() => onSelectGame(game)}
                            className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                                isSelected 
                                ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/50 scale-[1.02]' 
                                : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-750'
                            }`}
                        >
                            <div className="flex justify-between items-start w-full mb-2">
                                <div className="text-xs font-mono text-slate-400 bg-slate-900/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Clock size={10} /> {game.time}
                                </div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                    {game.date}
                                </div>
                            </div>
                            <div className="flex-1 w-full space-y-1">
                                <div className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                    {game.awayTeam}
                                </div>
                                <div className={`text-xs ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>@</div>
                                <div className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                    {game.homeTeam}
                                </div>
                            </div>
                            {isSelected && (
                                <div className="mt-2 w-full flex justify-center">
                                    <ChevronRight className="animate-bounce-x" size={16} />
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
        )}
        {!loading && (!schedule?.games || schedule.games.length === 0) && (
            <div className="p-6 text-center border border-dashed border-slate-700 rounded-xl text-slate-500">
                <p>No games found for this week or unable to load schedule.</p>
                <p className="text-xs mt-2">Check your API key configuration or try another week.</p>
            </div>
        )}
    </div>
  );
};

export default ScheduleBoard;