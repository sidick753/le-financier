import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PushKeysDto {
  @ApiProperty({ description: "Clé publique de la souscription (courbe P-256), fournie par PushManager.subscribe()." })
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @ApiProperty({ description: "Secret d'authentification de la souscription, fourni par PushManager.subscribe()." })
  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class SubscribePushDto {
  @ApiProperty({ description: "URL d'endpoint push propre au navigateur/appareil, fournie par PushManager.subscribe()." })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({ type: PushKeysDto })
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;

  @ApiProperty({ required: false, description: "User-Agent du navigateur — purement informatif, pour retrouver/gérer ses appareils." })
  @IsString()
  userAgent?: string;
}
