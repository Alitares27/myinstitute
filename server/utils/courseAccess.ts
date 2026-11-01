export const courseAccess = (course: string, role: string, user: string) => `(${role}='admin'
  OR (${role}='teacher' AND ${course}.teacher_id IN (SELECT id FROM teachers WHERE user_id=${user}))
  OR (${role}='student' AND EXISTS (SELECT 1 FROM enrollments own JOIN students member ON member.id=own.student_id WHERE own.course_id=${course}.id AND member.user_id=${user})))`;
