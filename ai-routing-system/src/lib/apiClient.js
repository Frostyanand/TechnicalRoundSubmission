// src/lib/apiClient.js
import axios from 'axios';
import { authClient } from './firebase/firebaseClient'; // Import the auth instance from the client SDK

// Use the exported auth instance
const auth = authClient; 

// Create the base Axios instance
const apiClient = axios.create({
  baseURL: '/api', 
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout 
});

apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();        
        // Attach the token to the Authorization header
        // This token is verified on the server-side to get the user's UID for rate limiting
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting Firebase ID token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if the error response exists and has status/data
    if (error.response?.status && error.response?.data) {
      const { status, data, headers } = error.response;
      const contentType = headers['content-type'];
      
      // 401 Unauthorized errors are common if the ID token is missing or expired
      if (status === 401) {
        console.warn('Authentication failed (401). User may need to re-login.');
      } 
      
      // Log the structured API error if it's a JSON response
      if (contentType && contentType.includes('application/json')) {
        console.error(`API Error (${status}):`, data);
      } else if (status === 404) {
        // Handle 404s
        console.warn('API endpoint not found (404) - check route spelling.');
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;