-- Supabase에서 SQL Editor에 붙여넣고 실행하세요

create table papers (
  id text primary key,
  user_id uuid references auth.users not null,
  title text default '',
  authors text default '',
  journal text default '',
  year text default '',
  keywords text[] default '{}',
  doi text default '',
  abstract text default '',
  pdf_url text,
  original_file_name text,
  reading_status text default '읽지않음',
  research_field text default '',
  purpose text default '',
  method text default '',
  result text default '',
  limitation text default '',
  my_thought text default '',
  research_idea text default '',
  one_sentence text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table papers enable row level security;
create policy "own papers" on papers for all using (auth.uid() = user_id);

create table thoughts (
  id text primary key,
  user_id uuid references auth.users not null,
  thought text default '',
  summary text default '',
  why text default '',
  how_to_apply text default '',
  one_sentence text default '',
  tags text[] default '{}',
  created_at timestamptz default now()
);
alter table thoughts enable row level security;
create policy "own thoughts" on thoughts for all using (auth.uid() = user_id);

create table emotions (
  id text primary key,
  user_id uuid references auth.users not null,
  emotion text default '',
  actual_event text default '',
  my_interpretation text default '',
  alternative_view text default '',
  message_to_self text default '',
  created_at timestamptz default now()
);
alter table emotions enable row level security;
create policy "own emotions" on emotions for all using (auth.uid() = user_id);

create table happiness (
  id text primary key,
  user_id uuid references auth.users not null,
  happy_moment text default '',
  food text,
  spending text,
  memorable_sentence text,
  achievement text,
  message_to_self text,
  tags text[] default '{}',
  created_at timestamptz default now()
);
alter table happiness enable row level security;
create policy "own happiness" on happiness for all using (auth.uid() = user_id);

create table research_notes (
  id text primary key,
  user_id uuid references auth.users not null,
  project_id text default '',
  title text default '',
  content text default '',
  ideas text[] default '{}',
  references text[] default '{}',
  todo_items jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table research_notes enable row level security;
create policy "own research_notes" on research_notes for all using (auth.uid() = user_id);

create table projects (
  id text primary key,
  user_id uuid references auth.users not null,
  name text default '',
  description text default '',
  goals text[] default '{}',
  color text default '',
  created_at timestamptz default now()
);
alter table projects enable row level security;
create policy "own projects" on projects for all using (auth.uid() = user_id);
