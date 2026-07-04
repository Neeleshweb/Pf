-- =============================================================================
-- PRODUCT JUDGMENT LAB — Phase 2, Step 1: shared taxonomy + source labels
-- =============================================================================
-- Neutral, Lab-level store used by GutCheck, DecisionRoom, and the Lab page.
-- SAFE + ADDITIVE ONLY: new table, new RPCs, new nullable columns, null-only
-- backfills. Nothing existing is dropped, renamed, or overwritten.
-- Run on STAGING first, verify with the checks at the bottom, then PRODUCTION.
-- Re-runnable (idempotent).
-- =============================================================================

-- 1) SHARED TAXONOMY TABLE -----------------------------------------------------
create table if not exists public.pjl_taxonomy (
  kind         text        not null default 'category',
  slug         text        not null,
  value        text        not null,
  icon         text        not null default '🏷️',
  blurb        text,
  sort         integer     not null default 100,
  is_seed      boolean     not null default false,
  usage_count  integer     not null default 0,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  primary key (kind, slug)
);

alter table public.pjl_taxonomy enable row level security;

drop policy if exists pjl_taxonomy_read on public.pjl_taxonomy;
create policy pjl_taxonomy_read on public.pjl_taxonomy
  for select using (true);   -- taxonomy is public-readable

-- 2) SEED: 23 combined categories --------------------------------------------
-- Values deliberately MATCH DecisionRoom's existing dr_taxonomy values where they
-- overlap (so DR's existing case categories keep matching), plus GutCheck's unique
-- ones. Icons + blurbs mirror the Lab page's category grid.
insert into public.pjl_taxonomy (kind, slug, value, icon, blurb, sort, is_seed) values
  ('category','prioritization',       'Prioritization',        '🎯','What to build now, later, or not at all.',            10,true),
  ('category','roadmap',              'Roadmap',               '🗺️','What to commit to, and in what order.',               20,true),
  ('category','discovery',            'Discovery',             '🔎','What to research or validate before committing.',     30,true),
  ('category','build-vs-validate',    'Build vs. validate',    '🔬','Should the team build, test, research, or wait?',     40,true),
  ('category','data-analytics',       'Data & Analytics',      '📊','What the numbers actually support.',                 50,true),
  ('category','metrics-measurement',  'Metrics & Measurement', '📐','Which metric really proves this worked.',            60,true),
  ('category','experimentation-ab',   'Experimentation & A/B', '🧪','Designing tests and reading results honestly.',      70,true),
  ('category','stakeholder-conflict', 'Stakeholder Conflict',  '🤝','How Product handles competing opinions.',            80,true),
  ('category','customer-escalation',  'Customer Escalation',   '🚨','When a key account''s demand hits the roadmap.',     90,true),
  ('category','launch-gtm',           'Launch & GTM',          '🚀','How to ship — big-bang, beta, or staged.',          100,true),
  ('category','strategy',             'Strategy',              '♟️','Where to play and how the pieces fit.',             110,true),
  ('category','vision-positioning',   'Vision & Positioning',  '🧭','What the product stands for and against.',           120,true),
  ('category','ux-design',            'UX & Design',           '🎨','When polish matters more than speed.',               130,true),
  ('category','pricing-packaging',    'Pricing & Packaging',   '💳','How value is packaged, charged, or limited.',        140,true),
  ('category','technical-tradeoffs',  'Technical Tradeoffs',   '⚙️','Debt, architecture, and build-vs-buy calls.',       150,true),
  ('category','execution-delivery',   'Execution & Delivery',  '📦','Getting it shipped under real constraints.',         160,true),
  ('category','team-org',             'Team & Org',            '👥','How the team is structured and how it works.',       170,true),
  ('category','resourcing-capacity',  'Resourcing & Capacity', '⏳','Doing it with the time and people you have.',        180,true),
  ('category','career-growth',        'Career & Growth',       '📈','Your own next move as a PM.',                        190,true),
  ('category','sunset-deprecation',   'Sunset & Deprecation',  '🌅','Moving users old-to-new without losing trust.',      200,true),
  ('category','compliance-risk',      'Compliance & Risk',     '🛡️','Legal, security, and risk trade-offs.',             210,true),
  ('category','ai-new-tech',          'AI / New Tech',         '🤖','Where new tech creates real value vs. hype.',        220,true),
  ('category','something-else',       'Something else',        '✨','Messy calls that don''t fit neatly anywhere.',       230,true)
on conflict (kind, slug) do update
  set value = excluded.value,
      icon  = excluded.icon,
      blurb = excluded.blurb,
      sort  = excluded.sort,
      is_seed = true;

-- 3) READ RPC (public) --------------------------------------------------------
create or replace function public.pjl_taxonomy(p_kind text default 'category')
returns table(slug text, value text, icon text, blurb text, sort integer, is_seed boolean, usage_count integer)
language sql stable security definer set search_path = public as $$
  select slug, value, icon, blurb, sort, is_seed, usage_count
  from public.pjl_taxonomy
  where kind = p_kind
  order by is_seed desc, sort, value;
