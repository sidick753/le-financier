-- Table des pondérations de scoring configurables (une ligne par critère et par produit)
CREATE TABLE "scoring_weights" (
    "id"           TEXT NOT NULL,
    "product"      TEXT NOT NULL,
    "criterionKey" TEXT NOT NULL,
    "label"        TEXT NOT NULL,
    "weight"       INTEGER NOT NULL,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scoring_weights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scoring_weights_product_criterionKey_key" ON "scoring_weights"("product", "criterionKey");
