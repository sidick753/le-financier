import { IsUUID, IsDateString } from 'class-validator';

// Approuver une réclamation (financement ou remboursement) exige désormais la
// preuve du virement réel fait par l'admin hors plateforme + sa date — un simple
// clic ne suffit plus à attester qu'un versement a eu lieu.
export class ApproveClaimDto {
  @IsUUID()
  proofDocumentId: string;

  @IsDateString()
  paidAt: string;
}
