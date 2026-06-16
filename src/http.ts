// Small HTTP helpers shared by the engine and handlers. Response / Headers /
// Request are the platform globals (browser, or Node's undici in tests).

import type { MockRequest } from "./types";

/** Build a JSON Response with the right content-type. */
export function json(
  body: unknown,
  init: { status?: number; headers?: HeadersInit } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

/** Resolve after `ms` milliseconds (used for the configurable latency). */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True when the path targets the mocked API surface. */
export function isApiPath(url: URL): boolean {
  return url.pathname.startsWith("/api/");
}

/**
 * Normalize the (input, init) pair `fetch` was called with into a MockRequest.
 * Body parsing is lazy — handlers that don't read it pay nothing.
 */
export function normalizeRequest(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  baseUrl: string,
): MockRequest {
  let href: string;
  let reqMethod: string | undefined;
  let reqHeaders: HeadersInit | undefined;
  let reqBody: BodyInit | null | undefined;

  if (typeof input === "string") {
    href = input;
  } else if (input instanceof URL) {
    href = input.href;
  } else {
    // Request object
    href = input.url;
    reqMethod = input.method;
    reqHeaders = input.headers;
  }

  const method = (init?.method ?? reqMethod ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers ?? reqHeaders);
  reqBody = init?.body;

  const url = new URL(href, baseUrl);

  const readText = async (): Promise<string> => {
    if (reqBody != null) {
      if (typeof reqBody === "string") return reqBody;
      // Other BodyInit shapes are uncommon in prototype code; stringify best-effort.
      return String(reqBody);
    }
    if (input instanceof Request) {
      try {
        return await input.clone().text();
      } catch {
        return "";
      }
    }
    return "";
  };

  return {
    method,
    url,
    path: url.pathname,
    headers,
    text: readText,
    json: async () => {
      const text = await readText();
      if (!text) return undefined;
      try {
        return JSON.parse(text);
      } catch {
        return undefined;
      }
    },
  };
}
