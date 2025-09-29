import { createHttp } from '@/lib/http';
import ENV from './env';

export const authApi = createHttp(ENV.AUTH_API_URL);
