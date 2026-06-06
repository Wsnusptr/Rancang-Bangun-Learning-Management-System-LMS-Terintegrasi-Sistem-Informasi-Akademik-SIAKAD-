-- SQL DDL for PMB tables (run in Supabase SQL editor)
-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. pmb_programs
CREATE TABLE IF NOT EXISTS pmb_programs (
    id                    uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_code          text        NOT NULL,
    program_name          text        NOT NULL,
    degree_level          text        NOT NULL,
    career_prospects      text,
    program_description   text,
    accreditation_status  text,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 2. pmb_schedules
CREATE TABLE IF NOT EXISTS pmb_schedules (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_title text        NOT NULL,
    event_type  text        NOT NULL,
    event_date  date        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. pmb_faqs
CREATE TABLE IF NOT EXISTS pmb_faqs (
    id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    question       text        NOT NULL,
    answer         text        NOT NULL,
    category       text,
    order_priority integer     DEFAULT 0,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 4. pmb_scholarships
CREATE TABLE IF NOT EXISTS pmb_scholarships (
    id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    scholarship_name text        NOT NULL,
    amount           text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 5. pmb_requirements
CREATE TABLE IF NOT EXISTS pmb_requirements (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       text        NOT NULL,
    description text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 6. pmb_facilities
CREATE TABLE IF NOT EXISTS pmb_facilities (
    id                   uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_name        text        NOT NULL,
    facility_description text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- 7. pmb_contacts
CREATE TABLE IF NOT EXISTS pmb_contacts (
    id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform       text        NOT NULL,
    contact_detail text        NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 8. pmb_resources (Media Unduhan)
CREATE TABLE IF NOT EXISTS pmb_resources (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       text        NOT NULL,
    file_url    text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 9. pmb_testimonials
CREATE TABLE IF NOT EXISTS pmb_testimonials (
    id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumni_name      text        NOT NULL,
    alumni_position  text        NOT NULL,
    testimonial_text text        NOT NULL,
    rating           integer     DEFAULT 5,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Optional: add indexes for faster search
CREATE INDEX IF NOT EXISTS idx_pmb_programs_name      ON pmb_programs (program_name);
CREATE INDEX IF NOT EXISTS idx_pmb_schedules_title    ON pmb_schedules (event_title);
CREATE INDEX IF NOT EXISTS idx_pmb_resources_title    ON pmb_resources (title);
