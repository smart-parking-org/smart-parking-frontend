import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import ENV from '@/config/env';
import { ACCESS_TOKEN_KEY } from '@/config/constants';

let refreshPromise: Promise<string> | null = null;

async function refreshOnce(): Promise<string> {
  // single-flight: nếu đã có promise -> dùng lại, không gọi lần 2
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post(
      `${ENV.AUTH_API_URL}/auth/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY)}`,
        },
      },
    ) // KHÔNG gửi Authorization
    .then((res) => {
      const t = res.data.access_token as string;
      localStorage.setItem(ACCESS_TOKEN_KEY, t);
      return t;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function createHttp(baseURL: string): AxiosInstance {
  const instance = axios.create({ baseURL, timeout: 10000 });

  // tránh gắn interceptor trùng
  if ((instance as any)._attached) return instance;
  (instance as any)._attached = true;

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const isRefresh = (config.url || '').includes('/auth/refresh');
    if (token && !isRefresh) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const status = error.response?.status;
      const original = (error.config as AxiosRequestConfig & { _retry?: boolean }) || {};
      const url = (original.url || '').toString();

      // Không phải 401 → bỏ
      if (status !== 401) return Promise.reject(error);

      // Bỏ qua refresh cho các endpoint auth (login/register/forgot/verify/refresh)
      if (/\/auth\/(login|logout|refresh)/i.test(url)) {
        return Promise.reject(error);
      }

      // Request gốc không có Authorization (chưa đăng nhập) → bỏ
      const hasAuth =
        !!original.headers && !!(original.headers.Authorization || (original.headers as any).authorization);
      if (!hasAuth) return Promise.reject(error);

      // Chặn lặp
      if (original._retry) return Promise.reject(error);
      original._retry = true;

      try {
        const newToken = await refreshOnce();
        original.headers = original.headers ?? {};
        (original.headers as any).Authorization = `Bearer ${newToken}`;
        return axios(original);
      } catch (e) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        window.location.href = '/login';
        return Promise.reject(e);
      }
    },
  );

  return instance;
}
