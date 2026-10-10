-- GCC Compass schema (SQLite / Turso / libSQL). JSON columns are TEXT holding JSON.
CREATE TABLE states (
  id TEXT PRIMARY KEY,               -- 'KA','MH','GJ','UP','TN','MP','TS','HR'
  name TEXT NOT NULL,
  gcc_policy_status TEXT NOT NULL CHECK (gcc_policy_status IN ('active','none_known','expected')),
  source_id TEXT NOT NULL REFERENCES sources(id),
  note TEXT,
  unverified INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE cities (
  id TEXT PRIMARY KEY,               -- 'bengaluru','pune',...
  name TEXT NOT NULL,
  state_id TEXT NOT NULL REFERENCES states(id),
  tier INTEGER NOT NULL CHECK (tier IN (1,2))
);
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  publisher TEXT NOT NULL,
  url TEXT NOT NULL,
  published_date TEXT,               -- 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD'
  type TEXT NOT NULL CHECK (type IN ('official_policy','industry_report','broker_report','news','vendor_blog')),
  reliability TEXT NOT NULL CHECK (reliability IN ('H','M','L')),
  url_precision TEXT NOT NULL DEFAULT 'exact' CHECK (url_precision IN ('exact','domain_only')),
  notes TEXT
);
CREATE TABLE facts (
  id TEXT PRIMARY KEY,               -- 'f001'...; new ones 'f071'+
  entity_type TEXT NOT NULL CHECK (entity_type IN ('country','city','state','provider')),
  entity_id TEXT NOT NULL,           -- 'IN' | cities.id | states.id | providers.id (polymorphic, checked in app)
  metric TEXT NOT NULL,
  value_num REAL,                    -- nullable for qualitative facts
  value_text TEXT,                   -- display text for ranges/qualitative ('1,800-1,900')
  unit TEXT,
  as_of TEXT NOT NULL,
  definition_note TEXT,
  source_id TEXT NOT NULL REFERENCES sources(id),
  confidence TEXT NOT NULL CHECK (confidence IN ('H','M','L')),
  verified_by_human INTEGER NOT NULL DEFAULT 1,
  extracted_by TEXT NOT NULL CHECK (extracted_by IN ('ai','human')),
  unverified INTEGER NOT NULL DEFAULT 0,  -- [UNVERIFIED] badge; forces confidence 'L'
  quote TEXT,                        -- supporting span for AI-extracted facts
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  CHECK (value_num IS NOT NULL OR value_text IS NOT NULL)
);
CREATE INDEX facts_metric ON facts(metric, entity_id);
CREATE TABLE policies (
  id TEXT PRIMARY KEY,
  state_id TEXT NOT NULL REFERENCES states(id),
  name TEXT NOT NULL,
  year INTEGER,
  summary TEXT,
  eligibility_json TEXT NOT NULL,    -- {"all":[{field,op,value,fail_reason}], "needs_check":[string]}
  incentives_json TEXT NOT NULL,     -- [{type,pct,cap_inr_cr,duration_yrs,conditions}]
  source_id TEXT NOT NULL REFERENCES sources(id),
  unverified_parts TEXT              -- JSON array of strings
);
CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('setup_bot','eor','recruiting','legal_tax','real_estate','advisory')),
  cities TEXT NOT NULL DEFAULT '[]', -- JSON array of cities.id
  notes TEXT,                        -- descriptive only, no ratings
  source_id TEXT REFERENCES sources(id),
  is_flexiple INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE plans (
  id TEXT PRIMARY KEY,               -- nanoid
  inputs_json TEXT NOT NULL,         -- navigator inputs + weights
  result_json TEXT,                  -- snapshot of ranking/eligibility/cost + fact ids used
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  plan_id TEXT REFERENCES plans(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  note TEXT,
  consent INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE llm_cache (             -- optional: cache 'why they differ' notes
  key TEXT PRIMARY KEY, value TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
