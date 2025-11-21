import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { _BASE, playSound, playAlternateClick } from './utils/sound';
import useAnnouncer from './hooks/useAnnouncer';
import { FooterBrand } from './components/UI';
import { GlobalEffects } from './components/GlobalEffects';
import MemoryGame from './games/MemoryGame';
import DiggingGame from './games/DiggingGame';
import BootsGame from './games/BootsGame';
import AirplanesGame from './games/AirplanesGame';
import { SkillBar } from './Skills';

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
    name: "Truck Match",
    tagline: "Find the matching trucks and tools!",
    skills: ["Memory", "Focus", "Pattern spotting"],
    difficulty: "Medium",
    category: "Memory",
    emoji: "🚜",
    montessoriGoals: ["Concentration", "Order", "Refined visual discrimination"],
    waldorfGoals: ["Imagination with visual motifs", "Rhythmic practice"],
    intelligences: ["Visual-Spatial", "Logical-Mathematical"],
  },
  digging: {
    name: "Looking for Long Shorty's Loot",
    tagline: "Dig up the pirate treasure!",
    skills: ["Patience", "Guessing", "Pirate Luck"],
    difficulty: "Easy",
    category: "Problem Solving",
    emoji: "🏴‍☠️",
    montessoriGoals: ["Sensorial exploration", "Cause & effect"],
    waldorfGoals: ["Nature play", "Story-based discovery"],
    intelligences: ["Bodily-Kinesthetic", "Naturalist"],
  },
  boots: {
    name: "Isabelle’s Boot Designer",
    tagline: "Design your own colorful rain boots!",
    skills: ["Creativity", "Color Matching", "Design"],
    difficulty: "Easy",
    category: "Attention & Coordination",
    emoji: "👢",
    montessoriGoals: ["Color discrimination", "Creative expression"],
    waldorfGoals: ["Artful color play", "Imaginative design"],
    intelligences: ["Visual-Spatial", "Intrapersonal"],
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

const MONTESSORI_FOCUS = Array.from(
  new Set(
    Object.values(GAME_METADATA).flatMap((meta) => meta.montessoriGoals ?? [])
  )
);

const WALDORF_FOCUS = Array.from(
  new Set(
    Object.values(GAME_METADATA).flatMap((meta) => meta.waldorfGoals ?? [])
  )
);

const GAME_SKILL_SUMMARY = Object.values(GAME_METADATA).map((meta) => ({
  name: meta.name,
  category: meta.category,
  skills: meta.skills.slice(0, 3),
}));

// Background music choices. Use the app `public/sounds/` folder for bundled tracks.
const MUSIC_TRACKS: { key: string; label: string; emoji: string; path: string }[] = [
  { key: "silent", label: "Silent", emoji: "🔇", path: "" },
  { key: "tides", label: "Tides", emoji: "🌊", path: `${_BASE}sounds/tides-and-smiles.mp3` },
  { key: "happy", label: "Happy", emoji: "☀️", path: `${_BASE}sounds/happy-day.mp3` },
  { key: "playful", label: "Playful", emoji: "🎈", path: `${_BASE}sounds/playful.mp3` },
  { key: "love", label: "Love", emoji: "💖", path: `${_BASE}sounds/love-in-japan.mp3` },
];

const TOUR_GAME_IDS: GameId[] = ["memory", "digging", "boots", "airplanes"];

const createEmptyPlayer = (): PlayerProfile => ({
  name: "",
  age: null,
  avatarUrl: null,
  points: 0,
  learningProfile: {},
  gameResults: [],
  pointsHistory: [],
  inventory: [],
});

const hydratePlayer = (data?: PlayerProfile | null): PlayerProfile => ({
  ...createEmptyPlayer(),
  ...(data || {}),
});

const loadStoredPlayer = (): PlayerProfile => {
  try {
    const raw = localStorage.getItem("playerProfile");
    if (raw) return hydratePlayer(JSON.parse(raw) as PlayerProfile);
  } catch (e) {
    // ignore storage parsing errors
  }
  return createEmptyPlayer();
};

const loadStoredLastPlayer = (): PlayerProfile | null => {
  try {
    const raw = localStorage.getItem("lastPlayerProfile");
    if (raw) {
      const parsed = hydratePlayer(JSON.parse(raw) as PlayerProfile);
      return parsed.name ? parsed : null;
    }
  } catch (e) {
    // ignore storage parsing errors
  }
  return null;
};

// createConfetti and playSound now live in utils modules

interface WelcomeBackModalProps {
  playerName: string;
  onPlay: () => void;
  onTour: () => void;
  onSwitch: () => void;
}

const WelcomeBackModal: React.FC<WelcomeBackModalProps> = ({ playerName, onPlay, onTour, onSwitch }) => {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ textAlign: 'center', maxWidth: 440 }}>
        <h2>Welcome Back, {playerName}!</h2>
        <div style={{fontSize: '4rem', margin: '20px 0'}}>👋</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px', margin: '0 auto'}}>
          <button className="primary-button" onClick={onPlay} style={{width: '100%'}}>Let's Play!</button>
          <button className="secondary-button" onClick={onTour} style={{width: '100%'}}>Take a Tour</button>
          <button 
            className="text-button" 
            onClick={onSwitch} 
            style={{
              marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-muted)', 
              background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline'
            }}
          >
            Not {playerName}? Switch Player
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProfilePromptModalProps {
  existingName?: string;
  existingDetails?: string;
  onUseExisting: () => void;
  onCreateNew: () => void;
  onSkip: () => void;
}

