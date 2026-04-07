import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Attach userId to every request automatically
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem("userId");
  if (userId) config.headers["x-user-id"] = userId;
  return config;
});

export default api;
