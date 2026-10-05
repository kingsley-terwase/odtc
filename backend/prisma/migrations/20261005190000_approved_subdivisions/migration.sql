CREATE TABLE "ServiceSubdivision" (
 "id" UUID NOT NULL, "serviceAreaId" UUID NOT NULL, "name" VARCHAR(120) NOT NULL,
 "normalizedName" VARCHAR(120) NOT NULL, "mapboxId" VARCHAR(300), "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ServiceSubdivision_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ServiceSubdivision_serviceAreaId_fkey" FOREIGN KEY ("serviceAreaId") REFERENCES "ServiceArea"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceSubdivision_serviceAreaId_normalizedName_key" ON "ServiceSubdivision"("serviceAreaId", "normalizedName");
CREATE UNIQUE INDEX "ServiceSubdivision_serviceAreaId_mapboxId_key" ON "ServiceSubdivision"("serviceAreaId", "mapboxId");
CREATE INDEX "ServiceSubdivision_normalizedName_active_idx" ON "ServiceSubdivision"("normalizedName", "active");
CREATE INDEX "ServiceSubdivision_mapboxId_active_idx" ON "ServiceSubdivision"("mapboxId", "active");
-- Preserve explicitly approved aliases only; parent names are not approvals.
INSERT INTO "ServiceSubdivision" ("id", "serviceAreaId", "name", "normalizedName", "updatedAt")
SELECT md5(a."id"::text || ':' || lower(trim(regexp_replace(alias, '\s+', ' ', 'g'))))::uuid,
 a."id", trim(regexp_replace(alias, '\s+', ' ', 'g')), lower(trim(regexp_replace(alias, '\s+', ' ', 'g'))), CURRENT_TIMESTAMP
FROM "ServiceArea" a CROSS JOIN LATERAL unnest(a."aliases") AS alias
WHERE trim(alias) <> '' ON CONFLICT ("serviceAreaId", "normalizedName") DO NOTHING;
