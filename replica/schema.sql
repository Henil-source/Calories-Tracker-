-- Optional cloud sync (NOT used by v1, which keeps everything on the device).
-- Postgres; access via row level security keyed on auth.uid().
create table profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sex text not null check (sex in ('female','male')),
  birth_year int not null check (birth_year between 1900 and 2100),
  height_cm numeric(5,1) not null check (height_cm between 100 and 250),
  weight_kg numeric(5,1) not null check (weight_kg between 25 and 300),
  target_kg numeric(5,1) not null,
  activity text not null check (activity in ('sedentary','light','moderate','active','very')),
  goal text not null check (goal in ('lose','maintain','gain')),
  pace numeric(3,2) not null default 0.5,
  kcal_override int check (kcal_override between 800 and 6000)
);
create table foods_custom (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (length(name) between 1 and 120),
  source text not null check (source in ('MY','OFF','PHOTO')),
  kcal_100g numeric(6,1) not null check (kcal_100g between 0 and 950),
  protein_100g numeric(6,1), carbs_100g numeric(6,1), fat_100g numeric(6,1), fibre_100g numeric(6,1),
  portions jsonb not null default '[]'
);
create index on foods_custom (owner_id);
create table log_entries (
  id uuid primary key,                      -- generated on the device, makes uploads idempotent
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,                   -- tombstone for sync
  day date not null,                        -- user's local calendar day
  meal text not null check (meal in ('breakfast','morning','lunch','evening','dinner')),
  food_id text not null,
  name text not null,
  grams numeric(7,1) not null check (grams > 0),
  portion_label text not null,
  qty numeric(7,2) not null check (qty > 0),
  kcal int not null check (kcal >= 0),
  protein numeric(6,1) not null, carbs numeric(6,1) not null, fat numeric(6,1) not null, fibre numeric(6,1) not null,
  via text not null check (via in ('search','photo','quick','barcode'))
);
create index on log_entries (owner_id, day);
create table body_logs (
  owner_id uuid not null,
  day date not null,
  kind text not null check (kind in ('weight_kg','water_ml')),
  value numeric(7,1) not null check (value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, day, kind)
);
alter table profiles enable row level security;
alter table foods_custom enable row level security;
alter table log_entries enable row level security;
alter table body_logs enable row level security;
create policy own_profiles on profiles using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_foods on foods_custom using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_entries on log_entries using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy own_body on body_logs using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- Account deletion: delete from each table where owner_id = :id, then delete the auth user.
