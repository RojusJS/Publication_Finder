import apiClient from "./apiClient";

export const getProjects = async () => {
  const response = await apiClient.get("/projects/");
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await apiClient.post("/projects/", projectData);
  return response.data;
};

export const savePublication = async (projectId, pubData) => {
  const response = await apiClient.post(`/projects/${projectId}/publications/`, pubData);
  return response.data;
};

export const getPublications = async (projectId) => {
  const response = await apiClient.get(`/projects/${projectId}/publications/`);
  return response.data;
};

export const deletePublication = async (projectId, publicationId) => {
  const response = await apiClient.delete(`/projects/${projectId}/publications/${publicationId}/`);
  return response.data;
};