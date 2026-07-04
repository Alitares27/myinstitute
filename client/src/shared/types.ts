export interface Trip {
  id: string;
  name: string;
  date: string; 
  status: TripStatus;
  cost: number;
}

export interface Reservation {
  id?: string;
  memberId: string;
  tripId: string;
  advance: number; 
  cost: number; 
  pendingPayment: number; 
  registrationDate: string;
  dueDate: string;
}
