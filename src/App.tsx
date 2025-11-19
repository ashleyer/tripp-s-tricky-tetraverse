import React, { useEffect, useMemo, useState } from "react";

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
  }
> = {
  memory: {
    name: "Match the Pairs",
    tagline: "Flip the cards and find the twins!",
    skills: ["Memory", "Focus", "Pattern spotting"],
    difficulty: "Medium",
    category: "Memory",
  },
  digging: {
    name: "Treasure Dig",
    tagline: "Tap to dig and find the hidden gem!",
    skills: ["Patience", "Guessing", "Basic strategy"],
    difficulty: "Easy",
    category: "Problem Solving",
  },
  boots: {
    name: "Isabelle’s Boots",
    tagline: "Help Isabelle pick matching colorful boots!",
    skills: ["Color matching", "Attention to detail"],
    difficulty: "Easy",
    category: "Attention & Coordination",
  },
  airplanes: {
    name: "Airplane Catch",
    tagline: "Catch the flying planes before they zoom away!",
    skills: ["Hand-eye coordination", "Reaction time"],
    difficulty: "Easy",
    category: "Attention & Coordination",
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

  const recordGameResult = (gameId: GameId, score: number, attempts: number) => {
    setGameResults((prev) => [
      ...prev,
      { gameId, score, attempts, timestamp: Date.now() },
    ]);
  };

  const canPlay = !isLockedByScreenTime;

  const showArcade = !selectedGame;

  return (
    <div className="app-root">
      <header className="app-header" aria-label="All Four You Kids Arcade">
        <div className="header-main">
          <h1 className="app-title" aria-label="All Four You Kids Arcade">
            🎮 All Four You Kids’ Arcade
          </h1>
          <p className="app-subtitle">
            Safe, simple, smile-first mini-games for kids (with tools just for
            grown-ups).
          </p>
        </div>
        <div className="header-right">
          <button
            type="button"
            className="parent-button"
            onClick={() => setShowParentOverlay(true)}
            aria-label="Open information for parents"
          >
            For Parents
          </button>
        </div>
      </header>

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
        <ArcadeView
          canPlay={canPlay}
          onSelectGame={(gameId) => {
            if (!canPlay) return;
            playSound("click");
            setSelectedGame(gameId);
          }}
        />
      ) : selectedGame ? (
        <GameView
          gameId={selectedGame}
          onBackToArcade={() => setSelectedGame(null)}
          onGameResult={recordGameResult}
          canPlay={canPlay}
        />
      ) : null}

      {/* Parent overlay */}
      {showParentOverlay && (
        <ParentOverlay onClose={() => setShowParentOverlay(false)} />
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
  onGameResult: (gameId: GameId, score: number, attempts: number) => void;
  canPlay: boolean;
}

const GameView: React.FC<GameViewProps> = ({
  gameId,
  onBackToArcade,
  onGameResult,
  canPlay,
}) => {
  const meta = GAME_METADATA[gameId];

  return (
    <section className="game-section" aria-label={meta.name}>
      <div className="game-header">
        <button
          type="button"
          className="secondary-button"
          onClick={onBackToArcade}
        >
          ← Back to Arcade
        </button>
        <div>
          <h2>{meta.name}</h2>
          <p className="game-tagline">{meta.tagline}</p>
        </div>
      </div>

      {!canPlay && (
        <p className="game-locked-note">
          Screen time has finished for now. Games are paused so kids can rest
          their eyes and do something offline.
        </p>
      )}

      {canPlay && (
        <div className="game-inner">
          {gameId === "memory" && (
            <MemoryGame
              onFinish={(score, attempts) =>
                onGameResult("memory", score, attempts)
              }
            />
          )}
          {gameId === "digging" && (
            <DiggingGame
              onFinish={(score, attempts) =>
                onGameResult("digging", score, attempts)
              }
            />
          )}
          {gameId === "boots" && (
            <BootsGame
              onFinish={(score, attempts) =>
                onGameResult("boots", score, attempts)
              }
            />
          )}
          {gameId === "airplanes" && (
            <AirplanesGame
              onFinish={(score, attempts) =>
                onGameResult("airplanes", score, attempts)
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
        setMatchedIndexes((prev) => [...prev, a, b]);
        setFlippedIndexes([]);

        if (matchedIndexes.length + 2 === cards.length) {
          setFinished(true);
          const score = 100 - (attempts + 1 - cards.length / 2) * 10;
          onFinish(Math.max(10, score), attempts + 1);
        }
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

export default App;
