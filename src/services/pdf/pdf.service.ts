import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Contract } from '../../database/schemas/contract.schema';
import { User } from '../../database/schemas/user.schema';
import { Job } from '../../database/schemas/job.schema';
import { Proposal } from '../../database/schemas/proposal.schema';

@Injectable()
export class PdfService {
  async generateContractAgreement(contract: Contract): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header
      doc.fontSize(20).text('Contract Agreement', { align: 'center' });
      doc.moveDown();

      // Contract Details
      doc.fontSize(14).text(`Contract ID: ${contract._id}`);
      doc.text(`Title: ${contract.title}`);
      doc.text(`Description: ${contract.description}`);
      doc.text(`Contract Type: ${contract.contractType || 'N/A'}`);
      doc.text(`Total Amount: ${contract.totalAmount} ${contract.currency}`);
      if (contract.hourlyRate) {
        doc.text(`Hourly Rate: ${contract.hourlyRate} ${contract.currency}`);
      }
    
      doc.text(`Start Date: ${contract.startDate.toDateString()}`);
      if (contract.endDate) {
        doc.text(`End Date: ${contract.endDate.toDateString()}`);
      }
      doc.text(`Status: ${contract.status}`);
      doc.moveDown();

      // Terms
      if (contract.terms) {
        doc.fontSize(14).text('Terms and Conditions:');
        doc.fontSize(12).text(contract.terms);
        doc.moveDown();
      }

      // Signatures
      doc.fontSize(14).text('Signatures:');
      doc.moveDown();
      doc.text(
        `Client Signature: ${contract.isClientSigned ? 'Signed' : 'Pending'}`,
      );
      doc.text(
        `Freelancer Signature: ${contract.isFreelancerSigned ? 'Signed' : 'Pending'}`,
      );

