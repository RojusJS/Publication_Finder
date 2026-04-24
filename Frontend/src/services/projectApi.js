import apiClient from "./apiClient";

export const getProjects = async () => {
  const response = await apiClient.get("/projects/");
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await apiClient.post("/projects/", projectData);
  return response.data;
};

export const deleteProject = async (projectId) => {
  await apiClient.delete(`/projects/${projectId}/`);
};

export const getFolders = async (projectId) => {
  const response = await apiClient.get(`/projects/${projectId}/folders/`);
  return response.data;
};

export const createFolder = async (projectId, folderData) => {
  const response = await apiClient.post(
    `/projects/${projectId}/folders/`,
    folderData,
  );
  return response.data;
};

export const deleteFolder = async (projectId, folderId) => {
  await apiClient.delete(`/projects/${projectId}/folders/${folderId}/`);
};

export const savePublication = async (projectId, folderId, pubData) => {
  const response = await apiClient.post(
    `/projects/${projectId}/folders/${folderId}/publications/`,
    {
      openalex_id: pubData.openalex_id,
      title: pubData.title,
      year: pubData.year,
      doi: pubData.doi,
      pdf_url: pubData.pdf_url,
      landing_page_url: pubData.landing_page_url,
      abstract: pubData.abstract,
      authors: pubData.authors ?? [],
      institutions: pubData.institutions ?? [],
      source_name: pubData.source_name,
      cited_by_count: pubData.cited_by_count,
      language: pubData.language,
      keywords: pubData.keywords ?? [],
      is_oa: pubData.is_oa,
      pub_type: pubData.type,
    },
  );
  return response.data;
};

export const savePublicationToProject = async (projectId, pubData) => {
  const response = await apiClient.post(
    `/projects/${projectId}/publications/`,
    {
      openalex_id: pubData.openalex_id,
      title: pubData.title,
      year: pubData.year,
      doi: pubData.doi,
      pdf_url: pubData.pdf_url,
      landing_page_url: pubData.landing_page_url,
      abstract: pubData.abstract,
      authors: pubData.authors ?? [],
      institutions: pubData.institutions ?? [],
      source_name: pubData.source_name,
      cited_by_count: pubData.cited_by_count,
      language: pubData.language,
      keywords: pubData.keywords ?? [],
      is_oa: pubData.is_oa,
      pub_type: pubData.type,
    },
  );
  return response.data;
};

export const getProjectPublications = async (projectId) => {
  const response = await apiClient.get(`/projects/${projectId}/publications/`);
  return response.data;
};

export const deleteProjectPublication = async (projectId, publicationId) => {
  await apiClient.delete(
    `/projects/${projectId}/publications/${publicationId}/`,
  );
};

export const getPublications = async (projectId, folderId) => {
  const response = await apiClient.get(
    `/projects/${projectId}/folders/${folderId}/publications/`,
  );
  return response.data;
};

export const deletePublication = async (projectId, folderId, publicationId) => {
  await apiClient.delete(
    `/projects/${projectId}/folders/${folderId}/publications/${publicationId}/`,
  );
};

export const getRecommendations = async (projectId, folderId = null) => {
  const response = await apiClient.post(`/recommendations/${projectId}/`, {
    folder_id: folderId,
  });
  return response.data;
};

export const getNotes = async (publicationId) => {
  const response = await apiClient.get(
    `/projects/publications/${publicationId}/notes/`,
  );
  return response.data;
};

export const createNote = async (publicationId, text) => {
  const response = await apiClient.post(
    `/projects/publications/${publicationId}/notes/`,
    { text },
  );
  return response.data;
};

export const updateNote = async (publicationId, noteId, text) => {
  const response = await apiClient.patch(
    `/projects/publications/${publicationId}/notes/${noteId}/`,
    { text },
  );
  return response.data;
};

export const deleteNote = async (publicationId, noteId) => {
  await apiClient.delete(
    `/projects/publications/${publicationId}/notes/${noteId}/`,
  );
};

export const updateLabel = async (publicationId, label) => {
  const response = await apiClient.patch(
    `/projects/publications/${publicationId}/label/`,
    { label },
  );
  return response.data;
};

export const updateProject = async (projectId, projectData) => {
  const response = await apiClient.patch(`/projects/${projectId}/`, projectData);
  return response.data;
};

export const updateFolder = async (projectId, folderId, folderData) => {
  const response = await apiClient.patch(
    `/projects/${projectId}/folders/${folderId}/`,
    folderData,
  );
  return response.data;
};

export const getProjectAnalytics = async (projectId) => {
  const response = await apiClient.get(`/projects/${projectId}/analytics/`);
  return response.data;
};
