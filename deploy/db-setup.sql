-- Skyview — local Postgres bootstrap (idempotent, safe to re-run).
-- Run as: sudo -u postgres psql -v ON_ERROR_STOP=1 -f deploy/db-setup.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'skyview') THEN
    CREATE ROLE skyview WITH LOGIN PASSWORD '567a97498ad6245737dd54dab68739bfce1839c6';
  END IF;
END
$$;

SELECT 'CREATE DATABASE skyview OWNER skyview'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'skyview')\gexec

GRANT ALL PRIVILEGES ON DATABASE skyview TO skyview;

\c skyview
GRANT ALL ON SCHEMA public TO skyview;
