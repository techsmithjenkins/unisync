create table public.profiles (
  id uuid not null default gen_random_uuid (),
  index_number text not null,
  full_name text null,
  role public.user_role null default 'student'::user_role,
  must_change_password boolean null default true,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  surname text null,
  first_name text null,
  other_names text null,
  status text null default 'Active'::text,
  gender text null,
  password text null,
  constraint profiles_pkey primary key (id),
  constraint profiles_index_number_key unique (index_number)
) TABLESPACE pg_default;

create table public.courses (
  code text not null,
  name text not null,
  created_at timestamp with time zone null default now(),
  constraint courses_pkey primary key (code)
) TABLESPACE pg_default;

create table public.resources (
  id uuid not null default gen_random_uuid (),
  title text not null,
  category text null default 'General'::text,
  file_path text not null,
  file_url text not null,
  file_type text null,
  size_kb numeric null,
  created_at timestamp with time zone null default now(),
  constraint resources_pkey primary key (id)
) TABLESPACE pg_default;

create table public.weekly_schedule (
  id uuid not null default extensions.uuid_generate_v4 (),
  course_code text not null,
  course_name text not null,
  day_of_week integer not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  venue text not null,
  lecturer_name text null,
  created_by uuid null,
  mode text null default 'In Person'::text,
  constraint weekly_schedule_pkey primary key (id),
  constraint weekly_schedule_created_by_fkey foreign KEY (created_by) references profiles (id)
) TABLESPACE pg_default;

create table public.notifications (
  id uuid not null default gen_random_uuid (),
  title text not null,
  message text not null,
  priority text null default 'info'::text,
  type text null default 'broadcast'::text,
  created_at timestamp with time zone null default now(),
  constraint notifications_pkey primary key (id)
) TABLESPACE pg_default;



create table public.schedule_exceptions (
  id uuid not null default extensions.uuid_generate_v4 (),
  schedule_id uuid null,
  exception_date date not null,
  status public.class_status null default 'active'::class_status,
  new_venue text null,
  new_start_time time without time zone null,
  new_end_time time without time zone null,
  note text null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint schedule_exceptions_pkey primary key (id),
  constraint schedule_exceptions_schedule_id_fkey foreign KEY (schedule_id) references weekly_schedule (id) on delete CASCADE
) TABLESPACE pg_default;