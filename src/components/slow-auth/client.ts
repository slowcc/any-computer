import { atom, getDefaultStore } from "jotai";
import { atomWithStorage } from "jotai/utils";

interface User {
  address: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
};

export const authAtom = atomWithStorage<AuthState>(
  "auth",
  initialState,
  undefined,
  {
    getOnInit: true,
  }
);

// Utility atoms for specific actions
export const loginAtom = atom(
  null,
  (get, set, { user, token }: { user: User; token: string }) => {
    set(authAtom, {
      isAuthenticated: true,
      user,
      token,
    });
  }
);

export const logoutAtom = atom(null, (get, set) => {
  set(authAtom, initialState);
});

const BASE_URL = "https://slow.land";
export const API_BASE_URL = `${BASE_URL}`;

interface RequestOptions extends RequestInit {
  userAddress?: string;
}

class ApiClient {
  private getAuthToken(): string | null {
    const store = getDefaultStore();
    const authState = store.get(authAtom);
    return authState.token;
  }

  private async fetch(endpoint: string, options: RequestOptions = {}) {
    const token = this.getAuthToken();
    const { userAddress, ...restOptions } = options;

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...restOptions.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...restOptions,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized error - you might want to trigger logout here
        const store = getDefaultStore();
        store.set(authAtom, {
          isAuthenticated: false,
          user: null,
          token: null,
        });
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async get(endpoint: string, options: RequestOptions = {}) {
    return this.fetch(endpoint, options);
  }

  async post(endpoint: string, data?: any, options: RequestOptions = {}) {
    return this.fetch(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async put(endpoint: string, data?: any, options: RequestOptions = {}) {
    return this.fetch(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete(endpoint: string, options: RequestOptions = {}) {
    return this.fetch(endpoint, {
      method: "DELETE",
      ...options,
    });
  }

  async patch(endpoint: string, data?: any, options: RequestOptions = {}) {
    return this.fetch(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }
}

export const apiClient = new ApiClient();