import axios from 'axios';

let inMemoryAuthToken: string | null = null;
let inMemoryGuestChatToken: string | null = null;

export function setInMemoryAuthToken(token: string | null) {
  inMemoryAuthToken = token;
}

export function getInMemoryAuthToken(): string | null {
  return inMemoryAuthToken;
}

export function setInMemoryGuestChatToken(token: string | null) {
  inMemoryGuestChatToken = token;
}

export function getInMemoryGuestChatToken(): string | null {
  return inMemoryGuestChatToken;
}

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = inMemoryAuthToken || inMemoryGuestChatToken;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function extractApiError(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; details?: Array<{ message: string }> } | undefined;
    if (data?.details && data.details.length > 0) {
      return data.details.map((d) => d.message).join('. ');
    }
    if (data?.error) {
      return data.error;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
