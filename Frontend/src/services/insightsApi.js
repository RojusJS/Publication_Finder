import apiClient from "./apiClient";

export const getProjectInsights = async (projectId) => {
    const response = await apiClient.post(`/insights/${projectId}/`);
    return response.data.insights;
};