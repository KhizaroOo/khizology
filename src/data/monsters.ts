export type MonsterStatus = 'active' | 'coming-soon' | 'foundation';

export interface Monster {
  id: string;
  name: string;
  module: string;
  description: string;
  color: string;
  colorLight: string;
  textColor: string;
  route: string;
  image: string;
  status: MonsterStatus;
  role?: 'FEEL' | 'USE' | 'UNDERSTAND' | 'REMEMBER';
  tagline: string;
}

export const monsters: Monster[] = [
  {
    id: 'artooo',
    name: 'artooo',
    module: 'Artworks',
    description:
      'A visual playground of sticky-note art, sketches, illustrations, creativity, emotions, and storytelling through lines.',
    color: '#F5CF5C',
    colorLight: '#FDE68A',
    textColor: '#2A3439',
    route: '/artworks',
    image: '/images/Monsters/artooo.png',
    status: 'active',
    role: 'FEEL',
    tagline: 'Art that feels.',
  },
  {
    id: 'toolooo',
    name: 'toolooo',
    module: 'Toolbox',
    description:
      'Small browser tools that help you check, simulate, decide, plan, and create — turning invisible problems into visible ones.',
    color: '#F7933C',
    colorLight: '#FED7AA',
    textColor: '#2A3439',
    route: '/toolbox',
    image: '/images/Monsters/toolooo.png',
    status: 'active',
    role: 'USE',
    tagline: 'Make it visible.',
  },
  {
    id: 'infooo',
    name: 'infooo',
    module: 'Interactive Knowledge Worlds',
    description:
      'Interactive worlds that make difficult knowledge visible, explorable, and easier to understand.',
    color: '#5CCFAF',
    colorLight: '#A7F3D0',
    textColor: '#2A3439',
    route: '/infooo',
    image: '/images/Monsters/infooo.png',
    status: 'active',
    role: 'UNDERSTAND',
    tagline: 'See it. Touch it. Understand it.',
  },
  {
    id: 'notooo',
    name: 'notooo',
    module: 'Knowledge Notes',
    description:
      'One book, filtered into a visual page of ideas worth keeping.',
    // Matches the reserved ff-04 lab asset until Notooo receives final mascot art.
    color: '#E38D7C',
    colorLight: '#FED7AA',
    textColor: '#2A3439',
    route: '/notooo',
    // This reserved lab asset is never presented as Notooo's final mascot identity.
    image: '/images/Monsters/ff-04.png',
    status: 'active',
    role: 'REMEMBER',
    tagline: 'One Book. One Page.',
  },
  {
    id: 'future-2',
    name: '???ooo',
    module: 'Unknown',
    description:
      'A mystery still taking shape in the Khizooology lab.',
    color: '#5DB3D7',
    colorLight: '#BAE6FD',
    textColor: '#2A3439',
    route: '/future-monsters',
    image: '/images/Monsters/ff-01.png',
    status: 'coming-soon',
    tagline: 'Still forming.',
  },
  {
    id: 'future-3',
    name: '???ooo',
    module: 'Unknown',
    description:
      'A mystery still taking shape in the Khizooology lab.',
    color: '#DF78A0',
    colorLight: '#FBCFE8',
    textColor: '#2A3439',
    route: '/future-monsters',
    image: '/images/Monsters/ff-02.png',
    status: 'coming-soon',
    tagline: 'Still forming.',
  },
  {
    id: 'future-4',
    name: '???ooo',
    module: 'Unknown',
    description:
      'A mystery still taking shape in the Khizooology lab.',
    color: '#93B96A',
    colorLight: '#D9F99D',
    textColor: '#2A3439',
    route: '/future-monsters',
    image: '/images/Monsters/ff-03.png',
    status: 'coming-soon',
    tagline: 'Still forming.',
  },
  {
    id: 'future-6',
    name: '???ooo',
    module: 'Unknown',
    description:
      'A mystery still taking shape in the Khizooology lab.',
    color: '#B699FF',
    colorLight: '#DDD6FE',
    textColor: '#2A3439',
    route: '/future-monsters',
    image: '/images/Monsters/devooo.png',
    status: 'coming-soon',
    tagline: 'Still forming.',
  },
  {
    id: 'future-8',
    name: '???ooo',
    module: 'Unknown',
    description:
      'A mystery still taking shape in the Khizooology lab.',
    color: '#6CA6FF',
    colorLight: '#BFDBFE',
    textColor: '#2A3439',
    route: '/future-monsters',
    image: '/images/Monsters/freeooo.png',
    status: 'coming-soon',
    tagline: 'Still forming.',
  },
];

export const activeMonsters = monsters.filter((m) => m.status === 'active');
export const getMonsterById = (id: string) => monsters.find((m) => m.id === id);
