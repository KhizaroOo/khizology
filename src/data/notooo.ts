export const notoooCategories = ['Mind', 'Money', 'Nature', 'Life', 'People', 'Society'] as const;
export type NotoooCategory = typeof notoooCategories[number];
export type NotoooBookStatus = 'draft' | 'approved' | 'published';
export type NotoooContentFormat = 'book';
export const notoooResearchConfidence = ['high', 'medium', 'low'] as const;
export type NotoooResearchConfidence = typeof notoooResearchConfidence[number];
export const notoooSourceTypes = ['author', 'publisher', 'official', 'interview', 'review', 'analysis', 'other'] as const;
export type NotoooSourceType = typeof notoooSourceTypes[number];

export interface NotoooSource {
  id: string;
  title: string;
  type: NotoooSourceType;
  publisher?: string;
  url?: string;
  accessedAt?: string;
}

export interface NotoooEngineSection {
  id: string;
  title: string;
  oneLiner: string;
  points: string[];
  sourceIds?: string[];
  example?: string;
  note?: string;
  label?: string;
}

export interface NotoooBook {
  id: string;
  number: number;
  slug: string;
  title: string;
  author: string;
  publicationYear?: number;
  bookPublicationDate?: string;
  publisher?: string;
  format: NotoooContentFormat;
  category: NotoooCategory;
  tags: string[];
  summaryImage: string;
  originalDownload: string;
  alt: string;
  shortDescription: string;
  whyItMatters: string;
  aboutThisNotooo: string;
  keyIdeas: string[];
  subtitle: string;
  bigIdea: NotoooEngineSection;
  sections: NotoooEngineSection[];
  khizoooTake: NotoooEngineSection;
  remember: NotoooEngineSection;
  sources: NotoooSource[];
  researchConfidence: NotoooResearchConfidence;
  editionNote?: string;
  relatedBooks?: string[];
  createdAt?: string;
  publishedAt?: string;
  updatedAt?: string;
  featured?: boolean;
  status: NotoooBookStatus;
}

export interface NotoooValidationResult {
  errors: string[];
  warnings: string[];
}

export const notoooIdentity = {
  id: 'notooo',
  monsterId: 'notooo',
  status: 'active' as const,
  type: 'Book in One Page',
  role: 'REMEMBER',
  tagline: 'One Book. One Page.',
  supportingLine: 'Big knowledge. Small space. Simple words.',
  philosophy: 'Research, understand, filter, compress, and visualize the useful ideas in one simple knowledge page.',
  mission: 'Preserve useful knowledge in a form worth returning to.',
  disclosure: 'A khizooo-curated one-page synthesis created with AI-assisted research. It captures useful ideas, not the complete book.',
  notReplacementNotice: 'Notooo is not a replacement for reading the original book.',
  mascot: null,
  mascotNote: 'No final Notooo mascot asset is assigned yet.',
  pageFormat: 'A4 portrait',
  color: '#E38D7C',
  colorLight: '#FED7AA',
} as const;

