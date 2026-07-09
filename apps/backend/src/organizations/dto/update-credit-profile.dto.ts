import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Profil de crédit de la PME — attributs de l'entité (secteur, santé financière,
// dirigeant, équipe/gouvernance/marché), partagés par toutes ses demandes de
// financement plutôt que ressaisis à chaque nouvelle demande.
export class UpdateCreditProfileDto {
  // --- Secteur & structure (PRET) ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secteurCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  secteurSaisonnalite?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  secteurImportDevises?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  secteurSoutienPublic?: boolean;

  // --- Santé financière (PRET + EQUITY) ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cashFlowAnnuel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fluxMobileMoneyMensuel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  autonomieFinanciere?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tauxEndettement?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ratioLiquidite?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tcamCa3ans?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  margeBrute?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  runwayMois?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  nbClientsActifs?: number;

  // --- Profil du dirigeant (PRET + EQUITY) ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  dirigeantExperienceAns?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dirigeantAntecedents?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dirigeantIncidentsLegaux?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceSecteurAns?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackRecord?: string;

  // --- Équipe, gouvernance & marché (EQUITY) ---
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  completudeEquipe?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  droitsInvestisseur?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transparence?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tailleMarche?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scalabilite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partMarcheRelative?: string;
}
