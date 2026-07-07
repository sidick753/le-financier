-- Trace l'échec du dernier calcul de scoring automatique pour une demande de
-- financement (visible côté admin) ; remis à NULL dès qu'un calcul aboutit.
ALTER TABLE "funding_requests" ADD COLUMN "scoringError" TEXT;