const ProfilePromptModal: React.FC<ProfilePromptModalProps> = ({ existingName, existingDetails, onUseExisting, onCreateNew, onSkip }) => {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ textAlign: 'center', maxWidth: 440 }}>
        <h2>Parents: Who is playing today?</h2>
        <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>
          Choose to reuse the saved player profile or start fresh with a new kiddo before you hand the device over.
        </p>

        {existingName ? (
          <p style={{ marginTop: 4, fontSize: '0.95rem', color: 'var(--text-main)' }}>
            Last saved player: <strong>{existingDetails || existingName}</strong>
          </p>
        ) : (
          <p style={{ marginTop: 4, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
            No saved player yet.
          </p>
        )}

        {existingName ? (
          <button
            className="primary-button"
            style={{ width: '100%', marginTop: 16 }}
            onClick={onUseExisting}
          >
            Use {existingName}'s Profile
          </button>
        ) : null}

        <button
          className={existingName ? 'secondary-button' : 'primary-button'}
          style={{ width: '100%', marginTop: 12 }}
          onClick={onCreateNew}
        >
          {existingName ? 'Create a New Player' : 'Set Up a Player'}
        </button>

        <button
          className="text-button"
          style={{ marginTop: 16, fontSize: '0.9rem', textDecoration: 'underline', color: 'var(--text-muted)' }}
          onClick={onSkip}
        >
          I'll decide after exploring
        </button>
      </div>
    </div>
  );
};

interface IntroBannerProps {
  onBegin: () => void;
}

const IntroBanner: React.FC<IntroBannerProps> = ({ onBegin }) => {
  const slides = [
    { emoji: '🚜', title: 'Truck Match' },
    { emoji: '🏴‍☠️', title: "Long Shorty's Loot" },
    { emoji: '👢', title: "Isabelle's Boot Designer" },
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
            Let's Begin
          </button>
        </div>
        <h2 style={{ fontFamily: '"Bubblegum Sans", cursive', color: 'var(--color-accent)', marginTop: '1rem' }}>
          Happy Fourth Birthday, Tripp!
        </h2>
      </div>
    </div>
  );
};

