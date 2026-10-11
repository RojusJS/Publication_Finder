import api, { refreshAccessToken, setAccessToken } from "./client";

// Not a credential: only remembers that a refresh cookie probably exists, so
// anonymous visitors don't fire a doomed refresh request on every page load.
const SESSION_HINT_KEY = "pf_session";

export function setSessionHint(active) {
  try {
    if (active) window.localStorage.setItem(SESSION_HINT_KEY, "1");
    else window.localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    /* storage unavailable */
  }
}

function hasSessionHint() {
  try {
    return window.localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return true; // cannot tell, so try the cookie
  }
}

async function startSession(request) {
  const { data } = await request;
  setAccessToken(data.access);
  setSessionHint(true);
  return data.user;
}

export const login = (username, password) => startSession(api.post("/auth/login/", { username, password }));

export const register = ({ username, email, password, password2 }) =>
  startSession(api.post("/auth/register/", { username, email, password, password2 }));

/** Restore a session from the refresh cookie; resolves to the user or ``null``. */
export async function restoreSession() {
  if (!hasSessionHint()) return null;
  try {
    await refreshAccessToken();
  } catch {
    setSessionHint(false);
    return null;
  }
  const { data } = await api.get("/auth/me/");
  return data;
}

export async function logout() {
  try {
    await api.post("/auth/logout/");
  } finally {
    setAccessToken(null);
    setSessionHint(false);
  }
}

export const updateProfile = (email) => api.patch("/auth/me/", { email }).then((r) => r.data);

export const changePassword = (currentPassword, newPassword) =>
  startSession(api.post("/auth/me/password/", { current_password: currentPassword, new_password: newPassword }));

export async function deleteAccount(password) {
  await api.delete("/auth/me/", { data: { password } });
  setAccessToken(null);
  setSessionHint(false);
}

// Administration
export const listUsers = (params) => api.get("/auth/users/", { params }).then((r) => r.data);
export const deleteUser = (userId) => api.delete(`/auth/users/${userId}/`);
export const toggleStaff = (userId) => api.post(`/auth/users/${userId}/toggle-staff/`).then((r) => r.data);