      doc.end();
    });
  }

  async generateComprehensiveContractPdf(
    contract: Contract,
    client: User,
    freelancer: User,
    job: Job,
    proposal: Proposal,
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header
      doc.fontSize(24).text('Freelance Contract Agreement', { align: 'center' });
      doc.moveDown(2);

      // Contract Overview
      doc.fontSize(16).text('Contract Overview', { underline: true });
      doc.moveDown();
      doc.fontSize(12)
        .text(`Contract ID: ${contract._id}`)
        .text(`Title: ${contract.title}`)
        .text(`Description: ${contract.description}`)
        .text(`Contract Type: ${contract.contractType || 'N/A'}`)
        .text(`Total Amount: ${contract.totalAmount} ${contract.currency}`)
        .text(`Hourly Rate: ${contract.hourlyRate || 0} ${contract.currency}`)
        .text(`Start Date: ${contract.startDate.toDateString()}`)
        .text(`End Date: ${contract.endDate ? contract.endDate.toDateString() : 'Not specified'}`)
        .text(`Status: ${contract.status}`)
        .text(`Platform Fee: ${contract.platformFeePercentage}%`)
        .text(`Total Paid: ${contract.totalPaid} ${contract.currency}`);
      doc.moveDown();

      // Client Information
      doc.fontSize(16).text('Client Information', { underline: true });
      doc.moveDown();
      doc.fontSize(12)
        .text(`Name: ${client.profile?.firstName} ${client.profile?.lastName}`)
        .text(`Email: ${client.email}`)
        .text(`Phone: ${client.profile?.phone || 'Not provided'}`)
        .text(`Company: ${client.clientData?.companyName || 'Not specified'}`)
        .text(`Industry: ${client.clientData?.industry || 'Not specified'}`)
        .text(`Company Size: ${client.clientData?.companySize || 'Not specified'}`)
        .text(`Total Spent: ${client.clientData?.totalSpent || 0} USD`)
        .text(`Posted Jobs: ${client.clientData?.postedJobs || 0}`)
        .text(`Rating: ${client.clientData?.rating || 0}/5 (${client.clientData?.reviewCount || 0} reviews)`);
      doc.moveDown();

      // Freelancer Information
      doc.fontSize(16).text('Freelancer Information', { underline: true });
      doc.moveDown();
      doc.fontSize(12)
        .text(`Name: ${freelancer.profile?.firstName} ${freelancer.profile?.lastName}`)
        .text(`Email: ${freelancer.email}`)
        .text(`Phone: ${freelancer.profile?.phone || 'Not provided'}`)
        .text(`Title: ${freelancer.freelancerData?.title || 'Not specified'}`)
        .text(`Experience Level: ${freelancer.freelancerData?.experience || 'Not specified'}`)
        .text(`Hourly Rate: ${freelancer.freelancerData?.hourlyRate || 0} USD`)
        .text(`Availability: ${freelancer.freelancerData?.availability || 'Not specified'}`)
        .text(`Total Earned: ${freelancer.freelancerData?.totalEarned || 0} USD`)
        .text(`Completed Jobs: ${freelancer.freelancerData?.completedJobs || 0}`)
        .text(`Rating: ${freelancer.freelancerData?.rating || 0}/5 (${freelancer.freelancerData?.reviewCount || 0} reviews)`);

      if (freelancer.freelancerData?.skills && freelancer.freelancerData.skills.length > 0) {
        doc.text(`Skills: ${freelancer.freelancerData.skills.join(', ')}`);
      }

      if (freelancer.freelancerData?.overview) {
        doc.moveDown();
        doc.text('Overview:');
        doc.text(freelancer.freelancerData.overview);
      }
      doc.moveDown();

      // Job Information
      doc.fontSize(16).text('Job Information', { underline: true });
      doc.moveDown();
      doc.fontSize(12)
        .text(`Job ID: ${job._id}`)
        .text(`Title: ${job.title}`)
        .text(`Description: ${job.description}`)
        .text(`Category: ${job.category}`)
        .text(`Project Type: ${job.projectType}`)
        .text(`Budget: ${job.budget.type === 'fixed' ? `${job.budget.min} ${job.budget.currency}` : job.budget.type === 'hourly' ? `${job.budget.min}-${job.budget.max} ${job.budget.currency}/hr` : `${job.budget.min}-${job.budget.max} ${job.budget.currency}`}`)
        .text(`Experience Level: ${job.experienceLevel || 'Not specified'}`)
        .text(`Status: ${job.status}`)
        .text(`Urgent: ${job.isUrgent ? 'Yes' : 'No'}`)
        .text(`Featured: ${job.isFeatured ? 'Yes' : 'No'}`)
        .text(`Proposal Count: ${job.proposalCount}`)
        .text(`Posted At: ${job.postedAt.toDateString()}`)
        .text(`Expires At: ${job.expiresAt ? job.expiresAt.toDateString() : 'Not specified'}`);

      if (job.skills && job.skills.length > 0) {
        doc.text(`Required Skills: ${job.skills.join(', ')}`);
      }

      if (job.duration) {
        doc.text(`Duration: ${job.duration.value} ${job.duration.unit}`);
      }
      doc.moveDown();

      // Proposal Information
      doc.fontSize(16).text('Proposal Information', { underline: true });
      doc.moveDown();
      doc.fontSize(12)
        .text(`Proposal ID: ${proposal._id}`)
        .text(`Proposed Rate: ${proposal.proposedRate.amount} ${proposal.proposedRate.currency} (${proposal.proposedRate.type})`)
        .text(`Status: ${proposal.status}`)
        .text(`Submitted At: ${proposal.submittedAt.toDateString()}`)
        .text(`Client Viewed: ${proposal.clientViewed ? 'Yes' : 'No'}`);

      if (proposal.estimatedDuration) {
        doc.text(`Estimated Duration: ${proposal.estimatedDuration.value} ${proposal.estimatedDuration.unit}`);
      }

      doc.moveDown();
      doc.text('Cover Letter:');
      doc.text(proposal.coverLetter);

      if (proposal.proposedMilestones && proposal.proposedMilestones.length > 0) {
        doc.moveDown();
        doc.fontSize(14).text('Proposed Milestones:', { underline: true });
        doc.fontSize(12);
        proposal.proposedMilestones.forEach((milestone, index) => {
          doc.text(`${index + 1}. ${milestone.title}`);
          doc.text(`   Description: ${milestone.description}`);
          doc.text(`   Amount: ${milestone.amount} ${contract.currency}`);
          doc.text(`   Duration: ${milestone.durationDays} days`);
          doc.moveDown(0.5);
        });
      }
      doc.moveDown();

      // Terms and Conditions
      if (contract.terms) {
        doc.fontSize(16).text('Terms and Conditions', { underline: true });
        doc.moveDown();
        doc.fontSize(12).text(contract.terms);
        doc.moveDown();
      }

      // Signatures
      doc.fontSize(16).text('Signatures', { underline: true });
      doc.moveDown();
      doc.fontSize(12)
        .text(`Client Signature: ${contract.isClientSigned ? 'Signed' : 'Pending'}`)
        .text(`Freelancer Signature: ${contract.isFreelancerSigned ? 'Signed' : 'Pending'}`);

      doc.moveDown(2);
      doc.fontSize(10).text('This contract is generated electronically and is legally binding.', { align: 'center' });

      doc.end();
    });
  }

  // Generic method for other PDF generations
  async generateCustomPdf(
    content: string,
    title: string = 'Document',
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(content);

      doc.end();
    });
  }
}
