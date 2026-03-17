-- Migration: Add CPF to tickets and create staff_assignments table
-- This enables manual ticket lookup by CPF and staff-event binding

-- ============================================
-- PART 1: Add CPF column to tickets
-- ============================================

alter table public.tickets
  add column if not exists cpf text;

-- Index for efficient CPF lookups
create index if not exists idx_tickets_cpf on public.tickets(cpf);

-- Index for combined search (event + cpf)
create index if not exists idx_tickets_event_cpf on public.tickets(event_id, cpf);

-- ============================================
-- PART 2: Create staff_assignments table
-- ============================================

create table if not exists public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz default now(),
  
  -- Staff can only be assigned once per event
  constraint staff_assignments_unique unique (staff_id, event_id)
);

-- Enable RLS
alter table public.staff_assignments enable row level security;

-- ============================================
-- PART 3: RLS Policies for staff_assignments
-- ============================================

-- Staff can read their own assignments
create policy "staff_read_own_assignments"
  on public.staff_assignments
  for select
  to authenticated
  using (staff_id = auth.uid());

-- Admin can read all assignments (for management UI)
create policy "admin_read_all_assignments"
  on public.staff_assignments
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Admin can insert assignments
create policy "admin_insert_assignments"
  on public.staff_assignments
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Admin can delete assignments
create policy "admin_delete_assignments"
  on public.staff_assignments
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- ============================================
-- PART 4: Update tickets RLS for staff access
-- ============================================

-- Staff can read tickets for events they are assigned to
create policy "staff_read_assigned_event_tickets"
  on public.tickets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.staff_assignments sa
      join public.profiles p on p.id = auth.uid()
      where sa.staff_id = auth.uid()
      and sa.event_id = tickets.event_id
      and p.role = 'staff'
    )
  );

-- Staff can update tickets (validate) for their assigned events
create policy "staff_update_assigned_event_tickets"
  on public.tickets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.staff_assignments sa
      join public.profiles p on p.id = auth.uid()
      where sa.staff_id = auth.uid()
      and sa.event_id = tickets.event_id
      and p.role = 'staff'
    )
  )
  with check (
    exists (
      select 1 from public.staff_assignments sa
      join public.profiles p on p.id = auth.uid()
      where sa.staff_id = auth.uid()
      and sa.event_id = tickets.event_id
      and p.role = 'staff'
    )
  );
