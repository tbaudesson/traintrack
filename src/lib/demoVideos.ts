/** A link that plays inline: a specific YouTube or Vimeo video, not a search page. */
export const isPlayable = (url: string | null | undefined): url is string =>
  !!url && /(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/|vimeo\.com\/\d)/.test(url);

/** The demo of a library exercise: its video in the database (seeded by migration 064, edited by an admin), when it plays inline. */
export function demoVideo(fromDatabase?: string | null): string | null {
  return isPlayable(fromDatabase) ? fromDatabase : null;
}
