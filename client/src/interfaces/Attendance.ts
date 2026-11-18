export interface AttendanceRecord {
  id: number;
  student?: string;
  course?: string;
  student_id: number;
  course_id: number;
  date: string;
  status: string;
  topic?: string;
  topic_id?: number | null;
}
