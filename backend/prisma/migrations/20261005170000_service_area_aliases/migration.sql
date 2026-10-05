-- Explicit admin-managed location names; existing service areas retain no aliases.
ALTER TABLE "ServiceArea" ADD COLUMN "aliases" VARCHAR(120)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(120)[];
