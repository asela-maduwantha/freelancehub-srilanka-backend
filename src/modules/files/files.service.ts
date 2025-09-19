import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AzureBlobService } from '../../services/azure/azure-blob.service';
import { FileUploadResponseDto, UploadFileSuccessResponseDto } from './dto';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  // Allowed file types for document uploads
  private readonly allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream', // For some zip files
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
  ];

  // Maximum file size: 10MB
  private readonly maxFileSize = 10 * 1024 * 1024;

  constructor(private readonly azureBlobService: AzureBlobService) {}

  /**
   * Upload a document file to Azure Blob Storage
   * @param file - The uploaded file
   * @param description - Optional description for the file
   * @returns Promise<UploadFileSuccessResponseDto>
   */
  async uploadDocument(
    file: Express.Multer.File,
    description?: string,
  ): Promise<UploadFileSuccessResponseDto> {
    try {
      // Validate file
      this.validateFile(file);

      this.logger.log(`Uploading file: ${file.originalname}, size: ${file.size} bytes`);

      // Upload to Azure Blob Storage with metadata
      const uploadResult = await this.azureBlobService.uploadFile(file, {
        containerName: 'documents', // Use a dedicated container for documents
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          description: description || '',
          fileType: 'document',
        },
      });

      // Format response according to required structure
      const responseData: FileUploadResponseDto = {
        filename: file.originalname,
        url: uploadResult.url,
        size: file.size,
        type: file.mimetype,
      };

      this.logger.log(`File uploaded successfully: ${file.originalname} -> ${uploadResult.blobName}`);

      return {
        success: true,
        message: 'File uploaded successfully',
        data: responseData,
      };
    } catch (error) {
      this.logger.error(`File upload failed for ${file.originalname}:`, error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Validate uploaded file against business rules
   * @param file - The file to validate
   * @throws BadRequestException if validation fails
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds the maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    // Check file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Supported types: PDF, DOC, DOCX, TXT, ZIP, and images`,
      );
    }

    // Check if file has content
    if (file.size === 0) {
      throw new BadRequestException('Empty files are not allowed');
    }

    // Validate filename
    if (!file.originalname || file.originalname.trim().length === 0) {
      throw new BadRequestException('File must have a valid filename');
    }

    // Check for potentially dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif'];
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    
    if (fileExtension && dangerousExtensions.includes(`.${fileExtension}`)) {
      throw new BadRequestException('File type not allowed for security reasons');
    }
  }

  /**
   * Get supported file types for client-side validation
   * @returns Array of supported MIME types
   */
  getSupportedFileTypes(): string[] {
    return [...this.allowedMimeTypes];
  }

  /**
   * Get maximum file size limit
   * @returns Maximum file size in bytes
   */
  getMaxFileSize(): number {
    return this.maxFileSize;
  }
}
