import React, { useEffect, useMemo, useRef, useState } from "react";
import { _BASE, playSound, playAlternateClick } from './utils/sound';
import useAnnouncer from './hooks/useAnnouncer';
import { FooterBrand } from './components/UI';
import { GlobalEffects } from './components/GlobalEffects';
import MemoryGame from './games/MemoryGame';
import DiggingGame from './games/DiggingGame';
import BootsGame from './games/BootsGame';
import AirplanesGame from './games/AirplanesGame';

type GameId = "memory" | "digging" | "boots" | "airplanes";

type PlayerProfile = {
  name: string;
  age: number | null;
  avatarUrl: string | null;
  points?: number;
  learningProfile?: Record<string, number>;
  // optional per-player audio preferences
  musicKey?: string;
  musicVolume?: number;
  // per-player persisted histories
  gameResults?: GameResult[];
  pointsHistory?: { timestamp: number; delta: number; reason?: string }[];
  inventory?: string[];
};

type GameResult = {
  gameId: GameId;
  score: number;
  attempts: number;
  timestamp: number;
  goals?: {
    montessori: string[];
    waldorf: string[];
    intelligences: string[];
  };
  metrics?: Record<string, number>;
};

type ScreenTimeState = {
  limitMinutes: number | null;
  remainingSeconds: number;
  isActive: boolean;
};

const PRELOADED_AVATARS: { id: string; label: string; emoji: string }[] = [
  { id: "rocket", label: "Rocket Hero", emoji: "🚀" },
  { id: "dino", label: "Friendly Dino", emoji: "🦕" },
  { id: "unicorn", label: "Magic Unicorn", emoji: "🦄" },
  { id: "pilot", label: "Tiny Pilot", emoji: "🧑‍✈️" },
];

const GAME_METADATA: Record<
  GameId,
  {
    name: string;
    tagline: string;
    skills: string[];
    difficulty: "Easy" | "Medium";
    category: "Memory" | "Problem Solving" | "Attention & Coordination";
    emoji: string;
    montessoriGoals?: string[];
    waldorfGoals?: string[];
    intelligences?: string[];
  }
> = {
  memory: {
    name: "Match the Pairs",
    tagline: "Flip the cards and find the twins!",
    skills: ["Memory", "Focus", "Pattern spotting"],
    difficulty: "Medium",
    category: "Memory",
    emoji: "🃏",
    montessoriGoals: ["Concentration", "Order", "Refined visual discrimination"],
    waldorfGoals: ["Imagination with visual motifs", "Rhythmic practice"],
    intelligences: ["Visual-Spatial", "Logical-Mathematical"],
  },
  digging: {
    name: "Treasure Dig",
    tagline: "Tap to dig and find the hidden gem!",
    skills: ["Patience", "Guessing", "Basic strategy"],
    difficulty: "Easy",
    category: "Problem Solving",
    emoji: "💎",
    montessoriGoals: ["Sensorial exploration", "Cause & effect"],
    waldorfGoals: ["Nature play", "Story-based discovery"],
    intelligences: ["Bodily-Kinesthetic", "Naturalist"],
  },
  boots: {
    name: "Isabelle’s Boots",
    tagline: "Help Isabelle pick matching colorful boots!",
    skills: ["Color matching", "Attention to detail"],
    difficulty: "Easy",
    category: "Attention & Coordination",
    emoji: "👢",
    montessoriGoals: ["Color discrimination", "Practical life matching"],
    waldorfGoals: ["Artful color play", "Rhythmic repetition"],
    intelligences: ["Visual-Spatial", "Interpersonal"],
  },
  airplanes: {
    name: "Airplane Catch",
    tagline: "Catch the flying planes before they zoom away!",
    skills: ["Hand-eye coordination", "Reaction time"],
    difficulty: "Easy",
    category: "Attention & Coordination",
    emoji: "✈️",
    montessoriGoals: ["Gross motor timing", "Hand-eye coordination"],
    waldorfGoals: ["Imaginative movement", "Narrative play"],
    intelligences: ["Bodily-Kinesthetic", "Spatial"],
  },
};

// Background music choices. Use the app `public/sounds/` folder for bundled tracks.
const MUSIC_TRACKS: { key: string; label: string; emoji: string; path: string }[] = [
  { key: "silent", label: "Silent", emoji: "🔇", path: "" },
  { key: "tides", label: "Tides", emoji: "🌊", path: `${_BASE}sounds/tides-and-smiles.mp3` },
  { key: "happy", label: "Happy", emoji: "☀️", path: `${_BASE}sounds/happy-day.mp3` },
  { key: "playful", label: "Playful", emoji: "🎈", path: `${_BASE}sounds/playful.mp3` },
  { key: "chill", label: "Chill", emoji: "🌴", path: `${_BASE}sounds/chill-pulse.mp3` },
  { key: "love", label: "Love", emoji: "💖", path: `${_BASE}sounds/love-in-japan.mp3` },
];

// createConfetti and playSound now live in utils modules

