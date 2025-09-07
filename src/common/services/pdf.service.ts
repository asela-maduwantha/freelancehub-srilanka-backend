import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { Contract } from '../../schemas/contract.schema';
import { ClientProfile } from '../../schemas/client-profile.schema';
import { FreelancerProfile } from '../../schemas/freelancer-profile.schema';

@Injectable()
export class PdfService {
  async generateContractPDF(
    contract: Contract,
    clientProfile?: ClientProfile | null,
    freelancerProfile?: FreelancerProfile | null,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: 'Freelance Contract Agreement',
            Author: 'Freelance Hub',
            Subject: 'Contract Agreement',
          },
        });

        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Color palette
        const colors = {
          primary: '#1B5E20', // Dark green
          primaryLight: '#388E3C', // Medium green
          accent: '#4CAF50', // Light green
          text: '#212121', // Dark gray
          textLight: '#757575', // Light gray
          background: '#F8F9FA', // Very light gray
          white: '#FFFFFF',
          success: '#2E7D32',
          warning: '#FF8F00',
          danger: '#D32F2F',
          border: '#E0E0E0',
        };

        // Page dimensions
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 50;
        const contentWidth = pageWidth - margin * 2;

        // Helper function to add a new page if needed
        const checkPageSpace = (requiredSpace: number) => {
          if (doc.y + requiredSpace > pageHeight - margin - 50) {
            doc.addPage();
            return true;
          }
          return false;
        };

        // Header
        doc.rect(0, 0, pageWidth, 100).fill(colors.primary);

        doc
          .fillColor(colors.white)
          .fontSize(26)
          .font('Helvetica-Bold')
          .text('FREELANCE HUB', margin, 25);

        doc
          .fontSize(12)
          .font('Helvetica')
          .text('Professional Contract Agreement', margin, 55);

        // Reset position after header
        doc.y = 120;

        // Contract Title Section
        doc
          .rect(margin, doc.y, contentWidth, 60)
          .fill(colors.background)
          .stroke(colors.border);

        doc
          .fillColor(colors.primary)
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('CONTRACT AGREEMENT', margin, doc.y + 15, {
            width: contentWidth,
            align: 'center',
          });

        doc
          .fillColor(colors.text)
          .fontSize(14)
          .font('Helvetica')
          .text(contract.title, margin, doc.y + 45, {
            width: contentWidth,
            align: 'center',
          });

        doc.y += 80;

        // Contract Information Section
        checkPageSpace(150);

        doc
          .fillColor(colors.primary)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('Contract Information', margin, doc.y);

        // Underline
        doc
          .moveTo(margin, doc.y + 5)
          .lineTo(margin + 180, doc.y + 5)
          .lineWidth(2)
          .strokeColor(colors.accent)
          .stroke();

        doc.y += 25;

        // Contract info box
        const infoBoxY = doc.y;
        doc
          .rect(margin, infoBoxY, contentWidth, 110)
          .fill(colors.white)
          .stroke(colors.border);

        // Contract information in two columns
        const leftCol = margin + 20;
        const rightCol = margin + contentWidth / 2;
        let currentY = infoBoxY + 20;

        doc.fillColor(colors.text).fontSize(10).font('Helvetica');

        // Left column
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('Contract ID:', leftCol, currentY);
        doc
          .font('Helvetica')
          .fillColor(colors.text)
          .text(
            (contract as any)._id?.toString() || 'N/A',
            leftCol + 80,
            currentY,
          );

        currentY += 15;
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('Start Date:', leftCol, currentY);
        doc
          .font('Helvetica')
          .fillColor(colors.text)
          .text(
            contract.startDate?.toISOString().split('T')[0] || 'N/A',
            leftCol + 80,
            currentY,
          );

        currentY += 15;
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('Payment Type:', leftCol, currentY);
        doc
          .font('Helvetica')
          .fillColor(colors.text)
          .text(
            contract.contractType.replace('_', ' ').toUpperCase(),
            leftCol + 80,
            currentY,
          );

        currentY += 15;
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('Status:', leftCol, currentY);
        const statusColor =
          contract.status === 'ACTIVE' ? colors.success : colors.warning;
        doc
          .font('Helvetica-Bold')
          .fillColor(statusColor)
          .text(contract.status.toUpperCase(), leftCol + 80, currentY);

        // Right column
        currentY = infoBoxY + 20;
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('Project:', rightCol, currentY);
        doc
          .font('Helvetica')
          .fillColor(colors.text)
          .text(
            contract.projectId ? (contract.projectId as any).title : 'N/A',
            rightCol + 60,
            currentY,
          );

        currentY += 15;
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('End Date:', rightCol, currentY);
        doc
          .font('Helvetica')
          .fillColor(colors.text)
          .text(
            contract.endDate?.toISOString().split('T')[0] || 'N/A',
            rightCol + 60,
            currentY,
          );

        currentY += 15;
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('Total Budget:', rightCol, currentY);
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.success)
          .text(
            `$${contract.totalAmount} ${contract.currency}`,
            rightCol + 80,
            currentY,
          );

        doc.y = infoBoxY + 130;

        // Parties Section
        checkPageSpace(200);

        doc
          .fillColor(colors.primary)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('Parties Involved', margin, doc.y);

        doc
          .moveTo(margin, doc.y + 5)
          .lineTo(margin + 150, doc.y + 5)
          .lineWidth(2)
          .strokeColor(colors.accent)
          .stroke();

        doc.y += 25;

        const partiesBoxY = doc.y;
        const boxHeight = 140;

        // Client box
        const clientBoxWidth = contentWidth / 2 - 10;
        doc
          .rect(margin, partiesBoxY, clientBoxWidth, boxHeight)
          .fill(colors.white)
          .stroke(colors.border);

        doc.rect(margin, partiesBoxY, clientBoxWidth, 25).fill(colors.primary);

        doc
          .fillColor(colors.white)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Client', margin + 10, partiesBoxY + 8);

        let clientY = partiesBoxY + 35;
        doc.fillColor(colors.text).fontSize(9).font('Helvetica');
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('Name:', margin + 10, clientY);
        doc
          .font('Helvetica')
          .fillColor(colors.text)
          .text((contract.clientId as any).name, margin + 40, clientY);

        clientY += 12;
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('Email:', margin + 10, clientY);
        doc
          .font('Helvetica')
          .fillColor(colors.text)
          .text((contract.clientId as any).email, margin + 40, clientY, {
            width: clientBoxWidth - 50,
          });

        if (clientProfile) {
          clientY += 12;
          doc
            .font('Helvetica-Bold')
            .fillColor(colors.primary)
            .text('Company:', margin + 10, clientY);
          doc
            .font('Helvetica')
            .fillColor(colors.text)
            .text(clientProfile.companyName || 'N/A', margin + 55, clientY);

          clientY += 12;
          doc
            .font('Helvetica-Bold')
            .fillColor(colors.primary)
            .text('Industry:', margin + 10, clientY);
          doc
            .font('Helvetica')
            .fillColor(colors.text)
            .text(clientProfile.industry || 'N/A', margin + 50, clientY);

          if (clientProfile.location) {
            clientY += 12;
            doc
              .font('Helvetica-Bold')
              .fillColor(colors.primary)
              .text('Location:', margin + 10, clientY);
            doc
              .font('Helvetica')
              .fillColor(colors.text)
              .text(
                `${clientProfile.location.city}, ${clientProfile.location.country}`,
                margin + 55,
                clientY,
              );
          }
        }

        // Freelancer box
        const freelancerBoxX = margin + clientBoxWidth + 20;
        doc
          .rect(freelancerBoxX, partiesBoxY, clientBoxWidth, boxHeight)
          .fill(colors.white)
          .stroke(colors.border);

        doc
          .rect(freelancerBoxX, partiesBoxY, clientBoxWidth, 25)
          .fill(colors.primary);

        doc
          .fillColor(colors.white)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Freelancer', freelancerBoxX + 10, partiesBoxY + 8);

        let freelancerY = partiesBoxY + 35;
        doc.fillColor(colors.text).fontSize(9).font('Helvetica');
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('Name:', freelancerBoxX + 10, freelancerY);
        doc
          .font('Helvetica')
          .fillColor(colors.text)
          .text(
            (contract.freelancerId as any).name,
            freelancerBoxX + 40,
            freelancerY,
          );

        freelancerY += 12;
        doc
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('Email:', freelancerBoxX + 10, freelancerY);
        doc
          .font('Helvetica')
          .fillColor(colors.text)
          .text(
            (contract.freelancerId as any).email,
            freelancerBoxX + 40,
            freelancerY,
            { width: clientBoxWidth - 50 },
          );

        if (freelancerProfile) {
          freelancerY += 12;
          doc
            .font('Helvetica-Bold')
            .fillColor(colors.primary)
            .text('Title:', freelancerBoxX + 10, freelancerY);
          doc
            .font('Helvetica')
            .fillColor(colors.text)
            .text(
              freelancerProfile.professionalTitle,
              freelancerBoxX + 35,
              freelancerY,
            );

          freelancerY += 12;
          doc
            .font('Helvetica-Bold')
            .fillColor(colors.primary)
            .text('Experience:', freelancerBoxX + 10, freelancerY);
          doc
            .font('Helvetica')
            .fillColor(colors.text)
            .text(
              freelancerProfile.experienceLevel,
              freelancerBoxX + 65,
              freelancerY,
            );

          freelancerY += 12;
          doc
            .font('Helvetica-Bold')
            .fillColor(colors.primary)
            .text('Rate:', freelancerBoxX + 10, freelancerY);
          doc
            .font('Helvetica')
            .fillColor(colors.text)
            .text(
              `$${freelancerProfile.hourlyRate}/hr`,
              freelancerBoxX + 35,
              freelancerY,
            );

          if (freelancerProfile.location) {
            freelancerY += 12;
            doc
              .font('Helvetica-Bold')
              .fillColor(colors.primary)
              .text('Location:', freelancerBoxX + 10, freelancerY);
            doc
              .font('Helvetica')
              .fillColor(colors.text)
              .text(
                `${freelancerProfile.location.city}, ${freelancerProfile.location.country}`,
                freelancerBoxX + 55,
                freelancerY,
              );
          }
        }

        doc.y = partiesBoxY + boxHeight + 30;

        // Project Milestones
        checkPageSpace(200);

        doc
          .fillColor(colors.primary)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('Project Milestones', margin, doc.y);

        doc
          .moveTo(margin, doc.y + 5)
          .lineTo(margin + 160, doc.y + 5)
          .lineWidth(2)
          .strokeColor(colors.accent)
          .stroke();

        doc.y += 25;

        contract.milestones.forEach((milestone, index) => {
          checkPageSpace(90);

          const milestoneY = doc.y;
          const milestoneHeight = 80;

          // Milestone box
          doc
            .rect(margin, milestoneY, contentWidth, milestoneHeight)
            .fill(colors.white)
            .stroke(colors.border);

          // Milestone number circle
          doc.circle(margin + 25, milestoneY + 25, 12).fill(colors.primary);

          doc
            .fillColor(colors.white)
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`${index + 1}`, margin + 22, milestoneY + 21);

          // Status indicator
          const statusColor =
            milestone.status === 'APPROVED'
              ? colors.success
              : milestone.status === 'PENDING'
                ? colors.warning
                : colors.textLight;
          doc
            .circle(margin + contentWidth - 25, milestoneY + 25, 8)
            .fill(statusColor);

          // Milestone title
          doc
            .fillColor(colors.primary)
            .fontSize(12)
            .font('Helvetica-Bold')
            .text(milestone.title, margin + 50, milestoneY + 15);

          // Description
          doc
            .fillColor(colors.text)
            .fontSize(9)
            .font('Helvetica')
            .text(milestone.description, margin + 50, milestoneY + 32, {
              width: contentWidth - 100,
              height: 20,
              ellipsis: true,
            });

          // Details row
          const detailY = milestoneY + 55;
          doc.fontSize(8).font('Helvetica');

          doc
            .font('Helvetica-Bold')
            .fillColor(colors.primary)
            .text('Amount:', margin + 50, detailY);
          doc
            .font('Helvetica')
            .fillColor(colors.text)
            .text(`$${milestone.amount}`, margin + 90, detailY);

          doc
            .font('Helvetica-Bold')
            .fillColor(colors.primary)
            .text('Deadline:', margin + 180, detailY);
          doc
            .font('Helvetica')
            .fillColor(colors.text)
            .text(
              milestone.deadline
                ? milestone.deadline.toISOString().split('T')[0]
                : 'N/A',
              margin + 225,
              detailY,
            );

          doc
            .font('Helvetica-Bold')
            .fillColor(colors.primary)
            .text('Status:', margin + 320, detailY);
          doc
            .font('Helvetica')
            .fillColor(statusColor)
            .text(
              milestone.status.replace('_', ' ').toUpperCase(),
              margin + 355,
              detailY,
            );

          doc.y = milestoneY + milestoneHeight + 15;
        });

        // Terms and Conditions
        checkPageSpace(200);

        doc
          .fillColor(colors.primary)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('Terms and Conditions', margin, doc.y);

        doc
          .moveTo(margin, doc.y + 5)
          .lineTo(margin + 180, doc.y + 5)
          .lineWidth(2)
          .strokeColor(colors.accent)
          .stroke();

        doc.y += 25;

        const termsY = doc.y;
        const termsHeight = 140;

        doc
          .rect(margin, termsY, contentWidth, termsHeight)
          .fill(colors.white)
          .stroke(colors.border);

        const terms = [
          'The freelancer agrees to complete all milestones according to the specifications provided.',
          'The client agrees to make payments according to the payment schedule outlined above.',
          'Any changes to the project scope must be agreed upon by both parties in writing.',
          'The freelancer retains all rights to the source code and deliverables until full payment is received.',
          'Both parties agree to communicate regularly and provide feedback in a timely manner.',
          'This contract is governed by the laws of the jurisdiction specified in the project terms.',
        ];

        let termY = termsY + 15;
        doc.fontSize(9).font('Helvetica').fillColor(colors.text);

        terms.forEach((term, index) => {
          doc
            .font('Helvetica-Bold')
            .fillColor(colors.primary)
            .text(`${index + 1}.`, margin + 15, termY);
          doc
            .font('Helvetica')
            .fillColor(colors.text)
            .text(term, margin + 30, termY, {
              width: contentWidth - 50,
              continued: false,
            });
          termY += 20;
        });

        doc.y = termsY + termsHeight + 30;

        // Digital Signatures
        checkPageSpace(120);

        doc
          .fillColor(colors.primary)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('Digital Signatures', margin, doc.y);

        doc
          .moveTo(margin, doc.y + 5)
          .lineTo(margin + 160, doc.y + 5)
          .lineWidth(2)
          .strokeColor(colors.accent)
          .stroke();

        doc.y += 25;

        const sigY = doc.y;
        const sigHeight = 80;

        doc
          .rect(margin, sigY, contentWidth, sigHeight)
          .fill(colors.white)
          .stroke(colors.border);

        // Client signature
        const clientSigned = contract.client_digital_signed
          ? '✓ Signed'
          : '✗ Not Signed';
        const clientSigColor = contract.client_digital_signed
          ? colors.success
          : colors.warning;

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('Client Signature:', margin + 20, sigY + 20);

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(clientSigColor)
          .text(clientSigned, margin + 120, sigY + 20);

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(colors.textLight)
          .text(
            `Date: ${contract.createdAt ? new Date(contract.createdAt).toDateString() : '____________'}`,
            margin + 20,
            sigY + 40,
          );

        // Freelancer signature
        const freelancerSigned = contract.freelancer_digital_signed
          ? '✓ Signed'
          : '✗ Not Signed';
        const freelancerSigColor = contract.freelancer_digital_signed
          ? colors.success
          : colors.warning;

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor(colors.primary)
          .text('Freelancer Signature:', margin + 280, sigY + 20);

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(freelancerSigColor)
          .text(freelancerSigned, margin + 400, sigY + 20);

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(colors.textLight)
          .text(
            `Date: ${contract.createdAt ? new Date(contract.createdAt).toDateString() : '____________'}`,
            margin + 280,
            sigY + 40,
          );

        // Footer
        const footerY = pageHeight - 40;
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor(colors.textLight)
          .text(
            'This contract is electronically generated and legally binding. Generated by Freelance Hub.',
            margin,
            footerY,
            { align: 'center', width: contentWidth },
          );

        doc.text(
          `Generated on: ${new Date().toISOString().split('T')[0]}`,
          margin,
          footerY + 12,
          { align: 'center', width: contentWidth },
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async savePDFToFile(pdfBuffer: Buffer, filename: string): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'contracts');

    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    return filePath;
  }
}
