import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Contract } from '../../database/schemas/contract.schema';

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
      if (contract.estimatedHours) {
        doc.text(`Estimated Hours: ${contract.estimatedHours}`);
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