// Add approved public Book in One Page entries here after their release is approved.
export const notoooBooks: NotoooBook[] = [{
  id: 'atomic-habits', number: 1, slug: 'atomic-habits', title: 'Atomic Habits', author: 'James Clear', publicationYear: 2018, bookPublicationDate: '2018-10-16', publisher: 'Avery',
  format: 'book', category: 'Mind', tags: ['Habits', 'Behavior', 'Identity', 'Systems', 'Self Improvement'], summaryImage: '', originalDownload: '',
  alt: 'Visual one-page Notooo synthesis of Atomic Habits by James Clear',
  shortDescription: 'Atomic Habits by James Clear compressed into one visual Notooo page covering identity, systems, the habit loop, Four Laws, environment and consistency.',
  whyItMatters: 'Atomic Habits provides a practical way to think about behavior change: make useful actions easier to repeat, shape the environment around them, and focus on the identity built through repetition rather than depending only on motivation.',
  aboutThisNotooo: 'This one-page synthesis focuses on the book’s most useful ideas: identity, systems, the habit loop, the Four Laws of Behavior Change, environment design, starting small, and returning quickly after a miss.',
  keyIdeas: ['Small changes compound', 'Identity grows through repeated actions', 'Systems move progress forward', 'Habits follow a cue-to-reward loop', 'Make good habits obvious, attractive, easy, and satisfying'],
  subtitle: 'Build small systems that make better choices easier to repeat.',
  bigIdea: {
    id: 'big-idea', title: 'Big Idea', oneLiner: 'Small actions repeated consistently can create large changes over time.',
    points: ['Small actions become systems when you repeat them.', 'Systems slowly shape your identity and results.'], sourceIds: ['james-clear-official', 'avery-publisher'],
  },
  sections: [
    { id: 'identity', title: 'Identity', oneLiner: 'Build habits around the person you want to become, not only the result you want.', points: ['Ask: “Who do I want to become?”', 'Repeated actions are evidence of that identity.', 'Small wins make the new identity feel real.'], sourceIds: ['james-clear-official', 'avery-publisher'] },
    { id: 'goals-vs-systems', title: 'Goals vs Systems', oneLiner: 'Goals choose the destination; systems are the repeated actions that move you there.', points: ['A goal shows where you want to go.', 'A system is what you do again and again.'], sourceIds: ['james-clear-official'] },
    { id: 'habit-loop', title: 'Habit Loop', oneLiner: 'Habits form through a repeating cycle of cue, craving, response, and reward.', points: ['Cue: you notice something.', 'Craving: you want a change.', 'Response and reward teach the brain to repeat it.'], sourceIds: ['avery-publisher', 'official-interviews'] },
    { id: 'four-laws', title: 'Four Laws', oneLiner: 'Good habits become easier when they are obvious, attractive, easy, and satisfying.', points: ['Make the cue easy to see and the action easy to start.', 'Make the result feel useful enough to repeat.'], sourceIds: ['james-clear-official', 'avery-publisher'] },
    { id: 'environment', title: 'Environment', oneLiner: 'Shape your surroundings so good choices become easier and bad choices become harder.', points: ['Keep useful cues in sight.', 'Move unhelpful cues out of reach.'], sourceIds: ['james-clear-official'] },
    { id: 'start-small', title: 'Start Small', oneLiner: 'Make the first step so easy that starting requires almost no effort.', points: ['Read one page instead of planning a whole chapter.', 'Put on workout clothes before asking for a full workout.'], sourceIds: ['james-clear-official', 'official-interviews'] },
    { id: 'consistency', title: 'Consistency', oneLiner: 'Missing once is normal; returning quickly stops one miss from becoming a pattern.', points: ['One miss is an event, not your identity.', 'Return to the system at the next chance.'], sourceIds: ['james-clear-official'] },
  ],
  khizoooTake: {
    id: 'khizooo-take', title: 'Khizooo Take', oneLiner: 'Real change comes from designing repeatable systems instead of waiting for motivation.', points: [],
    sourceIds: ['james-clear-official'], note: 'AI-assisted draft reviewed and approved for this Notooo entry.',
  },
  remember: {
    id: 'remember', title: 'Remember', oneLiner: 'Don’t chase a perfect day; build a system you can return to tomorrow.', points: [], sourceIds: ['james-clear-official'],
  },
  sources: [
    { id: 'james-clear-official', title: 'James Clear official Atomic Habits material', type: 'author', publisher: 'James Clear' },
    { id: 'avery-publisher', title: 'Atomic Habits publisher information', type: 'publisher', publisher: 'Avery' },
    { id: 'official-interviews', title: 'Official Atomic Habits summaries and interviews', type: 'official' },
  ],
  researchConfidence: 'high',
  editionNote: 'Published by Avery, 2018.', publishedAt: '2026-09-17', status: 'published', featured: true,}, {
  id: 'thinking-fast-and-slow', number: 2, slug: 'thinking-fast-and-slow', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', publicationYear: 2011, bookPublicationDate: '2011', publisher: 'Farrar, Straus and Giroux / Macmillan',
  format: 'book', category: 'Mind', tags: ['Decision Making', 'Judgment', 'Intuition', 'Uncertainty', 'Memory'], summaryImage: '', originalDownload: '',
  alt: 'Visual one-page Notooo synthesis of Thinking, Fast and Slow by Daniel Kahneman',
  shortDescription: 'Thinking, Fast and Slow by Daniel Kahneman in one Notooo page covering fast and slow thinking, bias, loss aversion, framing, intuition and memory.',
  whyItMatters: 'Thinking, Fast and Slow gives us a practical language for understanding judgment. It explains why quick intuition can be both powerful and misleading, and when slowing down can help us make a better decision.',
  aboutThisNotooo: 'This one-page synthesis focuses on fast and slow thinking, mental shortcuts, overconfidence, chance, loss aversion, framing, expert intuition, and the difference between experiencing and remembering.',
  keyIdeas: ['Fast and slow thinking work together', 'Easy answers can replace hard questions', 'Confidence can exceed evidence', 'Chance changes more outcomes than we notice', 'Framing can change choices'],
  subtitle: 'Your first answer is fast. Your best answer may need a second look.',
  bigIdea: {
    id: 'big-idea', title: 'Big Idea', oneLiner: 'We use fast automatic thinking and slower deliberate thinking; knowing their strengths and mistakes can improve our decisions.',
    points: ['Fast thinking handles most everyday judgments automatically.', 'Slow thinking uses attention to check harder problems.', 'Problems happen when a quick answer feels more reliable than it really is.'], sourceIds: ['macmillan-book', 'kahneman-nobel-lecture'],
  },
  sections: [
    { id: 'two-ways-of-thinking', title: 'Two Ways of Thinking', oneLiner: 'System 1 reacts quickly and automatically; System 2 slows down and works through harder problems.', points: ['System 1 is fast, effortless, and intuitive.', 'System 2 needs attention and mental effort.', 'Both are useful; neither should be treated as simply “good” or “bad.”'], sourceIds: ['macmillan-book', 'kahneman-nobel-lecture'] },
    { id: 'mental-shortcuts', title: 'Mental Shortcuts', oneLiner: 'When a question is difficult, the mind may answer an easier question without noticing.', points: ['Shortcuts help us make fast judgments.', 'They often work, but they can also create predictable errors.', 'An easy answer can feel right even when it does not answer the real question.'], sourceIds: ['macmillan-book'] },
    { id: 'overconfidence', title: 'Overconfidence', oneLiner: 'A convincing story can make us feel more certain than the evidence deserves.', points: ['We naturally build explanations from the information we have.', 'We often underestimate uncertainty and the role of luck.', 'Looking backward can make past events seem more predictable than they really were.'], sourceIds: ['macmillan-book'] },
    { id: 'chance-and-statistics', title: 'Chance & Statistics', oneLiner: 'Our minds prefer simple causes, but many outcomes contain more chance than we notice.', points: ['Small samples can produce misleading patterns.', 'Extreme results often move closer to normal over time.', 'A memorable pattern is not automatically a reliable prediction.'], sourceIds: ['macmillan-book', 'nobel-kahneman-facts'] },
    { id: 'losses-feel-bigger', title: 'Losses Feel Bigger', oneLiner: 'Losing something usually hurts more than gaining the same amount feels good.', points: ['People judge gains and losses relative to a reference point.', 'Losses can influence decisions more strongly than equivalent gains.', 'This helps explain why choices under risk do not always match purely rational models.'], sourceIds: ['kahneman-nobel-lecture', 'nobel-kahneman-facts'] },
    { id: 'framing-changes-choices', title: 'Framing Changes Choices', oneLiner: 'The same facts can lead to different choices depending on how they are presented.', points: ['“Lives saved” can feel different from equivalent “lives lost.”', 'Gain and loss framing can shift risk preferences.', 'Before deciding, try describing the same choice in another way.'], sourceIds: ['macmillan-book', 'kahneman-nobel-lecture'] },
    { id: 'when-to-trust-intuition', title: 'When to Trust Intuition', oneLiner: 'Intuition becomes more trustworthy when real experience has trained you to recognize useful patterns.', points: ['Expert intuition can develop through repeated meaningful practice.', 'Familiar cues can trigger strong answers very quickly.', 'Confidence alone does not prove that intuition is expertise.'], sourceIds: ['macmillan-book'] },
    { id: 'two-selves', title: 'Two Selves', oneLiner: 'The part of you living an experience and the part remembering it do not always judge it the same way.', points: ['The experiencing self lives each moment.', 'The remembering self builds the story afterward.', 'Future choices can be guided by the memory of an experience rather than every moment that actually happened.'], sourceIds: ['macmillan-book'] },
  ],
  khizoooTake: {
    id: 'khizooo-take', title: 'Khizooo Take', oneLiner: 'Fast thinking is not the enemy. The real skill is noticing when your first answer is enough and when an important decision deserves slower thinking.', points: [],
    sourceIds: ['macmillan-book', 'kahneman-nobel-lecture'], note: 'AI-generated Khizooo Take approved for this Notooo entry.',
  },
  remember: {
    id: 'remember', title: 'Remember', oneLiner: 'When the stakes are high, slow down, check the evidence, and ask what your first answer may be missing.', points: [], sourceIds: ['macmillan-book', 'kahneman-nobel-lecture'],
  },
  sources: [
    { id: 'macmillan-book', title: 'Thinking, Fast and Slow — Farrar, Straus and Giroux / Macmillan', type: 'publisher', publisher: 'Farrar, Straus and Giroux / Macmillan' },
    { id: 'kahneman-nobel-lecture', title: 'Daniel Kahneman — Nobel Lecture', type: 'official' },
    { id: 'nobel-kahneman-facts', title: 'Daniel Kahneman — Nobel Prize Facts', type: 'official' },
  ],
  researchConfidence: 'high',
  editionNote: 'First published in 2011.', publishedAt: '2026-09-20', status: 'published',}, {
  id: 'the-psychology-of-money', number: 3, slug: 'the-psychology-of-money', title: 'The Psychology of Money', author: 'Morgan Housel', publicationYear: 2020, bookPublicationDate: '2020-09-08', publisher: 'Harriman House',
  format: 'book', category: 'Money', tags: ['Money & Behavior', 'Risk', 'Compounding', 'Long-term Thinking'], summaryImage: '', originalDownload: '',
  alt: 'Visual one-page Notooo note on The Psychology of Money by Morgan Housel',
  shortDescription: 'The Psychology of Money by Morgan Housel in one concise Notooo note about behavior, risk, compounding, enough, and staying power.',
  whyItMatters: 'The book shifts attention from forecasting and formulas toward the habits that help people make decisions under uncertainty. It is educational context, not financial or investment advice.',
  aboutThisNotooo: 'This original one-page interpretation focuses on behavior, luck and risk, compounding, enough, room for error, and long-term thinking. It is not a substitute for the book or personal financial guidance.',
  keyIdeas: ['Money decisions are shaped by experience and behavior', 'Luck and risk can coexist in one outcome', 'Compounding needs time and patience', 'Enough can protect long-term choices', 'Room for error makes plans more durable'],
  subtitle: 'Money choices are human choices made under uncertainty.',
  bigIdea: { id: 'big-idea', title: 'Big Idea', oneLiner: 'The book argues that doing well with money depends as much on behavior under uncertainty as on technical knowledge.', points: ['Different life experiences can produce different reasonable money choices.', 'The goal is a durable approach, not a universal formula.'], sourceIds: ['harriman-house', 'morgan-housel'] },
  sections: [
    { id: 'behavior-before-brilliance', title: 'Behavior Before Brilliance', oneLiner: 'Knowing a rule is different from being able to follow it when fear, envy, or excitement arrive.', points: ['Personal history shapes what feels safe or risky.', 'A usable plan has to fit the person using it.'], sourceIds: ['harriman-house', 'morgan-housel'] },
    { id: 'luck-and-risk', title: 'Luck & Risk', oneLiner: 'An outcome can reflect both skill and forces a person could not control.', points: ['Avoid turning one success into proof of a universal rule.', 'Treat a setback as information, not a complete verdict.'], sourceIds: ['harriman-house'] },
    { id: 'compounding-needs-time', title: 'Compounding Needs Time', oneLiner: 'Small gains can become meaningful when a useful process lasts long enough to build on itself.', points: ['Time is part of the result, not empty waiting.', 'Interrupting a sound process too early can erase its advantage.'], sourceIds: ['harriman-house', 'morgan-housel'] },
    { id: 'enough-is-a-boundary', title: 'Enough Is a Boundary', oneLiner: 'A personal definition of enough can keep ambition from demanding risks that damage what already matters.', points: ['More is not automatically a better target.', 'A boundary can make long-term choices calmer.'], sourceIds: ['harriman-house'] },
    { id: 'room-for-error', title: 'Room for Error', oneLiner: 'Plans become sturdier when they leave space for surprise, delay, and being wrong.', points: ['Build decisions that can survive imperfect forecasts.', 'Keeping options open can be more valuable than chasing maximum efficiency.'], sourceIds: ['harriman-house', 'morgan-housel'] },
  ],
  khizoooTake: { id: 'notooo-take', title: 'Notooo Take', oneLiner: 'A financial plan is more useful when it helps you keep making thoughtful choices through changing conditions.', points: [], sourceIds: ['harriman-house'], note: 'Original educational interpretation; not financial, legal, or investment advice.' },
  remember: { id: 'one-thing-to-keep', title: 'One Thing to Keep', oneLiner: 'Choose a path you can stay with when uncertainty makes the perfect plan impossible.', points: [], sourceIds: ['harriman-house'] },
  sources: [
    { id: 'harriman-house', title: 'The Psychology of Money', type: 'publisher', publisher: 'Harriman House', url: 'https://harriman.house/books/the-psychology-of-money/', accessedAt: '2026-09-20' },
    { id: 'morgan-housel', title: 'Morgan Housel official website', type: 'author', publisher: 'Morgan Housel', url: 'https://www.morganhousel.com/', accessedAt: '2026-09-20' },
  ],
  researchConfidence: 'high', editionNote: 'First published by Harriman House in 2020.', publishedAt: '2026-09-20', status: 'published', featured: true, relatedBooks: ['thinking-fast-and-slow'],
}, {
  id: 'braiding-sweetgrass', number: 4, slug: 'braiding-sweetgrass', title: 'Braiding Sweetgrass', author: 'Robin Wall Kimmerer', publicationYear: 2013, bookPublicationDate: '2013-09-16', publisher: 'Milkweed Editions',
  format: 'book', category: 'Nature', tags: ['Nature & Ecology', 'Reciprocity', 'Indigenous Knowledge', 'Science', 'Responsibility'], summaryImage: '', originalDownload: '',
  alt: 'Visual one-page Notooo note on Braiding Sweetgrass by Robin Wall Kimmerer',
  shortDescription: 'Braiding Sweetgrass by Robin Wall Kimmerer in one Notooo note about reciprocity, attention, responsibility, and respectful ways of knowing.',
  whyItMatters: 'Kimmerer brings botanical knowledge, Indigenous teachings, and lived relationship with land into conversation. The book asks readers to notice responsibilities within the more-than-human world.',
  aboutThisNotooo: 'This original interpretation keeps the book’s strands distinct rather than treating Indigenous knowledge as generic wellness advice. It is an invitation to read the original work and learn with context.',
  keyIdeas: ['Reciprocity changes how we understand a gift', 'Attention can become a form of responsibility', 'Knowledge traditions carry context and obligations', 'Gratitude can lead toward care', 'Living systems deserve more than extraction'],
  subtitle: 'Attention to the living world can become a practice of responsibility.',
  bigIdea: { id: 'big-idea', title: 'Big Idea', oneLiner: 'Braiding Sweetgrass places scientific knowledge and Indigenous teachings in conversation to ask how reciprocity can reshape our relationship with the living world.', points: ['The book does not reduce either tradition to the other.', 'Its framing asks what responsibility follows from receiving.'], sourceIds: ['robin-kimmerer', 'milkweed'] },
  sections: [
    { id: 'reciprocity', title: 'Reciprocity', oneLiner: 'A gift can create a relationship of care and return rather than a license to take without limit.', points: ['Receiving can carry obligations.', 'Care is part of the relationship, not an optional extra.'], sourceIds: ['robin-kimmerer', 'milkweed'] },
    { id: 'attention', title: 'Attention', oneLiner: 'Close observation of plants, places, and seasons can make a living system easier to recognize as more than a resource.', points: ['Specific attention resists treating land as an abstraction.', 'Learning begins with noticing what is already there.'], sourceIds: ['robin-kimmerer'] },
    { id: 'knowledge-with-context', title: 'Knowledge With Context', oneLiner: 'The book brings distinct knowledge traditions together without claiming they are interchangeable.', points: ['Scientific methods and Indigenous teachings have different histories and responsibilities.', 'Respect means not extracting teachings from their cultural context.'], sourceIds: ['robin-kimmerer', 'milkweed'] },
    { id: 'gratitude-and-care', title: 'Gratitude & Care', oneLiner: 'Gratitude matters most when it changes how people act toward the places and beings that sustain them.', points: ['Appreciation can lead to stewardship.', 'Care can be practiced locally and repeatedly.'], sourceIds: ['robin-kimmerer'] },
    { id: 'limits', title: 'Limits', oneLiner: 'A reciprocal relationship includes restraint: taking less, paying attention, and accepting that not everything is ours to use.', points: ['Limits protect relationships over time.', 'Responsibility is not the same as a quick personal benefit.'], sourceIds: ['milkweed', 'robin-kimmerer'] },
  ],
  khizoooTake: { id: 'notooo-take', title: 'Notooo Take', oneLiner: 'Read this as an invitation to listen with context, not as permission to borrow teachings that are not ours to flatten or claim.', points: [], sourceIds: ['robin-kimmerer'] },
  remember: { id: 'one-thing-to-keep', title: 'One Thing to Keep', oneLiner: 'Let attention lead to responsibility for the living systems you depend on.', points: [], sourceIds: ['robin-kimmerer'] },
  sources: [
    { id: 'robin-kimmerer', title: 'Braiding Sweetgrass', type: 'author', publisher: 'Robin Wall Kimmerer', url: 'https://robinwallkimmerer.com/book/braiding-sweetgrass/', accessedAt: '2026-09-20' },
    { id: 'milkweed', title: 'Braiding Sweetgrass', type: 'publisher', publisher: 'Milkweed Editions', url: 'https://milkweed.org/braiding-sweetgrass', accessedAt: '2026-09-20' },
  ],
  researchConfidence: 'high', editionNote: 'First published by Milkweed Editions in 2013.', publishedAt: '2026-09-20', status: 'published',
}, {
  id: 'mans-search-for-meaning', number: 5, slug: 'mans-search-for-meaning', title: "Man's Search for Meaning", author: 'Viktor E. Frankl', publicationYear: 1946, publisher: 'Beacon Press',
  format: 'book', category: 'Life', tags: ['Meaning & Resilience', 'Responsibility', 'Logotherapy', 'History', 'Psychology'], summaryImage: '', originalDownload: '',
  alt: "Visual one-page Notooo note on Man's Search for Meaning by Viktor E. Frankl",
  shortDescription: "Man's Search for Meaning by Viktor E. Frankl in one Notooo note about meaning, responsibility, historical context, and the limits of simple lessons.",
  whyItMatters: "Frankl's work combines an account of Nazi concentration camps with an introduction to logotherapy. It calls for serious attention to meaning while never making extreme suffering into a motivational slogan or clinical advice.",
  aboutThisNotooo: 'This original interpretation separates the book’s historical testimony from its high-level psychological ideas. It does not offer mental-health treatment, explain trauma, or prescribe how anyone should respond to suffering.',
  keyIdeas: ['Historical suffering must not be reduced to a lesson', 'Meaning is connected to responsibility', 'Logotherapy centers a search for meaning', 'Attitude is not a measure of moral worth', 'Psychological support needs appropriate care'],
  subtitle: 'A serious book about meaning that refuses easy answers to suffering.',
  bigIdea: { id: 'big-idea', title: 'Big Idea', oneLiner: 'Frankl’s account and logotherapy ask how people may orient themselves toward meaning, responsibility, and dignity amid circumstances they did not choose.', points: ['The historical account of Nazi concentration camps must remain central and specific.', 'The ideas are not a promise that suffering is useful or controllable.'], sourceIds: ['frankl-institute', 'penguin-random-house'] },
  sections: [
    { id: 'historical-context', title: 'Historical Context', oneLiner: 'The book includes Frankl’s testimony about imprisonment in Nazi concentration camps, a reality that should never be simplified into inspiration content.', points: ['The Holocaust is not a backdrop for a productivity lesson.', 'Historical suffering deserves accuracy, specificity, and respect.'], sourceIds: ['penguin-random-house', 'frankl-institute'] },
    { id: 'meaning-and-responsibility', title: 'Meaning & Responsibility', oneLiner: 'The book presents meaning as something encountered through commitments, relationships, and responsibility rather than delivered as a universal answer.', points: ['A meaning question may be personal and situated.', 'Responsibility points toward what a person can answer for.'], sourceIds: ['penguin-random-house', 'frankl-institute'] },
    { id: 'logotherapy', title: 'Logotherapy', oneLiner: 'Frankl’s approach places the search for meaning at the center of human motivation.', points: ['This is a high-level description, not treatment guidance.', 'People seeking support should use qualified professional care.'], sourceIds: ['frankl-institute', 'penguin-random-house'] },
    { id: 'attitude-with-care', title: 'Attitude With Care', oneLiner: 'The book discusses one’s stance toward hardship, but this must not become blame for people facing pain, trauma, or injustice.', points: ['No response to suffering proves a person’s worth.', 'Structural conditions and support remain real.'], sourceIds: ['frankl-institute'] },
    { id: 'no-easy-lesson', title: 'No Easy Lesson', oneLiner: 'The strongest takeaway is not a slogan; it is the demand to approach meaning, history, and another person’s suffering with seriousness.', points: ['Avoid comparing ordinary setbacks to atrocity.', 'Keep the book’s historical and psychological dimensions connected.'], sourceIds: ['penguin-random-house', 'frankl-institute'] },
  ],
  khizoooTake: { id: 'notooo-take', title: 'Notooo Take', oneLiner: 'The book is most useful when read as a serious invitation to consider responsibility and meaning, with care for its history and limits.', points: [], sourceIds: ['penguin-random-house'] },
  remember: { id: 'one-thing-to-keep', title: 'One Thing to Keep', oneLiner: 'Do not turn suffering into a slogan; meet questions of meaning with honesty, context, and care.', points: [], sourceIds: ['frankl-institute'] },
  sources: [
    { id: 'frankl-institute', title: 'Viktor Frankl Institute — standard publication list', type: 'official', publisher: 'Viktor Frankl Institute', url: 'https://www.viktorfrankl.org/standard_publist.html', accessedAt: '2026-09-20' },
    { id: 'penguin-random-house', title: "Man's Search for Meaning", type: 'publisher', publisher: 'Penguin Random House', url: 'https://www.penguinrandomhouse.com/books/206272/mans-search-for-meaning-by-viktor-e-frankl/', accessedAt: '2026-09-20' },
  ],
  researchConfidence: 'high', editionNote: 'First published in 1946; edition details vary.', publishedAt: '2026-09-20', status: 'published',
}, {
  id: 'steve-jobs', number: 6, slug: 'steve-jobs', title: 'Steve Jobs', author: 'Walter Isaacson', publicationYear: 2011, bookPublicationDate: '2011-10-24', publisher: 'Simon & Schuster',
  format: 'book', category: 'People', tags: ['Biography & Innovation', 'Product Thinking', 'Craft', 'Design', 'Leadership'], summaryImage: '', originalDownload: '',
  alt: 'Visual one-page Notooo note on Steve Jobs by Walter Isaacson',
  shortDescription: 'Steve Jobs by Walter Isaacson in one Notooo note about product focus, craft, design, leadership, persuasion, and the costs of imitation.',
  whyItMatters: 'Isaacson’s biography offers a documented portrait of an influential product leader and the people and industries around him. It is useful when lessons are separated from the behaviors that should not be copied blindly.',
  aboutThisNotooo: 'This original interpretation focuses on product and craft themes in the biography, while keeping its subject a complex person rather than a hero template or a psychological diagnosis.',
  keyIdeas: ['Focus requires saying no', 'Craft shapes product experience', 'Small details can carry a larger intention', 'Persuasion can motivate and distort', 'A result does not justify every method'],
  subtitle: 'Learn from the work without turning a person into a template.',
  bigIdea: { id: 'big-idea', title: 'Big Idea', oneLiner: 'Isaacson presents Jobs as a demanding, influential creative entrepreneur whose product instincts and working style produced both notable strengths and real costs.', points: ['The biography draws on extensive interviews and reporting.', 'A lesson from one life is not a rule for every team.'], sourceIds: ['simon-schuster', 'isaacson-official'] },
  sections: [
    { id: 'focus', title: 'Focus', oneLiner: 'A coherent product often depends on choosing what it will not try to be.', points: ['Fewer priorities can make a direction clearer.', 'Saying no is only useful when it protects a real purpose.'], sourceIds: ['simon-schuster', 'isaacson-official'] },
    { id: 'craft-and-design', title: 'Craft & Design', oneLiner: 'The biography highlights attention to the experience of a product, including details users may not name directly.', points: ['Care for details can communicate respect for the user.', 'Craft is a practice shared across a team, not a lone-genius trait.'], sourceIds: ['simon-schuster'] },
    { id: 'persuasion', title: 'Persuasion', oneLiner: 'Strong conviction can help a team move, but it can also crowd out useful dissent and honest constraints.', points: ['A compelling story can create energy.', 'Healthy teams still need room for evidence and disagreement.'], sourceIds: ['simon-schuster', 'isaacson-official'] },
    { id: 'leadership-costs', title: 'Leadership Costs', oneLiner: 'The book does not ask readers to copy every aspect of Jobs’s management style.', points: ['Intensity can produce results and strain relationships at the same time.', 'An admired outcome does not excuse harmful conduct.'], sourceIds: ['simon-schuster'] },
    { id: 'biography-not-blueprint', title: 'Biography, Not Blueprint', oneLiner: 'A life story can sharpen questions about craft and focus without becoming a universal operating manual.', points: ['Context, collaborators, and timing shape every outcome.', 'Use the biography to examine choices, not to imitate a personality.'], sourceIds: ['isaacson-official', 'simon-schuster'] },
  ],
  khizoooTake: { id: 'notooo-take', title: 'Notooo Take', oneLiner: 'Keep the focus on useful product questions: what deserves care, what should be removed, and how can a team pursue quality without copying harmful patterns.', points: [], sourceIds: ['simon-schuster'] },
  remember: { id: 'one-thing-to-keep', title: 'One Thing to Keep', oneLiner: 'Learn from the work and its context; do not treat a famous person’s style as a complete blueprint.', points: [], sourceIds: ['isaacson-official'] },
  sources: [
    { id: 'simon-schuster', title: 'Steve Jobs', type: 'publisher', publisher: 'Simon & Schuster', url: 'https://www.simonandschuster.com/books/Steve-Jobs/Walter-Isaacson/9781451648539', accessedAt: '2026-09-20' },
    { id: 'isaacson-official', title: 'Steve Jobs by Walter Isaacson', type: 'author', publisher: 'Walter Isaacson', url: 'https://isaacson.tulane.edu/books/steve-jobs/', accessedAt: '2026-09-20' },
  ],
  researchConfidence: 'high', editionNote: 'Published by Simon & Schuster in 2011.', publishedAt: '2026-09-20', status: 'published', relatedBooks: ['thinking-fast-and-slow'],
}, {
  id: 'sapiens', number: 7, slug: 'sapiens', title: 'Sapiens', author: 'Yuval Noah Harari', publicationYear: 2011, publisher: 'Harper',
  format: 'book', category: 'Society', tags: ['History & Humanity', 'Institutions', 'Culture', 'Science', 'Systems Thinking'], summaryImage: '', originalDownload: '',
  alt: 'Visual one-page Notooo note on Sapiens by Yuval Noah Harari',
  shortDescription: 'Sapiens by Yuval Noah Harari in one Notooo note about human history, shared stories, institutions, agriculture, and debated broad interpretations.',
  whyItMatters: 'Sapiens offers a large-scale story about how Homo sapiens formed societies and institutions. Its broad framing can prompt useful questions, but its interpretations should not be treated as uncontested historical fact.',
  aboutThisNotooo: 'This original interpretation identifies the book’s central frameworks and their limits. It distinguishes Harari’s sweeping synthesis from established facts and points readers toward the original book and further history.',
  keyIdeas: ['Shared stories can coordinate large groups', 'Institutions depend on collective belief and practice', 'Agriculture changed social organization', 'Money can organize trust across distance', 'Broad history needs critical reading'],
  subtitle: 'A wide historical lens, read with curiosity and critical distance.',
  bigIdea: { id: 'big-idea', title: 'Big Idea', oneLiner: 'Harari argues that humans gained unusual power to cooperate at scale through shared stories, institutions, and changing forms of knowledge.', points: ['This is a broad interpretive framework, not a settled account of every period.', 'The book spans evolutionary roots through modern scientific and economic change.'], sourceIds: ['harari-official', 'harper'] },
  sections: [
    { id: 'cognitive-revolution', title: 'Cognitive Revolution', oneLiner: 'The book presents a cognitive revolution as a framework for explaining expanded human cooperation and imagination.', points: ['Harari uses it to connect language, stories, and social coordination.', 'The framework is a synthesis that historians and scientists may debate.'], sourceIds: ['harari-official', 'harper'] },
    { id: 'imagined-orders', title: 'Imagined Orders', oneLiner: 'Harari describes shared beliefs and institutions as structures that can organize cooperation among people who do not know one another.', points: ['Money, law, and nations rely on shared practice as well as rules.', 'Calling an order imagined does not mean its effects are unreal.'], sourceIds: ['harari-official'] },
    { id: 'agriculture', title: 'Agriculture', oneLiner: 'The book frames agriculture as a major reorganization of human life, labor, and population rather than an uncomplicated upgrade.', points: ['Large shifts can create gains and new burdens together.', 'This framing is an interpretation, not a single verdict on every society.'], sourceIds: ['harari-official', 'harper'] },
    { id: 'institutions-and-money', title: 'Institutions & Money', oneLiner: 'The book uses money and institutions to show how trust can travel beyond face-to-face relationships.', points: ['Shared systems can coordinate strangers at large scales.', 'Every system also depends on history, enforcement, and unequal power.'], sourceIds: ['harari-official'] },
    { id: 'read-broad-claims-critically', title: 'Read Broad Claims Critically', oneLiner: 'A sweeping narrative can reveal patterns and still require checking against more specific histories and scholarship.', points: ['Ask whether an argument is evidence, interpretation, or provocation.', 'Use the book as a starting point for inquiry, not a final map of humanity.'], sourceIds: ['harari-official', 'harper'] },
  ],
  khizoooTake: { id: 'notooo-take', title: 'Notooo Take', oneLiner: 'The useful habit is to notice the stories and institutions that coordinate people, then ask whose evidence and interests they carry.', points: [], sourceIds: ['harari-official'] },
  remember: { id: 'one-thing-to-keep', title: 'One Thing to Keep', oneLiner: 'A powerful historical story is an invitation to investigate, not permission to stop questioning.', points: [], sourceIds: ['harari-official'] },
  sources: [
    { id: 'harari-official', title: 'Sapiens', type: 'author', publisher: 'Yuval Noah Harari', url: 'https://www.ynharari.com/book/sapiens/', accessedAt: '2026-09-20' },
    { id: 'harper', title: 'Sapiens — Tenth Anniversary Edition', type: 'publisher', publisher: 'HarperCollins', url: 'https://officialharpercollins.shop/products/sapiens-tenth-anniversary-ed-yuval-noah-harari', accessedAt: '2026-09-20' },
  ],
  researchConfidence: 'high', editionNote: 'First published in Hebrew in 2011; English editions vary.', publishedAt: '2026-09-20', status: 'published', relatedBooks: ['braiding-sweetgrass'],
}];

