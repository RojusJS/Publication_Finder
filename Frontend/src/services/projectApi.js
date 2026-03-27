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
    pubData,
  );
  return response.data;
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

export const getRecommendations = async (projectId) => {
  const response = await apiClient.post(`/recommendations/${projectId}/`);
  return response.data;
};
