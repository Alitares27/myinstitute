import api from "../api";

export interface User {
    id: number;
    name: string;
    email: string;
    telefono: string;
    role: string;
    document: string;
    specialty?: string;
    grade?: string;
}

export async function getUsers(): Promise<User[]> {
    const response = await api.get("/users");
    return response.data;
}