export function getPublishedNotoooBooks(books: NotoooBook[] = notoooBooks) {
  return books.filter((book) => book.status === 'published');
}

export const publishedNotoooBooks = getPublishedNotoooBooks();
export const hasPublishedNotoooBooks = publishedNotoooBooks.length > 0;

export function getNotoooBook(slug: string) {
  return publishedNotoooBooks.find((book) => book.slug === slug);
}

export function relatedNotoooBooks(book: NotoooBook) {
  const ids = new Set(book.relatedBooks || []);
  return publishedNotoooBooks.filter((candidate) => candidate.id !== book.id && ids.has(candidate.id));
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sourceTypes = new Set<string>(notoooSourceTypes);
const confidenceLevels = new Set<string>(notoooResearchConfidence);
const contentStatuses = new Set<string>(['draft', 'approved', 'published']);

function validateSection(book: NotoooBook, section: NotoooEngineSection | undefined, label: string, sourceIds: Set<string>, sectionIds: Set<string>, result: NotoooValidationResult) {
  if (!section) {
    result.errors.push(`${book.slug}: missing ${label}`);
    return;
  }
  if (!kebabCasePattern.test(section.id)) result.errors.push(`${book.slug}: section id must be lowercase kebab-case`);
  if (sectionIds.has(section.id)) result.errors.push(`${book.slug}: duplicate section id ${section.id}`);
  sectionIds.add(section.id);
  if (!section.title.trim() || !section.oneLiner.trim()) result.errors.push(`${book.slug}: every Engine section needs a title and one-liner`);
  if (section.title.length > 70) result.errors.push(`${book.slug}: Engine section title is too long`);
  if (section.oneLiner.length > 240) result.errors.push(`${book.slug}: Engine section one-liner is too long`);
  if (section.oneLiner.length > 170) result.warnings.push(`${book.slug}: Engine section one-liner should be shorter for a one-page layout`);
  if (section.points.length > 3) result.errors.push(`${book.slug}: Engine sections may contain at most three supporting points`);
  if (section.points.some((point) => !point.trim())) result.errors.push(`${book.slug}: Engine section points cannot be empty`);
  if (section.points.some((point) => point.length > 160)) result.warnings.push(`${book.slug}: supporting points should be shorter for one-page readability`);
  if (new Set(section.sourceIds || []).size !== (section.sourceIds || []).length) result.errors.push(`${book.slug}: duplicate source ID in section ${section.id}`);
  for (const sourceId of section.sourceIds || []) if (!sourceIds.has(sourceId)) result.errors.push(`${book.slug}: broken source ID ${sourceId}`);
}

export function assessNotoooBooks(books: NotoooBook[]): NotoooValidationResult {
  const result: NotoooValidationResult = { errors: [], warnings: [] };
  const ids = new Set<string>();
  const numbers = new Set<number>();
  const slugs = new Set<string>();
  const validCategories = new Set<string>(notoooCategories);

  for (const book of books) {
    if (!kebabCasePattern.test(book.id)) result.errors.push(`${book.id}: id must be lowercase kebab-case`);
    if (ids.has(book.id)) result.errors.push(`${book.id}: duplicate id`);
    ids.add(book.id);
    if (!Number.isInteger(book.number) || book.number < 1) result.errors.push(`${book.id}: number must be a positive integer`);
    if (numbers.has(book.number)) result.errors.push(`${book.id}: duplicate number`);
    numbers.add(book.number);
    if (!kebabCasePattern.test(book.slug)) result.errors.push(`${book.id}: slug must be lowercase kebab-case`);
    if (slugs.has(book.slug)) result.errors.push(`${book.slug}: duplicate slug`);
    slugs.add(book.slug);
    if (!validCategories.has(book.category)) result.errors.push(`${book.slug}: invalid category`);
    if (book.format !== 'book') result.errors.push(`${book.slug}: unsupported Notooo format`);
    if (!contentStatuses.has(book.status)) result.errors.push(`${book.slug}: invalid content status`);
    for (const [label, value] of Object.entries({ title: book.title, author: book.author, alt: book.alt, shortDescription: book.shortDescription, whyItMatters: book.whyItMatters, subtitle: book.subtitle })) {
      if (!value.trim()) result.errors.push(`${book.slug}: missing ${label}`);
    }
    if (!Array.isArray(book.keyIdeas) || !book.keyIdeas.length) result.errors.push(`${book.slug}: add at least one paraphrased key idea`);
    if (book.publicationYear && (!Number.isInteger(book.publicationYear) || book.publicationYear < 1)) result.errors.push(`${book.slug}: invalid publicationYear`);
    if (book.createdAt && !datePattern.test(book.createdAt)) result.errors.push(`${book.slug}: createdAt must use YYYY-MM-DD`);
    if (book.publishedAt && !datePattern.test(book.publishedAt)) result.errors.push(`${book.slug}: publishedAt must use YYYY-MM-DD`);
    if (book.updatedAt && !datePattern.test(book.updatedAt)) result.errors.push(`${book.slug}: updatedAt must use YYYY-MM-DD`);
    if (book.status === 'published' && !book.publishedAt) result.errors.push(`${book.slug}: published entries need publishedAt`);
    if (book.relatedBooks?.includes(book.id)) result.errors.push(`${book.slug}: cannot relate to itself`);
    if (!confidenceLevels.has(book.researchConfidence)) result.errors.push(`${book.slug}: invalid research confidence`);
    if (book.status === 'published' && book.researchConfidence === 'low') result.errors.push(`${book.slug}: published entries cannot use low research confidence`);
    const sources = Array.isArray(book.sources) ? book.sources : [];
    if (!sources.length) result.errors.push(`${book.slug}: add at least one research source`);
    if (book.researchConfidence === 'high' && sources.length < 2) result.errors.push(`${book.slug}: high research confidence needs at least two sources`);

    const sourceIds = new Set<string>();
    for (const source of sources) {
      if (!kebabCasePattern.test(source.id)) result.errors.push(`${book.slug}: source id must be lowercase kebab-case`);
      if (sourceIds.has(source.id)) result.errors.push(`${book.slug}: duplicate source id ${source.id}`);
      sourceIds.add(source.id);
      if (!source.title.trim()) result.errors.push(`${book.slug}: source needs a title`);
      if (!sourceTypes.has(source.type)) result.errors.push(`${book.slug}: invalid source type`);
      if (source.url && !/^https:\/\//.test(source.url)) result.errors.push(`${book.slug}: source URL must use HTTPS`);
      if (source.accessedAt && !datePattern.test(source.accessedAt)) result.errors.push(`${book.slug}: source accessedAt must use YYYY-MM-DD`);
    }

    const sectionIds = new Set<string>();
    const mainSections = Array.isArray(book.sections) ? book.sections : [];
    if (!mainSections.length) result.errors.push(`${book.slug}: add at least one dynamic Engine section`);
    if (mainSections.length < 5 || mainSections.length > 8) result.warnings.push(`${book.slug}: aim for five to eight main sections`);
    validateSection(book, book.bigIdea, 'Big Idea', sourceIds, sectionIds, result);
    for (const section of mainSections) validateSection(book, section, 'Engine section', sourceIds, sectionIds, result);
    validateSection(book, book.khizoooTake, 'Khizooo Take', sourceIds, sectionIds, result);
    validateSection(book, book.remember, 'Remember', sourceIds, sectionIds, result);

    const completeSections = [book.bigIdea, ...mainSections, book.khizoooTake, book.remember].filter((section): section is NotoooEngineSection => Boolean(section));
    const visibleText = [book.subtitle, ...completeSections.flatMap((section) => [section.oneLiner, ...section.points])];
    if (visibleText.some((text) => text.split(/\s+/).length > 32)) result.warnings.push(`${book.slug}: simplify a sentence longer than 32 words`);
    if (book.bigIdea?.oneLiner && book.bigIdea.oneLiner.split(/[.!?]+/).filter(Boolean).length > 2) result.warnings.push(`${book.slug}: Big Idea should use one sentence, two at most`);
    if (visibleText.some((text) => /[“"][^”"]{220,}[”"]/.test(text))) result.warnings.push(`${book.slug}: review a long quoted passage for copyright discipline`);
    const estimatedWords = visibleText.join(' ').trim().split(/\s+/).filter(Boolean).length;
    if (estimatedWords > 500) result.warnings.push(`${book.slug}: visible content exceeds the one-page word budget`);
  }

  for (const book of books) for (const relatedId of book.relatedBooks || []) {
    if (!ids.has(relatedId)) result.errors.push(`${book.slug}: broken related book reference ${relatedId}`);
  }
  return result;
}

export function validateNotoooBooks(books: NotoooBook[]) {
  return assessNotoooBooks(books).errors;
}

export function getNotoooQualityWarnings(books: NotoooBook[]) {
  return assessNotoooBooks(books).warnings;
}
