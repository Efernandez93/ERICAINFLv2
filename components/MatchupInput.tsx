import React, { useState } from 'react';
import { Search, Trophy } from 'lucide-react';

interface MatchupInputProps {
  onAnalyze: (teamA: string, teamB: string, sport: string) => void;
  loading: boolean;
}

const MatchupInput: React.FC<MatchupInputProps> = ({ onAnalyze, loading }) => {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [sport, setSport] = useState('NFL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamA && teamB) {
      onAnalyze(teamA, teamB, sport);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500 rounded-lg">
            <Trophy className="text-white" size={24} />
        </div>
        <div>
            <h2 className="text-xl font-bold text-white">New Analysis</h2>
            <p className="text-slate-400 text-sm">Enter matchup details to find optimal legs</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Team A (e.g. Home)</label>
                <input
                type="text"
                placeholder="e.g. Chiefs"
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required
                />
            </div>
            
            <div className="flex justify-center items-center pb-3 md:col-span-1 text-slate-500 font-bold text-xl">
                VS
            </div>

            <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Team B (e.g. Away)</label>
                <input
                type="text"
                placeholder="e.g. Raiders"
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required
                />
            </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-700 mt-4">
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sport" value="NFL" checked={sport === 'NFL'} onChange={() => setSport('NFL')} className="accent-indigo-500" />
                    <span className="text-slate-300 text-sm">NFL</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sport" value="NBA" checked={sport === 'NBA'} onChange={() => setSport('NBA')} className="accent-indigo-500" />
                    <span className="text-slate-300 text-sm">NBA</span>
                </label>
            </div>
            <button
                type="submit"
                disabled={loading || !teamA || !teamB}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all ${
                loading || !teamA || !teamB
                    ? 'bg-slate-700 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'
                }`}
            >
                {loading ? (
                <>Processing...</>
                ) : (
                <>
                    <Search size={18} /> Analyze Matchup
                </>
                )}
            </button>
        </div>
      </form>
    </div>
  );
};

export default MatchupInput;