const App: React.FC = () => {
  const [player, setPlayer] = useState<PlayerProfile>(() => {
    try {
      const raw = localStorage.getItem("playerProfile");
      if (raw) return JSON.parse(raw) as PlayerProfile;
    } catch (e) {
      // ignore
    }
    return { name: "", age: null, avatarUrl: null, points: 0, learningProfile: {} };
  });

  // persist player profile locally
  useEffect(() => {
    try {
      localStorage.setItem("playerProfile", JSON.stringify(player));
    } catch (e) {}
  }, [player]);

  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [showParentOverlay, setShowParentOverlay] = useState<boolean>(false);
  const [showPlayersOverlay, setShowPlayersOverlay] = useState<boolean>(false);
  const [showAboutOverlay, setShowAboutOverlay] = useState<boolean>(false);
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [showTour, setShowTour] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<{
    gameId: GameId | null;
    visible: boolean;
  }>({ gameId: null, visible: false });
  const [musicKey, setMusicKey] = useState<string>(() => {
    try {
      return player.musicKey || localStorage.getItem("musicKey") || "silent";
    } catch (e) {
      return "silent";
    }
  });
  const [musicVolume] = useState<number>(() => {
    try {
      return typeof player.musicVolume === 'number'
        ? player.musicVolume
        : Number(localStorage.getItem("musicVolume") || 0.45);
    } catch (e) {
      return 0.45;
    }
  });
  const [rememberMusic] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("rememberMusic");
      return v === null ? true : v === "1";
    } catch (e) {
      return true;
    }
  });
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const currentMusicKeyRef = useRef<string | null>(null);

  const [showParentalReport, setShowParentalReport] = useState<boolean>(false);
  const [showPrizeShop, setShowPrizeShop] = useState<boolean>(false);
  const [showSkillsOverlay, setShowSkillsOverlay] = useState<boolean>(false);
  const [redeemConfirm, setRedeemConfirm] = useState<{
    open: boolean;
    prize?: string;
    cost?: number;
  }>({ open: false });

  const [tempName, setTempName] = useState("");
  const [tempAge, setTempAge] = useState("");

  // ARIA announcer: use shared hook that listens for `ttt-announce` events
  const { announceText } = useAnnouncer();

  const [screenTime, setScreenTime] = useState<ScreenTimeState>({
    limitMinutes: null,
    remainingSeconds: 0,
    isActive: false,
  });

  // Timer effect for screen time
  useEffect(() => {
    if (!screenTime.isActive || screenTime.remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setScreenTime((prev) => {
        const next = prev.remainingSeconds - 1;
        if (next <= 0) {
          playSound("fail");
          return {
            ...prev,
            remainingSeconds: 0,
            isActive: false,
          };
        }
        return {
          ...prev,
          remainingSeconds: next,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screenTime.isActive, screenTime.remainingSeconds]);

  // Derived “performance” feedback – purely playful & approximate.
  const performanceSummary = useMemo(() => {
    if (!player.age || gameResults.length === 0) {
      return "Play some games to see how you’re doing in each skill area!";
    }

    // Aggregate scores by category and by intelligences
    const byCategory: Record<string, { totalScore: number; games: number }> = {};
    const byIntelligence: Record<string, { totalScore: number; games: number }> = {};
    const montessoriSeen = new Set<string>();
    const waldorfSeen = new Set<string>();

    gameResults.forEach((result) => {
      const meta = GAME_METADATA[result.gameId];
      const category = meta.category;
      if (!byCategory[category]) byCategory[category] = { totalScore: 0, games: 0 };
      byCategory[category].totalScore += result.score;
      byCategory[category].games += 1;

      const ints = meta.intelligences ?? [];
      ints.forEach((i) => {
        if (!byIntelligence[i]) byIntelligence[i] = { totalScore: 0, games: 0 };
        byIntelligence[i].totalScore += result.score;
        byIntelligence[i].games += 1;
      });

      (meta.montessoriGoals ?? []).forEach((g) => montessoriSeen.add(g));
      (meta.waldorfGoals ?? []).forEach((g) => waldorfSeen.add(g));
    });

    const lines: string[] = [];

    Object.entries(byCategory).forEach(([category, data]) => {
      const avg = Math.round(data.totalScore / Math.max(1, data.games));
      lines.push(`${category}: average ${avg}%`);
    });

    Object.entries(byIntelligence).forEach(([intel, data]) => {
      const avg = Math.round(data.totalScore / Math.max(1, data.games));
      lines.push(`${intel}: ${avg}%`);
    });

    if (montessoriSeen.size) {
      lines.push(`Montessori focus: ${[...montessoriSeen].slice(0,3).join(', ')}`);
    }
    if (waldorfSeen.size) {
      lines.push(`Waldorf focus: ${[...waldorfSeen].slice(0,3).join(', ')}`);
    }

    return lines.join(' · ');
  }, [player.age, gameResults]);

  const isLockedByScreenTime =
    screenTime.limitMinutes !== null &&
    (!screenTime.isActive || screenTime.remainingSeconds <= 0);

  const recordGameResult = (
    gameId: GameId,
    score: number,
    attempts: number,
    goals?: { montessori: string[]; waldorf: string[]; intelligences: string[] },
    metrics?: Record<string, number>
  ) => {
    const timestamp = Date.now();

    // persist to local gameResults array (session)
    const result: GameResult = { gameId, score, attempts, timestamp, goals, metrics };
    setGameResults((prev) => [...prev, result]);

    // derive improved metrics
    const derived: Record<string, number> = {};
    // Concentration: prefer avgHoldTime (seconds) -> scale to 0-100 assuming 0-3s range
    if (metrics && typeof metrics.avgHoldTime === 'number') {
      const avg = metrics.avgHoldTime;
      derived.concentration = Math.min(100, Math.round((avg / 3) * 100));
    } else if (metrics && typeof metrics.concentration === 'number') {
      derived.concentration = Math.min(100, Math.round(metrics.concentration));
    }

    // Accuracy: use provided accuracy or compute from score/attempts
    if (metrics && typeof metrics.accuracy === 'number') {
      derived.accuracy = Math.min(100, Math.round(metrics.accuracy));
    } else {
      // normalized accuracy: higher score relative to max (100) and fewer attempts
      const attemptFactor = Math.max(1, attempts);
      derived.accuracy = Math.min(100, Math.round((score / 100) * 100 * (1 / attemptFactor) * 1.5));
    }

    // Reaction score: use reactionScore if supplied, otherwise base on score and attempts
    if (metrics && typeof metrics.reactionScore === 'number') {
      derived.reactionScore = Math.min(100, Math.round(metrics.reactionScore));
    } else {
      derived.reactionScore = Math.min(100, Math.round(score * 0.9));
    }

    // Persistence: for digging-like tasks, fewer digs = higher persistence score
    if (metrics && typeof metrics.persistence === 'number') {
      const p = metrics.persistence; // attempts
      derived.persistence = Math.max(0, Math.min(100, Math.round(100 - (p - 1) * 12)));
    }

    // Award points scaled by performance and difficulty
    const basePoints = Math.max(1, Math.round(score / 12));
    // bonus for concentration/accuracy/reactive
    const bonus = Math.round(((derived.concentration || 0) + (derived.accuracy || 0) + (derived.reactionScore || 0)) / 300 * 5);
    const earnedPoints = basePoints + bonus;

    // update player profile with learningProfile aggregates and histories
    setPlayer((prev) => {
      const lp = { ...(prev.learningProfile ?? {}) } as Record<string, number>;
      if (goals && goals.intelligences) {
        goals.intelligences.forEach((i) => {
          lp[i] = (lp[i] || 0) + score;
        });
      }
      if (goals && goals.montessori) {
        goals.montessori.forEach((g) => {
          lp[g] = (lp[g] || 0) + score;
        });
      }
      if (goals && goals.waldorf) {
        goals.waldorf.forEach((g) => {
          lp[g] = (lp[g] || 0) + score;
        });
      }

      // aggregate derived metrics into profile too
      Object.entries(derived).forEach(([k, v]) => {
        lp[k] = (lp[k] || 0) + v;
      });

      // append to per-player gameResults history and pointsHistory
      const prevResults = prev.gameResults ?? [];
      const prevPoints = prev.pointsHistory ?? [];
      const newResults = [...prevResults, result];
      const newPoints = [...prevPoints, { timestamp, delta: earnedPoints, reason: gameId }];
      const newPointsTotal = (prev.points || 0) + earnedPoints;

      return {
        ...prev,
        points: newPointsTotal,
        learningProfile: lp,
        gameResults: newResults,
        pointsHistory: newPoints,
      };
    });
  };

  const canPlay = !isLockedByScreenTime;

  const showArcade = !selectedGame;

  // Calculate best score for the active game
  const bestScore = useMemo(() => {
    if (!selectedGame) return 0;
    // Check session results
    const sessionBest = gameResults
      .filter((r) => r.gameId === selectedGame)
      .reduce((max, r) => Math.max(max, r.score), 0);
    // Check persisted profile results
    const profileBest = (player.gameResults || [])
      .filter((r) => r.gameId === selectedGame)
      .reduce((max, r) => Math.max(max, r.score), 0);
    return Math.max(sessionBest, profileBest);
  }, [selectedGame, gameResults, player.gameResults]);

  // Handle selecting a game: show tutorial first time, otherwise enter game
  const handleSelectGame = (gameId: GameId) => {
    if (!canPlay) return;
    playAlternateClick();
    const key = `seenTutorial:${gameId}`;
    if (!localStorage.getItem(key)) {
      setShowTutorial({ gameId, visible: true });
      return;
    }
    setSelectedGame(gameId);
  };

  // Background music control helpers
  const setBackgroundMusic = (key: string, autoplay = true) => {
    // if same music is already active, just ensure it plays if requested
    if (musicRef.current && currentMusicKeyRef.current === key) {
      if (autoplay && musicRef.current.paused) {
        musicRef.current.play().then(() => setIsMusicPlaying(true)).catch(() => setIsMusicPlaying(false));
      }
      return;
    }

    // stop previous
    if (musicRef.current) {
      try {
        musicRef.current.pause();
        musicRef.current.currentTime = 0;
      } catch (e) {
        // ignore
      }
      musicRef.current = null;
    }

    setMusicKey(key);
    currentMusicKeyRef.current = key;
    // if the user has a player profile and chose to remember, persist to their profile
    if (rememberMusic) {
      setPlayer((p) => ({ ...p, musicKey: key, musicVolume: musicVolume }));
      try {
        localStorage.setItem('musicKey', key);
      } catch (e) {}
    }
    if (key === "silent") {
      setIsMusicPlaying(false);
      return;
    }

    const track = MUSIC_TRACKS.find((t) => t.key === key);
    if (!track || !track.path) {
      setIsMusicPlaying(false);
      return;
    }

    const audio = new Audio(track.path);
    audio.loop = true;
    audio.volume = musicVolume;
    musicRef.current = audio;
    if (autoplay) {
      audio.play().then(() => setIsMusicPlaying(true)).catch(() => setIsMusicPlaying(false));
    }
  };

  const toggleMusicPlay = () => {
    if (!musicRef.current) {
      if (musicKey && musicKey !== "silent") {
        setBackgroundMusic(musicKey, true);
      }
      return;
    }
    if (isMusicPlaying) {
      musicRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      musicRef.current.play().then(() => setIsMusicPlaying(true)).catch(() => setIsMusicPlaying(false));
    }
  };

  useEffect(() => {
    // clean up audio on unmount
    return () => {
      if (musicRef.current) {
        try {
          musicRef.current.pause();
        } catch (e) {}
        musicRef.current = null;
      }
    };
  }, []);

  // apply persisted music choice on mount
  useEffect(() => {
    if (musicKey && musicKey !== "silent") {
      setBackgroundMusic(musicKey, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // listen for prize shop open events from PlayersOverlay
  useEffect(() => {
    const handler = () => setShowPrizeShop(true);
    window.addEventListener('openPrizeShop', handler as EventListener);
    return () => window.removeEventListener('openPrizeShop', handler as EventListener);
  }, []);

  // when volume changes, update current audio and persist
  useEffect(() => {
    if (musicRef.current) {
      try {
        musicRef.current.volume = musicVolume;
      } catch (e) {}
    }
    try {
      if (rememberMusic) localStorage.setItem("musicVolume", String(musicVolume));
    } catch (e) {}
  }, [musicVolume, rememberMusic]);

  return (
    <div className={`app-root ${selectedGame ? "in-game" : ""}`}>
      <GlobalEffects />

      <header className="app-header" aria-label="Tripp's Tricky Tetraverse">
        <div className="header-main">
          <div className="header-text-block">
            <h1 className="app-title design-title" aria-label="Tripp's Tricky Tetraverse">
              Tripp's Tricky Tetraverse
            </h1>
            <p className="app-subtitle design-subtitle" style={{ fontFamily: '"Rubik Bubbles", cursive', letterSpacing: '0.05em' }}>an All Four You arcade</p>
          </div>
        </div>
      </header>

      {/* Main Navigation Bar */}
      <nav className="main-overlay-nav" id="tour-nav">
        <ul className="overlay-list">
          <li>
            <button className="overlay-nav-btn interactive-hover" onClick={() => setShowPlayersOverlay(true)}>
              Players {player.avatarUrl ? '🙂' : ''}
            </button>
          </li>
          <li>
            <button className="overlay-nav-btn interactive-hover" onClick={() => setShowPrizeShop(true)}>
              Prize Shop 🏆
            </button>
          </li>
          <li>
            <button className="overlay-nav-btn interactive-hover" onClick={() => setShowSkillsOverlay(true)}>
              Skills Built 📊
            </button>
          </li>
          <li>
            <button className="overlay-nav-btn interactive-hover" onClick={() => setShowParentOverlay(true)}>
              Parents 🛡️
            </button>
          </li>
          <li>
            <button className="overlay-nav-btn interactive-hover" onClick={() => setShowAboutOverlay(true)}>
              About ℹ️
            </button>
          </li>
        </ul>
      </nav>

      {/* Player Profile & Points Section */}
      <section className="profile-section" id="tour-profile" aria-label="Current Player">
        {!player.name ? (
          <div className="profile-setup" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Who is playing?</h3>
            <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '320px' }}>
              <input 
                type="text" 
                placeholder="Name" 
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '12px', border: '1px solid #ccc' }}
              />
              <input 
                type="number" 
                placeholder="Age" 
                value={tempAge}
                onChange={(e) => setTempAge(e.target.value)}
                style={{ width: '70px', padding: '8px', borderRadius: '12px', border: '1px solid #ccc' }}
              />
            </div>
            <button 
              className="primary-button" 
              disabled={!tempName}
              onClick={() => {
                setPlayer(p => ({ ...p, name: tempName, age: tempAge ? parseInt(tempAge) : null }));
                playSound('success');
              }}
              style={{ width: '100%', maxWidth: '320px', justifyContent: 'center' }}
            >
              Let's Play!
            </button>
          </div>
        ) : (
          <div 
            className="profile-card interactive-hover" 
            onClick={() => setShowPlayersOverlay(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar-preview-box" style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--color-accent)', background: '#fff' }}>
                {player.avatarUrl ? (
                  player.avatarUrl.startsWith("preloaded:") ? (
                    <span style={{ fontSize: '2rem' }}>
                      {PRELOADED_AVATARS.find((a) => `preloaded:${a.id}` === player.avatarUrl)?.emoji}
                    </span>
                  ) : (
                    <img src={player.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  )
                ) : (
                  <span style={{ fontSize: '2rem' }}>🙂</span>
                )}
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, fontFamily: 'var(--font-display)' }}>{player.name}</h2>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {player.age ? `${player.age} years old` : 'Ready to play!'}
                </p>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
                {player.points || 0} <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>pts</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '140px', lineHeight: 1.2 }}>
                Save up for the <strong>Prize Shop</strong>!
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Music Choice Section */}
      <section className="music-choice-section" aria-label="Music Selection">
        <h3 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem 0' }}>🎵 Music Choice 🎵</h3>
        <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>
          Tap a button to change the music!
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          <button 
            className="music-tile interactive-hover" 
            onClick={toggleMusicPlay} 
            style={{ minWidth: '60px', background: isMusicPlaying ? 'var(--accent-soft)' : '#eee' }}
          >
            {isMusicPlaying ? '⏸' : '▶️'}
          </button>
          {MUSIC_TRACKS.map(t => (
            <button 
              key={t.key}
              className={`music-tile interactive-hover ${musicKey === t.key ? 'music-tile-selected' : ''}`}
              onClick={() => setBackgroundMusic(t.key, true)}
            >
              <span style={{ fontSize: '1.4rem' }}>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </section>



      {showIntro && (
        <IntroBanner
          onBegin={() => {
            setShowIntro(false);
            setShowTour(true);
          }}
        />
      )}

      {showTour && (
        <TourOverlay onClose={() => setShowTour(false)} />
      )}

      {/* ARIA live region for dynamic announcements */}
      <div aria-live="polite" aria-atomic="true" style={{position:'absolute',left:-9999,top:'auto',width:1,height:1,overflow:'hidden'}}> {announceText} </div>

      {/* Arcade vs specific game */}
      {showArcade ? (
        <ArcadeView canPlay={canPlay} onSelectGame={handleSelectGame} />
      ) : selectedGame ? (
        <GameView
          gameId={selectedGame}
          onBackToArcade={() => setSelectedGame(null)}
          onGameResult={recordGameResult}
          canPlay={canPlay}
          onRequestTutorial={() =>
            setShowTutorial({ gameId: selectedGame, visible: true })
          }
          currentPoints={player.points || 0}
          bestScore={bestScore}
        />
      ) : null}

      {/* Tutorials: show before entering the actual game */}
      {showTutorial.visible && showTutorial.gameId && (
        <TutorialModal
          gameId={showTutorial.gameId}
          onClose={() => {
            const key = `seenTutorial:${showTutorial.gameId}`;
            try {
              localStorage.setItem(key, "1");
            } catch (e) {
              // ignore storage errors
            }
            setShowTutorial({ gameId: null, visible: false });
            setSelectedGame(showTutorial.gameId);
          }}
        />
      )}

      {/* Parent overlay */}
      {showParentOverlay && (
        <ParentOverlay
          onClose={() => setShowParentOverlay(false)}
          onOpenReport={() => {
            setShowParentOverlay(false);
            setShowParentalReport(true);
          }}
          screenTime={screenTime}
          onSetScreenTime={(min) => {
            playSound("click");
            setScreenTime({
              limitMinutes: min,
              remainingSeconds: min * 60,
              isActive: true,
            });
          }}
        />
      )}

      {showParentalReport && (
        <ParentalReport player={player} gameResults={gameResults} onClose={() => setShowParentalReport(false)} />
      )}
      {showPrizeShop && (
        <PrizeShop
          player={player}
          onClose={() => setShowPrizeShop(false)}
          onRedeem={(cost, prize) => {
            // Redeem: deduct points, append to inventory and pointsHistory, and show confirmation
            setPlayer((p) => {
              const remaining = Math.max(0, (p.points || 0) - cost);
              const inv = [...(p.inventory || []), prize];
              const ph = [...(p.pointsHistory || []), { timestamp: Date.now(), delta: -cost, reason: `redeem:${prize}` }];
              return { ...p, points: remaining, inventory: inv, pointsHistory: ph };
            });
            setRedeemConfirm({ open: true, prize, cost });
          }}
        />
      )}

      {redeemConfirm.open && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h2>Redeemed!</h2>
            <p>
              You redeemed <strong>{redeemConfirm.prize}</strong> for <strong>{redeemConfirm.cost}</strong> points.
            </p>
            <p style={{fontSize:'0.95rem'}}>Inventory updated for {player.name || 'Player'}.</p>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button className="primary-button" onClick={() => { setRedeemConfirm({open:false}); setShowPrizeShop(false); }}>Done</button>
            </div>
            <FooterBrand />
          </div>
        </div>
      )}

      {showPlayersOverlay && (
        <PlayersOverlay
          player={player}
          onClose={() => setShowPlayersOverlay(false)}
          onSave={(p) => {
            setPlayer(p);
            setShowPlayersOverlay(false);
          }}
          performanceSummary={performanceSummary}
        />
      )}

      {showAboutOverlay && (
        <AboutOverlay onClose={() => setShowAboutOverlay(false)} />
      )}

      {showSkillsOverlay && (
        <SkillsOverlay 
          player={player} 
          onClose={() => setShowSkillsOverlay(false)} 
          performanceSummary={performanceSummary}
        />
      )}

      {/* Only show footer on main (arcade) page */}
      {showArcade && (
        <footer className="app-footer">
          <p>
            built with ❤️ by{" "}
            <a
              href="https://github.com/ashleyer"
              target="_blank"
              rel="noreferrer"
            >
              aeromano
            </a>{" "}
            in Boston
          </p>
        </footer>
      )}
    </div>
  );
};

// small branded footer used in modals and views is provided by `FooterBrand` component

interface ArcadeViewProps {
  canPlay: boolean;
  onSelectGame: (gameId: GameId) => void;
}

const ArcadeView: React.FC<ArcadeViewProps> = ({ canPlay, onSelectGame }) => {
  const [index, setIndex] = useState(0);
  const gameIds: GameId[] = ["memory", "digging", "boots", "airplanes"];

  const currentGameId = gameIds[index];
  const currentGame = GAME_METADATA[currentGameId];

  const next = () => {
    playAlternateClick();
    setIndex((prev) => (prev + 1) % gameIds.length);
  };

  const prev = () => {
    playAlternateClick();
    setIndex((prev) => (prev - 1 + gameIds.length) % gameIds.length);
  };

  return (
    <section
      className="arcade-section"
      id="tour-arcade"
      aria-label="Game selection carousel"
      aria-live="polite"
    >
      <div className="arcade-heading-block">
        <h2 className="arcade-title design-title">Pick a Game from the Arcade</h2>
        <p className="arcade-blurb">
          Pick from 4 tricky games! Play to learn new skills and earn points.
        </p>
      </div>

      <div className="carousel-wrapper">
        <button
          type="button"
          className="carousel-nav parent-button overlay-nav-btn interactive-hover"
          onClick={prev}
          aria-label="Previous game"
        >
          ◀
        </button>

        <article className="game-card" aria-roledescription="slide">
          <p className="game-pill">
            #{index + 1} of {gameIds.length}
          </p>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }} aria-hidden="true">
            {currentGame.emoji}
          </div>
          <h3>{currentGame.name}</h3>
          <p className="game-tagline">{currentGame.tagline}</p>
          <p className="game-meta">
            Difficulty: <strong>{currentGame.difficulty}</strong> · Category:{" "}
            <strong>{currentGame.category}</strong>
          </p>
          <div className="skills-list">
            {currentGame.skills.map((skill) => (
              <span key={skill} className="skill-chip">
                {skill}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 'auto', width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '1rem' }}>
            <button
              type="button"
              className="primary-button game-play-button interactive-hover"
              onClick={() => onSelectGame(currentGameId)}
              disabled={!canPlay}
              aria-disabled={!canPlay}
            >
              {canPlay ? "Play this game" : "Screen time is up"}
            </button>
          </div>
        </article>

        <button
          type="button"
          className="carousel-nav parent-button overlay-nav-btn interactive-hover"
          onClick={next}
          aria-label="Next game"
        >
          ▶
        </button>
      </div>
    </section>
  );
};

interface GameViewProps {
  gameId: GameId;
  onBackToArcade: () => void;
  onGameResult: (
    gameId: GameId,
    score: number,
    attempts: number,
    goals?: { montessori: string[]; waldorf: string[]; intelligences: string[] },
    metrics?: Record<string, number>
  ) => void;
  canPlay: boolean;
  onRequestTutorial?: () => void;
  currentPoints: number;
  bestScore: number;
}

const GameView: React.FC<GameViewProps> = ({
  gameId,
  onBackToArcade,
  onGameResult,
  canPlay,
  onRequestTutorial,
  currentPoints,
  bestScore,
}) => {
  const meta = GAME_METADATA[gameId];
  const [paused, setPaused] = useState(false);

  return (
    <section className="game-section game-enter-active" aria-label={meta.name}>
      <div className="game-header">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="game-control-btn interactive-hover"
            onClick={onBackToArcade}
            aria-label="Back to arcade"
            title="Back"
          >
            ⬅️
          </button>
        </div>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <h2>{meta.name} <span aria-hidden>{meta.emoji}</span></h2>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>Points: <strong>{currentPoints}</strong></span>
            <span>Best: <strong>{bestScore}</strong></span>
          </div>
        </div>

        <div className="game-controls">
          <button
            type="button"
            className="game-control-btn interactive-hover"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? 'Resume game' : 'Pause game'}
            title={paused ? 'Resume' : 'Pause'}
          >
            {paused ? '▶️' : '⏸️'}
          </button>

          <button
            type="button"
            className="game-control-btn interactive-hover"
            onClick={() => onRequestTutorial && onRequestTutorial()}
            aria-label="Show directions"
            title="Directions"
          >
            💡
          </button>

          <button
            type="button"
            className="game-control-btn interactive-hover"
            onClick={onBackToArcade}
            aria-label="Quit to main carousel"
            title="Quit"
          >
            🏁
          </button>
        </div>
      </div>

      {!canPlay && (
        <p className="game-locked-note">
          Screen time has finished for now. Games are paused so kids can rest
          their eyes and do something offline.
        </p>
      )}

      {canPlay && (
        <div className={`game-inner ${paused ? 'paused' : ''}`}>
          {paused && (
            <div className="pause-overlay" role="status" aria-live="polite" style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{background:'rgba(255,255,255,0.9)',padding:20,borderRadius:12,boxShadow:'var(--shadow-subtle)'}}>
                <p style={{margin:0,fontSize:'1.1rem',color:'var(--text-main)'}}>Paused</p>
                <div style={{marginTop:8,display:'flex',gap:8,justifyContent:'center'}}>
                  <button className="primary-button" onClick={() => setPaused(false)}>Resume</button>
                </div>
              </div>
            </div>
          )}

          {gameId === "memory" && (
            <MemoryGame
              onFinish={(score, attempts, metrics) =>
                onGameResult(
                  "memory",
                  score,
                  attempts,
                  {
                    montessori: meta.montessoriGoals ?? [],
                    waldorf: meta.waldorfGoals ?? [],
                    intelligences: meta.intelligences ?? [],
                  },
                  metrics
                )
              }
            />
          )}
          {gameId === "digging" && (
            <DiggingGame
              onFinish={(score, attempts, metrics) =>
                onGameResult(
                  "digging",
                  score,
                  attempts,
                  {
                    montessori: meta.montessoriGoals ?? [],
                    waldorf: meta.waldorfGoals ?? [],
                    intelligences: meta.intelligences ?? [],
                  },
                  metrics
                )
              }
            />
          )}
          {gameId === "boots" && (
            <BootsGame
              onFinish={(score, attempts, metrics) =>
                onGameResult(
                  "boots",
                  score,
                  attempts,
                  {
                    montessori: meta.montessoriGoals ?? [],
                    waldorf: meta.waldorfGoals ?? [],
                    intelligences: meta.intelligences ?? [],
                  },
                  metrics
                )
              }
            />
          )}
          {gameId === "airplanes" && (
            <AirplanesGame
              onFinish={(score, attempts, metrics) =>
                onGameResult(
                  "airplanes",
                  score,
                  attempts,
                  {
                    montessori: meta.montessoriGoals ?? [],
                    waldorf: meta.waldorfGoals ?? [],
                    intelligences: meta.intelligences ?? [],
                  },
                  metrics
                )
              }
            />
          )}
        </div>
      )}
    </section>
  );
};

// Game implementations moved to `src/games/*` for better modularity and testability.

// --- Parent Overlay ---
// --- Parent Overlay ---
interface ParentOverlayProps {
  onClose: () => void;
  onOpenReport?: () => void;
  screenTime: ScreenTimeState;
  onSetScreenTime: (minutes: number) => void;
}

const ParentOverlay: React.FC<ParentOverlayProps> = ({ onClose, onOpenReport, screenTime, onSetScreenTime }) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const min = Number(formData.get('minutes'));
    if (min > 0) onSetScreenTime(min);
  };

  return (
    <div
      className="modal-backdrop parent-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Information for parents"
    >
      <div className="modal-content parent-modal-content">
        <h2>For Parents & Caregivers</h2>
        
        <div style={{background: 'rgba(30, 80, 200, 0.06)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem'}}>
          <h3 style={{marginTop:0, fontSize:'1.1rem'}}>Screen Time Controls</h3>
          <form onSubmit={handleSubmit} style={{display:'flex', gap:'8px', alignItems:'flex-end'}}>
            <label className="form-label" style={{marginBottom:0}}>
              Set Limit (minutes)
              <input type="number" name="minutes" min="1" max="120" placeholder="e.g. 20" style={{width:'100px'}} />
            </label>
            <button type="submit" className="primary-button" style={{padding:'0.5rem 1rem', fontSize:'0.9rem'}}>Set</button>
          </form>
          <p style={{fontSize:'0.9rem', color:'var(--text-muted)', marginTop:'8px'}}>
            {screenTime.isActive 
              ? `Time remaining: ${Math.floor(screenTime.remainingSeconds / 60)}m ${screenTime.remainingSeconds % 60}s` 
              : screenTime.limitMinutes ? "Time's up!" : "No active limit."}
          </p>
        </div>

        <p>
          This little arcade was designed to be <strong>gentle, low-pressure, and kid-friendly</strong>.
          There are no ads, no in-app purchases, and no hidden chats. Everything runs locally in your child’s browser.
        </p>
        
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="secondary-button" onClick={() => setShowDetails((s) => !s)} aria-expanded={showDetails}>
            {showDetails ? 'Hide details' : 'More info'}
          </button>
          {onOpenReport && (
            <button type="button" className="secondary-button" onClick={onOpenReport}>
              View Parental Report
            </button>
          )}
          <button
            type="button"
            className="primary-button"
            onClick={onClose}
            autoFocus
            style={{ marginLeft: 'auto' }}
          >
            Close
          </button>
        </div>

        {showDetails && (
          <div style={{ marginTop: 12, fontSize: '0.92rem', color: 'var(--text-muted)' }}>
            <p>
              This app stores lightweight, local reports and planned future features (emotion tracking, AI suggestions, exportable reports) are described in the README; any such features will be opt-in and privacy-first.
            </p>
            <p>
              Everything stays on this device unless you explicitly export or share a report. If you have concerns, email <a href="mailto:ashleye.romano@gmail.com">ashleye.romano@gmail.com</a>.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

// --- Intro Banner ---
interface IntroBannerProps {
  onBegin: () => void;
}

const IntroBanner: React.FC<IntroBannerProps> = ({ onBegin }) => {
  const slides = [
    { emoji: '🧠', title: 'Match the Pairs' },
    { emoji: '💎', title: 'Treasure Dig' },
    { emoji: '👢', title: 'Isabelle\'s Boots' },
    { emoji: '✈️', title: 'Airplane Catch' },
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="modal-backdrop intro-banner" role="dialog" aria-modal="true">
      <div className="modal-content intro-content" style={{ textAlign: 'center' }}>
        <div className="intro-carousel" aria-hidden>
          {slides.map((s, i) => (
            <div key={s.title} className={`intro-slide ${i === idx ? 'active' : ''}`}>
              <div className="intro-emoji" aria-hidden>
                {s.emoji}
              </div>
              <div className="intro-title">{s.title}</div>
            </div>
          ))}
        </div>
        <h1 style={{ fontSize: '1.6rem', margin: '0.8rem 0 0.2rem' }}>Tripp's Tricky Tetraverse</h1>
        
        <div style={{ margin: '0.6rem 0' }}>
          <button className="primary-button" onClick={onBegin} style={{ fontSize: '1rem' }}>
            Tap to Begin
          </button>
        </div>
        <h2 style={{ fontFamily: '"Bubblegum Sans", cursive', color: 'var(--color-accent)', marginTop: '1rem' }}>Happy Fourth Birthday, Tripp!</h2>
      </div>
    </div>
  );
};

// --- Tutorial Modal ---
interface TutorialModalProps {
  gameId: GameId;
  onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ gameId, onClose }) => {
  const title = GAME_METADATA[gameId].name;
  let body: React.ReactNode = null;
  switch (gameId) {
    case "memory":
      body = (
        <>
          <p>Flip two cards at a time. If they match, they stay face up.</p>
          <p>Try to remember where the pictures are and match all pairs.</p>
        </>
      );
      break;
    case "digging":
      body = (
        <>
          <p>Tap a square to dig. One square hides a treasure.</p>
          <p>Keep digging until you find the gem!</p>
        </>
      );
      break;
    case "boots":
      body = (
        <>
          <p>Find the boot that matches the color shown at the top.</p>
          <p>Tap the boot you think matches — good luck!</p>
        </>
      );
      break;
    case "airplanes":
      body = (
        <>
          <p>Tap the planes as they fly by. Catch them all to win.</p>
          <p>Be quick — but have fun!</p>
        </>
      );
      break;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content">
        <h2>{title}</h2>
        <div style={{ color: "var(--text-main)" }}>{body}</div>
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem" }}>
          <button
            className="primary-button"
            onClick={onClose}
            autoFocus
            aria-label={`Start ${title}`}
          >
            Start Game
          </button>
          <button
            className="secondary-button"
            onClick={onClose}
            aria-label="Skip tutorial"
          >
            Skip
          </button>
        </div>
        <FooterBrand />
      </div>
    </div>
  );
};

// --- Players Overlay ---
interface PlayersOverlayProps {
  player: PlayerProfile;
  onClose: () => void;
  onSave: (player: PlayerProfile) => void;
  performanceSummary: string;
}

const PlayersOverlay: React.FC<PlayersOverlayProps> = ({ player, onClose, onSave, performanceSummary }) => {
  const [local, setLocal] = useState<PlayerProfile>(player);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadPreview(url);
      setLocal(prev => ({ ...prev, avatarUrl: url }));
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>Player Profile</h2>
        
        <div className="profile-grid" style={{ marginBottom: '1rem' }}>
          <div className="avatar-column">
            <p className="avatar-title">Choose Avatar</p>
            <div className="avatar-list">
              {PRELOADED_AVATARS.map((avatar) => {
                const isSelected = local.avatarUrl === `preloaded:${avatar.id}`;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    className={`avatar-pill ${isSelected ? "avatar-pill-selected" : ""}`}
                    onClick={() => {
                      playSound("click");
                      setLocal((prev) => ({ ...prev, avatarUrl: `preloaded:${avatar.id}` }));
                      setUploadPreview(null);
                    }}
                  >
                    <span className="avatar-emoji">{avatar.emoji}</span>
                  </button>
                );
              })}
            </div>
            <label className="form-label" style={{marginTop:8}}>
              Upload Photo
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </label>
            <div className="avatar-preview-box">
              {local.avatarUrl ? (
                local.avatarUrl.startsWith("preloaded:") ? (
                  <span className="avatar-preview-emoji">
                    {PRELOADED_AVATARS.find((a) => `preloaded:${a.id}` === local.avatarUrl)?.emoji}
                  </span>
                ) : (
                  <img src={uploadPreview ?? local.avatarUrl} alt="Preview" />
                )
              ) : (
                <span className="avatar-placeholder">🙂</span>
              )}
            </div>
          </div>

          <div>
            <label className="form-label">
              Name
              <input
                type="text"
                value={local.name}
                onChange={(e) => setLocal((s) => ({ ...s, name: e.target.value }))}
              />
            </label>
            <label className="form-label">
              Age
              <input
                type="number"
                min={3}
                max={12}
                value={local.age ?? ""}
                onChange={(e) =>
                  setLocal((s) => ({ ...s, age: e.target.value ? Number(e.target.value) : null }))
                }
              />
            </label>
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.03)', padding: '12px', borderRadius: '12px', marginBottom: '1rem' }}>
          <h3 style={{fontSize:'1rem', margin:'0 0 6px 0'}}>Skill Snapshot</h3>
          <p style={{fontSize:'0.9rem', margin:0, color:'var(--text-muted)'}}>{performanceSummary}</p>
        </div>

        <div style={{marginTop:8}}>
          <strong>Inventory:</strong>
          <div style={{marginTop:6, marginBottom: 12}}>
            {(local.inventory && local.inventory.length) ? (
              <ul style={{margin:0, paddingLeft: 20}}>
                {local.inventory.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            ) : (
              <div style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>No redeemed items yet.</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem", flexWrap: 'wrap' }}>
          <button className="primary-button" onClick={() => onSave(local)}>Save Profile</button>
          <button className="secondary-button" onClick={onClose}>Cancel</button>
          <button
            className="secondary-button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openPrizeShop'));
            }}
          >
            Prize Shop ({local.points ?? 0} pts)
          </button>
        </div>
        <FooterBrand />
      </div>
    </div>
  );
};

// --- About Overlay ---
interface AboutOverlayProps {
  onClose: () => void;
}

const AboutOverlay: React.FC<AboutOverlayProps> = ({ onClose }) => {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content">
        <h2>About Tripp's Tricky Tetraverse</h2>
        <p>
          This small arcade was made to celebrate a four-year-old's birthday —
          short, gentle games that focus on matching, digging, picking, and
          catching. It's made to be safe, ad-free, and local to this device.
        </p>
        <p>
          Parents can set a screen-time limit, and the app keeps playful
          progress notes that never leave the browser. The games are short
          and non-competitive — great for little hands and growing minds.
        </p>
        <p style={{ marginTop: '1rem', fontSize: '0.98rem' }}>
          <a
            href="https://github.com/ashleyer/tripp-s-tricky-tetraverse"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--brand-darkgreen)', textDecoration: 'underline' }}
          >
            View this project on GitHub
          </a>
        </p>
        <div style={{ marginTop: "1rem" }}>
          <button className="primary-button" onClick={onClose}>
            Close
          </button>
        </div>
        <FooterBrand />
      </div>
    </div>
  );
};

