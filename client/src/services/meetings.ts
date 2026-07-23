import api from "../api";
import { Meeting, MeetingRequest } from "../interfaces/Meeting";

export async function getMeetings(): Promise<Meeting[]> {
    const response = await api.get("/meetings");
    return response.data;
}

export async function getMeeting(id: number): Promise<Meeting> {
    const response = await api.get(`/meetings/${id}`);
    return response.data;
}

export async function createMeeting(
    meeting: MeetingRequest
): Promise<Meeting> {
    const response = await api.post("/meetings", meeting);
    return response.data;
}

export async function updateMeeting(
    id: number,
    meeting: MeetingRequest
): Promise<void> {
    await api.put(`/meetings/${id}`, meeting);
}

export async function deleteMeeting(id: number): Promise<void> {
    await api.delete(`/meetings/${id}`);
}