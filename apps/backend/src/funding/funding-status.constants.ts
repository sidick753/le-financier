import { FundingRequestStatus } from '@le-financier/database';

// Une demande n'est modifiable/supprimable par la PME (et ses documents attachés
// ne sont supprimables) que tant qu'elle n'a jamais été rendue visible aux
// investisseurs. Source unique — importée par funding.service.ts et
// documents.service.ts pour éviter que les deux règles divergent.
export const EDITABLE_FUNDING_STATUSES: FundingRequestStatus[] = ['DRAFT', 'UNDER_REVIEW'];

// Statuts consultables sans authentification (investisseurs parcourant les
// opportunités) — cf. findAllPublished(). Tout le reste exige d'être membre
// de l'organisation propriétaire.
export const PUBLIC_FUNDING_STATUSES: FundingRequestStatus[] = ['PUBLISHED', 'FUNDED', 'CLOSED'];
