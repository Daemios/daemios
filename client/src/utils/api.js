import router from "@/router/index.js";
import { useToastStore } from "@/stores/toastStore";

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message || "Request failed");
    this.name = "ApiError";
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.details = options.details ?? null;
    this.payload = options.payload ?? null;
  }
}

let toastStore;
function getToastStore() {
  try {
    if (!toastStore) toastStore = useToastStore();
    return toastStore;
  } catch (err) {
    return null;
  }
}

function showToast(message) {
  const store = getToastStore();
  if (store) {
    store.showError(message);
  } else {
    console.error("API error:", message);
  }
}

function extractMessage(payload, fallback = "Request failed") {
  if (!payload && payload !== 0) return fallback;
  if (typeof payload === "string") {
    return payload || fallback;
  }
  if (typeof payload === "object") {
    if (payload.error && payload.error.message) return payload.error.message;
    if (payload.message) return payload.message;
    if (payload.data && typeof payload.data === "object" && payload.data.message) {
      return payload.data.message;
    }
  }
  return fallback;
}

async function parseBody(response) {
  const contentType = response.headers.get("content-type") || "";
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch (err) {
      return null;
    }
  }
  return text;
}

function handleFailure(status, payload) {
  const message = extractMessage(payload, status === 401 ? "Please sign in" : "Request failed");
  if (status === 401 && typeof document !== "undefined") {
    try {
      const currentPath = document.location ? document.location.pathname : null;
      if (currentPath !== "/login") {
        router.push("/login");
      }
    } catch (err) {
      /* ignore router push failures */
    }
  }
  showToast(message);
  throw new ApiError(message, {
    status,
    code: payload && payload.error ? payload.error.code : null,
    details: payload && payload.error ? payload.error.details : null,
    payload,
  });
}

const API_BASE = (() => {
  try {
    const fromEnv =
      import.meta && import.meta.env && import.meta.env.VITE_API_ENDPOINT
        ? import.meta.env.VITE_API_ENDPOINT
        : null;
    return fromEnv || "http://localhost:3000";
  } catch (e) {
    return "http://localhost:3000";
  }
})();

const IS_DEV = typeof window !== "undefined" && window.location && window.location.port;

const api = {
  async call(method, url, input) {
    const suffix = String(url || "").replace(/^\//, "");
    const path = IS_DEV
      ? `/api/${suffix}`
      : `${API_BASE.replace(/\/$/, "")}/${suffix}`;

    try {
      const response = await fetch(path, {
        method,
        mode: "cors",
        credentials: "include",
        headers: {
          "X-Organization-Alias": "web-client",
          "Cache-Control": "no-cache",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body:
          method === "POST" || method === "PATCH" ? JSON.stringify(input) : null,
      });

      const payload = await parseBody(response);

      if (!response.ok) {
        handleFailure(response.status, payload);
      }

      if (payload && typeof payload === "object" && "success" in payload) {
        if (payload.success) {
          return payload;
        }
        handleFailure(response.status, payload);
      }

      return { success: true, data: payload, meta: null, message: null };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const message = err && err.message ? err.message : "Network request failed";
      showToast(message);
      throw new ApiError(message, { status: null, details: null, payload: null });
    }
  },
  get(url, input) {
    return api.call("GET", url, input);
  },
  post(url, input) {
    return api.call("POST", url, input);
  },
  patch(url, input) {
    return api.call("PATCH", url, input);
  },
  delete(url, input) {
    return api.call("DELETE", url, input);
  },
};

export default api;
