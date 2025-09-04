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
      host:
        this.configService.get<string>('email.smtpHost') || 'smtp.gmail.com',
      port: this.configService.get<number>('email.smtpPort') || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('email.smtpUser'),
        pass: this.configService.get<string>('email.smtpPass'),
      },
    });
  }

  private getBaseTemplate(title: string, content: string, footerText?: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; color: #374151; line-height: 1.6; }
          .highlight-box { background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center; margin: 20px 0; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3); }
          .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4); }
          .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
          .footer p { margin: 5px 0; }
          .icon { font-size: 24px; margin-bottom: 10px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">🚀</div>
            <h1>${title}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>${footerText || "You're receiving this email because you're part of the FreelanceHub community."}</p>
            <p>© 2025 FreelanceHub. All rights reserved.</p>
            <p><a href="#" style="color: #22c55e; text-decoration: none;">Unsubscribe</a> | <a href="#" style="color: #22c55e; text-decoration: none;">Privacy Policy</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">Welcome to FreelanceHub! We're excited to have you join our community.</p>
      
      <div class="highlight-box">
        <h2 style="margin: 0 0 15px 0; color: #16a34a; font-size: 24px;">🔐 Your Verification Code</h2>
        <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #22c55e;">
          <span style="font-size: 32px; font-weight: bold; color: #16a34a; letter-spacing: 4px;">${otp}</span>
        </div>
        <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">This code will expire in <strong>10 minutes</strong></p>
      </div>
      
      <p>If you didn't request this verification code, please ignore this email.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="cta-button">Verify Your Email</a>
      </div>
    `;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: '🔐 Verify Your Email - FreelanceHub',
      text: `Your OTP code is: ${otp}. It will expire in 10 minutes.`,
      html: this.getBaseTemplate('Verify Your Email', content, "You're receiving this because you signed up for FreelanceHub."),
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">Welcome to FreelanceHub, ${name}! 🎉</p>
      
      <div class="highlight-box">
        <h2 style="margin: 0 0 15px 0; color: #16a34a;">✅ Account Verified Successfully</h2>
        <p style="margin: 0; font-size: 16px;">Your email has been verified and your account is now active. You can start exploring projects and connecting with clients right away!</p>
      </div>
      
      <h3 style="color: #16a34a; margin: 30px 0 15px 0;">🚀 What's Next?</h3>
      <ul>
        <li><strong>Complete your profile</strong> - Add your skills, experience, and portfolio</li>
        <li><strong>Browse projects</strong> - Find opportunities that match your expertise</li>
        <li><strong>Submit proposals</strong> - Start bidding on projects you're interested in</li>
        <li><strong>Connect with clients</strong> - Build relationships and grow your freelance career</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="cta-button">Explore Projects</a>
      </div>
    `;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: '🎉 Welcome to FreelanceHub - Your Account is Ready!',
      text: `Welcome ${name}! Your account has been verified. You can now start using FreelanceHub.`,
      html: this.getBaseTemplate('Welcome to FreelanceHub!', content),
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendProjectInvitation(
    to: string,
    projectTitle: string,
    clientName: string,
  ): Promise<void> {
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">Great news! A new project opportunity has been posted that might interest you.</p>
      
      <div class="highlight-box">
        <h2 style="margin: 0 0 15px 0; color: #16a34a;">📋 New Project Opportunity</h2>
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">${projectTitle}</h3>
        <p style="margin: 0; font-size: 16px;"><strong>Posted by:</strong> ${clientName}</p>
      </div>
      
      <p>This could be a great opportunity to showcase your skills and work with a new client. Check out the project details and consider submitting a proposal if it aligns with your expertise.</p>
      
      <h3 style="color: #16a34a; margin: 30px 0 15px 0;">💡 Tips for Success:</h3>
      <ul>
        <li><strong>Read carefully</strong> - Understand the project requirements thoroughly</li>
        <li><strong>Highlight relevant experience</strong> - Show how your skills match the project needs</li>
        <li><strong>Be competitive</strong> - Research similar projects and price accordingly</li>
        <li><strong>Personalize your proposal</strong> - Make it specific to this client's needs</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="cta-button">View Project Details</a>
      </div>
    `;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `📋 New Project Opportunity: ${projectTitle}`,
      text: `Hello! ${clientName} has posted a new project: ${projectTitle}. Check it out on FreelanceHub!`,
      html: this.getBaseTemplate('New Project Opportunity', content, "You're receiving this because you have relevant skills for this project type."),
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendProposalAccepted(to: string, projectTitle: string): Promise<void> {
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">Congratulations! 🎉</p>
      
      <div class="highlight-box">
        <h2 style="margin: 0 0 15px 0; color: #16a34a;">✅ Your Proposal Was Accepted!</h2>
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">${projectTitle}</h3>
        <p style="margin: 0; font-size: 16px;">Great news! Your proposal has been accepted and you can now start working on this project.</p>
      </div>
      
      <p>The client has chosen you for this project. A contract will be created shortly, and you'll receive it for review and approval.</p>
      
      <h3 style="color: #16a34a; margin: 30px 0 15px 0;">🚀 What's Next?</h3>
      <ul>
        <li><strong>Review the contract</strong> - Check all terms and conditions carefully</li>
        <li><strong>Sign the contract</strong> - Approve it to officially start the project</li>
        <li><strong>Start working</strong> - Begin delivering the project requirements</li>
        <li><strong>Communicate regularly</strong> - Keep the client updated on your progress</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="cta-button">View Project</a>
      </div>
    `;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: '🎉 Congratulations! Your Proposal Was Accepted',
      text: `Great news! Your proposal for "${projectTitle}" has been accepted. You can now start working on the project.`,
      html: this.getBaseTemplate('Congratulations!', content, "You're receiving this because you submitted a proposal that was accepted."),
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPaymentNotification(
    to: string,
    amount: number,
    projectTitle: string,
  ): Promise<void> {
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">Great news! Your payment has been processed successfully.</p>
      
      <div class="highlight-box">
        <h2 style="margin: 0 0 15px 0; color: #16a34a;">💰 Payment Processed Successfully</h2>
        <div style="text-align: center; margin: 20px 0;">
          <div style="font-size: 36px; font-weight: bold; color: #16a34a; margin-bottom: 10px;">$${amount}</div>
          <p style="margin: 0; color: #6b7280;">Payment Amount</p>
        </div>
        <p style="margin: 15px 0 0 0; font-size: 16px;"><strong>Project:</strong> ${projectTitle}</p>
      </div>
      
      <p>Your payment has been securely processed and should appear in your account within 3-5 business days, depending on your bank's processing time.</p>
      
      <h3 style="color: #16a34a; margin: 30px 0 15px 0;">📋 Payment Details:</h3>
      <ul>
        <li><strong>Amount:</strong> $${amount}</li>
        <li><strong>Project:</strong> ${projectTitle}</li>
        <li><strong>Status:</strong> Completed</li>
        <li><strong>Processing Time:</strong> 3-5 business days</li>
      </ul>
      
      <p>If you have any questions about this payment, please don't hesitate to contact our support team.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="cta-button">View Transaction History</a>
      </div>
    `;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: '💰 Payment Processed Successfully - FreelanceHub',
      text: `Your payment of $${amount} for "${projectTitle}" has been processed successfully.`,
      html: this.getBaseTemplate('Payment Processed', content, "You're receiving this because a payment was processed for your account."),
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendContractPDF(
    to: string,
    contractId: string,
    pdfBuffer: Buffer,
    projectTitle: string,
  ): Promise<void> {
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">Congratulations! Your contract has been signed by both parties.</p>
      
      <div class="highlight-box">
        <h2 style="margin: 0 0 15px 0; color: #16a34a;">📄 Contract Signed Successfully</h2>
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">${projectTitle}</h3>
        <p style="margin: 0; font-size: 16px;">Both you and your client have signed the contract. The project is now officially underway!</p>
      </div>
      
      <p>We've attached the signed contract PDF to this email for your records. Please keep this document safe as it contains all the important terms and conditions of your agreement.</p>
      
      <h3 style="color: #16a34a; margin: 30px 0 15px 0;">📋 What's Included:</h3>
      <ul>
        <li><strong>Project details</strong> - Complete scope and deliverables</li>
        <li><strong>Payment terms</strong> - Milestones and payment schedule</li>
        <li><strong>Timeline</strong> - Project deadlines and milestones</li>
        <li><strong>Legal terms</strong> - Rights, responsibilities, and dispute resolution</li>
      </ul>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h4 style="margin: 0 0 10px 0; color: #92400e;">⚠️ Important Reminder</h4>
        <p style="margin: 0; color: #92400e;">Keep this contract in a safe place. You may need to reference it throughout the project duration.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="cta-button">View Project Dashboard</a>
      </div>
    `;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `📄 Contract Signed: ${projectTitle}`,
      text: `Congratulations! The contract for "${projectTitle}" has been signed by both parties. Please find the contract PDF attached.`,
      html: this.getBaseTemplate('Contract Signed', content, "You're receiving this because you are a party to this contract."),
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

  async sendContractReadyForApproval(
    to: string,
    contractId: string,
    projectTitle: string,
    isFreelancer: boolean = false,
  ): Promise<void> {
    const role = isFreelancer ? 'freelancer' : 'client';
    const action = isFreelancer ? 'review and approve' : 'approve';
    const title = isFreelancer ? 'Review Contract' : 'Approve Contract';

    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">A contract has been created for your project and is ready for your ${action}.</p>
      
      <div class="highlight-box">
        <h2 style="margin: 0 0 15px 0; color: #16a34a;">📝 Contract Ready for ${title}</h2>
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">${projectTitle}</h3>
        <p style="margin: 0; font-size: 16px;">The contract has been drafted and is waiting for your ${action} to proceed with the project.</p>
      </div>
      
      <p>Please take a moment to carefully review all the terms, conditions, payment schedule, and project deliverables before ${isFreelancer ? 'approving' : 'approving'} the contract.</p>
      
      <h3 style="color: #16a34a; margin: 30px 0 15px 0;">📋 What to Check:</h3>
      <ul>
        <li><strong>Project scope</strong> - Make sure all deliverables are clearly defined</li>
        <li><strong>Payment terms</strong> - Review milestones and payment schedule</li>
        <li><strong>Timeline</strong> - Check deadlines and project duration</li>
        <li><strong>Legal terms</strong> - Understand rights and responsibilities</li>
        <li><strong>Contact information</strong> - Ensure all details are correct</li>
      </ul>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h4 style="margin: 0 0 10px 0; color: #92400e;">⚠️ Important</h4>
        <p style="margin: 0; color: #92400e;">Once you ${action} the contract, it becomes legally binding. Make sure you're comfortable with all terms before proceeding.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="cta-button">${title}</a>
      </div>
    `;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `📝 Contract Ready for Your Approval: ${projectTitle}`,
      text: `The contract for "${projectTitle}" is ready for your ${action}. Please log in to FreelanceHub to ${action} the contract.`,
      html: this.getBaseTemplate(title, content, `You're receiving this because you are the ${role} for this project.`),
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendNewProposalNotification(
    to: string,
    projectTitle: string,
    freelancerName: string,
    freelancerEmail: string,
  ): Promise<void> {
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">Great news! You have received a new proposal for your project.</p>
      
      <div class="highlight-box">
        <h2 style="margin: 0 0 15px 0; color: #16a34a;">🎉 New Proposal Received!</h2>
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">${projectTitle}</h3>
        <p style="margin: 0; font-size: 16px;"><strong>From:</strong> ${freelancerName} (${freelancerEmail})</p>
      </div>
      
      <p>A freelancer has submitted a proposal for your project. Take some time to review their profile, experience, and proposal details to see if they're a good fit for your project.</p>
      
      <h3 style="color: #16a34a; margin: 30px 0 15px 0;">💡 Next Steps:</h3>
      <ul>
        <li><strong>Review freelancer's profile</strong> - Check their experience and portfolio</li>
        <li><strong>Read the proposal</strong> - Understand their approach and pricing</li>
        <li><strong>Check references</strong> - Look at their past work and reviews</li>
        <li><strong>Send a message</strong> - Ask questions and discuss the project</li>
        <li><strong>Accept the proposal</strong> - If they're the right fit for your project</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="cta-button">Review Proposal</a>
      </div>
    `;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `🎉 New Proposal Received: ${projectTitle}`,
      text: `Great news! ${freelancerName} has submitted a proposal for your project "${projectTitle}". Log in to review their proposal and connect with them.`,
      html: this.getBaseTemplate('New Proposal Received', content, "You're receiving this because you posted a project on FreelanceHub."),
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendProposalAcceptedNotification(
    to: string,
    projectTitle: string,
    freelancerName: string,
    message?: string,
  ): Promise<void> {
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">Congratulations ${freelancerName}! 🎉</p>
      
      <div class="highlight-box">
        <h2 style="margin: 0 0 15px 0; color: #16a34a;">✅ Your Proposal Was Accepted!</h2>
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">${projectTitle}</h3>
        <p style="margin: 0; font-size: 16px;">Great news! Your proposal has been accepted and you're ready to start working.</p>
      </div>
      
      ${message ? `
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h4 style="margin: 0 0 10px 0; color: #92400e;">📝 Message from Client:</h4>
        <p style="margin: 0; color: #92400e; font-style: italic;">"${message}"</p>
      </div>
      ` : ''}
      
      <h3 style="color: #16a34a; margin: 30px 0 15px 0;">🚀 What's Next:</h3>
      <ul>
        <li><strong>Contract creation</strong> - A contract will be created and sent for your approval</li>
        <li><strong>Review terms</strong> - Check all contract terms and conditions carefully</li>
        <li><strong>Sign contract</strong> - Approve it to officially start the project</li>
        <li><strong>Begin work</strong> - Start delivering the project deliverables</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="cta-button">Start Working on Project</a>
      </div>
    `;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `🎉 Congratulations! Your Proposal Was Accepted`,
      text: `Congratulations ${freelancerName}! Your proposal for "${projectTitle}" has been accepted. You can now start working on the project.`,
      html: this.getBaseTemplate('Congratulations!', content, "You're receiving this because you submitted a proposal that was accepted."),
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendProposalRejectedNotification(
    to: string,
    projectTitle: string,
    freelancerName: string,
    reason?: string,
    message?: string,
  ): Promise<void> {
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">Hi ${freelancerName}, we wanted to let you know about an update on your proposal.</p>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h2 style="margin: 0 0 15px 0; color: #92400e;">📝 Proposal Update</h2>
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">${projectTitle}</h3>
        <p style="margin: 0; color: #92400e; font-size: 16px;">Thank you for your interest in this project. Unfortunately, your proposal was not selected at this time.</p>
      </div>
      
      ${reason ? `
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #16a34a;">Reason:</h4>
        <p style="margin: 0; color: #374151;">${reason}</p>
      </div>
      ` : ''}
      
      ${message ? `
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #16a34a;">Message from Client:</h4>
        <p style="margin: 0; color: #374151; font-style: italic;">"${message}"</p>
      </div>
      ` : ''}
      
      <h3 style="color: #16a34a; margin: 30px 0 15px 0;">💡 Keep Exploring:</h3>
      <ul>
        <li><strong>Browse other projects</strong> - Find opportunities that match your skills</li>
        <li><strong>Update your profile</strong> - Add more details to attract more clients</li>
        <li><strong>Refine your approach</strong> - Consider what worked well in this proposal</li>
        <li><strong>Don't get discouraged</strong> - Every freelancer faces rejection sometimes</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" class="cta-button">Find New Projects</a>
      </div>
    `;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `📝 Proposal Update: ${projectTitle}`,
      text: `Hi ${freelancerName}, we wanted to let you know that your proposal for "${projectTitle}" was not selected this time. ${message || ''}`,
      html: this.getBaseTemplate('Proposal Update', content, "You're receiving this because you submitted a proposal on FreelanceHub."),
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendStripeConnectOnboarding(
    to: string,
    userName: string,
    onboardingUrl: string,
  ): Promise<void> {
    const content = `
      <p style="font-size: 18px; margin-bottom: 20px;">Hi ${userName}! To receive payments from clients, you need to complete your Stripe account setup.</p>
      
      <div class="highlight-box">
        <h2 style="margin: 0 0 15px 0; color: #16a34a;">💳 Complete Your Payment Setup</h2>
        <p style="margin: 0; font-size: 16px;">Setting up your Stripe account is essential for receiving payments from clients on FreelanceHub.</p>
      </div>
      
      <h3 style="color: #16a34a; margin: 30px 0 15px 0;">📋 What You'll Need:</h3>
      <ul>
        <li><strong>Bank account information</strong> - For receiving payments</li>
        <li><strong>Identification documents</strong> - Government-issued ID</li>
        <li><strong>Business information</strong> - If you're running a business</li>
        <li><strong>Tax information</strong> - For tax reporting purposes</li>
      </ul>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h4 style="margin: 0 0 10px 0; color: #92400e;">⚠️ Important:</h4>
        <p style="margin: 0; color: #92400e;">You must complete this setup before you can receive payments from clients. The verification process typically takes 24-48 hours.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${onboardingUrl}" class="cta-button">Complete Stripe Setup</a>
      </div>
      
      <p style="text-align: center; color: #6b7280; font-size: 14px;">This link will expire in 24 hours. If it expires, you can restart the process from your dashboard.</p>
    `;

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: `💳 Complete Your Stripe Account Setup - FreelanceHub`,
      text: `Hi ${userName}, to receive payments from clients, you need to complete your Stripe account setup. Click here to get started: ${onboardingUrl}`,
      html: this.getBaseTemplate('Complete Your Payment Setup', content, "You're receiving this because you're a freelancer on FreelanceHub."),
    };

    await this.transporter.sendMail(mailOptions);
  }
}
