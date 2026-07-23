import type { TripStatus } from "../shared/constants";

export interface Trip {
  id: number;
  temple_id?: number;
  temple_name?: string;
  name?: string;
  date: string;
  status?: TripStatus | string;
  cost: number;
}

export interface Reservation {
  id: number;
  user_id: number;
  trip_id: number;
  user_name?: string;
  user_document?: string;
  trip_date?: string;
  register_date?: string;
  advance_payment: number;
  pending_payment: number;
  due_date?: string;
}
