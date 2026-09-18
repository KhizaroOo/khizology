import { getMonsterById, type Monster } from './monsters';

export type MonsterVoiceContext = 'intro' | 'discovery' | 'empty' | 'next';

export interface MonsterVoice {
  personality: string;
  tone: string;
  microcopy: Record<MonsterVoiceContext, string>;
  signatureLine?: string;
}

export const baseMonsterVoice: MonsterVoice = {
  personality: 'curious and clear',
  tone: 'simple, visual, human, and direct',
  microcopy: {
    intro: 'Start with what is here. The rest can unfold from there.',
    discovery: 'Look once. Then look again.',
    empty: 'Nothing matches that view. Try a different path.',
    next: 'Keep exploring when the next question appears.',
  },
};

export const mysteryMonsterVoice: MonsterVoice = {
  personality: 'quiet and curious',
  tone: 'minimal, teasing, and unrevealing',
  microcopy: {
    intro: 'The lab is still forming.',
    discovery: 'Not everything in the lab has a name yet.',
    empty: 'This door is still locked.',
    next: 'More will make sense when it is ready.',
  },
};

export const monsterVoices: Partial<Record<Monster['id'], MonsterVoice>> = {
  artooo: {
    personality: 'observant, warm, and quietly curious',
    tone: 'short, reflective, visual, and open-ended',
    microcopy: {
      intro: 'Take your time. Some details show up after a second look.',
      discovery: 'Look closer. The small marks matter.',
      empty: 'No artworks match that view. Try another tag or search.',
      next: 'Follow the line somewhere else.',
    },
  },
  toolooo: {
    personality: 'practical, precise, and systems-minded',
    tone: 'compact, active, clear, and never bossy',
    microcopy: {
      intro: 'Choose a question. Then make the moving parts visible.',
      discovery: 'Change one thing. Watch what follows.',
      empty: 'No tools match that combination. Clear a filter and try another path.',
      next: 'Use what you found to choose the next move.',
    },
    signatureLine: 'Turn invisible problems into visible ones.',
  },
  infooo: {
    personality: 'curious, patient, and observant',
    tone: 'inviting, simple, and never condescending',
    microcopy: {
      intro: "Words weren't enough. So I made it move.",
      discovery: 'Try isolating one system. Connections become easier to see.',
      empty: 'Nothing matches that search yet. Try another structure.',
      next: 'Follow one connection at a time.',
    },
    signatureLine: 'See it. Touch it. Understand it.',
  },
  notooo: {
    personality: 'thoughtful, calm, and human',
    tone: 'concise, reflective, and never academic for its own sake',
    microcopy: {
      intro: 'One page can hold the part worth carrying forward.',
      discovery: 'Look for the idea that stays useful after the book closes.',
      empty: 'The first handwritten page is still being made.',
      next: 'Keep the thought. Then return to the book when you can.',
    },
    signatureLine: 'Remember what matters.',
  },
};

export function getMonsterVoice(monster: Pick<Monster, 'id' | 'status'>): MonsterVoice {
  if (monster.status === 'coming-soon') return mysteryMonsterVoice;
  return monsterVoices[monster.id] ?? baseMonsterVoice;
}

export function voiceForMonsterId(id: Monster['id']): MonsterVoice {
  const monster = getMonsterById(id);
  return monster ? getMonsterVoice(monster) : baseMonsterVoice;
}
