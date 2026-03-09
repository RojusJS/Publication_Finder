import apiClient from "./apiClient";

export const getProjects = async () => {
  const response = await apiClient.get("/projects/");
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await apiClient.post("/projects/", projectData);
  return response.data;
};