$$;

-- 4) ADD RPC (authenticated users add a custom category + a meaningful icon) ---
create or replace function public.pjl_add_taxonomy(p_kind text, p_value text, p_icon text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_slug text;
  v_icon text;
  v_row  public.pjl_taxonomy%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;

  p_value := btrim(coalesce(p_value, ''));
  if char_length(p_value) < 2 or char_length(p_value) > 40 then
    return jsonb_build_object('ok', false, 'error', 'bad_length');
  end if;

  v_slug := btrim(regexp_replace(lower(p_value), '[^a-z0-9]+', '-', 'g'), '-');
  if v_slug = '' then
    return jsonb_build_object('ok', false, 'error', 'bad_value');
  end if;

  -- icon is required to be meaningful: caller must pass an emoji; fall back only if absent
  v_icon := coalesce(nullif(btrim(coalesce(p_icon, '')), ''), '🏷️');

  select * into v_row from public.pjl_taxonomy where kind = p_kind and slug = v_slug;
  if found then
    update public.pjl_taxonomy set usage_count = usage_count + 1
      where kind = p_kind and slug = v_slug;
    return jsonb_build_object('ok', true, 'existing', true,
      'slug', v_row.slug, 'value', v_row.value, 'icon', v_row.icon);
  end if;

  insert into public.pjl_taxonomy (kind, slug, value, icon, sort, is_seed, usage_count, created_by)
    values (p_kind, v_slug, p_value, v_icon, 500, false, 1, auth.uid());

  return jsonb_build_object('ok', true, 'existing', false,
    'slug', v_slug, 'value', p_value, 'icon', v_icon);
end;
$$;

grant execute on function public.pjl_taxonomy(text)                 to anon, authenticated;
grant execute on function public.pjl_add_taxonomy(text, text, text) to authenticated;

-- 5) SOURCE LABELS ------------------------------------------------------------
-- Add a nullable source_type to GutCheck dilemmas and DecisionRoom cases.
-- Values (PRD): community_submission | editorial_case | anonymized_field_case
--               | practice_scenario | expert_case
alter table public.gc_schedule add column if not exists source_type text;
alter table public.dr_cases    add column if not exists source_type text;

-- Null-only backfill (never overwrites an existing value):
--   GutCheck: user-submitted dilemmas => community_submission, curated bank => editorial_case
update public.gc_schedule
   set source_type = case when submitter is not null
                          then 'community_submission'
                          else 'editorial_case' end
 where source_type is null;

--   DecisionRoom: all existing cases are real user submissions
update public.dr_cases
   set source_type = 'community_submission'
 where source_type is null;

-- =============================================================================
-- VERIFICATION (run after; all should look sane)
-- =============================================================================
-- select count(*) as seeded_categories from public.pjl_taxonomy where is_seed;      -- expect 23
-- select * from public.pjl_taxonomy('category') order by sort limit 5;              -- read RPC works
-- select source_type, count(*) from public.gc_schedule group by 1;                 -- labels backfilled
-- select source_type, count(*) from public.dr_cases    group by 1;
-- select public.pjl_add_taxonomy('category','Test Category','🧩');                  -- add works (then delete the test row)
-- delete from public.pjl_taxonomy where slug='test-category' and is_seed=false;
