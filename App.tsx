
import React, { useState, useEffect } from 'react';
import ScheduleBoard from './components/ScheduleBoard';
import LegCard from './components/LegCard';
import SourceList from './components/SourceList';
import RosterList from './components/RosterList';
import ParlaySidebar from './components/ParlaySidebar';
import { analyzeMatchup } from './services/gemini';
import { StorageService, CachedMatchup } from './services/storage';
import { AnalysisResult, GroundingSource, ParlayLeg, Game } from './types';
import { Shield, Activity, AlertCircle, Database, HardDrive, CloudOff } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [rawText, setRawText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [pinnedLegs, setPinnedLegs] = useState<ParlayLeg[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cachedGameIds, setCachedGameIds] = useState<string[]>([]);

  // Load list of cached games on mount
  useEffect(() => {
    setCachedGameIds(StorageService.getCachedGameIds());
  }, []);

  const handleSelectGame = async (game: Game) => {
    setSelectedGame(game);
    setLoading(true);
    setError(null);
    setResult(null);
    setSources([]);
    setRawText("");

    // 1. Check Cache First
    const cachedData = StorageService.getMatchup(game.id);
    if (cachedData) {
        console.log("Loading from cache...");
        setResult(cachedData.data);
        setSources(cachedData.sources);
        setRawText(cachedData.rawText);
        setLoading(false);
        return;
    }

    // 2. Fetch from API if not cached
    try {
      const response = await analyzeMatchup(game.homeTeam, game.awayTeam);
      
      // Save result to state
      setResult(response.data);
      setSources(response.sources);
      setRawText(response.rawText);
      
      // Save to Cache via Service
      const cachePayload: CachedMatchup = {
          data: response.data,
          sources: response.sources,
          rawText: response.rawText
      };
      StorageService.saveMatchup(game.id, cachePayload);
      
      // Update local state for the UI indicators
      setCachedGameIds(prev => [...new Set([...prev, game.id])]);

    } catch (err) {
      setError("Failed to analyze matchup. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const togglePin = (leg: ParlayLeg) => {
    setPinnedLegs(prev => {
        const exists = prev.find(l => l.id === leg.id);
        if (exists) {
            return prev.filter(l => l.id !== leg.id);
        }
        return [...prev, leg];
    });
  };

  const removePin = (id: string) => {
    setPinnedLegs(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
        
        {/* Left Sidebar (Parlay Builder) */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block h-screen sticky top-0 overflow-y-auto z-40 shadow-xl shadow-black/50`}>
            <ParlaySidebar legs={pinnedLegs} onRemoveLeg={removePin} />
        </div>

        {/* Main Content */}
        <div className="flex-1 h-screen overflow-y-auto relative flex flex-col">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-lg">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-indigo-500 shadow-lg shadow-indigo-600/20 bg-slate-800 relative group cursor-pointer">
                            <img 
                                src="https://i.ibb.co/Xf87Rb1s/spongebob.jpg" 
                                alt="ERIC AI" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white leading-none">ERIC <span className="text-indigo-500">AI</span></h1>
                            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Expert Real-time Intelligent Capper</span>
                        </div>
                    </div>
                    <button 
                        className="lg:hidden text-sm bg-slate-800 px-3 py-1 rounded border border-slate-700"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? 'Hide Slip' : `View Slip (${pinnedLegs.length})`}
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">
                
                <ScheduleBoard 
                    onSelectGame={handleSelectGame} 
                    selectedGameId={selectedGame?.id}
                    cachedGameIds={cachedGameIds} 
                />

                {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-8 animate-fade-in">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                        <div className="inline-block w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-400 animate-pulse font-mono text-sm">ERIC is analyzing defensive schemes vs {selectedGame?.homeTeam}...</p>
                        <p className="text-slate-600 text-xs mt-2">Checking real-time data & stats...</p>
                    </div>
                )}

                {/* Welcome State (No game selected) */}
                {!loading && !result && !selectedGame && (
                    <div className="text-center py-20">
                        <h3 className="text-2xl font-bold text-slate-700 mb-2">Select a Game</h3>
                        <p className="text-slate-500">Choose a matchup from the schedule above to view predictions.</p>
                        <div className="flex justify-center mt-4 gap-2">
                             <span className="flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                <Database size={10} /> GREEN = Cached (Instant Load)
                             </span>
                        </div>
                    </div>
                )}

                {/* Results Area */}
                {!loading && (result || rawText) && (
                <div className="animate-fade-in space-y-8">
                    
                    {/* Matchup Title */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                        <h2 className="text-3xl font-bold text-white">{result?.matchup}</h2>
                        {cachedGameIds.includes(selectedGame?.id || '') && (
                            <span className="text-xs font-mono text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded">
                                <Database size={12} /> Data Cached
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                        {/* Left Column: Matchup Stats (Defense Matrix) */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 shadow-sm">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Shield className="text-red-400" size={18} />
                                Defense Vulnerabilities
                            </h3>
                            
                            {result?.defenseStats ? (
                                <div className="space-y-3">
                                {result.defenseStats.map((stat, idx) => (
                                    <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-bold text-white">{stat.position} Defense</span>
                                            <span className="text-xs font-mono text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">{stat.rank}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 mb-1">Allows {stat.avgAllowed}</div>
                                        <div className="text-[10px] text-slate-500 leading-tight border-t border-slate-700/50 pt-2 mt-1">{stat.description}</div>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm italic">No structured defensive stats found.</p>
                            )}
                            </div>
                            
                            {result?.summary && (
                                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">ERIC's Analysis</h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Parlay Legs */}
                        <div className="lg:col-span-2">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Activity className="text-emerald-400" size={20} />
                            ERIC's Recommended Props
                            </h3>

                            {result?.legs ? (
                            <div>
                                {result.legs.map((leg, idx) => (
                                <LegCard 
                                    key={leg.id || idx} 
                                    leg={leg} 
                                    onTogglePin={togglePin}
                                    isPinned={pinnedLegs.some(l => l.id === leg.id)}
                                />
                                ))}
                            </div>
                            ) : (
                            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                                <h4 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                                    <AlertCircle size={16} /> Raw Analysis
                                </h4>
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <pre className="whitespace-pre-wrap font-sans text-slate-300">{rawText}</pre>
                                </div>
                            </div>
                            )}
                            
                            <SourceList sources={sources} />
                        </div>
                    </div>

                    {/* Roster Section */}
                    {result?.rosters && (
                        <div className="animate-fade-in border-t border-slate-800 pt-8">
                            <h3 className="text-xl font-bold text-white mb-4">Key Starters & Last 5 Games</h3>
                            <RosterList 
                                teamA={result.rosters.teamA} 
                                teamB={result.rosters.teamB} 
                                pinnedLegs={pinnedLegs}
                                onTogglePin={togglePin}
                            />
                        </div>
                    )}
                </div>
                )}
            </main>

            {/* Storage Mode Footer */}
            <footer className="border-t border-slate-900 bg-slate-950 py-3 px-6">
                <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] text-slate-600">
                    <span>ERIC AI v1.0</span>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800">
                            <HardDrive size={10} className="text-indigo-500" />
                            <span className="text-slate-400">Local Cache Active</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 opacity-50" title="Requires Database">
                            <CloudOff size={10} className="text-slate-500" />
                            <span className="text-slate-500">Cloud Sync Inactive</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    </div>
  );
};

export default App;
