export type MonsterVoiceId = 'artooo' | 'toolooo' | 'infooo' | 'notooo';
export interface MonsterVoice {
  personality: string;
  tone: string;
  microcopy: string;
  success: string;
  warning: string;
  emptyState: string;
  reactions: string[];
  active: boolean;
}

export const monsterVoices: Record<MonsterVoiceId, MonsterVoice> = {
  artooo: { personality: 'observant and warm', tone: 'quiet, visual, unforced', microcopy: 'No calculation this time. Just look.', success: 'Found a piece to sit with.', warning: 'This image stays in your browser.', emptyState: 'Nothing here yet. Try another feeling.', reactions: ['Look closer.', 'Let it linger.'], active: true },
  toolooo: { personality: 'calm and practical', tone: 'plain, useful, never bossy', microcopy: 'I did the math. You make the call.', success: 'A clearer next step.', warning: 'Treat this as a model, then check your real context.', emptyState: 'Start with a preset or one small input.', reactions: ['Make it visible.', 'Try one change.'], active: true },
  infooo: { personality: 'curious, observant, clever', tone: 'short, visual, simple, never patronizing', microcopy: "Words weren't enough. So I made it move.", success: 'Something interesting happens here.', warning: 'Not public yet.', emptyState: 'Locked in the lab.', reactions: ['Wait… look at this.', "Tap it. Let's see what it does.", 'Looks simple. It isn’t.'], active: false },
  notooo: { personality: 'reflective note-maker', tone: 'short and considered', microcopy: 'A thought worth keeping.', success: 'Reserved for future notes.', warning: 'Not public yet.', emptyState: 'Locked in the lab.', reactions: [], active: false },
};
