export interface Member {
  id: number;
  name: string;
}

export interface Tema {
  id: number;
  title: string;
}

export interface Student {
  id: number;
  name: string;
}

export interface Course {
  id: number;
  title: string;
}

export interface Topic {
  id: number;
  course_id: number;
  title: string;
}

export interface BasicUser {
  id: number;
  name: string;
}

export interface Temple {
  id: number;
  name: string;
}

export type SortDirection = "asc" | "desc";

export type SortConfig = {
  key: string;
  direction: SortDirection;
} | null;
