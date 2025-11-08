export interface MonthlyPass {
  id: number;
  user_id: number;
  vehicle_id: number;
  parking_lot_id: number;
  months: number;
  start_date: string | null;
  end_date: string | null;
  amount: number;
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
  order_id: string;
  txn_ref: string | null;
  user_snapshot: {
    id: number;
    name: string;
    email: string;
    phone: string;
  } | null;
  vehicle_snapshot: {
    id: number;
    license_plate: string;
    vehicle_type: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMonthlyPassRequest {
  user_id: number;
  vehicle_id: number;
  parking_lot_id: number;
  months?: number;
  start_date?: string;
  bank_code?: string;
}

export interface CreateMonthlyPassResponse {
  id: number;
  order_id: string;
  txn_ref: string;
  amount: number;
  payUrl: string;
}

export interface MonthlyPassesResponse {
  data: MonthlyPass[];
}

export interface MonthlyPassesPaginatedResponse {
  data: MonthlyPass[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

