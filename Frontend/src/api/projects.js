import api from "./client";

const data = (request) => request.then((r) => r.data);
const base = (projectId) => `/projects/${projectId}`;

// Projects
export const listProjects = () => data(api.get("/projects/"));
export const getProject = (projectId) => data(api.get(`${base(projectId)}/`));
export const createProject = (payload) => data(api.post("/projects/", payload));
export const updateProject = (projectId, payload) => data(api.patch(`${base(projectId)}/`, payload));
export const deleteProject = (projectId) => api.delete(`${base(projectId)}/`);
export const leaveProject = (projectId) => api.post(`${base(projectId)}/leave/`);
export const getAnalytics = (projectId, folderId) =>
  data(api.get(`${base(projectId)}/analytics/`, { params: folderId ? { folder: folderId } : {} }));

// Folders
export const listFolders = (projectId, parentId) =>
  data(api.get(`${base(projectId)}/folders/`, { params: { parent: parentId || "root" } }));
export const getFolderTree = (projectId) => data(api.get(`${base(projectId)}/folders/tree/`));
export const getFolder = (projectId, folderId) => data(api.get(`${base(projectId)}/folders/${folderId}/`));
export const createFolder = (projectId, name, parentId) =>
  data(api.post(`${base(projectId)}/folders/`, { name, parent: parentId || null }));
export const updateFolder = (projectId, folderId, payload) =>
  data(api.patch(`${base(projectId)}/folders/${folderId}/`, payload));
export const deleteFolder = (projectId, folderId, keepPublications = true) =>
  api.delete(`${base(projectId)}/folders/${folderId}/`, { params: { keep_publications: keepPublications } });

// Publications
export const listPublications = (projectId, params) =>
  data(api.get(`${base(projectId)}/publications/`, { params }));
export const savePublications = (projectId, openalexIds, folderId = null) =>
  data(api.post(`${base(projectId)}/publications/`, { openalex_ids: openalexIds, folder_id: folderId }));
export const getSavedPublication = (projectId, publicationId) =>
  data(api.get(`${base(projectId)}/publications/${publicationId}/`));
export const updatePublication = (projectId, publicationId, payload) =>
  data(api.patch(`${base(projectId)}/publications/${publicationId}/`, payload));
export const deletePublication = (projectId, publicationId) =>
  api.delete(`${base(projectId)}/publications/${publicationId}/`);

// Notes
export const listNotes = (projectId, publicationId) =>
  data(api.get(`${base(projectId)}/publications/${publicationId}/notes/`));
export const createNote = (projectId, publicationId, text) =>
  data(api.post(`${base(projectId)}/publications/${publicationId}/notes/`, { text }));
export const updateNote = (projectId, publicationId, noteId, text) =>
  data(api.patch(`${base(projectId)}/publications/${publicationId}/notes/${noteId}/`, { text }));
export const deleteNote = (projectId, publicationId, noteId) =>
  api.delete(`${base(projectId)}/publications/${publicationId}/notes/${noteId}/`);

// Tools
export const semanticSearch = (projectId, query, folderId) =>
  data(api.post(`${base(projectId)}/semantic-search/`, { query, folder_id: folderId || null }));
export const getRecommendations = (projectId, folderId, limit = 10) =>
  data(api.post(`/recommendations/${projectId}/`, { folder_id: folderId || null, limit }));
export const listFeedback = (projectId) => data(api.get(`${base(projectId)}/recommendation-feedback/`));
export const sendFeedback = (projectId, openalexId, title, feedback) =>
  api.post(`${base(projectId)}/recommendation-feedback/`, { openalex_id: openalexId, title, feedback });
export const getInsight = (projectId, params) => data(api.get(`/insights/${projectId}/`, { params }));
export const generateInsight = (projectId, payload) => data(api.post(`/insights/${projectId}/`, payload));

export async function exportProject(projectId, format, folderId) {
  let response;
  try {
    response = await api.get(`${base(projectId)}/export/`, {
      params: { format, ...(folderId ? { folder: folderId } : {}) },
      responseType: "blob",
    });
  } catch (error) {
    // Error bodies arrive as a Blob too; decode them so error codes still work.
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        /* not JSON */
      }
    }
    throw error;
  }
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="([^"]+)"/);
  return { blob: response.data, filename: match ? match[1] : `export.${format}` };
}

// Members & invitations
export const listMembers = (projectId) => data(api.get(`${base(projectId)}/collaborators/`));
export const inviteMember = (projectId, username, role) =>
  data(api.post(`${base(projectId)}/collaborators/invite/`, { username, role }));
export const updateMember = (projectId, collaboratorId, role) =>
  data(api.patch(`${base(projectId)}/collaborators/${collaboratorId}/`, { role }));
export const removeMember = (projectId, collaboratorId) =>
  api.delete(`${base(projectId)}/collaborators/${collaboratorId}/`);
export const listInvitations = () => data(api.get("/projects/invitations/"));
export const respondToInvitation = (invitationId, action) =>
  data(api.post(`/projects/invitations/${invitationId}/respond/`, { action }));
