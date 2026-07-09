-- AlterEnum
BEGIN;
CREATE TYPE "ScoringStatus_new" AS ENUM ('RECU', 'EXTRACTION', 'A_COMPLETER', 'CALCULATED', 'PENDING_VALIDATION', 'COMPLEMENTS_DEMANDES', 'VALIDATED', 'REFUSED');
ALTER TABLE "scoring_reports" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "scoring_reports" ALTER COLUMN "status" TYPE "ScoringStatus_new" USING ("status"::text::"ScoringStatus_new");
ALTER TYPE "ScoringStatus" RENAME TO "ScoringStatus_old";
ALTER TYPE "ScoringStatus_new" RENAME TO "ScoringStatus";
DROP TYPE "ScoringStatus_old";
ALTER TABLE "scoring_reports" ALTER COLUMN "status" SET DEFAULT 'CALCULATED';
COMMIT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "autonomieFinanciere" DECIMAL(5,4),
ADD COLUMN     "cashFlowAnnuel" DECIMAL(14,2),
ADD COLUMN     "completudeEquipe" TEXT,
ADD COLUMN     "dirigeantAntecedents" TEXT,
ADD COLUMN     "dirigeantExperienceAns" INTEGER,
ADD COLUMN     "dirigeantIncidentsLegaux" TEXT,
ADD COLUMN     "droitsInvestisseur" TEXT,
ADD COLUMN     "experienceSecteurAns" INTEGER,
ADD COLUMN     "fluxMobileMoneyMensuel" DECIMAL(14,2),
ADD COLUMN     "margeBrute" DECIMAL(5,4),
ADD COLUMN     "moat" TEXT,
ADD COLUMN     "nbClientsActifs" INTEGER,
ADD COLUMN     "partMarcheRelative" TEXT,
ADD COLUMN     "ratioLiquidite" DECIMAL(5,4),
ADD COLUMN     "runwayMois" INTEGER,
ADD COLUMN     "scalabilite" TEXT,
ADD COLUMN     "secteurCode" TEXT,
ADD COLUMN     "secteurImportDevises" BOOLEAN DEFAULT false,
ADD COLUMN     "secteurSaisonnalite" BOOLEAN DEFAULT false,
ADD COLUMN     "secteurSoutienPublic" BOOLEAN DEFAULT false,
ADD COLUMN     "tailleMarche" TEXT,
ADD COLUMN     "tauxEndettement" DECIMAL(5,4),
ADD COLUMN     "tcamCa3ans" DECIMAL(5,4),
ADD COLUMN     "trackRecord" TEXT,
ADD COLUMN     "transparence" TEXT;

-- AlterTable
ALTER TABLE "scoring_inputs" DROP COLUMN "autonomieFinanciere",
DROP COLUMN "cashFlowAnnuel",
DROP COLUMN "completudeEquipe",
DROP COLUMN "dirigeantAntecedents",
DROP COLUMN "dirigeantExperienceAns",
DROP COLUMN "dirigeantIncidentsLegaux",
DROP COLUMN "experienceSecteurAns",
DROP COLUMN "fluxMobileMoneyMensuel",
DROP COLUMN "moat",
DROP COLUMN "nbClientsActifs",
DROP COLUMN "partMarcheRelative",
DROP COLUMN "ratioLiquidite",
DROP COLUMN "scalabilite",
DROP COLUMN "secteurCode",
DROP COLUMN "secteurImportDevises",
DROP COLUMN "secteurSaisonnalite",
DROP COLUMN "secteurSoutienPublic",
DROP COLUMN "tailleMarche",
DROP COLUMN "tauxEndettement",
DROP COLUMN "tcamCa3ans",
DROP COLUMN "trackRecord";