function App() {
  const [player, setPlayer] = useState<PlayerProfile>(loadStoredPlayer);
  const [lastPlayer, setLastPlayer] = useState<PlayerProfile | null>(() => {
    const stored = loadStoredLastPlayer();
    if (stored) return stored;
    return player.name ? player : null;
  });
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);

  // persist player profile locally
  useEffect(() => {
    try {
      localStorage.setItem("playerProfile", JSON.stringify(player));
      if (player.name) {
        localStorage.setItem("lastPlayerProfile", JSON.stringify(player));
        setLastPlayer(player);
      }
    } catch (e) {}
  }, [player]);

  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [showParentOverlay, setShowParentOverlay] = useState<boolean>(false);
  const [showPlayersOverlay, setShowPlayersOverlay] = useState<boolean>(false);
  const [showAboutOverlay, setShowAboutOverlay] = useState<boolean>(false);
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [showWelcomeBack, setShowWelcomeBack] = useState<boolean>(false);
  const [showTour, setShowTour] = useState<boolean>(false);
  const [showProfilePrompt, setShowProfilePrompt] = useState<boolean>(false);
  const [tourTargetGameId, setTourTargetGameId] = useState<GameId | null>(null);
  const [showTutorial, setShowTutorial] = useState<{
    gameId: GameId | null;
    visible: boolean;
  }>({ gameId: null, visible: false });
  const [pendingAvatarData, setPendingAvatarData] = useState<string | null>(null);
  const [avatarUploadContext, setAvatarUploadContext] = useState<'current' | 'new'>('current');
  const [musicKey, setMusicKey] = useState<string>(() => {
    try {
      const savedKey = player.musicKey || localStorage.getItem("musicKey");
      if (savedKey) return savedKey;
      // On first load, pick a random track that isn't silent
      const playableTracks = MUSIC_TRACKS.filter(t => t.key !== 'silent');
      const randomTrack = playableTracks[Math.floor(Math.random() * playableTracks.length)];
      return randomTrack.key;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showParentalReport, setShowParentalReport] = useState<boolean>(false);
  const [showPrizeShop, setShowPrizeShop] = useState<boolean>(false);
  const [showSkillsOverlay, setShowSkillsOverlay] = useState<boolean>(false);
  const [redeemConfirm, setRedeemConfirm] = useState<{
    open: boolean;
    prize?: string;
    cost?: number;
  }>({ open: false });

  const [lastPlayedGameId, setLastPlayedGameId] = useState<GameId | null>(null);

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

  const summaryProfile = player.name ? player : lastPlayer;
  const summaryLabel = player.name
    ? 'Active player'
    : summaryProfile?.name
      ? 'Last player on this device'
      : 'Active player';
  const hasActivePlayer = Boolean(player.name);

  const screenTimeMessage = useMemo(() => {
    if (!screenTime.limitMinutes) return "Screen time: No limit set";
    if (screenTime.isActive) {
      const minutesLeft = Math.max(0, Math.floor(screenTime.remainingSeconds / 60));
      const secondsLeft = Math.max(0, screenTime.remainingSeconds % 60);
      return `Screen time: ${minutesLeft}m ${secondsLeft}s left (limit ${screenTime.limitMinutes}m)`;
    }
    return `Screen time limit: ${screenTime.limitMinutes} minutes`;
  }, [screenTime]);

  const lastProfileSummary = useMemo(() => {
    if (!lastPlayer?.name) return "No previous player";
    const ageSuffix = lastPlayer.age ? `, ${lastPlayer.age}` : "";
    return `${lastPlayer.name}${ageSuffix}`;
  }, [lastPlayer]);

  const handleCreateNewPlayer = useCallback(() => {
    playSound('click');
    setTempName("");
    setTempAge("");
    setPendingAvatarData(null);
    setShowCreateForm(true);
    requestAnimationFrame(() => {
      document.getElementById('profile-create-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  const handleQuickCreateSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    setPlayer({
      ...createEmptyPlayer(),
      name: tempName.trim(),
      age: tempAge ? parseInt(tempAge) : null,
      avatarUrl: pendingAvatarData,
    });
    playSound('success');
    setTempName("");
    setTempAge("");
    setShowCreateForm(false);
    setPendingAvatarData(null);
  }, [pendingAvatarData, tempAge, tempName]);

  const handleProfilePromptUseExisting = useCallback(() => {
    if (player.name) {
      setShowProfilePrompt(false);
      return;
    }
    if (lastPlayer) {
      setPlayer(hydratePlayer(lastPlayer));
      setShowCreateForm(false);
      setPendingAvatarData(null);
    }
    setShowProfilePrompt(false);
  }, [lastPlayer, player.name]);

  const handleProfilePromptCreateNew = useCallback(() => {
    setShowProfilePrompt(false);
    handleCreateNewPlayer();
  }, [handleCreateNewPlayer]);

  const handleLoadLastPlayer = useCallback(() => {
    if (!lastPlayer?.name) return;
    setPlayer(hydratePlayer(lastPlayer));
    setShowCreateForm(false);
    setPendingAvatarData(null);
    playSound('success');
  }, [lastPlayer]);

  const requestAvatarUpload = useCallback((context: 'current' | 'new') => {
    setAvatarUploadContext(context);
    requestAnimationFrame(() => {
      fileInputRef.current?.click();
    });
  }, []);

  const handleAvatarFileSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (avatarUploadContext === 'current') {
        setPlayer((p) => ({ ...p, avatarUrl: dataUrl }));
      } else {
        setPendingAvatarData(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }, [avatarUploadContext]);

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false);
    setPendingAvatarData(null);
    setTempName("");
    setTempAge("");
  }, []);

  const endTour = useCallback(() => {
    setShowTour(false);
    setShowProfilePrompt(true);
    setTourTargetGameId(null);
  }, []);

  const handleTourStepChange = useCallback((stepId: string | null) => {
    if (stepId && stepId.startsWith('tour-game-')) {
      const maybeId = stepId.replace('tour-game-', '') as GameId;
      if (TOUR_GAME_IDS.includes(maybeId)) {
        setTourTargetGameId(maybeId);
        return;
      }
    }
    setTourTargetGameId(null);
  }, []);

  // Handle selecting a game: show tutorial first time, otherwise enter game
  const handleSelectGame = (gameId: GameId) => {
    if (!canPlay) return;
    playAlternateClick();
    const key = `seenTutorial:${gameId}`;
    const lastSeen = localStorage.getItem(key);
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (!lastSeen || (now - Number(lastSeen) > oneWeek)) {
      setShowTutorial({ gameId, visible: true });
      return;
    }
    setLastPlayedGameId(gameId);
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
      setBackgroundMusic(musicKey, true); // Autoplay on load
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

  useEffect(() => {
    const raw = localStorage.getItem("playerProfile");
    if (raw) {
      try {
        const p = JSON.parse(raw) as PlayerProfile;
        if (p.name) {
          setPlayer(p);
        }
      } catch (e) {
        // Malformed data, treat as new player
        localStorage.removeItem("playerProfile");
      }
    }
  }, []);

  return (
    <div className={`app-root ${selectedGame ? "in-game" : ""}`} id="tour-start-anchor">
      <GlobalEffects />

      {showIntro && (
        <IntroBanner
          onBegin={() => {
            setShowIntro(false);
            setShowTour(true);
          }}
        />
      )}

      <>
          <div className="sticky-top-bar">
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

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleAvatarFileSelected}
            />

            {/* Main Navigation Bar */}
            <nav className="main-overlay-nav" id="tour-nav">
              <ul className="overlay-list">
                <li>
                  <button
                    id="tour-menu-players"
                    className="overlay-nav-btn interactive-hover"
                    onClick={() => setShowPlayersOverlay(true)}
                  >
                    Players {player.avatarUrl ? '🙂' : ''}
                  </button>
                </li>
                <li>
                  <button
                    id="tour-prize-shop"
                    className="overlay-nav-btn interactive-hover"
                    onClick={() => setShowPrizeShop(true)}
                  >
                    Prize Shop 🏆
                  </button>
                </li>
                <li>
                  <button
                    id="tour-skills"
                    className="overlay-nav-btn interactive-hover"
                    onClick={() => setShowSkillsOverlay(true)}
                  >
                    Skills Built 📊
                  </button>
                </li>
                <li>
                  <button
                    id="tour-parent"
                    className="overlay-nav-btn interactive-hover"
                    onClick={() => setShowParentOverlay(true)}
                  >
                    Parents 🛡️
                  </button>
                </li>
                <li>
                  <button
                    id="tour-about"
                    className="overlay-nav-btn interactive-hover"
                    onClick={() => setShowAboutOverlay(true)}
                  >
                    About ℹ️
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Player Profile & Points Section */}
          <section className="profile-section" id="tour-profile" aria-label="Current Player">
            <div className="profile-summary-card">
              <div className="profile-summary-main">
                <div className="avatar-preview-box profile-summary-avatar" aria-hidden={!summaryProfile?.avatarUrl}>
                  {summaryProfile?.avatarUrl ? (
                    summaryProfile.avatarUrl.startsWith("preloaded:") ? (
                      <span style={{ fontSize: '2.4rem' }}>
                        {PRELOADED_AVATARS.find((a) => `preloaded:${a.id}` === summaryProfile.avatarUrl)?.emoji}
                      </span>
                    ) : (
                      <img src={summaryProfile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    )
                  ) : (
                    <span style={{ fontSize: '2.2rem' }}>🙂</span>
                  )}
                </div>
                <div>
                  <p className="profile-summary-label">{summaryLabel}</p>
                  <h2 className="profile-summary-name">{summaryProfile?.name || 'No player selected'}</h2>
                  <div className="profile-summary-chips">
                    <span className="profile-chip">{summaryProfile?.points ?? 0} pts earned</span>
                    {summaryProfile?.age && (
                      <span className="profile-chip">{summaryProfile.age} yrs</span>
                    )}
                  </div>
                  {!hasActivePlayer && (
                    <p className="profile-empty-hint">
                      {lastPlayer?.name
                        ? `Tap "Load ${lastPlayer.name}" below or create a new profile to start tracking progress.`
                        : 'Create a player profile to start saving points and skill notes.'}
                    </p>
                  )}
                </div>
              </div>
              <div className="profile-summary-meta">
                <div className="screen-time-chip">{screenTimeMessage}</div>
                <div className="last-profile-card">
                  <p className="last-profile-label">Last profile</p>
                  <strong>{lastPlayer?.name || 'None saved yet'}</strong>
                  <p className="last-profile-details">
                    {lastPlayer?.name ? `${lastProfileSummary} • ${lastPlayer.points ?? 0} pts` : 'Play once to store a profile.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <button
                className="secondary-button interactive-hover"
                type="button"
                onClick={() => setShowPlayersOverlay(true)}
              >
                Manage Profiles
              </button>
              <button
                className="ghost-button interactive-hover"
                type="button"
                onClick={handleLoadLastPlayer}
                disabled={!lastPlayer?.name}
              >
                {lastPlayer?.name ? `Load ${lastPlayer.name}` : 'No saved player'}
              </button>
              <button
                className="ghost-button interactive-hover"
                type="button"
                onClick={() => requestAvatarUpload('current')}
                disabled={!hasActivePlayer}
              >
                Upload Photo
              </button>
              <button
                className="primary-button interactive-hover"
                type="button"
                onClick={showCreateForm ? handleCancelCreate : handleCreateNewPlayer}
              >
                {showCreateForm ? 'Hide Create Form' : 'Create New Player'}
              </button>
            </div>

            {showCreateForm && (
              <form
                id="profile-create-form"
                className="profile-setup"
                onSubmit={handleQuickCreateSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px' }}
              >
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Add a new player</h3>
                <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Name"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    style={{ flex: '1 1 180px', padding: '8px', borderRadius: '12px', border: '1px solid #ccc' }}
                  />
                  <input
                    type="number"
                    placeholder="Age"
                    value={tempAge}
                    onChange={(e) => setTempAge(e.target.value)}
                    style={{ width: '90px', padding: '8px', borderRadius: '12px', border: '1px solid #ccc' }}
                  />
                </div>
                <div className="avatar-upload-row">
                  <div className="avatar-preview-box avatar-upload-preview">
                    {pendingAvatarData ? (
                      <img src={pendingAvatarData} alt="Pending avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      <span style={{ fontSize: '1.8rem' }}>🙂</span>
                    )}
                  </div>
                  <div className="avatar-upload-controls">
                    <button
                      type="button"
                      className="secondary-button interactive-hover"
                      onClick={() => requestAvatarUpload('new')}
                    >
                      Upload Photo
                    </button>
                    <span className="avatar-upload-hint">Optional: square photo works best</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={!tempName.trim()}
                    style={{ flex: '1 1 200px', justifyContent: 'center' }}
                  >
                    Save Player
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={handleCancelCreate}
                    style={{ fontSize: '0.9rem', textDecoration: 'underline', color: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Music Choice Section */}
          <section className="music-choice-section" id="tour-music" aria-label="Music Selection">
            <h3 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem 0' }}>🎵 Music Choice 🎵</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>
              Tap a button to change the music!
            </p>
            <div
              id="tour-music-controls"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}
            >
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
        </>
      



      {showTour && (
        <TourOverlay
          onClose={endTour}
          onSkip={endTour}
          onStepChange={handleTourStepChange}
        />
      )}

      {/* ARIA live region for dynamic announcements */}
      <div aria-live="polite" aria-atomic="true" style={{position:'absolute',left:-9999,top:'auto',width:1,height:1,overflow:'hidden'}}> {announceText} </div>
      
      {/* Arcade vs specific game */}
      {showArcade ? (
        <ArcadeView
          canPlay={canPlay}
          onSelectGame={handleSelectGame}
          initialGameId={lastPlayedGameId}
          tourTargetGameId={tourTargetGameId}
        />
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
              localStorage.setItem(key, Date.now().toString());
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
          onClose={() => {
            setShowParentOverlay(false);
          }}
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
            setShowCreateForm(false);
          }}
          performanceSummary={performanceSummary}
          onOpenReport={() => {
            setShowPlayersOverlay(false);
            setShowParentalReport(true);
          }}
          onSwitchPlayer={() => {
            if (window.confirm("Are you sure you want to switch players? This will sign you out.")) {
               setPlayer(createEmptyPlayer());
               setShowPlayersOverlay(false);
               handleCreateNewPlayer();
            }
          }}
        />
      )}

      {showWelcomeBack && (
        <WelcomeBackModal
          playerName={player.name}
          onPlay={() => setShowWelcomeBack(false)}
          onTour={() => {
            setShowWelcomeBack(false);
            setShowTour(true);
          }}
          onSwitch={() => {
            setShowWelcomeBack(false);
            setPlayer(createEmptyPlayer());
            handleCreateNewPlayer();
          }}
        />
      )}

      {showProfilePrompt && (
        <ProfilePromptModal
          existingName={player.name || lastPlayer?.name || undefined}
          existingDetails={player.name ? `${player.name}${player.age ? `, ${player.age}` : ''}` : lastPlayer?.name ? lastProfileSummary : undefined}
          onUseExisting={handleProfilePromptUseExisting}
          onCreateNew={handleProfilePromptCreateNew}
          onSkip={() => setShowProfilePrompt(false)}
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
          onOpenReport={() => setShowParentalReport(true)}
        />
      )}

      {/* Only show footer on main (arcade) page */}
      {showArcade && (
        <footer className="app-footer" id="tour-footer">
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
  initialGameId: GameId | null;
  tourTargetGameId?: GameId | null;
}

const ArcadeView: React.FC<ArcadeViewProps> = ({ canPlay, onSelectGame, initialGameId, tourTargetGameId }) => {
  const gameIds = TOUR_GAME_IDS;
  const [index, setIndex] = useState(() => {
    if (initialGameId) {
      const found = TOUR_GAME_IDS.indexOf(initialGameId);
      return found !== -1 ? found : 0;
    }
    return 0;
  });

  useEffect(() => {
    if (!tourTargetGameId) return;
    const targetIndex = TOUR_GAME_IDS.indexOf(tourTargetGameId);
    if (targetIndex !== -1 && targetIndex !== index) {
      setIndex(targetIndex);
    }
  }, [tourTargetGameId, index]);

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
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
          Swipe left/right or use arrows to explore all games.
        </p>
      </div>

      <div className="carousel-wrapper" id="tour-game-carousel">
        <button
          id="tour-carousel-prev"
          type="button"
          className="carousel-nav parent-button overlay-nav-btn interactive-hover"
          onClick={prev}
          aria-label="Previous game"
        >
          ◀
        </button>

        <article className="game-card" id={`tour-game-${currentGameId}`} aria-roledescription="slide">
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
          id="tour-carousel-next"
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
              onExit={onBackToArcade}
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
              onExit={onBackToArcade}
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
              onExit={onBackToArcade}
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
              onExit={onBackToArcade}
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
  isDisclaimer?: boolean;
}

const ParentOverlay: React.FC<ParentOverlayProps> = ({ onClose, onOpenReport, screenTime, onSetScreenTime, isDisclaimer }) => {
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
          <p style={{fontSize:'0.9rem', color:'var(--text-muted)', margin:'-4px 0 12px 0'}}>
            (Optional) Leave blank for unlimited play.
          </p>
          <form onSubmit={handleSubmit} style={{display:'flex', gap:'8px', alignItems:'flex-end'}}>
            <label className="form-label" style={{marginBottom:0}}>
              Set Limit (minutes)
              <input type="number" name="minutes" min="1" max="120" placeholder="Unlimited" style={{width:'100px'}} />
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
        <div style={{background:'rgba(255,255,255,0.7)', border:'1px dashed #4cc9f0', borderRadius:'14px', padding:'12px 14px', marginBottom:'1rem'}}>
          <h3 style={{marginTop:0}}>What are they practicing?</h3>
          <p style={{fontSize:'0.95rem', marginBottom:'0.6rem'}}>
            Games weave in Montessori elements ({MONTESSORI_FOCUS.slice(0,3).join(', ')}) and Waldorf vibes ({WALDORF_FOCUS.slice(0,3).join(', ')}), keeping play rooted in imagination, order, and movement.
          </p>
          <ul style={{paddingLeft:'1.2rem', margin:'0'}}>
            {GAME_SKILL_SUMMARY.map((game) => (
              <li key={game.name} style={{marginBottom:'0.4rem'}}>
                <strong>{game.name}</strong>: {game.skills.join(', ')}
              </li>
            ))}
          </ul>
          <p style={{fontSize:'0.85rem', color:'var(--text-muted)', marginTop:'0.6rem'}}>Skill snapshots are playful heuristics only—use them as conversation starters, not assessments.</p>
        </div>
        
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
            {isDisclaimer ? "Got it – Let's Play" : "Close"}
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
          <p>Try to remember where the trucks and tools are!</p>
        </>
      );
      break;
    case "digging":
      body = (
        <>
          <p>Tap a spot marked with X to dig.</p>
          <p>Find Long Shorty's hidden loot!</p>
        </>
      );
      break;
    case "boots":
      body = (
        <>
          <p>Pick colors, patterns, and stickers to design a custom boot.</p>
          <p>Tap "Done" when you are happy with your creation!</p>
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
  onOpenReport: () => void;
  onSwitchPlayer: () => void;
}

const PlayersOverlay: React.FC<PlayersOverlayProps> = ({ player, onClose, onSave, performanceSummary, onOpenReport, onSwitchPlayer }) => {
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
          <h3 style={{fontSize:'1rem', margin:'0 0 12px 0'}}>Skill Snapshot</h3>
          
          {Object.keys(player.learningProfile || {}).length > 0 ? (
            (() => {
              const skills = player.learningProfile || {};
              const maxValue = Math.max(...Object.values(skills));
              return Object.entries(skills)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([skill, value]) => (
                  <SkillBar 
                    key={skill}
                    skill={skill}
                    percentage={(value / maxValue) * 100}
                  />
                ));
            })()
          ) : (
            <p style={{fontSize:'0.9rem', margin:0, color:'var(--text-muted)'}}>{performanceSummary}</p>
          )}

          <button 
            className="text-link" 
            onClick={onOpenReport}
            style={{
              background: 'none', border: 'none', padding: 0, 
              color: 'var(--color-accent)', textDecoration: 'underline', 
              cursor: 'pointer', fontSize: '0.9rem', marginTop: '8px'
            }}
          >
            View Parental Report 📊
          </button>
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

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem", flexWrap: 'wrap', alignItems: 'center' }}>
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
          <button 
            className="secondary-button" 
            onClick={onSwitchPlayer}
            style={{marginLeft: 'auto', color: '#d63031', borderColor: '#d63031'}}
          >
            Switch Player
          </button>
        </div>
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
          In honour of my nephew Tripp's fourth Birthday, I ditched a birthday card he cant even read and took a stab at building this arcade instead —
          short, gentle games that focus on matching, digging, picking, and
          catching. It's made to be safe, ad-free, and local to this device.
        </p>
        <p>
          Parents can set a screen-time limit, and the app keeps playful
          progress notes that never leave the browser. The games are short
          and non-competitive — great for little hands and growing minds.
        </p>
        <div style={{background:'rgba(11,61,145,0.08)', padding:'12px 16px', borderRadius:'14px', margin:'14px 0'}}>
          <h3 style={{marginTop:0}}>Learning focus</h3>
          <p style={{marginBottom:'0.5rem'}}>
            Each game nods to Montessori practices like {MONTESSORI_FOCUS.slice(0,4).join(', ')} and Waldorf themes such as {WALDORF_FOCUS.slice(0,4).join(', ')}.
            Skills stay playful, never prescriptive.
          </p>
          <ul style={{paddingLeft:'1.2rem', margin:'0 0 0.6rem 0'}}>
            {GAME_SKILL_SUMMARY.map((game) => (
              <li key={game.name}>
                <strong>{game.name}</strong> ({game.category}) — {game.skills.join(', ')}
              </li>
            ))}
          </ul>
          <p style={{margin:0, fontSize:'0.9rem', color:'var(--text-muted)'}}>All tracking remains on this browser; exporting or sharing is optional and parent-led.</p>
        </div>
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
  const allResults = (player.gameResults && player.gameResults.length) ? player.gameResults : gameResults;
  
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 30);
  const [fromDate, setFromDate] = useState<string>(defaultFrom.toISOString().slice(0,10));
  const [toDate, setToDate] = useState<string>(today.toISOString().slice(0,10));

  const availableSkills = useMemo(() => Object.keys(player.learningProfile || {}), [player.learningProfile]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(availableSkills.slice(0, 5));
  const [chartType, setChartType] = useState<'bar' | 'line' | 'radar'>('bar');
  const [showPreview, setShowPreview] = useState(false);

  const filteredResults = useMemo(() => {
    return allResults.filter(r => {
      const d = new Date(r.timestamp).toISOString().slice(0,10);
      return d >= fromDate && d <= toDate;
    });
  }, [allResults, fromDate, toDate]);

  const totalPlays = filteredResults.length;
  
  const skills = player.learningProfile || {};
  const maxSkillScore = Math.max(...Object.values(skills), 100);

  const historyMap = new Map<string, number>();
  filteredResults.forEach(r => {
    const d = new Date(r.timestamp).toISOString().slice(0,10);
    historyMap.set(d, (historyMap.get(d) || 0) + r.score);
  });
  const timelineData = Array.from(historyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, score]) => ({ date, score }));

  const svgRef = useRef<SVGSVGElement>(null);

  const rasterizeSVG = (callback: (blob: Blob) => void) => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const img = new Image();
    const blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200; 
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 1200, 1600);
        canvas.toBlob((b) => {
          if (b) callback(b);
          URL.revokeObjectURL(url);
        }, 'image/png');
      }
    };
    img.src = url;
  };

  const handleDownloadImage = () => {
    rasterizeSVG((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tetraverse-Report-${player.name || 'Player'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleShare = () => {
    rasterizeSVG((blob) => {
      const file = new File([blob], 'report.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: "Tripp's Tricky Tetraverse Report",
          text: `Check out ${player.name}'s progress!`
        }).catch(() => console.log('Share failed or cancelled'));
      } else {
        alert("Sharing not supported on this device/browser. Image will be downloaded instead.");
        handleDownloadImage();
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content" style={{width:'95%', maxWidth:'900px', maxHeight:'90vh', overflowY:'auto'}}>
        <div className="no-print" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <h2 style={{margin:0}}>Parental Report Generator</h2>
          <button className="secondary-button" onClick={onClose}>Close</button>
        </div>

        {/* Configuration Panel */}
        <div className="no-print" style={{background:'#f8f9fa', padding:16, borderRadius:12, marginBottom:20, border:'1px solid #e9ecef'}}>
          <h3 style={{marginTop:0, fontSize:'1.1rem'}}>1. Select Data Range</h3>
          <div style={{display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', marginBottom:16}}>
            <label>From: <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></label>
            <label>To: <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></label>
            <span style={{fontSize:'0.9rem', color:'#666'}}>({totalPlays} plays found)</span>
          </div>

          <h3 style={{marginTop:0, fontSize:'1.1rem'}}>2. Select Skills to Include</h3>
          <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom:16}}>
            {availableSkills.length === 0 && <span style={{color:'#666', fontStyle:'italic'}}>No skills recorded yet. Play some games!</span>}
            {availableSkills.map(skill => (
              <label key={skill} style={{display:'flex', alignItems:'center', gap:4, background:'white', padding:'4px 8px', borderRadius:4, border:'1px solid #ddd', cursor:'pointer'}}>
                <input 
                  type="checkbox" 
                  checked={selectedSkills.includes(skill)} 
                  onChange={() => toggleSkill(skill)}
                />
                {skill}
              </label>
            ))}
          </div>

          <h3 style={{marginTop:0, fontSize:'1.1rem'}}>3. Choose Chart Type</h3>
          <div style={{display:'flex', gap:12, marginBottom:16}}>
            <label style={{cursor:'pointer'}}><input type="radio" name="chartType" checked={chartType === 'bar'} onChange={() => setChartType('bar')} /> Skill Comparison (Bar)</label>
            <label style={{cursor:'pointer'}}><input type="radio" name="chartType" checked={chartType === 'line'} onChange={() => setChartType('line')} /> Progress Over Time (Line)</label>
            <label style={{cursor:'pointer'}}><input type="radio" name="chartType" checked={chartType === 'radar'} onChange={() => setChartType('radar')} /> Skill Profile (Radar)</label>
          </div>

          <button className="primary-button" onClick={() => setShowPreview(true)} style={{width:'100%'}}>
            Generate Report Preview
          </button>
        </div>

        {/* Preview Area */}
        {showPreview && (
          <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
            <div style={{marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center'}}>
              <button className="secondary-button" onClick={handleShare}>📱 Share (IG/Text)</button>
              <button className="secondary-button" onClick={handleDownloadImage}>📸 Save Photo</button>
              <button className="secondary-button" onClick={handlePrint}>🖨️ Print</button>
            </div>

            <div style={{overflowX:'auto', maxWidth:'100%', border:'1px solid #eee', borderRadius:8}}>
              <svg 
                ref={svgRef}
                width="800" 
                height="1000" 
                viewBox="0 0 800 1000" 
                style={{
                  background:'white',
                  display:'block'
                }}
              >
                {/* Background */}
                <rect x="0" y="0" width="800" height="1000" fill="#ffffff" />
                
                {/* Header */}
                <rect x="0" y="0" width="800" height="80" fill="#4cc9f0" />
                <text x="400" y="50" textAnchor="middle" fontFamily="sans-serif" fontSize="32" fontWeight="bold" fill="white">Tripp's Tricky Tetraverse</text>
                
                <text x="400" y="120" textAnchor="middle" fontFamily="sans-serif" fontSize="24" fill="#333">Progress Report: {player.name || 'Player'}</text>
                <text x="400" y="150" textAnchor="middle" fontFamily="sans-serif" fontSize="16" fill="#666">
                  {new Date(fromDate).toLocaleDateString()} — {new Date(toDate).toLocaleDateString()}
                </text>

                {/* Summary Stats */}
                <g transform="translate(100, 180)">
                  <rect x="0" y="0" width="280" height="100" rx="12" fill="#f0f8ff" stroke="#4cc9f0" strokeWidth="2" />
                  <text x="140" y="40" textAnchor="middle" fontFamily="sans-serif" fontSize="16" fill="#666">Total Points Earned</text>
                  <text x="140" y="80" textAnchor="middle" fontFamily="sans-serif" fontSize="36" fontWeight="bold" fill="#0b3d91">{player.points || 0}</text>
                </g>
                <g transform="translate(420, 180)">
                  <rect x="0" y="0" width="280" height="100" rx="12" fill="#fff0f5" stroke="#ff6b6b" strokeWidth="2" />
                  <text x="140" y="40" textAnchor="middle" fontFamily="sans-serif" fontSize="16" fill="#666">Games Played</text>
                  <text x="140" y="80" textAnchor="middle" fontFamily="sans-serif" fontSize="36" fontWeight="bold" fill="#d63031">{totalPlays}</text>
                </g>

                {/* Chart Area */}
                <g transform="translate(100, 350)">
                  <rect x="-20" y="-40" width="640" height="550" fill="none" stroke="#eee" rx="8" />
                  
                  {/* Chart Title */}
                  <text x="300" y="-10" textAnchor="middle" fontFamily="sans-serif" fontSize="20" fontWeight="bold" fill="#333">
                    {chartType === 'bar' && 'Skill Breakdown (Points)'}
                    {chartType === 'line' && 'Activity Over Time'}
                    {chartType === 'radar' && 'Skill Profile Shape'}
                  </text>

                  {/* BAR CHART LOGIC */}
                  {chartType === 'bar' && (
                    <>
                      {selectedSkills.length === 0 ? (
                        <text x="300" y="200" textAnchor="middle" fill="#999">Select skills above to see data</text>
                      ) : (
                        selectedSkills.map((skill, i) => {
                          const score = skills[skill] || 0;
                          const percentage = (score / (maxSkillScore || 1)) * 100;
                          const y = 20 + i * 45;
                          
                          return (
                            <g key={skill} transform={`translate(0, ${y})`}>
                              <foreignObject x="-150" y="0" width="700" height="50">
                                <SkillBar 
                                  skill={skill}
                                  percentage={percentage}
                                />
                              </foreignObject>
                            </g>
                          );
                        })
                      )}
                    </>
                  )}

                  {/* LINE CHART LOGIC */}
                  {chartType === 'line' && (
                    <>
                      {/* Axes */}
                      <line x1="0" y1="0" x2="0" y2="400" stroke="#333" strokeWidth="2" />
                      <line x1="0" y1="400" x2="600" y2="400" stroke="#333" strokeWidth="2" />
                      <text x="-30" y="200" textAnchor="middle" transform="rotate(-90, -30, 200)" fontSize="14" fill="#666">Points / Day</text>
                      <text x="300" y="440" textAnchor="middle" fontSize="14" fill="#666">Date</text>

                      {timelineData.length < 2 ? (
                        <text x="300" y="200" textAnchor="middle" fill="#999">Not enough data for a timeline.</text>
                      ) : (
                        (() => {
                          const maxDaily = Math.max(...timelineData.map(d => d.score), 10);
                          const width = 600;
                          const height = 400;
                          
                          const points = timelineData.map((d, i) => {
                            const x = (i / (timelineData.length - 1)) * width;
                            const y = height - (d.score / maxDaily) * height;
                            return `${x},${y}`;
                          }).join(' ');

                          return (
                            <>
                              {/* Grid lines */}
                              <line x1="0" y1="0" x2="600" y2="0" stroke="#eee" />
                              <line x1="0" y1="200" x2="600" y2="200" stroke="#eee" />
                              <text x="-10" y="5" textAnchor="end" fontSize="10">{maxDaily}</text>
                              <text x="-10" y="205" textAnchor="end" fontSize="10">{Math.round(maxDaily/2)}</text>

                              <polyline points={points} fill="none" stroke="#ff6b6b" strokeWidth="3" />
                              {timelineData.map((d, i) => {
                                const x = (i / (timelineData.length - 1)) * width;
                                const y = height - (d.score / maxDaily) * height;
                                return (
                                  <g key={i}>
                                    <circle cx={x} cy={y} r="4" fill="#fff" stroke="#ff6b6b" strokeWidth="2" />
                                    {/* Only show date label for first, last, and middle */}
                                    {(i === 0 || i === timelineData.length - 1 || i === Math.floor(timelineData.length/2)) && (
                                      <text x={x} y={420} textAnchor="middle" fontSize="10" fill="#666">{d.date.slice(5)}</text>
                                    )}
                                  </g>
                                );
                              })}
                            </>
                          );
                        })()
                      )}
                    </>
                  )}

                  {/* RADAR CHART LOGIC */}
                  {chartType === 'radar' && (
                    <g transform="translate(300, 200)">
                      {selectedSkills.length < 3 ? (
                        <text x="0" y="0" textAnchor="middle" fill="#999">Select at least 3 skills for a radar chart.</text>
                      ) : (
                        (() => {
                          const radius = 180;
                          const angleStep = (Math.PI * 2) / selectedSkills.length;
                          
                          // Draw web
                          const webPoints = selectedSkills.map((_, i) => {
                            const angle = i * angleStep - Math.PI / 2;
                            return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
                          }).join(' ');
                          
                          // Draw data polygon
                          const dataPoints = selectedSkills.map((skill, i) => {
                            const angle = i * angleStep - Math.PI / 2;
                            const val = (skills[skill] || 0) / (maxSkillScore || 1);
                            return `${Math.cos(angle) * radius * val},${Math.sin(angle) * radius * val}`;
                          }).join(' ');

                          return (
                            <>
                              {/* Background Web */}
                              <polygon points={webPoints} fill="#f9f9f9" stroke="#ddd" strokeWidth="1" />
                              {[0.25, 0.5, 0.75].map(r => (
                                <polygon 
                                  key={r}
                                  points={selectedSkills.map((_, i) => {
                                    const angle = i * angleStep - Math.PI / 2;
                                    return `${Math.cos(angle) * radius * r},${Math.sin(angle) * radius * r}`;
                                  }).join(' ')}
                                  fill="none" stroke="#eee" strokeWidth="1"
                                />
                              ))}

                              {/* Axes and Labels */}
                              {selectedSkills.map((skill, i) => {
                                const angle = i * angleStep - Math.PI / 2;
                                const x = Math.cos(angle) * radius;
                                const y = Math.sin(angle) * radius;
                                const labelX = Math.cos(angle) * (radius + 20);
                                const labelY = Math.sin(angle) * (radius + 20);
                                return (
                                  <g key={skill}>
                                    <line x1="0" y1="0" x2={x} y2={y} stroke="#ddd" />
                                    <text 
                                      x={labelX} 
                                      y={labelY} 
                                      textAnchor={labelX > 0 ? 'start' : labelX < 0 ? 'end' : 'middle'} 
                                      dominantBaseline="middle"
                                      fontSize="12" 
                                      fill="#333"
                                    >
                                      {skill}
                                    </text>
                                  </g>
                                );
                              })}

                              {/* Data Shape */}
                              <polygon points={dataPoints} fill="rgba(76, 201, 240, 0.5)" stroke="#4cc9f0" strokeWidth="2" />
                            </>
                          );
                        })()
                      )}
                    </g>
                  )}

                </g>

                {/* Footer */}
                <rect x="0" y="950" width="800" height="50" fill="#f0f0f0" />
                <text x="400" y="980" textAnchor="middle" fontFamily="sans-serif" fontSize="14" fill="#999">tripps-tricky-tetraverse.web.app</text>
              </svg>
            </div>
          </div>
        )}
        
        <div className="no-print" style={{marginTop:16}}>
        </div>
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
  onOpenReport?: () => void;
}

const SkillsOverlay: React.FC<SkillsOverlayProps> = ({ player, onClose, performanceSummary, onOpenReport }) => {
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

        <div style={{marginTop:16, display:'flex', justifyContent:'center'}}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              onClose();
              onOpenReport?.();
            }}
          >
            Generate Parental Report
          </button>
        </div>

        <div style={{marginTop:12, display:'flex', justifyContent:'center'}}>
          <button className="primary-button interactive-hover" onClick={onClose}>Awesome!</button>
        </div>
        <FooterBrand />
      </div>
    </div>
  );
};

// --- Tour Overlay ---
interface TourOverlayProps {
  onClose: () => void;
  onSkip?: () => void;
  onStepChange?: (stepId: string | null) => void;
}

const TourOverlay: React.FC<TourOverlayProps> = ({ onClose, onSkip, onStepChange }) => {
  const [step, setStep] = useState(0);
  const steps = [
    { id: 'tour-nav', text: "Parents & caregivers: this quick tour shows where everything lives. Skip anytime!", position: 'bottom' },
    { id: 'tour-menu-players', text: "Players button opens saved profiles so you can switch kiddos or edit details.", position: 'bottom' },
    { id: 'tour-prize-shop', text: "Prize Shop lets you convert earned points into virtual goodies for motivation.", position: 'bottom' },
    { id: 'tour-skills', text: "Skills Built gives caregivers a quick snapshot of what was practiced.", position: 'bottom' },
    { id: 'tour-parent', text: "Parents button houses the disclaimer plus screen-time timers and reports.", position: 'bottom' },
    { id: 'tour-about', text: "About explains the arcade's purpose and how to reach the creator.", position: 'bottom' },
    { id: 'tour-profile', text: "This panel shows the active avatar, point total, and screen-time status.", position: 'bottom' },
    { id: 'tour-music-controls', text: "Choose background music or mute it before starting games.", position: 'top' },
    { id: 'tour-carousel-next', text: "Use these arrows or swipe to move between each arcade game.", position: 'top' },
    { id: 'tour-game-memory', text: "Truck Match builds memory and focus by pairing trucks and tools.", position: 'top' },
    { id: 'tour-game-digging', text: "Long Shorty's Loot is a calm tap game about patience and cause/effect.", position: 'top' },
    { id: 'tour-game-boots', text: "Boot Designer sparks creativity with colors, stickers, and patterns.", position: 'top' },
    { id: 'tour-game-airplanes', text: "Airplane Catch sharpens reaction time and hand-eye coordination.", position: 'top' },
    { id: 'tour-footer', text: "Created by Auntie Ashley for Tripp's fourth birthday!", position: 'top' },
  ];

  const currentStep = steps[step];
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const isIntroStep = currentStep.id === 'tour-nav';

  useEffect(() => {
    onStepChange?.(currentStep.id);
  }, [currentStep.id, onStepChange]);

  useEffect(() => {
    return () => {
      onStepChange?.(null);
    };
  }, [onStepChange]);

  useEffect(() => {
    let raf: number | null = null;
    let cancelled = false;

    const updateRect = () => {
      const el = document.getElementById(currentStep.id);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };

    const attemptFind = (tries = 0) => {
      if (cancelled) return;
      const el = document.getElementById(currentStep.id);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      } else if (tries < 10) {
        raf = requestAnimationFrame(() => attemptFind(tries + 1));
      } else {
        setTargetRect(null);
      }
    };

    attemptFind();

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [currentStep.id]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      playSound('click');
    } else {
      onStepChange?.(null);
      onClose();
      playSound('success');
    }
  };

  const handleSkip = () => {
    onStepChange?.(null);
    onSkip?.();
  };

  const tooltip = (customPosition?: React.CSSProperties) => (
    <div style={{
      position: 'absolute',
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
      zIndex: 101,
      ...customPosition,
    }}>
      <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{currentStep.text}</p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {isIntroStep && onSkip && (
          <button className="text-button" type="button" onClick={handleSkip} style={{ textDecoration: 'underline', fontSize: '0.9rem' }}>
            Skip Tour
          </button>
        )}
        <button className="primary-button" onClick={handleNext} style={{ alignSelf: 'center' }}>
          {step === steps.length - 1 ? "Let's Play!" : "Next ➡"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="tour-overlay" style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      {targetRect && (
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
      )}

      {targetRect
        ? tooltip({
            left: Math.max(10, Math.min(window.innerWidth - 310, targetRect.left + (targetRect.width / 2) - 150)),
            top: currentStep.position === 'bottom' ? targetRect.bottom + 20 : targetRect.top - 160,
          })
        : tooltip({
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          })}
    </div>
  );
};

export default App;
