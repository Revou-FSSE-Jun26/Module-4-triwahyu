import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createApi } from "./api";
import { isApiError } from "./errors";
import { TOKEN_COOKIE } from "./session";

/** The session token for the current request, or null when signed out. Server Components only. */
export async function getServerToken(): Promise<string | null> {
  return (await cookies()).get(TOKEN_COOKIE)?.value ?? null;
}

/** An API bound to the request's token. */
export async function getServerApi() {
  return createApi(await getServerToken());
}

/**
 * Run a server-side fetch and turn a 401 into a redirect to /login (FE-05).
 * Other errors propagate to the route's error boundary.
 */
export async function withSession<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (isApiError(error) && error.statusCode === 401) redirect("/login?expired=1");
    throw error;
  }
}
