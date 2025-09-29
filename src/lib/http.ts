import { ACCESS_TOKEN_KEY } from '@/config/constants';
import axios from 'axios';

export function createHttp(baseURL: string) {
  const instance = axios.create({
    baseURL,
    timeout: 10000,
  });

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
}
