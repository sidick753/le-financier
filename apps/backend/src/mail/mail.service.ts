import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

// Gabarit minimal partagé par tous les emails transactionnels — un seul style à
// maintenir plutôt qu'un bloc HTML dupliqué dans chaque appelant.
export function renderEmail(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `
    <div style="font-family: -apple-system, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <p style="font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #2563eb; margin: 0 0 16px;">LeFinancier</p>
      <h1 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px;">${title}</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px;">${bodyHtml}</p>
      ${cta ? `<a href="${cta.url}" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 8px;">${cta.label}</a>` : ''}
    </div>
  `;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: Resend | null;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.client = apiKey ? new Resend(apiKey) : null;
    this.from = process.env.MAIL_FROM ?? 'LeFinancier <notifications@le-financier.com>';
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.client) {
      this.logger.warn(`RESEND_API_KEY absent — email "${subject}" à ${to} non envoyé.`);
      return;
    }

    const { error } = await this.client.emails.send({ from: this.from, to, subject, html });
    if (error) {
      this.logger.error(`Échec d'envoi de l'email "${subject}" à ${to} : ${error.message}`);
    }
  }
}
