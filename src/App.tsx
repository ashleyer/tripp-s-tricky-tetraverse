import React, { useEffect, useMemo, useRef, useState } from "react";

type GameId = "memory" | "digging" | "boots" | "airplanes";

type PlayerProfile = {
  name: string;
  age: number | null;
  avatarUrl: string | null;
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
    montessoriGoals: ["Gross motor timing", "Hand-eye coordination"],
    waldorfGoals: ["Imaginative movement", "Narrative play"],
    intelligences: ["Bodily-Kinesthetic", "Spatial"],
  },
};

// Simple sound helper – put matching .mp3 files in public/sounds.
// Use Vite's `BASE_URL` so asset paths work when app is served from
// a non-root base (GitHub Pages or similar).
const _BASE = (import.meta as any).env?.BASE_URL ?? "/";
const soundPaths: Record<string, string> = {
  click: `${_BASE}sounds/click.mp3`,
  success: `${_BASE}sounds/success.mp3`,
  fail: `${_BASE}sounds/fail.mp3`,
};

// Background music choices. Place matching .mp3 files in `public/music/`.
const MUSIC_TRACKS: { key: string; label: string; emoji: string; path: string }[] = [
  { key: "silent", label: "Silent", emoji: "🔇", path: "" },
  { key: "tides", label: "Tides", emoji: "🌊", path: `${_BASE}music/tides-and-smiles.mp3` },
  { key: "happy", label: "Happy", emoji: "☀️", path: `${_BASE}music/happy-day.mp3` },
  { key: "playful", label: "Playful", emoji: "🎈", path: `${_BASE}music/playful.mp3` },
  { key: "chill", label: "Chill", emoji: "🌴", path: `${_BASE}music/chill-pulse.mp3` },
  { key: "love", label: "Love", emoji: "💖", path: `${_BASE}music/love-in-japan.mp3` },
];

function playSound(key: keyof typeof soundPaths) {
  const path = soundPaths[key];
  const audio = new Audio(path);
  // we ignore play() promise errors so it doesn't crash on browsers that block autoplay
  audio.play().catch(() => {});
}

