import axios from 'axios';

const API_BASE_URL = 'http://10.214.184.185:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor for handling errors
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// User APIs
export const registerUser = async (name, file) => {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);

  const response = await api.post('/register/', formData);
  return response.data;
};

export const recognizeFace = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/recognize/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/users/');
  return response.data;
};

export const getUserById = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};

export const getTodayAttendance = async () => {
  const response = await api.get('/attendance/today');
  return response.data;
};

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;