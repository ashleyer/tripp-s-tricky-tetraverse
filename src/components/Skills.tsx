import React from 'react';

export const SKILL_ICONS: Record<string, string> = {
  // from GAME_METADATA skills
  'Memory': '🧠',
  'Focus': '🎯',
  'Pattern spotting': '🔍',
  'Patience': '⏳',
  'Guessing': '🤔',
  'Pirate Luck': '🍀',
  'Creativity': '🎨',
  'Color Matching': '🌈',
  'Design': '✏️',
  'Hand-eye coordination': '✋',
  'Reaction time': '⚡️',
  
  // from montessoriGoals
  'Concentration': '🧘',
  'Order': '🔢',
  'Refined visual discrimination': '👁️‍🗨️',
  'Sensorial exploration': 'щу',
  'Cause & effect': '🔗',
  'Color discrimination': '🎨',
  'Creative expression': '✨',
  'Gross motor timing': '🏃',

  // from waldorfGoals
  'Imagination with visual motifs': '🎭',
  'Rhythmic practice': '🎶',
  'Nature play': '🌳',
  'Story-based discovery': '📖',
  'Artful color play': '🖌️',
  'Imaginative design': '💡',
  'Imaginative movement': '🤸',
  'Narrative play': '🗣️',

  // from intelligences
  'Visual-Spatial': '🗺️',
  'Logical-Mathematical': '🧮',
  'Bodily-Kinesthetic': '🤸‍♂️',
  'Naturalist': '🌿',
  'Intrapersonal': '👤',

  // from derived metrics
  'accuracy': '🎯',
  'reactionScore': '⚡️',
from: '💪',
  'avgHoldTime': '⏳',
  'persistence': '끈',
};

interface SkillBarProps {
  skill: string;
  value: number;
  maxValue: number;
}

export const SkillBar: React.FC<SkillBarProps> = ({ skill, value, maxValue }) => {
  const percentage = (value / maxValue) * 100;
  const icon = SKILL_ICONS[skill] || '⭐';

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{icon} {skill}</span>
        <span style={{ fontSize: '0.9rem', color: 'var(--color-accent)' }}>{Math.round(value)}</span>
      </div>
      <div style={{ background: '#eee', borderRadius: '8px', height: '16px', overflow: 'hidden' }}>
        <div 
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--color-secondary), var(--color-accent))',
            borderRadius: '8px',
            transition: 'width 0.5s ease-in-out'
          }}
        />
      </div>
    </div>
  );
};
