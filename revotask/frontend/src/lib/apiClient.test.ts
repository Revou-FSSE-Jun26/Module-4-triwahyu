import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, getBaseUrl } from "./apiClient";
import { ApiError } from "./errors";

const respond = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://public.example/api");
  vi.stubEnv("API_BASE_URL", "https://server.example/api/");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// REQ-FND-4: typed fetch wrapper with env-specific base URLs, bearer auth and ApiError.
describe("getBaseUrl", () => {
  it("uses NEXT_PUBLIC_API_BASE_URL in the browser", () => expect(getBaseUrl()).toBe("https://public.example/api"));

  it("uses API_BASE_URL on the server and trims trailing slashes", () => {
    vi.stubGlobal("window", undefined);
    expect(getBaseUrl()).toBe("https://server.example/api");
  });

  it("falls back to the public URL on the server when API_BASE_URL is unset", () => {
    vi.stubGlobal("window", undefined);
    vi.stubEnv("API_BASE_URL", "");
    delete process.env.API_BASE_URL;
    expect(getBaseUrl()).toBe("https://public.example/api");
  });

  it("throws a clear error when nothing is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(() => getBaseUrl()).toThrow(/not configured/);
  });
});

describe("apiRequest", () => {
  it("unwraps the data envelope and sends the bearer token", async () => {
    const fetchMock = vi.fn(() => respond(200, { data: { id: "1" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ id: string }>("/boards", {}, "tok")).resolves.toEqual({ id: "1" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://public.example/api/boards");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok");
    expect(init.cache).toBe("no-store");
  });

  it("omits Authorization without a token and adds JSON content type for bodies", async () => {
    const fetchMock = vi.fn(() => respond(201, { data: {} }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/auth/login", { method: "POST", body: "{}" });

    const headers = new Headers((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers);
    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws ApiError with statusCode, message, code and details on non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => respond(400, { error: "Validation failed: title", code: "VALIDATION_ERROR", details: { title: ["Required"] } })),
    );

    const error = await apiRequest("/cards").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      statusCode: 400,
      message: "Validation failed: title",
      code: "VALIDATION_ERROR",
      details: { title: ["Required"] },
    });
  });

  it("throws ApiError with status 0 when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(apiRequest("/boards")).rejects.toMatchObject({ statusCode: 0, code: "NETWORK_ERROR" });
  });

  it("throws ApiError for a success response that is not in the envelope", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respond(200, { unexpected: true })));
    await expect(apiRequest("/boards")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("handles non-JSON error bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("<html>Bad gateway</html>", { status: 502 }))));
    await expect(apiRequest("/boards")).rejects.toMatchObject({ statusCode: 502 });
  });
});
