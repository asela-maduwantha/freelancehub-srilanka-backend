import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { PdfService } from './services/pdf.service';

@Module({
  imports: [ConfigModule],
  providers: [EmailService, PdfService],
  exports: [EmailService, PdfService],
})
export class CommonModule {}
