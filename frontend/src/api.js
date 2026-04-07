import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Attach userId and bearer token to every request automatically
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
  if (userId) config.headers = { ...config.headers, ["x-user-id"]: userId };
  if (token)
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const responseData = error.response?.data;
    const isExpired =
      error.response?.status === 401 &&
      typeof responseData?.error === "string" &&
      responseData.error.includes("Token expired");

    if (isExpired && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const token = localStorage.getItem("token");
      if (!token) {
        localStorage.clear();
        window.location.href = "/";
        return Promise.reject(error);
      }

      try {
        const refreshRes = await axios.post("/api/auth/refresh", { token });
        const newToken = refreshRes.data?.token;
        if (newToken) {
          localStorage.setItem("token", newToken);
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${newToken}`,
          };
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
