export interface NavItem {
  label: string;
  href: string;
  color?: string;
  external?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const mainNav: NavItem[] = [
  { label: 'Artworks',       href: '/artworks',        color: '#F5CF5C' },
  { label: 'Toolbox',        href: '/toolbox',         color: '#F7933C' },
  { label: 'Future Monsters',href: '/future-monsters', color: '#B699FF' },
  { label: 'My Portfolio',   href: '/my-portfolio' },
];

export const footerNav: NavGroup[] = [
  {
    label: 'Monsters',
    items: [
      { label: 'artooo — Artworks',     href: '/artworks' },
      { label: 'toolooo — Toolbox',     href: '/toolbox' },
      { label: 'Future Monsters',       href: '/future-monsters' },
    ],
  },
  {
    label: 'Explore',
    items: [
      { label: 'My Portfolio',      href: '/my-portfolio' },
      { label: 'Behind The Vibes',  href: '/behind-the-vibes' },
      { label: 'You Ask I Answer',  href: '/you-ask-i-answer' },
      { label: 'Drop a Vibe',       href: '/drop-a-vibe' },
    ],
  },
  {
    label: 'Toolbox',
    items: [
      { label: 'All Calculators',           href: '/toolbox' },
      { label: 'Profit Margin Calculator',  href: '/toolbox/calculators/profit-margin-calculator' },
      { label: 'Age Calculator',            href: '/toolbox/calculators/age-calculator' },
      { label: 'Percentage Calculator',     href: '/toolbox/calculators/percentage-calculator' },
    ],
  },
];
