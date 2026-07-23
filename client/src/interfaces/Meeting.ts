export type AttendeeStatus = "pending" | "confirmed" | "declined";

export interface MeetingUser {
    id: number;
    name: string;
    email: string;
    role: "admin" | "teacher" | "student";
    status: AttendeeStatus;
}

export interface Meeting {
    id?: number;

    title: string;

    meeting_date: string;

    start_time: string;

    end_time?: string | null;

    topics: string;

    notes?: string | null;

    status?: string;

    created_by: number;

    created_by_name?: string;

    created_at?: string;

    attendees: MeetingUser[];
}

export interface AttendeeRequest {
    id: number;
    status: AttendeeStatus;
}

export interface MeetingRequest {
    title: string;

    meeting_date: string;

    start_time: string;

    end_time?: string;

    topics: string;

    notes?: string;

    status?: string;

    attendees: AttendeeRequest[];
}