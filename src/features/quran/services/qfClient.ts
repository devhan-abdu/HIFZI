import { supabase } from "@/src/lib/supabase";

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export type QFOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  params?: Record<string, any>;
  body?: any;
  silentErrorLog?: boolean;
};

export class QFRequestError extends Error {
  endpoint: string;
  status: number;
  bodyText: string;
  payload: unknown;
  params?: Record<string, any>;

  constructor({
    endpoint,
    status,
    bodyText,
    payload,
    params,
  }: {
    endpoint: string;
    status: number;
    bodyText: string;
    payload: unknown;
    params?: Record<string, any>;
  }) {
    super(bodyText || `QF request failed with status ${status}`);
    this.name = "QFRequestError";
    this.endpoint = endpoint;
    this.status = status;
    this.bodyText = bodyText;
    this.payload = payload;
    this.params = params;
  }
}

function parseQFResponse(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function callQF(endpoint: string, options?: QFOptions) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const sessionToken = session?.access_token;

    if (!sessionToken) throw new Error("AUTH_REQUIRED");

    const res = await fetch(`${BACKEND_BASE_URL}/qf-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        endpoint,
        method: options?.method ?? "GET",
        params: options?.params,
        body: options?.body,
      }),
    });

    const text = await res.text();
    const payload = parseQFResponse(text);

    if (!res.ok) {
      if (!options?.silentErrorLog) {
        console.error("callQF API error:", { endpoint, status: res.status, body: payload });
      }
      throw new QFRequestError({
        endpoint,
        status: res.status,
        bodyText: text,
        payload,
        params: options?.params,
      });
    }

    return payload;
  } catch (error: any) {
    if (!options?.silentErrorLog) {
      console.error("callQF failure:", { endpoint, message: error?.message });
    }
    throw error; 
  }
}
