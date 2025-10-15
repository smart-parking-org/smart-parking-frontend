export type Role = 'admin' | 'resident';

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type MeResponse = {
  id: number;
  name: string;
  email: string;
  phone: string;
  apartment_code: string | null;
  role: Role;
};
