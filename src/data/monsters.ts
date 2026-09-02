export type MonsterStatus = 'active' | 'coming-soon';

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
    tagline: 'Make it visible.',
  },
  {
    id: 'future-2',
    name: '???ooo',
    module: 'Unknown',
    description:
      'A mystery. A future module. Identity unknown — but it is coming.',
    color: '#5DB3D7',
    colorLight: '#BAE6FD',
    textColor: '#2A3439',
    route: '/future-monsters',
    image: '/images/Monsters/ff-01.png',
    status: 'coming-soon',
    tagline: 'Coming soon.',
  },
  {
    id: 'future-3',
    name: '???ooo',
    module: 'Unknown',
    description:
      'A mystery. A future module. Identity unknown — but it is coming.',
    color: '#DF78A0',
    colorLight: '#FBCFE8',
    textColor: '#2A3439',
    route: '/future-monsters',
    image: '/images/Monsters/ff-02.png',
    status: 'coming-soon',
    tagline: 'Coming soon.',
  },
  {
    id: 'future-4',
    name: '???ooo',
    module: 'Unknown',
    description:
      'A mystery. A future module. Identity unknown — but it is coming.',
    color: '#93B96A',
    colorLight: '#D9F99D',
    textColor: '#2A3439',
    route: '/future-monsters',
    image: '/images/Monsters/ff-03.png',
    status: 'coming-soon',
    tagline: 'Growing.',
  },
  {
    id: 'future-5',
    name: '???ooo',
    module: 'Unknown',
    description:
      'A mystery. A future module. Identity unknown — but it is coming.',
    color: '#E38D7C',
    colorLight: '#FED7AA',
    textColor: '#2A3439',
    route: '/future-monsters',
    image: '/images/Monsters/ff-04.png',
    status: 'coming-soon',
    tagline: 'Unleashing soon.',
  },
  {
    id: 'future-6',
    name: '???ooo',
    module: 'Unknown',
    description:
      'A mystery. A future module. Identity unknown — but it is coming.',
    color: '#B699FF',
    colorLight: '#DDD6FE',
    textColor: '#2A3439',
    route: '/future-monsters',
    image: '/images/Monsters/devooo.png',
    status: 'coming-soon',
    tagline: 'In the lab.',
  },
  {
    id: 'future-7',
    name: '???ooo',
    module: 'Unknown',
    description:
      'A mystery. A future module. Identity unknown — but it is coming.',
    color: '#5CCFAF',
    colorLight: '#A7F3D0',
    textColor: '#2A3439',
    route: '/future-monsters',
    image: '/images/Monsters/infooo.png',
    status: 'coming-soon',
    tagline: 'Brewing.',
  },
  {
    id: 'future-8',
    name: '???ooo',
    module: 'Unknown',
    description:
      'A mystery. A future module. Identity unknown — but it is coming.',
    color: '#6CA6FF',
    colorLight: '#BFDBFE',
    textColor: '#2A3439',
    route: '/future-monsters',
    image: '/images/Monsters/freeooo.png',
    status: 'coming-soon',
    tagline: 'Almost ready.',
  },
];

export const activeMonsters = monsters.filter((m) => m.status === 'active');
export const getMonsterById = (id: string) => monsters.find((m) => m.id === id);
