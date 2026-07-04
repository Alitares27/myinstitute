export interface Trip {
  id: number;
  name?: string;
  date: string;
  status?: TripStatus;
  cost: number;
}

export interface Reservation {
  id: number;
  user_id: number;
  trip_id: number;
  user_name?: string;
  trip_date?: string;
  register_date?: string;
  advance_payment: number;
  pending_payment: number;
  due_date?: string;
}
