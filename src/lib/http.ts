import axios from 'axios';

import ENV from '@/config/env';
import { ACCESS_TOKEN_KEY } from '@/config/constants';

const http = axios.create({
  baseURL: ENV.API_URL,
  timeout: 10000,
});

http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default http;
