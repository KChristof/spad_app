-- CreateTable
CREATE TABLE "CompletudeSnapshot" (
    "id" TEXT NOT NULL,
    "dateSnapshot" TIMESTAMP(3) NOT NULL,
    "districtCode" TEXT NOT NULL,
    "etablissementCode" TEXT NOT NULL DEFAULT '',
    "formulaireId" TEXT NOT NULL,
    "nbAttendu" INTEGER,
    "nbRecu" INTEGER NOT NULL,
    "nbRecuPlafond" INTEGER NOT NULL DEFAULT 0,
    "tauxCompletude" DOUBLE PRECISION,

    CONSTRAINT "CompletudeSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompletudeSnapshot_dateSnapshot_idx" ON "CompletudeSnapshot"("dateSnapshot");

-- CreateIndex
CREATE INDEX "CompletudeSnapshot_districtCode_formulaireId_idx" ON "CompletudeSnapshot"("districtCode", "formulaireId");

-- CreateIndex
CREATE UNIQUE INDEX "CompletudeSnapshot_dateSnapshot_districtCode_etablissementC_key" ON "CompletudeSnapshot"("dateSnapshot", "districtCode", "etablissementCode", "formulaireId");
