"use client";

// Minimal wrapper around Google Identity Services (GIS) for a single scope:
// drive.appdata — a hidden, per-app folder Drive gives every signed-in user,
// invisible in their normal Drive UI. No backend/database needed on our side.
//
// Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID to be set (OAuth 2.0 Client ID, "Web application",
// created in Google Cloud Console — see web/.env.local.example for setup steps).

const DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let gisScriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("โหลด Google Sign-In ไม่สำเร็จ"));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

export function isGoogleSyncConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

// Requests a Drive appdata access token via the GIS popup flow.
// Resolves with the token, or rejects if the user closes the popup / denies access.
export async function requestDriveAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_GOOGLE_CLIENT_ID — ดู web/.env.local.example");
  }
  await loadGisScript();

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts!.oauth2!.initTokenClient({
      client_id: clientId,
      scope: DRIVE_APPDATA_SCOPE,
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token);
      },
      error_callback: (err) => reject(new Error(err?.message || "เข้าสู่ระบบไม่สำเร็จ")),
    });
    client.requestAccessToken();
  });
}

export function revokeDriveAccessToken(token: string) {
  window.google?.accounts?.oauth2?.revoke(token, () => {});
}

// Minimal ambient types for the GIS client (Google doesn't ship official TS types).
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token: string; error?: string }) => void;
            error_callback?: (err: { message?: string }) => void;
          }) => { requestAccessToken: () => void };
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}
