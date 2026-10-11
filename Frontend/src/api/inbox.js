import api from "./client";

export const getNotificationSummary = () => api.get("/notifications/").then((r) => r.data);
export const listInbox = (params) => api.get("/inbox/", { params }).then((r) => r.data);
export const markRead = (id) => api.post(`/inbox/${id}/read/`);
export const markAllRead = () => api.post("/inbox/read-all/");
export const deleteInboxItem = (id) => api.delete(`/inbox/${id}/`);
export const sharePublication = (username, openalexId, message) =>
  api.post("/inbox/share/", { username, openalex_id: openalexId, message }).then((r) => r.data);
