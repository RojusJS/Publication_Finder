import apiClient from "./apiClient";
 
export const getProjectInsights = async (projectId, focus = "bendros") => {
    const response = await apiClient.post(`/insights/${projectId}/`, { focus });
    return response.data.insights;
};