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

  async sendContractPDF(to: string, contractId: string, pdfBuffer: Buffer, projectTitle: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `Contract Signed: ${projectTitle}`,
      text: `Congratulations! The contract for "${projectTitle}" has been signed by both parties. Please find the contract PDF attached.`,
      html: `<h2>Contract Signed</h2><p>Congratulations! The contract for <strong>"${projectTitle}"</strong> has been signed by both parties.</p><p>Please find the contract PDF attached to this email.</p>`,
      attachments: [
        {
          filename: `contract-${contractId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendContractReadyForApproval(to: string, contractId: string, projectTitle: string, isFreelancer: boolean = false): Promise<void> {
    const role = isFreelancer ? 'freelancer' : 'client';
    const action = isFreelancer ? 'review and approve' : 'approve';
    
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `Contract Ready for Your Approval: ${projectTitle}`,
      text: `The contract for "${projectTitle}" is ready for your ${action}. Please log in to FreelanceHub to ${action} the contract.`,
      html: `<h2>Contract Ready for Approval</h2><p>The contract for <strong>"${projectTitle}"</strong> is ready for your ${action}.</p><p>Please log in to FreelanceHub to ${action} the contract.</p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendNewProposalNotification(to: string, projectTitle: string, freelancerName: string, freelancerEmail: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `New Proposal Received: ${projectTitle}`,
      text: `Great news! ${freelancerName} has submitted a proposal for your project "${projectTitle}". Log in to review their proposal and connect with them.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">🎉 New Proposal Received!</h1>
            </div>
            
            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1976d2; margin: 0 0 10px 0; font-size: 20px;">${projectTitle}</h2>
              <p style="margin: 0; color: #555; font-size: 16px;">
                <strong>${freelancerName}</strong> has submitted a proposal for your project.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #1976d2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Review Proposal
              </a>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 16px;">💡 Next Steps:</h3>
              <ul style="color: #555; margin: 0; padding-left: 20px;">
                <li>Review the freelancer's profile and portfolio</li>
                <li>Check their proposal details and pricing</li>
                <li>Send a message to discuss the project</li>
                <li>Accept the proposal when you're ready to proceed</li>
              </ul>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
              <p>You're receiving this because you posted a project on FreelanceHub.</p>
              <p>© 2025 FreelanceHub. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendProposalAcceptedNotification(to: string, projectTitle: string, freelancerName: string, message?: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `🎉 Congratulations! Your Proposal Was Accepted`,
      text: `Congratulations ${freelancerName}! Your proposal for "${projectTitle}" has been accepted. You can now start working on the project.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
              <p style="color: #1976d2; font-size: 18px; margin: 10px 0 0 0;">Your Proposal Was Accepted</p>
            </div>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <h2 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 20px;">${projectTitle}</h2>
              <p style="margin: 0; color: #2e7d32; font-size: 16px;">
                Great news! Your proposal has been accepted and you're ready to start working.
              </p>
            </div>
            
            ${message ? `
            <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #e65100; margin: 0 0 10px 0; font-size: 16px;">📝 Message from Client:</h3>
              <p style="margin: 0; color: #555; font-style: italic;">"${message}"</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #4caf50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Start Working on Project
              </a>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 16px;">🚀 What's Next:</h3>
              <ul style="color: #555; margin: 0; padding-left: 20px;">
                <li>A contract will be created and sent for your approval</li>
                <li>Review the contract terms and milestones</li>
                <li>Sign the contract to officially start the project</li>
                <li>Begin working on the project deliverables</li>
              </ul>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
              <p>You're receiving this because you submitted a proposal on FreelanceHub.</p>
              <p>© 2025 FreelanceHub. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendProposalRejectedNotification(to: string, projectTitle: string, freelancerName: string, reason?: string, message?: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `Proposal Update: ${projectTitle}`,
      text: `Hi ${freelancerName}, we wanted to let you know that your proposal for "${projectTitle}" was not selected this time. ${message || ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">Proposal Update</h1>
            </div>
            
            <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
              <h2 style="color: #e65100; margin: 0 0 10px 0; font-size: 18px;">${projectTitle}</h2>
              <p style="margin: 0; color: #555; font-size: 16px;">
                Thank you for your interest in this project. Unfortunately, your proposal was not selected at this time.
              </p>
            </div>
            
            ${reason ? `
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">Reason:</h3>
              <p style="margin: 0; color: #555;">${reason}</p>
            </div>
            ` : ''}
            
            ${message ? `
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">Message from Client:</h3>
              <p style="margin: 0; color: #555; font-style: italic;">"${message}"</p>
            </div>
            ` : ''}
            
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin: 0 0 15px 0; font-size: 16px;">💡 Keep Exploring:</h3>
              <ul style="color: #555; margin: 0; padding-left: 20px;">
                <li>Browse other projects that match your skills</li>
                <li>Update your profile to attract more clients</li>
                <li>Consider refining your proposal approach</li>
                <li>Don't get discouraged - every freelancer faces rejection</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #1976d2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Find New Projects
              </a>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
              <p>You're receiving this because you submitted a proposal on FreelanceHub.</p>
              <p>© 2025 FreelanceHub. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendStripeConnectOnboarding(to: string, userName: string, onboardingUrl: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `Complete Your Stripe Account Setup - FreelanceHub`,
      text: `Hi ${userName}, to receive payments from clients, you need to complete your Stripe account setup. Click here to get started: ${onboardingUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">💳 Complete Your Payment Setup</h1>
            </div>
            
            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1976d2; margin: 0 0 10px 0; font-size: 18px;">Hi ${userName}!</h2>
              <p style="margin: 0; color: #555; font-size: 16px;">
                To receive payments from clients on FreelanceHub, you need to set up your Stripe account.
              </p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 16px;">📋 What you'll need:</h3>
              <ul style="color: #555; margin: 0; padding-left: 20px;">
                <li>Bank account information</li>
                <li>Identification documents</li>
                <li>Business information (if applicable)</li>
                <li>Tax information</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${onboardingUrl}" style="background-color: #635bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Complete Stripe Setup
              </a>
            </div>
            
            <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #e65100; margin: 0 0 10px 0; font-size: 16px;">⚠️ Important:</h3>
              <p style="margin: 0; color: #555; font-size: 14px;">
                You must complete this setup before you can receive payments from clients. The process typically takes 24-48 hours to be approved.
              </p>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
              <p>You're receiving this because you're a freelancer on FreelanceHub.</p>
              <p>© 2025 FreelanceHub. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
