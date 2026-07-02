-- Étendre l'enum ScoringStatus avec les nouveaux statuts
ALTER TYPE "ScoringStatus" ADD VALUE IF NOT EXISTS 'RECU';
ALTER TYPE "ScoringStatus" ADD VALUE IF NOT EXISTS 'EXTRACTION';
ALTER TYPE "ScoringStatus" ADD VALUE IF NOT EXISTS 'A_COMPLETER';
ALTER TYPE "ScoringStatus" ADD VALUE IF NOT EXISTS 'COMPLEMENTS_DEMANDES';
ALTER TYPE "ScoringStatus" ADD VALUE IF NOT EXISTS 'REFUSED';

-- Créer la table scoring_inputs
CREATE TABLE "scoring_inputs" (
    "id"                      TEXT NOT NULL,
    "fundingRequestId"        TEXT NOT NULL,
    "product"                 TEXT NOT NULL,

    -- Données FACTURE
    "debiteurNom"             TEXT,
    "debiteurType"            TEXT,
    "debiteurSolvabilite"     TEXT,
    "echeanceFactureDate"     TIMESTAMP(3),
    "ancienneteRelation"      TEXT,
    "partPlusGrosClient"      DECIMAL(5,4),
    "delaiPaiementMenu"       TEXT,
    "tauxImpaye12m"           DECIMAL(5,4),
    "nbClientsActifs"         INTEGER,

    -- Données PRET MLT
    "cashFlowAnnuel"          DECIMAL(14,2),
    "fluxMobileMoneyMensuel"  DECIMAL(14,2),
    "autonomieFinanciere"     DECIMAL(5,4),
    "tauxEndettement"         DECIMAL(5,4),
    "ratioLiquidite"          DECIMAL(5,4),
    "garantieType"            TEXT,
    "garantieCouverture"      DECIMAL(5,4),
    "dirigeantExperienceAns"  INTEGER,
    "dirigeantAntecedents"    TEXT,
    "dirigeantIncidentsLegaux" TEXT,
    "secteurCode"             TEXT,
    "secteurSaisonnalite"     BOOLEAN DEFAULT false,
    "secteurImportDevises"    BOOLEAN DEFAULT false,
    "secteurSoutienPublic"    BOOLEAN DEFAULT false,

    -- Données EQUITY
    "tcamCa3ans"              DECIMAL(5,4),
    "tailleMarche"            TEXT,
    "scalabilite"             TEXT,
    "experienceSecteurAns"    INTEGER,
    "trackRecord"             TEXT,
    "completudeEquipe"        TEXT,
    "moat"                    TEXT,
    "partMarcheRelative"      TEXT,
    "runwayMois"              INTEGER,
    "margeBrute"              DECIMAL(5,4),
    "droitsInvestisseur"      TEXT,
    "transparence"            TEXT,

    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scoring_inputs_pkey" PRIMARY KEY ("id")
);

-- Contrainte d'unicité fundingRequestId
ALTER TABLE "scoring_inputs" ADD CONSTRAINT "scoring_inputs_fundingRequestId_key" UNIQUE ("fundingRequestId");

-- Foreign key vers funding_requests
ALTER TABLE "scoring_inputs" ADD CONSTRAINT "scoring_inputs_fundingRequestId_fkey"
    FOREIGN KEY ("fundingRequestId") REFERENCES "funding_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enrichir ScoringReport : nouvelles colonnes
ALTER TABLE "scoring_reports"
    ADD COLUMN IF NOT EXISTS "product"        TEXT,
    ADD COLUMN IF NOT EXISTS "bareme_version" TEXT NOT NULL DEFAULT '2026.1',
    ADD COLUMN IF NOT EXISTS "grade"          TEXT,
    ADD COLUMN IF NOT EXISTS "gradeCapped"    BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "coverage"       DECIMAL(4,3),
    ADD COLUMN IF NOT EXISTS "confidence"     DECIMAL(4,3),
    ADD COLUMN IF NOT EXISTS "advanceRate"    DECIMAL(4,3);

-- Migrer autoScore de DECIMAL(5,2) vers DECIMAL(5,1) (compatible, pas de perte)
-- PostgreSQL ne supporte pas ALTER COLUMN TYPE en place si données existent sans USING
-- On utilise USING pour la conversion explicite
ALTER TABLE "scoring_reports"
    ALTER COLUMN "autoScore" TYPE DECIMAL(5,1) USING "autoScore"::DECIMAL(5,1);

ALTER TABLE "scoring_reports"
    ALTER COLUMN "validatedScore" TYPE DECIMAL(5,1) USING "validatedScore"::DECIMAL(5,1);

-- Backfill product depuis fundingRequests pour les rapports existants
UPDATE "scoring_reports" sr
SET "product" = fr."category"::TEXT
FROM "funding_requests" fr
WHERE sr."fundingRequestId" = fr."id"
  AND sr."product" IS NULL;

-- Pour les rapports sans fundingRequest, on met une valeur par défaut
UPDATE "scoring_reports" SET "product" = 'PRET' WHERE "product" IS NULL;

-- Rendre product NOT NULL après backfill
ALTER TABLE "scoring_reports" ALTER COLUMN "product" SET NOT NULL;

-- Backfill coverage et confidence avec valeurs par défaut neutres (0 = données manquantes)
UPDATE "scoring_reports" SET "coverage" = 0 WHERE "coverage" IS NULL;
UPDATE "scoring_reports" SET "confidence" = 0 WHERE "confidence" IS NULL;

ALTER TABLE "scoring_reports" ALTER COLUMN "coverage" SET NOT NULL;
ALTER TABLE "scoring_reports" ALTER COLUMN "confidence" SET NOT NULL;

-- Index supplémentaire sur fundingRequestId
CREATE INDEX IF NOT EXISTS "scoring_reports_fundingRequestId_idx" ON "scoring_reports"("fundingRequestId");
