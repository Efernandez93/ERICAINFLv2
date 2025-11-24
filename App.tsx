
import React, { useState, useEffect, useRef } from 'react';
import ScheduleBoard from './components/ScheduleBoard';
import LegCard from './components/LegCard';
import SourceList from './components/SourceList';
import RosterList from './components/RosterList';
import ParlaySidebar from './components/ParlaySidebar';
import SafeLegsPanel from './components/SafeLegsPanel';
import { getKeyPlayersAndStats, getDeepAnalysis } from './services/gemini';
import { StorageService } from './services/storage';
import { AnalysisResult, GroundingSource, ParlayLeg, Game, TeamRoster } from './types';
import { Shield, Activity, AlertCircle, Database, HardDrive, Terminal, Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [loadingStage, setLoadingStage] = useState<'idle' | 'rosters' | 'analysis'>('idle');
  const [streamingText, setStreamingText] = useState("");
  
  // Data States
  const [rosterData, setRosterData] = useState<{teamA: TeamRoster, teamB: TeamRoster} | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [rawText, setRawText] = useState<string>("");
  
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [pinnedLegs, setPinnedLegs] = useState<ParlayLeg[]>([]);
  
  const [sidebarOpen, setSidebarOpen] = useState(() => {
     if (typeof window !== 'undefined') {
         return window.innerWidth >= 1024;
     }
     return true;
  });

  const [cachedGameIds, setCachedGameIds] = useState<string[]>([]);
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [saveNotification, setSaveNotification] = useState<{ show: boolean; gameId?: string }>({ show: false });
  const [cacheStats, setCacheStats] = useState<{ totalGames: number; totalSchedules: number; isCloudConnected: boolean; localStorageSize: number }>({ totalGames: 0, totalSchedules: 0, isCloudConnected: false, localStorageSize: 0 });
  const [showCacheDetails, setShowCacheDetails] = useState(false);

  const FALLBACK_LOGO = "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png";

  const streamEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the streaming text
  useEffect(() => {
    if (streamEndRef.current) {
        streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingText]);

  // Load list of cached games on mount AND verify cloud connection
  useEffect(() => {
    const initApp = async () => {
        // 1. Get Local Cache IDs (Instant)
        const localIds = await StorageService.getCachedGameIds();
        setCachedGameIds(localIds);

        // 2. Verify Cloud Connection
        const isConnected = await StorageService.verifyConnection();
        setCloudStatus(isConnected ? 'connected' : 'offline');

        // 3. If Cloud is Connected, Re-sync (Pulls in desktop data to mobile)
        if (isConnected) {
            const syncedIds = await StorageService.getCachedGameIds();
            setCachedGameIds(syncedIds);
        }

        // 4. Get Cache Stats
        const stats = await StorageService.getCacheStats();
        setCacheStats(stats);
    };
    initApp();

    const handleResize = () => {
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        } else {
            setSidebarOpen(true);
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRefreshCache = async () => {
    const stats = await StorageService.getCacheStats();
    setCacheStats(stats);
  };

  const handleSelectGame = async (game: Game) => {
    setSelectedGame(game);
    setError(null);
    setResult(null);
    setRosterData(null);
    setSources([]);
    setRawText("");
    setStreamingText("");
    
    try {
        // 1. Check Cache (Fastest)
        const cachedData = await StorageService.getMatchup(game.id);
        
        if (cachedData) {
            console.log("Loading from cache...");
            setResult(cachedData.data);
            if (cachedData.data?.rosters) {
                setRosterData(cachedData.data.rosters);
            }
            setSources(cachedData.sources);
            setRawText(cachedData.rawText);
            setLoadingStage('idle');
            return;
        }

        // 2. Not Cached? Start 2-Stage Loading
        
        // STAGE 1: Fetch Rosters (Fast retrieval)
        setLoadingStage('rosters');
        const { rosters } = await getKeyPlayersAndStats(game.homeTeam, game.awayTeam);
        
        if (rosters) {
            setRosterData(rosters); // UI updates immediately to show players
        }

        // STAGE 2: Deep Analysis (Reasoning)
        setLoadingStage('analysis');
        const analysisResponse = await getDeepAnalysis(
            game.homeTeam, 
            game.awayTeam, 
            rosters, 
            (partialText) => setStreamingText(partialText)
        );

        // Merge and Finalize
        const finalData = analysisResponse.data;
        if (finalData && rosters) {
            finalData.rosters = rosters;
        }

        setResult(finalData);
        setSources(analysisResponse.sources);
        setRawText(analysisResponse.rawText);
        setLoadingStage('idle');
        setStreamingText(""); // Clear terminal once done

        // Save complete object to cache
        if (finalData) {
            await StorageService.saveMatchup(game.id, {
                data: finalData,
                sources: analysisResponse.sources,
                rawText: analysisResponse.rawText
            });
            setCachedGameIds(prev => [...new Set([...prev, game.id])]);

            // Show save confirmation notification
            setSaveNotification({ show: true, gameId: game.id });
            setTimeout(() => setSaveNotification({ show: false }), 3000);
        }

    } catch (err) {
      console.error(err);
      setError("Failed to analyze matchup. Please check your connection and try again.");
      setLoadingStage('idle');
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

  const isLoading = loadingStage !== 'idle';

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">

        {/* Left Sidebar (Parlay Builder) */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block h-screen sticky top-0 overflow-hidden z-40 lg:w-80 w-full`}>
             <div className="lg:hidden absolute top-4 right-4 z-50">
                 <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                     Close Slip
                 </button>
             </div>
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
                        className="lg:hidden text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg border border-indigo-500 font-bold shadow-lg shadow-indigo-900/20"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? 'Hide Slip' : `View (${pinnedLegs.length})`}
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">

                {/* Save Confirmation Toast */}
                {saveNotification.show && (
                    <div className="fixed bottom-6 right-6 bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-4 flex items-center gap-3 animate-fade-in z-50 max-w-sm">
                        <Database size={18} className="text-emerald-400 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-emerald-300">Analysis saved to Supabase</p>
                            <p className="text-xs text-emerald-200/70">Data cached and available offline</p>
                        </div>
                    </div>
                )}

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

                {/* Matchup Title */}
                {(selectedGame && (rosterData || result)) && (
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6 animate-fade-in">
                        <div className="flex items-center gap-4">
                             {/* AWAY TEAM */}
                            <div className="flex flex-col items-center">
                                <img 
                                    src={`https://a.espncdn.com/i/teamlogos/nfl/500/${selectedGame.awayTeamAbbr?.toLowerCase() || 'nfl'}.png`}
                                    onError={(e) => { e.currentTarget.src = FALLBACK_LOGO }}
                                    alt={selectedGame.awayTeam} 
                                    className="w-16 h-16 object-contain drop-shadow-xl" 
                                />
                                <span className="text-sm font-bold mt-1 text-slate-300">{selectedGame.awayTeam}</span>
                            </div>

                            <span className="text-2xl font-black text-slate-600 italic">VS</span>
                            
                            {/* HOME TEAM */}
                            <div className="flex flex-col items-center">
                                <img 
                                    src={`https://a.espncdn.com/i/teamlogos/nfl/500/${selectedGame.homeTeamAbbr?.toLowerCase() || 'nfl'}.png`}
                                    onError={(e) => { e.currentTarget.src = FALLBACK_LOGO }}
                                    alt={selectedGame.homeTeam} 
                                    className="w-16 h-16 object-contain drop-shadow-xl" 
                                />
                                <span className="text-sm font-bold mt-1 text-slate-300">{selectedGame.homeTeam}</span>
                            </div>
                        </div>
                        
                        {cachedGameIds.includes(selectedGame.id) && (
                            <span className="text-xs font-mono text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded">
                                <Database size={12} /> Data Cached
                            </span>
                        )}
                    </div>
                )}

                {/* STAGE 1: ROSTER DATA (Shows up first) */}
                {rosterData && (
                    <div className="animate-fade-in mb-8">
                        <RosterList 
                            teamA={rosterData.teamA} 
                            teamB={rosterData.teamB} 
                            pinnedLegs={pinnedLegs}
                            onTogglePin={togglePin}
                        />
                    </div>
                )}

                {/* STAGE 1 LOADING: Skeleton for Rosters */}
                {loadingStage === 'rosters' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-pulse">
                        <div className="bg-slate-900 h-64 rounded-xl border border-slate-800 p-4">
                            <div className="h-6 w-32 bg-slate-800 rounded mb-4"></div>
                            <div className="space-y-3">
                                <div className="h-20 bg-slate-800/50 rounded"></div>
                                <div className="h-20 bg-slate-800/50 rounded"></div>
                            </div>
                        </div>
                        <div className="bg-slate-900 h-64 rounded-xl border border-slate-800 p-4">
                            <div className="h-6 w-32 bg-slate-800 rounded mb-4"></div>
                            <div className="space-y-3">
                                <div className="h-20 bg-slate-800/50 rounded"></div>
                                <div className="h-20 bg-slate-800/50 rounded"></div>
                            </div>
                        </div>
                    </div>
                )}


                {/* STAGE 2: ANALYSIS (Shows up second) */}
                {result && (
                    <div className="animate-fade-in space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Matchup Stats (Defense Matrix) */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 shadow-sm">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Shield className="text-red-400" size={18} />
                                    Defense Vulnerabilities
                                </h3>
                                
                                {result.defenseStats ? (
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
                                
                                {result.summary && (
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

                                {result.legs ? (
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
                    </div>
                )}

                {/* STAGE 2 LOADING: Streaming Terminal */}
                {loadingStage === 'analysis' && (
                    <div className="w-full mt-6 animate-fade-in">
                         <div className="bg-slate-900 rounded-t-xl border border-slate-800 p-3 flex items-center gap-2">
                             <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                             <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse delay-75"></div>
                             <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse delay-150"></div>
                             <span className="ml-2 text-xs font-mono text-slate-400 flex items-center gap-2">
                                 <Terminal size={12} />
                                 ANALYZING_DEFENSIVE_MATCHUPS.EXE
                             </span>
                         </div>
                         <div className="bg-slate-950 border-x border-b border-slate-800 p-6 rounded-b-xl min-h-[200px] font-mono text-sm overflow-hidden relative">
                             {/* Scan line effect */}
                             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent animate-scan pointer-events-none"></div>
                             
                             {streamingText ? (
                                 <div className="whitespace-pre-wrap text-emerald-500/90 leading-relaxed">
                                     {streamingText}
                                     <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 animate-pulse align-middle"></span>
                                     <div ref={streamEndRef} />
                                 </div>
                             ) : (
                                 <div className="flex flex-col items-center justify-center h-40 gap-4">
                                     <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                     <p className="text-slate-500 animate-pulse">Evaluating defensive schemes against player props...</p>
                                 </div>
                             )}
                         </div>
                    </div>
                )}

                {/* Welcome State (No game selected) */}
                {!isLoading && !result && !selectedGame && (
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
            </main>

            {/* Storage Mode Footer */}
            <footer className="border-t border-slate-900 bg-slate-950 py-3 px-6">
                <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] text-slate-600 flex-wrap gap-3">
                    <span>ERIC AI v1.3</span>
                    <div className="flex items-center gap-2 flex-wrap">
                        {cloudStatus === 'checking' && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-indigo-500/30 text-indigo-400">
                                <Loader2 size={10} className="animate-spin" />
                                <span>Verifying Connection...</span>
                            </div>
                        )}

                        {cloudStatus === 'connected' && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-emerald-500/30 text-emerald-500 animate-fade-in">
                                <Cloud size={10} />
                                <span>Cloud Connected</span>
                            </div>
                        )}

                        {cloudStatus === 'offline' && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-orange-500/30 text-orange-400 animate-fade-in">
                                <CloudOff size={10} />
                                <span>Local Storage Mode</span>
                            </div>
                        )}

                        <button
                            onClick={() => setShowCacheDetails(!showCacheDetails)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                            title="Click to view cache details"
                        >
                            <Database size={10} className="text-indigo-500" />
                            <span className="text-slate-400">{cacheStats.totalGames} Games Cached</span>
                        </button>

                        <button
                            onClick={handleRefreshCache}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer hover:text-slate-300"
                            title="Refresh cache statistics"
                        >
                            <RefreshCw size={10} className="text-slate-400" />
                            <span className="text-slate-400 hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Cache Details Panel */}
                {showCacheDetails && (
                    <div className="mt-3 pt-3 border-t border-slate-800 bg-slate-900/50 rounded p-3 text-[9px] text-slate-400">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <span className="text-emerald-500 font-bold">Games</span>
                                <p>{cacheStats.totalGames} analyzed</p>
                            </div>
                            <div>
                                <span className="text-indigo-500 font-bold">Schedules</span>
                                <p>{cacheStats.totalSchedules} cached</p>
                            </div>
                            <div>
                                <span className="text-orange-500 font-bold">Storage</span>
                                <p>{(cacheStats.localStorageSize / 1024).toFixed(1)} KB</p>
                            </div>
                            <div>
                                <span className={cacheStats.isCloudConnected ? 'text-emerald-500 font-bold' : 'text-orange-500 font-bold'}>
                                    Cloud
                                </span>
                                <p>{cacheStats.isCloudConnected ? 'Connected' : 'Offline'}</p>
                            </div>
                        </div>
                        <p className="text-slate-500 mt-2">💡 Tip: All users share cached games and schedules - the more you load, the faster it is for everyone!</p>
                    </div>
                )}
            </footer>
        </div>

        {/* Right Sidebar (Safe Legs Panel) */}
        <div className="hidden lg:flex flex-col h-screen sticky top-0 overflow-hidden z-40 lg:w-96 bg-slate-900 border-l border-slate-800">
            <SafeLegsPanel
                homeTeam={rosterData?.teamA}
                awayTeam={rosterData?.teamB}
                onAddLeg={togglePin}
                disabled={!rosterData}
            />
        </div>
    </div>
  );
};

export default App;
