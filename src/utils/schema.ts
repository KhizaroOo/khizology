import { SITE } from '../data/site';
import {
  absoluteUrl,
  breadcrumbSchema,
  pageId,
  personId,
  personReference,
  siteUrl,
  websiteId,
  websiteReference,
  type BreadcrumbItem,
  type SeoUrlContext,
} from './seo';

export function personSchema(context: SeoUrlContext) {
  return {
    '@type': 'Person',
    '@id': personId(context),
    name: SITE.author,
    alternateName: SITE.artistName,
    url: absoluteUrl('/my-portfolio', context),
    sameAs: SITE.sameAs,
  };
}

export function websiteSchema(context: SeoUrlContext) {
  return {
    '@type': 'WebSite',
    '@id': websiteId(context),
    url: siteUrl(context),
    name: SITE.name,
    description: SITE.description,
    creator: personReference(context),
  };
}

interface PageSchemaInput {
  type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'ProfilePage';
  path: string;
  name: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
  aboutCreator?: boolean;
  primaryImage?: string;
  extra?: Record<string, unknown>;
}

export function pageSchema(input: PageSchemaInput, context: SeoUrlContext) {
  const page: Record<string, unknown> = {
    '@type': input.type || 'WebPage',
    '@id': pageId(input.path, context),
    url: absoluteUrl(input.path, context),
    name: input.name,
    description: input.description,
    isPartOf: websiteReference(context),
    ...(input.aboutCreator ? { about: personReference(context) } : {}),
    ...(input.primaryImage ? { primaryImageOfPage: { '@type': 'ImageObject', url: absoluteUrl(input.primaryImage, context) } } : {}),
    ...input.extra,
  };

  const graph: Record<string, unknown>[] = [page];
  if (input.breadcrumbs?.length) {
    const breadcrumb: Record<string, unknown> = breadcrumbSchema(input.breadcrumbs, context);
    const breadcrumbId = `${absoluteUrl(input.path, context)}#breadcrumb`;
    breadcrumb['@id'] = breadcrumbId;
    page.breadcrumb = { '@id': breadcrumbId };
    graph.push(breadcrumb);
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
