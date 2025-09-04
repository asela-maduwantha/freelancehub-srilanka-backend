import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { Contract } from '../../schemas/contract.schema';

@Injectable()
export class PdfService {
  async generateContractPDF(contract: Contract): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
        });

        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('FREELANCE CONTRACT', { align: 'center' });
        doc.moveDown(2);

        // Contract Details
        doc.fontSize(14).font('Helvetica-Bold').text('Contract Information', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        doc.text(`Contract ID: ${(contract as any)._id?.toString()}`);
        doc.text(`Project: ${contract.title || 'N/A'}`);
        doc.text(`Start Date: ${contract.startDate?.toISOString().split('T')[0] || 'N/A'}`);
        doc.text(`End Date: ${contract.endDate?.toISOString().split('T')[0] || 'N/A'}`);
        doc.text(`Payment Type: ${contract.contractType}`);
        doc.text(`Total Budget: $${contract.totalAmount}`);
        doc.text(`Currency: ${contract.currency}`);
        doc.moveDown(2);

        // Parties
        doc.fontSize(14).font('Helvetica-Bold').text('Parties Involved', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        doc.text(`Client ID: ${contract.clientId.toString()}`);
        doc.moveDown(0.5);
        doc.text(`Freelancer ID: ${contract.freelancerId.toString()}`);
        doc.moveDown(2);

        // Milestones
        doc.fontSize(14).font('Helvetica-Bold').text('Project Milestones', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');

        contract.milestones.forEach((milestone, index) => {
          doc.text(`${index + 1}. ${milestone.title}`);
          doc.text(`   Description: ${milestone.description}`);
          doc.text(`   Amount: $${milestone.amount}`);
          doc.text(`   Due Date: ${milestone.deadline || 'N/A'}`); // deadline is a Date in clean schema
          doc.moveDown(0.5);
        });

        doc.moveDown(2);

        // Terms and Conditions
        doc.fontSize(14).font('Helvetica-Bold').text('Terms and Conditions', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text('1. The freelancer agrees to complete all milestones according to the specifications provided.');
        doc.text('2. The client agrees to make payments according to the payment schedule outlined above.');
        doc.text('3. Any changes to the project scope must be agreed upon by both parties in writing.');
        doc.text('4. The freelancer retains all rights to the source code and deliverables until full payment is received.');
        doc.text('5. Both parties agree to communicate regularly and provide feedback in a timely manner.');
        doc.moveDown(2);

        // Signatures
        doc.fontSize(14).font('Helvetica-Bold').text('Signatures', { underline: true });
        doc.moveDown(1);

        // Client signature area
        doc.fontSize(12).font('Helvetica');
        doc.text('Client Signature: _______________________________');
        doc.text(`Date: ${contract.createdAt ? new Date(contract.createdAt).toDateString() : '____________'}`); // Using createdAt instead
        doc.moveDown(1);

        // Freelancer signature area
        doc.text('Freelancer Signature: _______________________________');
        doc.text(`Date: ${contract.createdAt ? new Date(contract.createdAt).toDateString() : '____________'}`); // Using createdAt instead
        doc.moveDown(2);

        // Footer
        doc.fontSize(8).font('Helvetica');
        doc.text('This contract is electronically generated and legally binding.', { align: 'center' });
        doc.text(`Generated on: ${new Date().toISOString().split('T')[0]}`, { align: 'center' });

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
