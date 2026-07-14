import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Décode le JWT s'il est présent (req.user renseigné) mais ne rejette jamais
// la requête s'il est absent ou invalide (req.user reste null) — utilisé sur
// les routes consultables à la fois par des visiteurs anonymes (opportunités
// PUBLISHED) et des utilisateurs authentifiés (PME propriétaire d'un brouillon).
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any): TUser {
    return (user || null) as TUser;
  }
}
