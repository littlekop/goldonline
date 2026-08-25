"use client";

// Reads/writes a single JSON blob in the signed-in user's Drive appDataFolder —
// a hidden per-app storage space, so no server or database of our own is needed.
// This lets portfolio + saved price history follow the user across devices as
// long as they sign in with the same Google account.

const FILE_NAME = "gold-tracker-data.json";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

export type SyncedData = {
  entries: unknown[];
  valuationBasis: string;
  history: Record<string, unknown>;
  updatedAt: string;
};

async function findFileId(accessToken: string): Promise<string | null> {
  const res = await fetch(
    `${DRIVE_FILES_URL}?spaces=appDataFolder&q=name%3D%27${FILE_NAME}%27&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = await res.json();
  return data?.files?.[0]?.id ?? null;
}

export async function readSyncedData(accessToken: string): Promise<SyncedData | null> {
  const fileId = await findFileId(accessToken);
  if (!fileId) return null;
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive read failed: ${res.status}`);
  return (await res.json()) as SyncedData;
}

export async function writeSyncedData(accessToken: string, data: SyncedData): Promise<void> {
  const fileId = await findFileId(accessToken);
  const body = JSON.stringify(data);

  if (fileId) {
    const res = await fetch(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) throw new Error(`Drive update failed: ${res.status}`);
    return;
  }

  const boundary = "gold-tracker-boundary";
  const metadata = { name: FILE_NAME, parents: ["appDataFolder"] };
  const multipartBody =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n` +
    `--${boundary}--`;

  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });
  if (!res.ok) throw new Error(`Drive create failed: ${res.status}`);
}
