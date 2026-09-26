export function normalizeNotoooSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Search only catalog metadata, never the private research/body fields. */
export function matchesNotoooCatalogItem(
  item: { search: string; category: string; status: string },
  query: string,
  category: string,
  status: string,
): boolean {
  return (category === 'All' || item.category === category)
    && (status === 'all' || item.status === status)
    && normalizeNotoooSearch(query).split(/\s+/).every(term => item.search.includes(term));
}
