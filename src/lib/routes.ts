/** The address of a session: fixed, with the number in the query, so it opens offline. */
export const sessionHref = (id: number | string | undefined) => `/log/session?id=${id ?? ""}`;

/** A group lesson and a lesson group, by ?id= like a session: they open offline too. */
export const lessonHref = (id: number | string) => `/lessons/lesson?id=${id}`;
export const lessonGroupHref = (id: number | string) => `/lessons/group?id=${id}`;
