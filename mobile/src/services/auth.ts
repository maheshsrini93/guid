import { apiClient } from "../lib/api-client";

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    subscriptionTier: string;
  };
}

interface RefreshResponse {
  token: string;
  refreshToken: string;
}

export function login(email: string, password: string) {
  return apiClient.post<AuthResponse>("/api/auth/mobile/login", {
    email,
    password,
  });
}

export function register(name: string, email: string, password: string) {
  return apiClient.post<AuthResponse>("/api/auth/mobile/register", {
    name,
    email,
    password,
  });
}

export function refreshToken(token: string) {
  return apiClient.post<RefreshResponse>("/api/auth/mobile/refresh", {
    refreshToken: token,
  });
}

