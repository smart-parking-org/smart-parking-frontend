import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/config/constants';
import http from '@/lib/http';

export default class AuthService {
  static async login(email: string, password: string): Promise<any> {
    try {
      const { data } = await http.post<any>('/auth/login', { email, password });
      this.setTokens(data.accessToken, data.refreshToken);
      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      await http.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API error', error);
    } finally {
      this.clearTokens();
    }
  }

  private static setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  static getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  static getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  static clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
