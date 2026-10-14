import nodemailer from 'nodemailer';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private enabled: boolean;
  private from: string;
  private fromEmail: string;
  private fromName: string;
  private useApi: boolean;
  private apiKey: string | null;

  constructor() {
    const host = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST;
    const port = parseInt(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || '587', 10);
    const user = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
    const pass = process.env.BREVO_SMTP_PASSWORD || process.env.SMTP_PASS;
    const explicitApiKey = process.env.BREVO_API_KEY;

    this.fromName = process.env.BREVO_SENDER_NAME || process.env.SMTP_FROM_NAME || 'DOLLAR2X';
    this.fromEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM || 'noreply@dollar2x.trade';
    this.from = `${this.fromName} <${this.fromEmail}>`;

    // Brevo API key starts with xkeysib-; the value in BREVO_SMTP_PASSWORD is
    // likely an API key, not the SMTP master password.
    this.apiKey = explicitApiKey || (pass && pass.startsWith('xkeysib-') ? pass : null);
    this.useApi = Boolean(this.apiKey);
    this.enabled = Boolean(this.apiKey || (host && user && pass));

    if (!this.enabled) {
      console.warn('[EMAIL] Brevo not configured. Emails will be logged instead.');
      return;
    }

    if (this.useApi) {
      console.log('[EMAIL] Using Brevo API v3 for email delivery.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  }

  private async send(to: string, subject: string, text: string, html: string): Promise<void> {
    if (!this.enabled) {
      console.log(`[EMAIL] Skipped sending to ${to}: email not configured`);
      return;
    }

    if (this.useApi && this.apiKey) {
      return this.sendViaApi(to, subject, text, html);
    }

    if (this.transporter) {
      return this.sendViaSmtp(to, subject, text, html);
    }
  }

  private async sendViaApi(to: string, subject: string, text: string, html: string): Promise<void> {
    const response = await fetch(`${BREVO_API_BASE}/smtp/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey!,
      },
      body: JSON.stringify({
        sender: { name: this.fromName, email: this.fromEmail },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Brevo API error ${response.status}: ${text}`);
    }
  }

  private async sendViaSmtp(to: string, subject: string, text: string, html: string): Promise<void> {
    if (!this.transporter) return;

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      text,
      html,
    });
  }

  async sendEmailVerificationOtp(email: string, otp: string): Promise<void> {
    const subject = 'Verify your DOLLAR2X account';
    const text = `Your DOLLAR2X email verification code is: ${otp}. It is valid for 15 minutes.`;
    const html = `<p>Your DOLLAR2X email verification code is:</p><h2>${otp}</h2><p>It is valid for 15 minutes.</p>`;
    await this.send(email, subject, text, html);
  }

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    const subject = 'Reset your DOLLAR2X password';
    const text = `Your DOLLAR2X password reset code is: ${otp}. It is valid for 15 minutes.`;
    const html = `<p>Your DOLLAR2X password reset code is:</p><h2>${otp}</h2><p>It is valid for 15 minutes.</p>`;
    await this.send(email, subject, text, html);
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;
    const subject = 'Password Reset Request';
    const text = `Use the following link to reset your password: ${resetUrl}`;
    const html = `<p>Use the following link to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`;
    await this.send(email, subject, text, html);
  }
}

export const emailService = new EmailService();
