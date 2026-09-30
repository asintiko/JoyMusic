import { ApiError, createApiClient, type ApiClient, type RequestItem } from "@joymusic/shared";
import { e2eEnvironment } from "../environment";

export const slug = "joy-demo-club";
const password = "joymusic-demo";

export interface DjSession {
  api: ApiClient;
  venueId: string;
  sessionId: string | null;
}

async function loginClient(email: string): Promise<ApiClient> {
  const environment = e2eEnvironment();
  let token: string | null = null;
  const api = createApiClient({
    baseUrl: environment.apiUrl,
    getToken: (kind) => (kind === "user" ? token : null),
  });
  const result = await api.call("authLogin", { body: { email, password } });
  token = result.accessToken;
  return api;
}

export async function djClient(): Promise<DjSession> {
  const api = await loginClient("dj@joymusic.uz");
  const venue = await api.call("venuePublic", { params: { slug } });
  return { api, venueId: venue.id, sessionId: null };
}

export async function ownerClient() {
  const api = await loginClient("demo@joymusic.uz");
  const venue = await api.call("venuePublic", { params: { slug } });
  return { api, venueId: venue.id };
}

export async function tableToken(label: string): Promise<{ token: string; scans: number }> {
  const owner = await ownerClient();
  const list = await owner.api.call("adminQrList", { params: { venueId: owner.venueId } });
  const code = list.codes.find((entry) => entry.label === label);
  if (!code) throw new Error(`QR code ${label} not found`);
  return { token: code.token, scans: code.scans };
}

export async function scansOf(label: string): Promise<number> {
  return (await tableToken(label)).scans;
}

export async function endActiveSession(dj: DjSession): Promise<void> {
  const state = await dj.api.call("venueState", { params: { slug } });
  if (!state.session) return;
  try {
    await dj.api.call("djSessionEnd", { params: { sessionId: state.session.id } });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }
}

export async function startSession(dj: DjSession): Promise<string> {
  await endActiveSession(dj);
  const session = await dj.api.call("djSessionStart", { params: { venueId: dj.venueId } });
  dj.sessionId = session.id;
  return session.id;
}

export async function endSession(dj: DjSession): Promise<void> {
  if (!dj.sessionId) return;
  await dj.api.call("djSessionEnd", { params: { sessionId: dj.sessionId } });
  dj.sessionId = null;
}

export async function findRequest(dj: DjSession, title: string): Promise<RequestItem> {
  if (!dj.sessionId) throw new Error("No active session");
  const state = await dj.api.call("djSessionState", { params: { sessionId: dj.sessionId } });
  const all = [...state.pending, ...state.queue];
  const found = all.find((item) => item.title === title);
  if (!found) throw new Error(`Request ${title} not found`);
  return found;
}

export async function setRequestsOpen(dj: DjSession, requestsOpen: boolean): Promise<void> {
  if (!dj.sessionId) throw new Error("No active session");
  await dj.api.call("djSessionSettings", {
    params: { sessionId: dj.sessionId },
    body: { requestsOpen },
  });
}
