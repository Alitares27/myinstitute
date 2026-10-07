-- ========================================================
-- Migración: Índices de Rendimiento para GestionAR
-- Optimiza consultas frecuentes, JOINs y filtros principales
-- ========================================================

-- Índices para Asistencia
CREATE INDEX IF NOT EXISTS idx_attendance_course_date ON attendance(course_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date DESC);

-- Índices para Matrículas / Inscripciones
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);

-- Índices para Calificaciones
CREATE INDEX IF NOT EXISTS idx_grades_student_course ON grades(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_grades_course_id ON grades(course_id);

-- Índices para Temas y Cursos
CREATE INDEX IF NOT EXISTS idx_topics_course_id ON topics(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);

-- Índices para Estudiantes y Maestros
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);

-- Índices para Consejos y Asistentes
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON meeting_attendees(user_id);

-- Índices para Actividades
CREATE INDEX IF NOT EXISTS idx_activity_plans_datetime ON activity_plans(activity_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_activity_plans_assigned_to ON activity_plans(assigned_to);

-- Índices para Viajes al Templo y Amortizaciones
CREATE INDEX IF NOT EXISTS idx_temple_trips_temple_id ON temple_trips(temple_id);
CREATE INDEX IF NOT EXISTS idx_temple_trips_date ON temple_trips(trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_temple_attendance_trip_id ON temple_attendance(trip_id);
CREATE INDEX IF NOT EXISTS idx_temple_attendance_user_id ON temple_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_temple_amortizations_attendance_id ON temple_amortizations(attendance_id);
