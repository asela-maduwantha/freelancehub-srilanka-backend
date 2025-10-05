import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter(): void {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.configService.get<number>('MAIL_PORT');
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') !== 'production';

    // Check if email credentials are configured
    if (!host || !user || !pass) {
      if (isDevelopment) {
        this.logger.warn(
          'Email credentials not configured. Using mock transporter for development.',
        );
        // Create a mock transporter for development
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true,
        });
        return;
      } else {
        throw new Error(
          'Email configuration is required in production environment',
        );
      }
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
      // Additional Gmail SMTP settings
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });
  }

  async sendMail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `"${this.configService.get<string>('MAIL_FROM_NAME')}" <${this.configService.get<string>('MAIL_FROM')}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email sent successfully to ${options.to}. Message ID: ${info.messageId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendEmailVerificationOtp(email: string, otp: string): Promise<void> {
    const subject = 'Verify Your Email - Freelancer Platform';
    const html = this.getEmailVerificationTemplate(otp);

    await this.sendMail({
      to: email,
      subject,
      html,
      text: `Your email verification code is: ${otp}. This code will expire in 10 minutes.`,
    });
  }

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    const subject = 'Password Reset Request - Freelancer Platform';
    const html = this.getPasswordResetTemplate(otp);

    await this.sendMail({
      to: email,
      subject,
      html,
      text: `Your password reset code is: ${otp}. This code will expire in 10 minutes.`,
    });
  }

  async sendLoginOtp(email: string, otp: string): Promise<void> {
    const subject = 'Login Verification Code - Freelancer Platform';
    const html = this.getLoginOtpTemplate(otp);

    await this.sendMail({
      to: email,
      subject,
      html,
      text: `Your login verification code is: ${otp}. This code will expire in 10 minutes.`,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const subject = 'Welcome to Freelancer Platform!';
    const html = this.getWelcomeTemplate(firstName);

    await this.sendMail({
      to: email,
      subject,
      html,
      text: `Welcome ${firstName}! Thank you for joining our freelancer platform.`,
    });
  }

  private getEmailVerificationTemplate(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - Frevo</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #f59e0b 100%); color: white; text-align: center; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            background: linear-gradient(135deg, #2563eb 0%, #f59e0b 100%);
            color: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            letter-spacing: 8px;
          }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Frevo</div>
            <h1>Verify Your Email Address</h1>
          </div>
          <div class="content">
            <p>Hello!</p>
            <p>Thank you for registering with Frevo. To complete your registration, please verify your email address by entering the following verification code:</p>

            <div class="otp-code">${otp}</div>

            <p>This verification code will expire in <strong>10 minutes</strong>.</p>

            <div class="warning">
              <strong>Security Notice:</strong> If you didn't create an account with us, please ignore this email.
            </div>

            <p>If you have any questions, please don't hesitate to contact our support team.</p>

            <p>Best regards,<br>The Frevo Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetTemplate(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Frevo</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #2563eb 100%); color: white; text-align: center; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            background: linear-gradient(135deg, #f59e0b 0%, #2563eb 100%);
            color: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            letter-spacing: 8px;
          }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .warning { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Frevo</div>
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello!</p>
            <p>We received a request to reset your password for your Frevo account. Use the following code to reset your password:</p>

            <div class="otp-code">${otp}</div>

            <p>This reset code will expire in <strong>10 minutes</strong>.</p>

            <div class="warning">
              <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email and consider changing your password as a precaution.
            </div>

            <p>If you have any questions, please don't hesitate to contact our support team.</p>

            <p>Best regards,<br>The Frevo Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getLoginOtpTemplate(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Verification - Frevo</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #f59e0b 100%); color: white; text-align: center; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            background: linear-gradient(135deg, #2563eb 0%, #f59e0b 100%);
            color: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            letter-spacing: 8px;
          }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .warning { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Frevo</div>
            <h1>Login Verification Code</h1>
          </div>
          <div class="content">
            <p>Hello!</p>
            <p>We noticed a login attempt to your Frevo account. Use the following verification code to complete your login:</p>

            <div class="otp-code">${otp}</div>

            <p>This verification code will expire in <strong>10 minutes</strong>.</p>

            <div class="warning">
              <strong>Security Notice:</strong> If you didn't attempt to log in, please secure your account by changing your password.
            </div>

            <p>If you have any questions, please don't hesitate to contact our support team.</p>

            <p>Best regards,<br>The Frevo Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeTemplate(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Frevo</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #2563eb 100%); color: white; text-align: center; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #2563eb 0%, #f59e0b 100%);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Frevo</div>
            <h1>Welcome to Frevo!</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName}!</p>
            <p>Welcome to Frevo - your gateway to connecting with amazing talent and opportunities!</p>
            <p>You can now start exploring projects, connecting with clients or freelancers, and building your professional network.</p>

            <div style="text-align: center;">
              <a href="#" class="cta-button">Get Started</a>
            </div>

            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Best regards,<br>The Frevo Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
