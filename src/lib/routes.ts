/** The address of a session: fixed, with the number in the query, so it opens offline. */
export const sessionHref = (id: number | string | undefined) => `/log/session?id=${id ?? ""}`;
