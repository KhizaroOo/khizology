export const noteCategories = ['AI', 'Development', 'Architecture', 'Product', 'Business', 'Learning', 'Creative'] as const;

export type NoteCategory = typeof noteCategories[number];
