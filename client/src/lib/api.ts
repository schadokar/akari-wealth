const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${BASE_URL}${path}`, { ...init, headers }).then((res) => {
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return res;
  });
}
