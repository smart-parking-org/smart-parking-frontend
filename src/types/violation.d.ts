export type ViolationType = 
  | 'OVERSTAY'
  | 'LATE_CHECK_IN'
  | 'PARKING_EXPIRED_CHECK_IN'
  | 'NO_SHOW'
  | 'LATE_PAYMENT'
  | 'WRONG_SLOT'
  | 'NO_RESERVATION'
  | 'OTHER';

export type ViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ViolationStatus = 'PENDING' | 'RESOLVED' | 'CANCELLED' | 'APPEALED';

export interface Violation {
  id: number;
  user_id: number | null;
  vehicle_id: number | null;
  reservation_id: number | null;
  parking_lot_id: number | null;
  slot_id: number | null;
  type: ViolationType;
  severity: ViolationSeverity;
  status: ViolationStatus;
  description: string | null;
  fine_amount: number | null;
  evidence_url: string | null;
  ticket_number: string | null;
  resolved_by: number | null;
  resolved_at: string | null;
  resolution_note: string | null;
  violation_time: string | null;
  payment_id: number | null;
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
  reservation_snapshot: {
    reservation_code: string;
    status: string;
    start_time: string | null;
    end_time: string | null;
    check_in_at: string | null;
    check_out_at: string | null;
    allocated_slot_id?: number;
    allocated_slot_code?: string;
  } | null;
  meta: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateViolationRequest {
  user_id?: number;
  vehicle_id?: number;
  reservation_id?: number;
  parking_lot_id?: number;
  slot_id?: number;
  type: 'WRONG_SLOT' | 'NO_RESERVATION' | 'OTHER';
  severity: ViolationSeverity;
  description?: string;
  fine_amount?: number;
  evidence_url?: string;
  violation_time?: string;
}

export interface ViolationsResponse {
  data: Violation[];
  current_page?: number;
  per_page?: number;
  total?: number;
  last_page?: number;
}

export interface ViolationDetailResponse {
  data: Violation;
}

export interface ResolveViolationRequest {
  resolved_by: number;
  resolution_note?: string;
  fine_amount?: number;
}

export interface CreateViolationPaymentResponse {
  id: number;
  order_id: string;
  txn_ref: string;
  amount: number;
  payUrl: string;
}

export interface DetectViolationsResponse {
  detected: number;
  violations_created?: number;
  updated?: number;
  data: Violation[] | Array<Record<string, any>>;
}

