import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    this.fromEmail =
      this.configService.get<string>('email.fromEmail') ||
      'noreply@freelancehub.com';

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.smtpHost') || 'smtp.gmail.com',
      port: this.configService.get<number>('email.smtpPort') || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('email.smtpUser'),
        pass: this.configService.get<string>('email.smtpPass'),
      },
    });
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: 'Verify Your Email - FreelanceHub',
      text: `Your OTP code is: ${otp}. It will expire in 10 minutes.`,
      html: `<p>Your OTP code is: <strong>${otp}</strong></p><p>It will expire in 10 minutes.</p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: 'Welcome to FreelanceHub',
      text: `Welcome ${name}! Your account has been verified.`,
      html: `<h1>Welcome ${name}!</h1><p>Your account has been verified and you can now start using FreelanceHub.</p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendProjectInvitation(to: string, projectTitle: string, clientName: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `New Project Opportunity: ${projectTitle}`,
      text: `Hello! ${clientName} has posted a new project: ${projectTitle}. Check it out on FreelanceHub!`,
      html: `<h2>New Project Opportunity</h2><p>Hello!</p><p>${clientName} has posted a new project: <strong>${projectTitle}</strong></p><p>Check it out on FreelanceHub!</p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendProposalAccepted(to: string, projectTitle: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: 'Congratulations! Your Proposal Was Accepted',
      text: `Great news! Your proposal for "${projectTitle}" has been accepted. You can now start working on the project.`,
      html: `<h2>Congratulations!</h2><p>Great news! Your proposal for <strong>"${projectTitle}"</strong> has been accepted.</p><p>You can now start working on the project.</p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPaymentNotification(to: string, amount: number, projectTitle: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: 'Payment Processed Successfully',
      text: `Your payment of $${amount} for "${projectTitle}" has been processed successfully.`,
      html: `<h2>Payment Processed</h2><p>Your payment of <strong>$${amount}</strong> for <strong>"${projectTitle}"</strong> has been processed successfully.</p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
