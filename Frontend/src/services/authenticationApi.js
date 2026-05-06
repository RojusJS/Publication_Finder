import apiClient from "./apiClient";

const API_BASE = "http://127.0.0.1:8000";

export async function registerUser({ email, username, password, password2 }) {
  const res = await fetch(`${API_BASE}/api/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password, password2 }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.error || JSON.stringify(data) || "registration failed",
    );
  }
  return data;
}
export async function loginUser({ username, password }) {
  const res = await fetch(`${API_BASE}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || "login failed");
  }
  return data;
}

export const getUsers = async () => {
  const response = await apiClient.get("/auth/users/");
  return response.data;
};

export const deleteUser = async (userId) => {
  await apiClient.delete(`/auth/users/${userId}/`);
};

export const resetUserPassword = async (userId) => {
  const response = await apiClient.post(
    `/auth/users/${userId}/reset-password/`,
  );
  return response.data;
};

export const toggleUserStaff = async (userId) => {
  const response = await apiClient.post(`/auth/users/${userId}/toggle-staff/`);
  return response.data;
};
