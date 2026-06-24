import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET ?? 'le-financier-documents';
    this.client = new S3Client({
      endpoint: `http://${process.env.MINIO_ENDPOINT ?? 'localhost'}:${process.env.MINIO_PORT ?? 4300}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER ?? '',
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? '',
      },
      forcePathStyle: true,
    });
  }

  generateStorageKey(
    originalFileName: string,
    context: { type: string; organizationId?: string; fundingRequestId?: string },
  ): string {
    const TYPE_FOLDERS: Record<string, string> = {
      KYC_ID:                      'kyc-identite',
      KYC_PROOF_OF_ADDRESS:        'kyc-justificatif-domicile',
      ORGANIZATION_LEGAL:          'documents-juridiques',
      FINANCIAL_STATEMENT:         'etats-financiers',
      FUNDING_REQUEST_ATTACHMENT:  'pieces-jointes',
      SETTLEMENT_PROOF:            'preuves-reglement',
      DISPUTE_EVIDENCE:            'preuves-litige',
      OTHER:                       'autres',
    };

    const ext = originalFileName.split('.').pop();
    const folder = TYPE_FOLDERS[context.type] ?? 'autres';
    const uuid = randomUUID();

    if (context.organizationId) {
      return `organisations/${context.organizationId}/${folder}/${uuid}.${ext}`;
    }
    if (context.fundingRequestId) {
      return `demandes/${context.fundingRequestId}/${folder}/${uuid}.${ext}`;
    }
    return `fichiers/${folder}/${uuid}.${ext}`;
  }

  async upload(storageKey: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
  }

  async getSignedDownloadUrl(storageKey: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }
}
