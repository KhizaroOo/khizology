import type { APIRoute } from 'astro';
import { SITE } from '../data/site';
import { activeMonsters } from '../data/monsters';
import { tools } from '../data/tools';
import { families, getFamilyById } from '../data/families';
import { infoooIdentity, infoooWorlds } from '../data/infooo';
import { notoooIdentity, publishedNotoooBooks } from '../data/notooo';
import { artworks } from '../data/artworks';
import { getPublishedNotes, notePath } from '../data/notes';
import { absoluteUrl } from '../utils/seo';

export const prerender = true;

// Escape metadata as Markdown text, keeping every resource on a single line.
const text = (value: string) => value.replace(/\s+/g, ' ').trim().replace(/[\\`*_[\]<>]/g, '\\$&');

export const GET: APIRoute = async ({ site }) => {
  const context = { site: site!, base: import.meta.env.BASE_URL };
  const link = (name: string, path: string, description: string) =>
    `- [${text(name)}](${absoluteUrl(path, context)}): ${text(description)}`;
  const hub = (id: string) => activeMonsters.find((monster) => monster.id === id);
  const hubLink = (id: string) => {
    const monster = hub(id)!;
    const name = monster.name[0].toUpperCase() + monster.name.slice(1);
    return link(`${name} — ${monster.module}`, monster.route, monster.description);
  };
  const publicTools = tools.filter((tool) => tool.status === 'active');
  const notes = await getPublishedNotes();
  const lines = [
    `# ${text(SITE.name)}`,
    '',
    `> ${text(SITE.name)} is a personal creative R&D laboratory by ${text(SITE.author)} / ${text(SITE.artistName)}, bringing together engineering, visual art, interactive knowledge and public learning.`,
    '',
    'Its creations help people use, understand, feel and remember. The active monsters are doorways into different kinds of public work.',
    ...(hub('toolooo') ? ['Toolooo tools run in the browser and do not require signup. Their simulations and diagnoses have limits; check the guidance on each tool page.'] : []),
    ...(hub('notooo') ? [`${text(notoooIdentity.disclosure)} ${text(notoooIdentity.notReplacementNotice)}`] : []),
    '',
    '## Start Here',
    '',
    link(SITE.name, '/', `${SITE.tagline} ${SITE.subTagline}`),
    link('Behind the Vibes', '/behind-the-vibes', `The creator story and philosophy behind ${SITE.name}.`),
    link('Portfolio', '/my-portfolio', `Professional work and experience of ${SITE.author}.`),
    ...activeMonsters.map((monster) => hubLink(monster.id)),
  ];

  if (hub('toolooo')) lines.push(
    '', '## Toolooo — Visual Browser Tools', '', hubLink('toolooo'),
    ...publicTools.map((tool) => link(tool.name, `/toolbox/${tool.slug}`, `${getFamilyById(tool.family)!.name} — ${tool.shortDescription}`)),
  );
  if (hub('infooo')) lines.push(
    '', `## Infooo — ${infoooIdentity.type}`, '', hubLink('infooo'),
    ...infoooWorlds.filter((world) => world.status === 'published' && world.visibility === 'public')
      .map((world) => link(world.title, `/infooo/${world.slug}`, world.description)),
  );
  if (hub('notooo')) lines.push(
    '', `## Notooo — ${notoooIdentity.type}`, '', hubLink('notooo'),
    ...publishedNotoooBooks.map((book) => link(`${book.title} — ${book.author}`, `/notooo/${book.slug}`, `${book.category} — ${book.shortDescription}`)),
  );
  if (hub('artooo')) lines.push(
    '', '## Artooo — Original Art', '',
    link('Artooo — Original Art', hub('artooo')!.route, `Explore ${artworks.length} original artworks by ${SITE.artistName} in the public gallery.`),
  );
  lines.push('', '## Optional', '',
    link('Privacy', '/privacy', 'How browser tools and optional analytics handle data.'),
    link('Drop a Vibe', '/drop-a-vibe', `Contact ${SITE.author}.`),
  );
  if (hub('toolooo')) lines.push(...families.filter((family) => publicTools.some((tool) => tool.family === family.id))
    .map((family) => link(`${family.name} tools`, `/toolbox/family/${family.id}`, family.description)));
  if (notes.length) lines.push(
    link('Notes', '/notes', `Published learning notes by ${SITE.author}.`),
    ...notes.map((note) => link(note.data.title, notePath(note.data.slug), note.data.description)),
  );

  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
