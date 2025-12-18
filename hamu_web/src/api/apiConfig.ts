import axios from 'axios';

// Define API URL centrally to be used across the application
export const API_URL = 'https://api.hamuwater.com/api';
// export const API_URL = 'http://localhost:8000/api';

// Create an axios instance with the base URL of your Django backend
const API = axios.create({
  baseURL: API_URL + '/', // Ensure the baseURL ends with a trailing slash
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor for authentication
API.interceptors.request.use(
  (config) => {
    // Get token from user object instead of 'token' key
    const userStr = localStorage.getItem('user');
    let token = null;
    
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        token = userData.access;
      } catch (e) {
        console.error('Failed to parse user data from localStorage', e);
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;