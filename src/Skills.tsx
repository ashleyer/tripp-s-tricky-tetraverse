import React from 'react';

// Map skill keys to icons and colors for consistent branding
export const SKILL_ICONS: Record<string, { icon: string; color: string }> = {
  // Core Gameplay
  memory: { icon: "🧠", color: "#8e44ad" },
  focus: { icon: "🎯", color: "#2980b9" },
  "pattern-spotting": { icon: "💠", color: "#16a085" },
  patience: { icon: "⏳", color: "#f39c12" },
  guessing: { icon: "🤔", color: "#d35400" },
  "pirate-luck": { icon: "🍀", color: "#27ae60" },
  creativity: { icon: "🎨", color: "#c0392b" },
  "color-matching": { icon: "🌈", color: "#1abc9c" },
  design: { icon: "✏️", color: "#9b59b6" },
  "hand-eye-coordination": { icon: "✋👁️", color: "#3498db" },
  "reaction-time": { icon: "⚡️", color: "#e67e22" },
  
  // Derived Metrics
  concentration: { icon: "🧘", color: "#2980b9" },
  accuracy: { icon: " bulls-eye ", color: "#27ae60" },
  reactionScore: { icon: "🏃💨", color: "#f1c40f" },
  persistence: { icon: "💪", color: "#e74c3c" },

  // Intelligences
  "visual-spatial": { icon: "🗺️", color: "#3498db" },
  "logical-mathematical": { icon: "🔢", color: "#9b59b6" },
  "bodily-kinesthetic": { icon: "🤸", color: "#e67e22" },
  naturalist: { icon: "🌳", color: "#2ecc71" },
  intrapersonal: { icon: "👤", color: "#f1c40f" },
  interpersonal: { icon: "👥", color: "#e74c3c" },
  linguistic: { icon: "🗣️", color: "#34495e" },
  musical: { icon: "🎵", color: "#8e44ad" },

  // Montessori
  "refined-visual-discrimination": { icon: "🔍", color: "#16a085" },
  order: { icon: "📊", color: "#2980b9" },
  "sensorial-exploration": { icon: "щупальца", color: "#f39c12" },
  "cause-effect": { icon: " domino ", color: "#d35400" },
  "gross-motor-timing": { icon: "⏱️", color: "#c0392b" },

  // Waldorf
  "imagination-with-visual-motifs": { icon: "🏞️", color: "#1abc9c" },
  "rhythmic-practice": { icon: "🥁", color: "#9b59b6" },
  "nature-play": { icon: "🦋", color: "#27ae60" },
  "story-based-discovery": { icon: "📖", color: "#3498db" },
  "artful-color-play": { icon: "🎨", color: "#e67e22" },
  "imaginative-design": { icon: "🏰", color: "#8e44ad" },
  "imaginative-movement": { icon: "💃", color: "#e74c3c" },
  "narrative-play": { icon: "🎭", color: "#34495e" },
  
  default: { icon: "⭐", color: "#7f8c8d" },
};

const getSkillInfo = (skill: string) => {
  const key = skill.toLowerCase().replace(/ /g, '-');
  return SKILL_ICONS[key] || SKILL_ICONS.default;
};

interface SkillBarProps {
  skill: string;
  percentage: number;
}

export const SkillBar: React.FC<SkillBarProps> = ({ skill, percentage }) => {
  const { icon, color } = getSkillInfo(skill);
  const filledWidth = `${Math.max(0, Math.min(100, percentage))}%`;

  return (
    <div style={{ marginBottom: '12px', fontFamily: 'var(--font-body)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>{icon}</span>
          <span style={{ fontWeight: 600, color: '#333' }}>{skill}</span>
        </div>
        <span style={{ fontWeight: 700, color: color }}>{Math.round(percentage)}%</span>
      </div>
      <div style={{ height: '20px', backgroundColor: '#e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
        <div
          style={{
            width: filledWidth,
            height: '100%',
            backgroundColor: color,
            borderRadius: '10px',
            transition: 'width 0.5s ease-in-out',
          }}
        />
      </div>
    </div>
  );
};
