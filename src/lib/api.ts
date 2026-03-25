import type { LiveRoom, FeedItem } from './types';
import { ethers } from 'ethers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Auth Context ────────────────────────────────────────────────────────────

let cachedSigner: ethers.Signer | null = null;
let cachedAddress: string = '';

export function setAuthContext(signer: ethers.Signer | null, address: string) {
  cachedSigner = signer;
  cachedAddress = address;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!cachedSigner || !cachedAddress) return {};
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const message = `Encanta Authentication\nWallet: ${cachedAddress.toLowerCase()}\nNonce: ${nonce}`;
  const signature = await cachedSigner.signMessage(message);
  return {
    'X-Signature': signature,
    'X-Nonce': nonce,
    'X-Wallet': cachedAddress.toLowerCase(),
  };
}

// ── Fetch helper ────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { wallet?: string; authenticated?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.wallet ? { Authorization: `Wallet ${options.wallet}` } : {}),
  };

  if (options?.authenticated) {
    const authHeaders = await getAuthHeaders();
    Object.assign(headers, authHeaders);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error de servidor' }));
    throw new Error(err.detail || `Error ${res.status}`);
  }

  return res.json();
}

async function authenticatedFormFetch(url: string, options: RequestInit): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders, ...options?.headers },
  });
  return res;
}

// ── Artists ───────────────────────────────────────────────────────────────────

export function fetchArtists() {
  return apiFetch<Record<string, unknown>[]>('/api/artists/');
}

export function fetchArtist(wallet: string) {
  return apiFetch<Record<string, unknown>>(`/api/artists/${wallet}`);
}

export function submitApplication(data: {
  wallet_address: string;
  stage_name: string;
  bio: string;
  categories: string[];
  hard_limits: string;
  referrer: string;
}) {
  return apiFetch<{ status: string }>('/api/artists/apply', {
    method: 'POST',
    body: JSON.stringify(data),
    authenticated: true,
  });
}

export async function uploadAudition(wallet: string, videoBlob: Blob) {
  const formData = new FormData();
  formData.append('video', videoBlob, 'audition.webm');
  formData.append('wallet', wallet);

  const res = await authenticatedFormFetch(`${API_URL}/api/artists/audition`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// ── Content ──────────────────────────────────────────────────────────────────

export async function uploadContent(file: File, artistWallet: string, category: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('artist_wallet', artistWallet);
  formData.append('category', category);

  const res = await authenticatedFormFetch(`${API_URL}/api/content/upload`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export function recordView(contentId: string, wallet: string) {
  return apiFetch(`/api/content/view/${contentId}?wallet=${wallet}`, { wallet });
}

export function recordLike(contentId: string, subscriberWallet: string, artistWallet: string) {
  return apiFetch(`/api/content/like/${contentId}`, {
    method: 'POST',
    body: JSON.stringify({
      subscriber_wallet: subscriberWallet,
      content_id: contentId,
      artist_wallet: artistWallet,
      engagement_type: 'like',
    }),
    authenticated: true,
  });
}

// ── Feed & Collections ──────────────────────────────────────────────────────

export function fetchFeed() {
  return apiFetch<FeedItem[]>('/api/content/feed');
}

export function purchaseContent(contentId: string, wallet: string) {
  return apiFetch<{ status: string }>(`/api/content/purchase/${contentId}`, {
    method: 'POST',
    body: JSON.stringify({ wallet }),
    authenticated: true,
  });
}

export function fetchCollection(wallet: string) {
  return apiFetch<{ items: Record<string, unknown>[] }>(`/api/content/collection/${wallet}`, {
    authenticated: true,
  });
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export function getTaskStatus(wallet: string) {
  return apiFetch<Record<string, unknown>[]>(`/api/tasks/${wallet}`, {
    authenticated: true,
  });
}

export async function submitTask(wallet: string, taskId: number, files: File[]) {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));

  const res = await authenticatedFormFetch(`${API_URL}/api/tasks/${wallet}/${taskId}/submit`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export function checkSubscription(wallet: string) {
  return apiFetch<{ active: boolean; expiry: string | null; referral_count: number }>(
    `/api/subscribe/status/${wallet}`
  );
}

export function getReferralInfo(wallet: string) {
  return apiFetch<{ wallet: string; referral_code: string; referral_count: number; share_text: string }>(
    `/api/subscribe/referral/${wallet}`
  );
}

// ── Live Rooms ──────────────────────────────────────────────────────────────

export function fetchLiveRooms() {
  return apiFetch<LiveRoom[]>('/api/live/rooms');
}

export function createLiveRoom(wallet: string, title: string, price: number) {
  return apiFetch<{ room_id: string }>('/api/live/rooms', {
    method: 'POST',
    body: JSON.stringify({ wallet, title, price }),
    authenticated: true,
  });
}

export function joinLiveRoom(roomId: string, wallet: string) {
  return apiFetch<{ token: string }>(`/api/live/rooms/${roomId}/join`, {
    method: 'POST',
    body: JSON.stringify({ wallet }),
    authenticated: true,
  });
}

export function closeLiveRoom(roomId: string, wallet: string) {
  return apiFetch<{ status: string }>(`/api/live/rooms/${roomId}`, {
    method: 'DELETE',
    body: JSON.stringify({ wallet }),
    authenticated: true,
  });
}

// ── WebSocket URL helper ────────────────────────────────────────────────────

export function getLiveWebSocketUrl(roomId: string, token: string) {
  const wsBase = API_URL.replace(/^http/, 'ws');
  return `${wsBase}/ws/live/${roomId}?token=${token}`;
}
