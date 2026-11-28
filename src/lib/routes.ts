/** The address of a session: fixed, with the number in the query, so it opens offline. */
export const sessionHref = (id: number | string | undefined) => `/log/session?id=${id ?? ""}`;

/** A tennis lesson and a tennis group, by ?id= like a session: they open offline too. */
export const tennisLessonHref = (id: number | string) => `/tennis/lesson?id=${id}`;
export const tennisGroupHref = (id: number | string) => `/tennis/group?id=${id}`;