const App: React.FC = () => {
  const [player, setPlayer] = useState<PlayerProfile>({
    name: "",
    age: null,
    avatarUrl: null,
  });

  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [showParentOverlay, setShowParentOverlay] = useState<boolean>(true);
  const [showPlayersOverlay, setShowPlayersOverlay] = useState<boolean>(false);
  const [showAboutOverlay, setShowAboutOverlay] = useState<boolean>(false);
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [showTutorial, setShowTutorial] = useState<{
    gameId: GameId | null;
    visible: boolean;
  }>({ gameId: null, visible: false });
  const [musicKey, setMusicKey] = useState<string>(() => {
    try {
      return localStorage.getItem("musicKey") || "silent";
    } catch (e) {
      return "silent";
    }
  });
  const [musicVolume, setMusicVolume] = useState<number>(() => {
    try {
      const v = localStorage.getItem("musicVolume");
      return v ? Number(v) : 0.45;
    } catch (e) {
      return 0.45;
    }
  });
  const [rememberMusic, setRememberMusic] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("rememberMusic");
      return v === null ? true : v === "1";
    } catch (e) {
      return true;
    }
  });
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const [screenTime, setScreenTime] = useState<ScreenTimeState>({
    limitMinutes: null,
    remainingSeconds: 0,
    isActive: false,
  });

  const [uploadedAvatarPreview, setUploadedAvatarPreview] = useState<
    string | null
  >(null);

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

  const screenTimeFriendly = useMemo(() => {
    if (!screenTime.limitMinutes) return "No limit set";
    const mins = Math.floor(screenTime.remainingSeconds / 60);
    const secs = screenTime.remainingSeconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s remaining`;
  }, [screenTime]);

  // Derived “performance” feedback – purely playful & approximate.
  const performanceSummary = useMemo(() => {
    if (!player.age || gameResults.length === 0) {
      return "Play some games to see how you’re doing in each skill area!";
    }

    const byCategory: Record<
      string,
      { totalScore: number; games: number }
    > = {};
    gameResults.forEach((result) => {
      const category = GAME_METADATA[result.gameId].category;
      if (!byCategory[category]) {
        byCategory[category] = { totalScore: 0, games: 0 };
      }
      byCategory[category].totalScore += result.score;
      byCategory[category].games += 1;
    });

    const parts: string[] = [];
    Object.entries(byCategory).forEach(([category, data]) => {
      const avgScore = data.totalScore / Math.max(data.games, 1);
      let comparison: string;
      if (avgScore >= 80) {
        comparison = "above many kids your age";
      } else if (avgScore >= 50) {
        comparison = "right around other kids your age";
      } else {
        comparison = "still warming up compared to kids your age";
      }
      parts.push(`${category}: You’re ${comparison}.`);
    });

    return parts.join(" ");
  }, [player.age, gameResults]);

  const handleAvatarUpload: React.ChangeEventHandler<HTMLInputElement> = (
    event
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedAvatarPreview(url);
    setPlayer((prev) => ({ ...prev, avatarUrl: url }));
  };

  const handleScreenTimeSubmit: React.FormEventHandler<HTMLFormElement> = (
    e
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const minutesRaw = formData.get("screenTimeMinutes");
    const minutes = Number(minutesRaw);
    if (!minutes || minutes <= 0) {
      setScreenTime({
        limitMinutes: null,
        remainingSeconds: 0,
        isActive: false,
      });
      return;
    }
    playSound("click");
    setScreenTime({
      limitMinutes: minutes,
      remainingSeconds: minutes * 60,
      isActive: true,
    });
  };

  const isLockedByScreenTime =
    screenTime.limitMinutes !== null &&
    (!screenTime.isActive || screenTime.remainingSeconds <= 0);

  const recordGameResult = (
    gameId: GameId,
    score: number,
    attempts: number,
    goals?: { montessori: string[]; waldorf: string[]; intelligences: string[] }
  ) => {
    setGameResults((prev) => [
      ...prev,
      { gameId, score, attempts, timestamp: Date.now(), goals },
    ]);
  };

  const canPlay = !isLockedByScreenTime;

  const showArcade = !selectedGame;

  // Handle selecting a game: show tutorial first time, otherwise enter game
  const handleSelectGame = (gameId: GameId) => {
    if (!canPlay) return;
    playSound("click");
    const key = `seenTutorial:${gameId}`;
    if (!localStorage.getItem(key)) {
      setShowTutorial({ gameId, visible: true });
      return;
    }
    setSelectedGame(gameId);
  };

  // Background music control helpers
  const setBackgroundMusic = (key: string, autoplay = true) => {
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
      <header className="app-header" aria-label="Tripp's Tricky Tetraverse">
        <div className="header-main">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="app-title-emoji" aria-hidden>
              🧸
            </span>
            <div>
              <h1 className="app-title" aria-label="Tripp's Tricky Tetraverse">
                Tripp's Tricky Tetraverse
              </h1>
              <p className="app-subtitle">an All Four You Arcade</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {MUSIC_TRACKS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`music-tile ${musicKey === t.key ? 'music-tile-selected' : ''}`}
                  onClick={() => {
                    playSound('click');
                    setMusicKey(t.key);
                    setBackgroundMusic(t.key, true);
                    try {
                      if (rememberMusic) localStorage.setItem('musicKey', t.key);
                    } catch (e) {}
                  }}
                  aria-pressed={musicKey === t.key}
                  aria-label={`Choose ${t.label} music`}
                >
                  <span aria-hidden style={{ fontSize: '1.1rem' }}>{t.emoji}</span>
                  <span style={{ fontSize: '0.8rem', marginLeft: 6 }}>{t.label}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 6, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => toggleMusicPlay()}
                  aria-pressed={isMusicPlaying}
                  aria-label={isMusicPlaying ? 'Pause background music' : 'Play background music'}
                  title={isMusicPlaying ? 'Pause music' : 'Play music'}
                >
                  {isMusicPlaying ? '⏸️' : '▶️'}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(musicVolume * 100)}
                  onChange={(e) => {
                    const v = Number(e.currentTarget.value) / 100;
                    setMusicVolume(v);
                    if (musicRef.current) musicRef.current.volume = v;
                    try {
                      if (rememberMusic) localStorage.setItem('musicVolume', String(v));
                    } catch (e) {}
                  }}
                  aria-label="Music volume"
                  style={{ width: 120 }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                <input
                  type="checkbox"
                  checked={rememberMusic}
                  onChange={(e) => {
                    const v = e.currentTarget.checked;
                    setRememberMusic(v);
                    try {
                      localStorage.setItem('rememberMusic', v ? '1' : '0');
                      if (!v) {
                        localStorage.removeItem('musicKey');
                        localStorage.removeItem('musicVolume');
                      }
                    } catch (e) {}
                  }}
                />
                Remember
              </label>
            </div>
          </div>
          <button
            type="button"
            className="parent-button"
            onClick={() => setShowParentOverlay(true)}
            aria-label="Open information for parents"
          >
            For Parents
          </button>
          <button
            type="button"
            className="parent-button"
            onClick={() => setShowPlayersOverlay(true)}
            aria-label="Players"
            style={{ marginLeft: 8 }}
          >
            Players
          </button>
          <button
            type="button"
            className="parent-button"
            onClick={() => setShowAboutOverlay(true)}
            aria-label="About this app"
            style={{ marginLeft: 8 }}
          >
            About
          </button>
        </div>
      </header>

      {showIntro && (
        <IntroBanner
          onBegin={() => {
            setShowIntro(false);
            // close parent overlay if it's open
            setShowParentOverlay(false);
          }}
        />
      )}

      {/* Player Profile Section */}
      <section className="profile-section" aria-label="Player profile">
        <div className="profile-card">
          <h2>Player Profile</h2>
          <div className="profile-grid">
            <div className="profile-main">
              <label className="form-label">
                Name
                <input
                  type="text"
                  placeholder="Type your name"
                  value={player.name}
                  onChange={(e) =>
                    setPlayer((prev) => ({ ...prev, name: e.target.value }))
                  }
                  aria-label="Player name"
                />
              </label>
              <label className="form-label">
                Age
                <input
                  type="number"
                  min={3}
                  max={12}
                  placeholder="Age"
                  value={player.age ?? ""}
                  onChange={(e) =>
                    setPlayer((prev) => ({
                      ...prev,
                      age: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  aria-label="Player age"
                />
              </label>

              <form
                className="screen-time-form"
                onSubmit={handleScreenTimeSubmit}
                aria-label="Screen time limit form"
              >
                <label className="form-label">
                  Screen time limit (minutes)
                  <input
                    type="number"
                    min={1}
                    max={120}
                    name="screenTimeMinutes"
                    placeholder="e.g. 20"
                    aria-label="Screen time limit in minutes"
                  />
                </label>
                <button type="submit" className="primary-button">
                  Set / Update Limit
                </button>
              </form>

              <p className="screen-time-status" aria-live="polite">
                ⏱ {screenTimeFriendly}
                {isLockedByScreenTime && (
                  <span className="screen-time-locked">
                    {" "}
                    – Screen time is up for now. Time for a stretch, snack, or
                    book!
                  </span>
                )}
              </p>
            </div>

            <div className="avatar-column">
              <p className="avatar-title">Choose an avatar</p>
              <div
                className="avatar-list"
                role="list"
                aria-label="Preloaded avatar choices"
              >
                {PRELOADED_AVATARS.map((avatar) => {
                  const isSelected =
                    player.avatarUrl === `preloaded:${avatar.id}`;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      role="listitem"
                      className={`avatar-pill ${
                        isSelected ? "avatar-pill-selected" : ""
                      }`}
                      onClick={() => {
                        playSound("click");
                        setPlayer((prev) => ({
                          ...prev,
                          avatarUrl: `preloaded:${avatar.id}`,
                        }));
                        setUploadedAvatarPreview(null);
                      }}
                      aria-pressed={isSelected}
                    >
                      <span
                        aria-hidden="true"
                        className="avatar-emoji"
                        role="img"
                      >
                        {avatar.emoji}
                      </span>
                      <span className="avatar-label">{avatar.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="avatar-upload-wrapper">
                <label className="form-label">
                  Or upload a photo (stays on this device only)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    aria-label="Upload custom avatar from this device"
                  />
                </label>
              </div>

              <div className="avatar-preview">
                <p className="avatar-title">Current avatar</p>
                <div className="avatar-preview-box">
                  {player.avatarUrl ? (
                    player.avatarUrl.startsWith("preloaded:") ? (
                      <span className="avatar-preview-emoji" aria-hidden="true">
                        {
                          PRELOADED_AVATARS.find(
                            (a) => `preloaded:${a.id}` === player.avatarUrl
                          )?.emoji
                        }
                      </span>
                    ) : (
                      <img
                        src={uploadedAvatarPreview ?? player.avatarUrl}
                        alt="Player avatar preview"
                      />
                    )
                  ) : (
                    <span className="avatar-placeholder" aria-hidden="true">
                      🙂
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="profile-note">
            We don’t send your child’s name, age, or avatar anywhere. Everything
            stays right here in this browser tab.
          </p>
        </div>
      </section>

      {/* Performance summary */}
      <section
        className="performance-section"
        aria-label="Performance summary compared to age group"
      >
        <h2>Your Skill Snapshot</h2>
        <p>{performanceSummary}</p>
      </section>

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
        <ParentOverlay onClose={() => setShowParentOverlay(false)} />
      )}

      {showPlayersOverlay && (
        <PlayersOverlay
          player={player}
          onClose={() => setShowPlayersOverlay(false)}
          onSave={(p) => {
            setPlayer(p);
            setShowPlayersOverlay(false);
          }}
        />
      )}

      {showAboutOverlay && (
        <AboutOverlay onClose={() => setShowAboutOverlay(false)} />
      )}

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
    </div>
  );
};

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
    playSound("click");
    setIndex((prev) => (prev + 1) % gameIds.length);
  };

  const prev = () => {
    playSound("click");
    setIndex((prev) => (prev - 1 + gameIds.length) % gameIds.length);
  };

  return (
    <section
      className="arcade-section"
      aria-label="Game selection carousel"
      aria-live="polite"
    >
      <h2>Pick a Game from the Arcade</h2>
      <p className="arcade-blurb">
        Swipe through the games, read what skills they build, and press play to
        start.
      </p>

      <div className="carousel-wrapper">
        <button
          type="button"
          className="carousel-nav"
          onClick={prev}
          aria-label="Previous game"
        >
          ◀
        </button>

        <article className="game-card" aria-roledescription="slide">
          <p className="game-pill">
            #{index + 1} of {gameIds.length}
          </p>
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
          <button
            type="button"
            className="primary-button game-play-button"
            onClick={() => onSelectGame(currentGameId)}
            disabled={!canPlay}
            aria-disabled={!canPlay}
          >
            {canPlay ? "Play this game" : "Screen time is up"}
          </button>
        </article>

        <button
          type="button"
          className="carousel-nav"
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
    goals?: { montessori: string[]; waldorf: string[]; intelligences: string[] }
  ) => void;
  canPlay: boolean;
  onRequestTutorial?: () => void;
}

const GameView: React.FC<GameViewProps> = ({
  gameId,
  onBackToArcade,
  onGameResult,
  canPlay,
  onRequestTutorial,
}) => {
  const meta = GAME_METADATA[gameId];
  const [paused, setPaused] = useState(false);

  return (
    <section className="game-section" aria-label={meta.name}>
      <div className="game-header">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="game-control-btn"
            onClick={onBackToArcade}
            aria-label="Back to arcade"
            title="Back"
          >
            ⬅️
          </button>
        </div>

        <div>
          <h2>{meta.name} <span aria-hidden> {meta.category === 'Memory' ? '🧠' : meta.category === 'Problem Solving' ? '🪄' : '✈️'}</span></h2>
          <p className="game-tagline">{meta.tagline}</p>
        </div>

        <div className="game-controls">
          <button
            type="button"
            className="game-control-btn"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? 'Resume game' : 'Pause game'}
            title={paused ? 'Resume' : 'Pause'}
          >
            {paused ? '▶️' : '⏸️'}
          </button>

          <button
            type="button"
            className="game-control-btn"
            onClick={() => onRequestTutorial && onRequestTutorial()}
            aria-label="Show directions"
            title="Directions"
          >
            💡
          </button>

          <button
            type="button"
            className="game-control-btn"
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
              onFinish={(score, attempts) =>
                onGameResult(
                  "memory",
                  score,
                  attempts,
                  {
                    montessori: meta.montessoriGoals ?? [],
                    waldorf: meta.waldorfGoals ?? [],
                    intelligences: meta.intelligences ?? [],
                  }
                )
              }
            />
          )}
          {gameId === "digging" && (
            <DiggingGame
              onFinish={(score, attempts) =>
                onGameResult(
                  "digging",
                  score,
                  attempts,
                  {
                    montessori: meta.montessoriGoals ?? [],
                    waldorf: meta.waldorfGoals ?? [],
                    intelligences: meta.intelligences ?? [],
                  }
                )
              }
            />
          )}
          {gameId === "boots" && (
            <BootsGame
              onFinish={(score, attempts) =>
                onGameResult(
                  "boots",
                  score,
                  attempts,
                  {
                    montessori: meta.montessoriGoals ?? [],
                    waldorf: meta.waldorfGoals ?? [],
                    intelligences: meta.intelligences ?? [],
                  }
                )
              }
            />
          )}
          {gameId === "airplanes" && (
            <AirplanesGame
              onFinish={(score, attempts) =>
                onGameResult(
                  "airplanes",
                  score,
                  attempts,
                  {
                    montessori: meta.montessoriGoals ?? [],
                    waldorf: meta.waldorfGoals ?? [],
                    intelligences: meta.intelligences ?? [],
                  }
                )
              }
            />
          )}
        </div>
      )}
    </section>
  );
};

// --- Game 1: Simple Memory Match ---
interface SimpleGameProps {
  onFinish: (score: number, attempts: number) => void;
}

const MemoryGame: React.FC<SimpleGameProps> = ({ onFinish }) => {
  const initialCards = useMemo(
    () => ["🐶", "🐶", "🦄", "🦄", "✈️", "✈️", "🧱", "🧱"],
    []
  );

  const shuffled = useMemo(
    () => [...initialCards].sort(() => Math.random() - 0.5),
    [initialCards]
  );

  const [cards] = useState<string[]>(shuffled);
  const [flippedIndexes, setFlippedIndexes] = useState<number[]>([]);
  const [matchedIndexes, setMatchedIndexes] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleCardClick = (index: number) => {
    if (finished) return;
    if (flippedIndexes.includes(index) || matchedIndexes.includes(index)) {
      return;
    }
    if (flippedIndexes.length === 2) return;

    playSound("click");
    const newFlipped = [...flippedIndexes, index];
    setFlippedIndexes(newFlipped);

    if (newFlipped.length === 2) {
      const [a, b] = newFlipped;
      setAttempts((prev) => prev + 1);
      if (cards[a] === cards[b]) {
        playSound("success");
        setMatchedIndexes((prev) => {
          const next = [...prev, a, b];
          // check finish condition using the updated array
          if (next.length === cards.length) {
            setFinished(true);
            const score = 100 - (attempts + 1 - cards.length / 2) * 10;
            onFinish(Math.max(10, score), attempts + 1);
          }
          return next;
        });
        setFlippedIndexes([]);
      } else {
        playSound("fail");
        setTimeout(() => setFlippedIndexes([]), 800);
      }
    }
  };

  return (
    <div className="game-panel">
      <p className="game-instructions">
        Tap two cards to flip them over. Try to find all the matching pairs
        using as few tries as you can.
      </p>
      <div className="memory-grid" role="grid" aria-label="Memory cards grid">
        {cards.map((card, index) => {
          const isFlipped =
            flippedIndexes.includes(index) || matchedIndexes.includes(index);
          return (
            <button
              key={index}
              type="button"
              className={`memory-card ${isFlipped ? "memory-card-flipped" : ""}`}
              onClick={() => handleCardClick(index)}
              aria-label={isFlipped ? `Card showing ${card}` : "Hidden card"}
            >
              <span aria-hidden="true">{isFlipped ? card : "❓"}</span>
            </button>
          );
        })}
      </div>
      <p className="game-meta-small">Attempts: {attempts}</p>
      {finished && (
        <p className="game-success-message">
          Great job! You matched all the cards!
        </p>
      )}
    </div>
  );
};

// --- Game 2: Easy Digging Game ---
const DiggingGame: React.FC<SimpleGameProps> = ({ onFinish }) => {
  const cells = Array.from({ length: 9 }, (_, i) => i);
  const [treasureIndex] = useState<number>(
    () => Math.floor(Math.random() * cells.length)
  );
  const [dug, setDug] = useState<number[]>([]);
  const [found, setFound] = useState(false);

  const handleDig = (index: number) => {
    if (found || dug.includes(index)) return;
    playSound("click");
    const newDug = [...dug, index];
    setDug(newDug);
    if (index === treasureIndex) {
      playSound("success");
      setFound(true);
      const attempts = newDug.length;
      const score = Math.max(10, 100 - (attempts - 1) * 15);
      onFinish(score, attempts);
    } else if (newDug.length === cells.length) {
      playSound("fail");
      onFinish(10, newDug.length);
    }
  };

  return (
    <div className="game-panel">
      <p className="game-instructions">
        Tap a square to dig. Somewhere in this little yard is a hidden
        treasure. Can you find it?
      </p>
      <div className="dig-grid" role="grid" aria-label="Digging squares">
        {cells.map((cell) => {
          const isDug = dug.includes(cell);
          const isTreasure = found && cell === treasureIndex;
          return (
            <button
              key={cell}
              type="button"
              className={`dig-cell ${isDug ? "dig-cell-dug" : ""} ${
                isTreasure ? "dig-cell-treasure" : ""
              }`}
              onClick={() => handleDig(cell)}
              aria-label={
                isTreasure
                  ? "Treasure found here!"
                  : isDug
                  ? "Already dug here"
                  : "Undug ground"
              }
            >
              <span aria-hidden="true">
                {isTreasure ? "💎" : isDug ? "🕳" : "🟫"}
              </span>
            </button>
          );
        })}
      </div>
      {found && (
        <p className="game-success-message">
          You found the treasure! Nice digging!
        </p>
      )}
    </div>
  );
};

// --- Game 3: Isabelle’s Boots ---
const BootsGame: React.FC<SimpleGameProps> = ({ onFinish }) => {
  const COLORS = ["🟡", "🟢", "🟣", "🔴"];
  const [targetColor] = useState(() => COLORS[Math.floor(Math.random() * 4)]);
  const [choices] = useState(() =>
    Array.from({ length: 6 }, () => COLORS[Math.floor(Math.random() * 4)])
  );
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleBootClick = (index: number) => {
    if (finished) return;
    playSound("click");
    setClickedIndex(index);
    setAttempts((prev) => prev + 1);

    const isCorrect = choices[index] === targetColor;
    if (isCorrect) {
      playSound("success");
      setFinished(true);
      const score = Math.max(10, 100 - (attempts) * 20);
      onFinish(score, attempts + 1);
    } else {
      playSound("fail");
    }
  };

  return (
    <div className="game-panel">
      <p className="game-instructions">
        Isabelle needs boots that match this color:{" "}
        <span aria-hidden="true" className="boots-target">
          {targetColor}
        </span>
        . Tap the boots that look the same.
      </p>
      <div className="boots-row" aria-label="Boot choices">
        {choices.map((color, index) => {
          const selected = clickedIndex === index;
          return (
            <button
              key={`${color}-${index}`}
              type="button"
              className={`boots-cell ${selected ? "boots-cell-selected" : ""}`}
              onClick={() => handleBootClick(index)}
              aria-pressed={selected}
            >
              <span aria-hidden="true">👢</span>
              <span aria-hidden="true" className="boots-color-dot">
                {color}
              </span>
            </button>
          );
        })}
      </div>
      <p className="game-meta-small">Guesses: {attempts}</p>
      {finished && (
        <p className="game-success-message">
          Isabelle loves your style. You picked the right boots!
        </p>
      )}
    </div>
  );
};

// --- Game 4: Airplanes ---
const AirplanesGame: React.FC<SimpleGameProps> = ({ onFinish }) => {
  const [planes, setPlanes] = useState(
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      caught: false,
    }))
  );
  const [caughtCount, setCaughtCount] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [finished, setFinished] = useState(false);

  const handlePlaneClick = (id: number) => {
    if (finished) return;
    playSound("click");
    setClicks((prev) => prev + 1);
    setPlanes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caught: true } : p))
    );
    setCaughtCount((prev) => {
      const next = prev + 1;
      if (next === planes.length) {
        playSound("success");
        setFinished(true);
        const score = Math.max(10, 100 - (clicks + 1 - planes.length) * 5);
        onFinish(score, clicks + 1);
      }
      return next;
    });
  };

  return (
    <div className="game-panel">
      <p className="game-instructions">
        Tap the airplanes as they “zoom” by. Catch them all!
      </p>
      <div
        className="planes-area"
        aria-label="Airplanes to tap"
        aria-live="polite"
      >
        {planes.map((plane) => (
          <button
            key={plane.id}
            type="button"
            className={`plane ${plane.caught ? "plane-caught" : ""}`}
            onClick={() => handlePlaneClick(plane.id)}
            aria-label={plane.caught ? "Plane already caught" : "Catch plane"}
          >
            <span aria-hidden="true">✈️</span>
          </button>
        ))}
      </div>
      <p className="game-meta-small">
        Caught: {caughtCount} / {planes.length}
      </p>
      {finished && (
        <p className="game-success-message">
          All planes landed safely. Great reflexes!
        </p>
      )}
    </div>
  );
};

// --- Parent Overlay ---
interface ParentOverlayProps {
  onClose: () => void;
}

const ParentOverlay: React.FC<ParentOverlayProps> = ({ onClose }) => {
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Information for parents"
    >
      <div className="modal-content">
        <h2>For Parents & Caregivers</h2>
        <p>
          This little arcade was designed to be{" "}
          <strong>gentle, low-pressure, and kid-friendly</strong>. There are no
          ads, no in-app purchases, and no hidden chats. Everything runs
          entirely in your child’s browser.
        </p>
        <ul>
          <li>
            <strong>Screen time limit:</strong> You can set a session time limit
            in minutes. When time is up, games pause with a friendly reminder
            to take a break.
          </li>
          <li>
            <strong>Data & privacy:</strong> Player names, ages, and avatars
            never leave this device. There is no sign-in and no tracking.
          </li>
          <li>
            <strong>Skill snapshots (not real testing):</strong> The “how you’re
            doing” messages are just playful estimates based on simple scores.
            They are <em>not</em> medical, psychological, or educational
            assessments.
          </li>
          <li>
            <strong>Safety & tone:</strong> All content is non-violent,
            non-competitive, and focused on simple tapping, matching, and
            noticing skills.
          </li>
        </ul>
        <p>
          Please stay nearby while kids play, and treat this as a fun add-on to
          their day, not a babysitter or a test. Reading, drawing, moving their
          body, and talking with real people are still the core ingredients of a
          healthy day.
        </p>
        <button
          type="button"
          className="primary-button"
          onClick={onClose}
          autoFocus
        >
          Got it – let’s play
        </button>
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
        <h1 style={{ fontSize: '1.6rem', margin: '0.8rem 0 0.2rem' }}>🎉 Tripp's Tricky Tetraverse</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.8rem' }}>Tiny games, big smiles.</p>
        <div style={{ margin: '0.6rem 0' }}>
          <button className="primary-button" onClick={onBegin} style={{ fontSize: '1rem' }}>
            Tap to Begin
          </button>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Parents: Tap <strong>For Parents</strong></p>
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
      </div>
    </div>
  );
};

// --- Players Overlay ---
interface PlayersOverlayProps {
  player: PlayerProfile;
  onClose: () => void;
  onSave: (player: PlayerProfile) => void;
}

const PlayersOverlay: React.FC<PlayersOverlayProps> = ({ player, onClose, onSave }) => {
  const [local, setLocal] = useState<PlayerProfile>(player);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content">
        <h2>Player Profile</h2>
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
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
          <button
            className="primary-button"
            onClick={() => onSave(local)}
          >
            Save
          </button>
          <button className="secondary-button" onClick={onClose}>
            Cancel
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
          This small arcade was made to celebrate a four-year-old's birthday —
          short, gentle games that focus on matching, digging, picking, and
          catching. It's made to be safe, ad-free, and local to this device.
        </p>
        <p>
          Parents can set a screen-time limit, and the app keeps playful
          progress notes that never leave the browser. The games are short
          and non-competitive — great for little hands and growing minds.
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

export default App;
