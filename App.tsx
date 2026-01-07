import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Trophy, 
  GitMerge, 
  GitPullRequest, 
  AlertCircle, 
  Search,
  RefreshCw,
  Github,
  Clock,
  X,
  ChevronRight
} from 'lucide-react';
import { Contributor, Repository, AppSettings, SortField } from './types';
import { INITIAL_REPOS, INITIAL_SETTINGS, MOCK_CONTRIBUTORS } from './constants';
import StatsCharts from './components/StatsCharts';
import EasterEggGame from './components/EasterEggGame';

// Konami Code Hook
const useKonamiCode = () => {
  const [triggered, setTriggered] = useState(false);
  const sequence = useMemo(() => ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], []);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newHistory = [...history, e.key].slice(-sequence.length);
      setHistory(newHistory);
      if (JSON.stringify(newHistory) === JSON.stringify(sequence)) {
        setTriggered(true);
        setHistory([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, sequence]);

  return [triggered, setTriggered] as const;
};

const PAGE_SIZE = 15;

const App: React.FC = () => {
  // --- State ---
  const [contributors, setContributors] = useState<Contributor[]>(MOCK_CONTRIBUTORS);
  const [repos, setRepos] = useState<Repository[]>(INITIAL_REPOS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  
  const [sortField, setSortField] = useState<SortField>(SortField.SCORE);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [dataSource, setDataSource] = useState<'mock' | 'local' | 'server'>('mock');
  
  // UI State
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);
  const observerTarget = useRef(null);
  
  // AI State
  const [aiRoast, setAiRoast] = useState<string>('');

  // Easter Egg
  const [showGame, setShowGame] = useKonamiCode();

  // --- Derived State ---
  const filteredContributors = useMemo(() => {
    let result = contributors.filter(c => !c.isIgnored);
    
    if (searchQuery) {
      result = result.filter(c => c.username.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return result.sort((a, b) => b[sortField] - a[sortField]);
  }, [contributors, searchQuery, sortField]);

  const topContributor = filteredContributors[0];
  const visibleContributors = filteredContributors.slice(0, visibleCount);
  
  // --- Effects ---

  // 1. Hydration: Load data from data.json (Server)
  useEffect(() => {
    const hydrate = async () => {
      try {
        // Always try to fetch fresh data.json first
        const response = await fetch('./data.json');
        if (response.ok) {
          const serverData = await response.json();
          setContributors(serverData.contributors);
          setRepos(serverData.repos);
          setSettings(serverData.settings);
          setDataSource('server');
          if (serverData.timestamp) {
            setLastSynced(new Date(serverData.timestamp));
          }
          
          // Set AI Roast if available in settings or data
          if (serverData.aiRoast) {
             setAiRoast(serverData.aiRoast);
          }
          return;
        }
      } catch (e) {
        console.error("Failed to load data.json", e);
      }
    };
    hydrate();
  }, []);
  
  // Reset pagination when filter/sort changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, sortField]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
           setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredContributors.length));
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [filteredContributors.length]);

  // --- Handlers ---

  const handleRefresh = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    
    try {
      // In static mode, refresh just re-fetches the JSON
      const response = await fetch('./data.json', { cache: 'no-store' });
      if (response.ok) {
         const serverData = await response.json();
         setContributors(serverData.contributors);
         setRepos(serverData.repos);
         setSettings(serverData.settings);
         setDataSource('server');
         if (serverData.timestamp) {
            setLastSynced(new Date(serverData.timestamp));
         }
         if (serverData.aiRoast) {
            setAiRoast(serverData.aiRoast);
         }
      }
    } catch (e) {
      console.error("Refresh failed", e);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans pb-20 relative overflow-x-hidden w-full">
      
      {showGame && <EasterEggGame onClose={() => setShowGame(false)} />}

      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                <Github className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                GitRank
              </h1>
            </div>
            <p className="text-slate-400 text-xs md:text-sm max-w-md">
              Tracking <span className="text-slate-200 font-semibold">{repos.length} repositories</span>. 
              {aiRoast && <span className="block mt-2 text-purple-400 italic">"{aiRoast}"</span>}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
             <div className="relative w-full sm:w-auto group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Find user..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 bg-slate-800/50 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                />
             </div>
          </div>
        </header>

        {/* Top Performer Mobile Card (Stacked) / Desktop Banner */}
        {topContributor && (
          <div className="mb-8 bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 relative overflow-hidden shadow-lg">
             <div className="absolute inset-0 bg-yellow-500/5" />
             <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                <div className="relative">
                  <div className="absolute -inset-1 bg-yellow-500 rounded-full blur opacity-40"></div>
                  <img src={topContributor.avatarUrl} className="w-20 h-20 rounded-full border-2 border-yellow-500 relative" />
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-slate-900 px-2 py-0.5 rounded-full text-xs font-bold shadow-lg">#1</div>
                </div>
                <div>
                   <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Leader: {topContributor.username}</h2>
                   <p className="text-slate-400 text-sm">
                      <span className="text-white font-mono font-bold text-lg">{topContributor.score}</span> points
                   </p>
                </div>
             </div>
             <Trophy className="hidden sm:block w-24 h-24 text-yellow-500/10 absolute -right-4 -bottom-4 rotate-12" />
          </div>
        )}

        {/* Main Leaderboard */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm mb-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50 gap-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              Leaderboard
              <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                {filteredContributors.length}
              </span>
            </h3>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-800/50 px-3 py-1.5 rounded-full whitespace-nowrap" title={`Source: ${dataSource}`}>
                <Clock className="w-3 h-3" />
                <span className="hidden sm:inline">Updated:</span>
                {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>

              <button 
                onClick={() => handleRefresh(false)}
                disabled={isRefreshing}
                className={`flex items-center gap-2 text-xs sm:text-sm px-3 py-1.5 rounded-full border border-transparent transition-colors ${
                  isRefreshing 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                }`}
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Loading' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-full">
              <thead>
                <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-3 sm:p-4 text-center w-12">Rank</th>
                  <th className="p-3 sm:p-4">Contributor</th>
                  {/* Hide detailed stats on mobile, show on medium+ screens */}
                  <th className="hidden md:table-cell p-4 cursor-pointer hover:text-purple-400 transition-colors" onClick={() => setSortField(SortField.MERGED)}>
                    <div className="flex items-center gap-2"><GitMerge className="w-4 h-4" /> Merged</div>
                  </th>
                  <th className="hidden md:table-cell p-4 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setSortField(SortField.OPEN)}>
                     <div className="flex items-center gap-2"><GitPullRequest className="w-4 h-4" /> Open</div>
                  </th>
                  <th className="hidden md:table-cell p-4 cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => setSortField(SortField.ISSUES)}>
                     <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Issues</div>
                  </th>
                  <th className="p-3 sm:p-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => setSortField(SortField.SCORE)}>
                    Score
                  </th>
                  <th className="hidden sm:table-cell p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {visibleContributors.map((contributor, index) => (
                  <tr 
                    key={contributor.id} 
                    onClick={() => setSelectedContributor(contributor)}
                    className="group hover:bg-slate-800/60 transition-colors duration-150 cursor-pointer active:bg-slate-800"
                  >
                    <td className="p-3 sm:p-4 text-center font-mono text-slate-500 group-hover:text-slate-300">
                      #{index + 1}
                    </td>
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                           <img 
                              src={contributor.avatarUrl} 
                              alt="" 
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-800 ring-2 ring-transparent group-hover:ring-slate-700 transition-all" 
                            />
                            {index < 3 && (
                              <div className="absolute -top-1 -right-1 text-xs">
                                {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                              </div>
                            )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-200 group-hover:text-white flex items-center gap-2 truncate">
                            {contributor.username}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[120px] sm:max-w-xs">
                             {/* Mobile Hint */}
                             <span className="md:hidden text-indigo-400">Tap for stats</span>
                             <span className="hidden md:inline">Last active {contributor.lastActive}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-4">
                      <span className="inline-block px-2 py-1 rounded bg-purple-500/10 text-purple-400 font-mono text-sm font-medium">
                        {contributor.mergedPRs}
                      </span>
                    </td>
                    <td className="hidden md:table-cell p-4">
                      <span className="inline-block px-2 py-1 rounded bg-blue-500/10 text-blue-400 font-mono text-sm font-medium">
                        {contributor.openPRs}
                      </span>
                    </td>
                    <td className="hidden md:table-cell p-4">
                      <span className="inline-block px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-sm font-medium">
                        {contributor.issues}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 text-right">
                      <span className="font-bold text-slate-200 text-base sm:text-lg">
                        {contributor.score}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell p-4 text-center">
                       <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                    </td>
                  </tr>
                ))}
                
                {/* Sentinel Element for Intersection Observer */}
                {visibleCount < filteredContributors.length && (
                    <tr ref={observerTarget}>
                        <td colSpan={7} className="p-6 text-center text-slate-500 text-sm animate-pulse">
                            Loading more contributors...
                        </td>
                    </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Contributor Details Modal */}
      {selectedContributor && (
         <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="relative p-6 border-b border-slate-800 bg-slate-800/50">
                  <button 
                    onClick={() => setSelectedContributor(null)} 
                    className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                     <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-4">
                     <img src={selectedContributor.avatarUrl} className="w-16 h-16 rounded-full border-2 border-slate-600" />
                     <div>
                        <h3 className="text-xl font-bold text-white">{selectedContributor.username}</h3>
                        <p className="text-sm text-slate-500 mt-1">Score: {selectedContributor.score}</p>
                     </div>
                  </div>
               </div>
               
               <div className="p-6">
                  {/* Individualized Chart */}
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Performance Stats</h4>
                  <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-2 mb-6">
                     <StatsCharts contributor={selectedContributor} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                     <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-400">{selectedContributor.mergedPRs}</div>
                        <div className="text-xs text-purple-300/70">Merged</div>
                     </div>
                     <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-400">{selectedContributor.openPRs}</div>
                        <div className="text-xs text-blue-300/70">Open</div>
                     </div>
                     <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-emerald-400">{selectedContributor.issues}</div>
                        <div className="text-xs text-emerald-300/70">Issues</div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}
      {/* Display Empty-state message when no contributors are available */}
      {filteredContributors.length === 0 && (
        <div className="fixed inset-0 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center max-w-md">
            <h1 className="text-xl text-slate-400 font-bold mb-1">No contributors found !</h1>
            <p className="text-slate-400">Please check your leaderboard configuration.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;