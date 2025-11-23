import React, { useEffect, useState } from 'react';
import { Calendar, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { Game, ScheduleResponse } from '../types';
import { getNFLSchedule } from '../services/gemini';

interface ScheduleBoardProps {
  onSelectGame: (game: Game) => void;
  selectedGameId?: string;
}

const ScheduleBoard: React.FC<ScheduleBoardProps> = ({ onSelectGame, selectedGameId }) => {
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSchedule = async () => {
    setLoading(true);
    const { data } = await getNFLSchedule();
    if (data) {
        setSchedule(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  return (
    <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="text-indigo-500" size={20} />
                {loading ? 'Loading Schedule...' : schedule?.week || 'NFL Schedule'}
            </h2>
            <button onClick={fetchSchedule} className="text-slate-500 hover:text-white transition-colors">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
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
        {!loading && !schedule?.games && (
            <div className="p-6 text-center border border-dashed border-slate-700 rounded-xl text-slate-500">
                Unable to load schedule. Please try refreshing.
            </div>
        )}
    </div>
  );
};

export default ScheduleBoard;