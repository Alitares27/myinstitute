import api from "../api";

export type { User } from "../interfaces/User";

export async function getUsers() {
    const response = await api.get("/users");
    return response.data;
}