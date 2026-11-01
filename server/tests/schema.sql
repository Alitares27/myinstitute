-- Disposable integration fixture. Never applied to the configured application database.
CREATE TABLE users(id serial PRIMARY KEY,name varchar(100) NOT NULL,email varchar(150) UNIQUE NOT NULL,password varchar(255) NOT NULL,telefono varchar(30),role varchar(20) NOT NULL,document bigint UNIQUE);
CREATE TABLE students(id serial PRIMARY KEY,user_id integer UNIQUE REFERENCES users(id),grade varchar(20),enrollment_date date DEFAULT CURRENT_DATE);
CREATE TABLE teachers(id serial PRIMARY KEY,user_id integer UNIQUE REFERENCES users(id),specialty text,created_at timestamptz DEFAULT now());
CREATE TABLE courses(id serial PRIMARY KEY,title text,description text,teacher_id integer REFERENCES teachers(id));
CREATE TABLE enrollments(id serial PRIMARY KEY,student_id integer REFERENCES students(id),course_id integer REFERENCES courses(id),enrollment_date date DEFAULT CURRENT_DATE,UNIQUE(student_id,course_id));
CREATE TABLE topics(id serial PRIMARY KEY,course_id integer REFERENCES courses(id),title text,description text,order_index integer DEFAULT 0);
CREATE TABLE attendance(id serial PRIMARY KEY,student_id integer REFERENCES students(id),course_id integer REFERENCES courses(id),date date,status text,topic_id integer REFERENCES topics(id),UNIQUE(student_id,course_id,date));
CREATE TABLE grades(id serial PRIMARY KEY,student_id integer REFERENCES students(id),course_id integer REFERENCES courses(id),grade numeric,grade_type text,created_at timestamptz DEFAULT now());
CREATE TABLE temples(id serial PRIMARY KEY,name text,city text,province text,address text,dedicated_date date,status text);
CREATE TABLE temple_trips(id serial PRIMARY KEY,temple_id integer REFERENCES temples(id),trip_date date,status text,cost numeric(12,2));
CREATE TABLE temple_attendance(id serial PRIMARY KEY,user_id integer REFERENCES users(id),trip_id integer REFERENCES temple_trips(id),register_date date,advance_payment numeric(12,2),pending_payment numeric(12,2),due_date date);
CREATE TABLE temple_amortizations(id serial PRIMARY KEY,attendance_id integer REFERENCES temple_attendance(id),payment_amount numeric(12,2),payment_date date,payment_type text);
CREATE TABLE meetings(id serial PRIMARY KEY,title text,meeting_date date,start_time time,end_time time,topics text,notes text,status text,created_by integer REFERENCES users(id));
CREATE TABLE meeting_attendees(meeting_id integer REFERENCES meetings(id) ON DELETE CASCADE,user_id integer REFERENCES users(id),status text,PRIMARY KEY(meeting_id,user_id));
CREATE TABLE activity_plans(id serial PRIMARY KEY,activity_name text,activity_datetime timestamp,assigned_to integer REFERENCES users(id),purpose text,description text,attendance integer,budget numeric,assignments text,spiritual boolean,social boolean,physical boolean,intellectual boolean,updated_at timestamptz DEFAULT now());

CREATE TABLE speakers(id serial PRIMARY KEY,member_id integer REFERENCES users(id));