// --- Parental Report ---
interface ParentalReportProps {
  player: PlayerProfile;
  gameResults: GameResult[];
  onClose: () => void;
}

const ParentalReport: React.FC<ParentalReportProps> = ({ player, gameResults, onClose }) => {
  const totals = player.learningProfile || {};
  const entries = Object.entries(totals).sort((a,b)=> b[1]-a[1]);

  // use persisted per-player results when available
  const allResults = (player.gameResults && player.gameResults.length) ? player.gameResults : gameResults;

  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 30);
  const [fromDate, setFromDate] = useState<string>(defaultFrom.toISOString().slice(0,10));
  const [toDate, setToDate] = useState<string>(today.toISOString().slice(0,10));

  const parseDay = (ts: number) => {
    const d = new Date(ts);
    return d.toISOString().slice(0,10);
  };

  const filteredResults = allResults.filter(r => {
    const day = parseDay(r.timestamp);
    return day >= fromDate && day <= toDate;
  });

  // aggregate plays per day and points per day from player's pointsHistory
  const playsByDay: Record<string, number> = {};
  filteredResults.forEach(r => {
    const day = parseDay(r.timestamp);
    playsByDay[day] = (playsByDay[day] || 0) + 1;
  });

  const pointsHistory = player.pointsHistory ?? [];
  const pointsInRange = pointsHistory.filter(p => {
    const day = parseDay(p.timestamp);
    return day >= fromDate && day <= toDate;
  });

  // convert to arrays sorted by day (not used directly here)

  const totalPlays = filteredResults.length;

  const sparklinePoints = pointsInRange.map(p => p.delta);

  // export helpers
  const exportSVG = (id: string, name: string) => {
    const node = document.getElementById(id) as SVGSVGElement | null;
    if (!node) return;
    const svgData = new XMLSerializer().serializeToString(node);
    const blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}.svg`; a.click(); URL.revokeObjectURL(url);
  };

  const exportPNG = async (id: string, name: string) => {
    const node = document.getElementById(id) as SVGSVGElement | null;
    if (!node) return;
    const svgData = new XMLSerializer().serializeToString(node);
    const svgBlob = new Blob([svgData], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0);
      const png = canvas.toDataURL('image/png');
      const a = document.createElement('a'); a.href = png; a.download = `${name}.png`; a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content">
        <h2>Parental Report — {player.name || 'Player'}</h2>
        <p style={{fontSize:'0.95rem'}}>Points: <strong>{player.points ?? 0}</strong></p>

        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
          <label style={{fontSize:'0.9rem'}}>From <input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} /></label>
          <label style={{fontSize:'0.9rem'}}>To <input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} /></label>
          <div style={{marginLeft:'auto',fontSize:'0.9rem',color:'var(--text-muted)'}}>Plays: {totalPlays}</div>
        </div>

        <h3>Points Timeline</h3>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <svg id="points-spark" width="260" height="60" viewBox={`0 0 ${Math.max(260, sparklinePoints.length*20)} 60`} style={{background:'rgba(255,255,255,0.02)',borderRadius:8}}>
            {(() => {
              if (sparklinePoints.length === 0) return null;
              const max = Math.max(...sparklinePoints.map(Math.abs)) || 1;
              const points = sparklinePoints.map((v,i) => {
                const x = i * 20 + 10; const y = 30 - (v / max) * 24;
                return `${x},${y}`;
              }).join(' ');
              return <polyline fill="none" stroke="#2d6a4f" strokeWidth={2} points={points} />;
            })()}
          </svg>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <button className="secondary-button" onClick={()=>exportSVG('points-spark', `${player.name||'player'}-points`)}>Export SVG</button>
            <button className="secondary-button" onClick={()=>exportPNG('points-spark', `${player.name||'player'}-points`)}>Export PNG</button>
          </div>
        </div>

        <h3 style={{marginTop:12}}>Top practiced skills</h3>
        <ul>
          {entries.slice(0,6).map(([k,v]) => (
            <li key={k}>{k}: {Math.round(v)}</li>
          ))}
        </ul>

        <p style={{fontSize:'0.9rem',color:'var(--text-muted)'}}>
          This is a local, lightweight summary. For richer exportable reports, emotion tracking, or AI-driven suggestions, see the README (planned features).
        </p>

        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button className="primary-button" onClick={onClose}>Close</button>
          <button className="secondary-button" onClick={() => {
            const blob = new Blob([JSON.stringify({player, gameResults: allResults}, null, 2)], {type:'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${player.name||'player'}-report.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}>Export JSON</button>
        </div>
        <FooterBrand />
      </div>
    </div>
  );
};

// --- Prize Shop ---
interface PrizeShopProps {
  player: PlayerProfile;
  onClose: () => void;
  onRedeem: (cost: number, prize: string) => void;
}

const PrizeShop: React.FC<PrizeShopProps> = ({ player, onClose, onRedeem }) => {
  const prizes = [
    { id: 'lollipop', label: '🍭 Lollipop', cost: 5 },
    { id: 'chocolate', label: '🍫 Chocolate Bar', cost: 8 },
    { id: 'pixie', label: '🍬 Giant Pixie Stick', cost: 10 },
    { id: 'kite', label: '🪁 Kite', cost: 15 },
    { id: 'teddy', label: '🧸 Teddy Bear', cost: 20 },
    { id: 'rubix', label: '🧊 Rubix Cube', cost: 25 },
    { id: 'doll', label: '🦸 Action Doll', cost: 30 },
    { id: 'lava', label: '💡 Lava Lamp', cost: 40 },
    { id: 'chess', label: '♟️ Chess Set', cost: 50 },
    { id: 'tshirt', label: '👕 Tetraverse T-shirt', cost: 75 },
  ];

  useEffect(() => {
    playSound('success');
  }, []);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content prize-shop-content">
        <div className="confetti-burst" aria-hidden="true"></div>
        <h2 className="design-title" style={{textAlign:'center', fontSize:'2.2rem', color:'#ff6b6b'}}>🏆 Prize Shop 🏆</h2>
        <p style={{textAlign:'center', fontSize:'1.2rem'}}>
          You have <strong style={{color:'#4cc9f0', fontSize:'1.4rem'}}>{player.points ?? 0}</strong> points!
        </p>
        <p style={{textAlign:'center', fontSize:'0.95rem', color:'var(--text-muted)', margin:'-8px 0 12px 0'}}>
          Tap a prize to buy it!
        </p>
        
        <div className="prize-grid-container" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'12px', maxHeight:'40vh', overflowY:'auto', padding:'8px'}}>
          {prizes.map(p => {
            const canAfford = (player.points || 0) >= p.cost;
            return (
              <button 
                key={p.id} 
                className={`prize-card interactive-hover ${canAfford ? 'affordable' : 'locked'}`}
                onClick={() => canAfford && onRedeem(p.cost, p.label)}
                disabled={!canAfford}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center', padding:'12px',
                  border: canAfford ? '2px solid #4cc9f0' : '2px solid #eee',
                  borderRadius:'16px', background: canAfford ? '#fff' : '#f9f9f9',
                  opacity: canAfford ? 1 : 0.6, cursor: canAfford ? 'pointer' : 'not-allowed'
                }}
              >
                <div style={{fontSize:'2.5rem', marginBottom:'4px'}}>{p.label.split(' ')[0]}</div>
                <div style={{fontSize:'0.9rem', fontWeight:'bold', textAlign:'center'}}>{p.label.split(' ').slice(1).join(' ')}</div>
                <div style={{fontSize:'0.85rem', color: canAfford ? '#0b3d91' : '#999', marginTop:'4px'}}>
                  {p.cost} pts
                </div>
              </button>
            );
          })}
        </div>

        <div style={{marginTop:16, borderTop:'2px dashed #eee', paddingTop:12}}>
          <h3 style={{fontSize:'1.1rem', margin:'0 0 8px 0'}}>🎒 Your Inventory</h3>
          <div style={{display:'flex', flexWrap:'wrap', gap:'8px', minHeight:'60px'}}>
            {(player.inventory && player.inventory.length) ? (
              player.inventory.map((it, i) => (
                <span key={i} className="inventory-item" style={{background:'#fffbe8', padding:'4px 10px', borderRadius:'20px', border:'1px solid #ffd700', fontSize:'0.9rem'}}>
                  {it}
                </span>
              ))
            ) : (
              <div style={{color:'var(--text-muted)', fontSize:'0.9rem', fontStyle:'italic'}}>Your backpack is empty. Play games to earn points!</div>
            )}
          </div>
        </div>

        <div style={{display:'flex', gap:8, marginTop:20, justifyContent:'center'}}>
          <button className="primary-button interactive-hover" onClick={onClose} style={{minWidth:'120px'}}>Close Shop</button>
        </div>
        <FooterBrand />
      </div>
    </div>
  );
};

// --- Skills Overlay ---
interface SkillsOverlayProps {
  player: PlayerProfile;
  onClose: () => void;
  performanceSummary: string;
}

const SkillsOverlay: React.FC<SkillsOverlayProps> = ({ player, onClose, performanceSummary }) => {
  const profile = player.learningProfile || {};
  const maxScore = Math.max(...Object.values(profile), 100);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content">
        <h2 className="design-title" style={{textAlign:'center'}}>📊 Skills Built</h2>
        <p style={{textAlign:'center', color:'var(--text-muted)'}}>Look at how much your brain is growing!</p>
        
        <div style={{margin:'20px 0', display:'flex', flexDirection:'column', gap:'12px'}}>
          {Object.entries(profile).length === 0 ? (
            <p style={{textAlign:'center', fontStyle:'italic'}}>Play some games to see your skills grow!</p>
          ) : (
            Object.entries(profile).map(([skill, score]) => (
              <div key={skill} style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <div style={{width:'120px', fontSize:'0.9rem', fontWeight:'bold', textAlign:'right'}}>{skill}</div>
                <div style={{flex:1, background:'#eee', borderRadius:'10px', height:'16px', overflow:'hidden'}}>
                  <div style={{
                    width: `${Math.min(100, (score / maxScore) * 100)}%`,
                    background: 'linear-gradient(90deg, #4cc9f0, #48dbfb)',
                    height:'100%', borderRadius:'10px',
                    transition: 'width 1s ease-out'
                  }} />
                </div>
                <div style={{width:'40px', fontSize:'0.85rem', color:'#666'}}>{score}</div>
              </div>
            ))
          )}
        </div>

        <div style={{background:'#f0f8ff', padding:'12px', borderRadius:'12px', fontSize:'0.9rem', color:'#0b3d91'}}>
          <strong>Coach's Note:</strong> {performanceSummary}
        </div>

        <div style={{marginTop:20, display:'flex', justifyContent:'center'}}>
          <button className="primary-button interactive-hover" onClick={onClose}>Awesome!</button>
        </div>
        <FooterBrand />
      </div>
    </div>
  );
};

// --- Tour Overlay ---
const TourOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const steps = [
    { id: 'tour-nav', text: "Here is your menu! Check your prizes, skills, or ask a parent for help.", position: 'bottom' },
    { id: 'tour-profile', text: "This is you! See your points and change your avatar here.", position: 'bottom' },
    { id: 'tour-arcade', text: "Pick a game here! Swipe to see more.", position: 'top' },
  ];

  const currentStep = steps[step];
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = document.getElementById(currentStep.id);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [step, currentStep.id]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      playSound('click');
    } else {
      onClose();
      playSound('success');
    }
  };

  if (!targetRect) return null;

  return (
    <div className="tour-overlay" style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      {/* Highlight border with massive shadow to create "hole" effect */}
      <div style={{
        position: 'absolute',
        left: targetRect.left - 4,
        top: targetRect.top - 4,
        width: targetRect.width + 8,
        height: targetRect.height + 8,
        border: '4px solid #ff6b6b',
        borderRadius: '12px',
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        pointerEvents: 'none',
        transition: 'all 0.3s ease'
      }} />

      {/* Tooltip */}
      <div style={{
        position: 'absolute',
        left: Math.max(10, Math.min(window.innerWidth - 310, targetRect.left + (targetRect.width / 2) - 150)),
        top: currentStep.position === 'bottom' ? targetRect.bottom + 20 : targetRect.top - 160,
        width: 300,
        background: 'white',
        padding: '16px',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        pointerEvents: 'auto',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 101
      }}>
        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{currentStep.text}</p>
        <button className="primary-button" onClick={handleNext} style={{ alignSelf: 'center' }}>
          {step === steps.length - 1 ? "Let's Play!" : "Next ➡"}
        </button>
      </div>
    </div>
  );
};

export default App;
