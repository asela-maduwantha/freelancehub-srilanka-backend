import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AzureBlobService } from '../../services/azure/azure-blob.service';
import { 
  FileUploadResponseDto, 
  UploadFileSuccessResponseDto,
  ListFilesDto,
  FileListResponseDto,
  FileResponseDto,
  UpdateFileMetadataDto,
  DownloadUrlResponseDto,
  FileMetadataDto,
} from './dto';
import { File } from '../../database/schemas/file.schema';

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

  constructor(
    private readonly azureBlobService: AzureBlobService,
    @InjectModel(File.name) private fileModel: Model<File>,
  ) {}

  /**
   * Upload a document file to Azure Blob Storage and save to database
   * @param file - The uploaded file
   * @param userId - ID of the user uploading the file
   * @param description - Optional description for the file
   * @param fileType - Type of file (document, avatar, portfolio, etc.)
   * @param contractId - Optional contract ID
   * @param milestoneId - Optional milestone ID
   * @param disputeId - Optional dispute ID
   * @returns Promise<UploadFileSuccessResponseDto>
   */
  async uploadDocument(
    file: Express.Multer.File,
    userId: string,
    description?: string,
    fileType: string = 'document',
    contractId?: string,
    milestoneId?: string,
    disputeId?: string,
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
          fileType,
          userId,
        },
      });

      // Save file record to database
      const fileRecord = await this.fileModel.create({
        filename: uploadResult.blobName,
        originalName: file.originalname,
        url: uploadResult.url,
        blobName: uploadResult.blobName,
        containerName: 'documents',
        size: file.size,
        mimeType: file.mimetype,
        uploadedBy: new Types.ObjectId(userId),
        fileType,
        description: description || '',
        contractId: contractId ? new Types.ObjectId(contractId) : undefined,
        milestoneId: milestoneId ? new Types.ObjectId(milestoneId) : undefined,
        disputeId: disputeId ? new Types.ObjectId(disputeId) : undefined,
        isDeleted: false,
      });

      // Format response according to required structure
      const responseData: FileUploadResponseDto = {
        filename: file.originalname,
        url: uploadResult.url,
        size: file.size,
        type: file.mimetype,
        fileId: (fileRecord._id as Types.ObjectId).toString(),
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

  /**
   * List files with filtering, pagination, and sorting
   * @param userId - ID of the user
   * @param dto - Query parameters
   * @returns Promise<FileListResponseDto>
   */
  async listFiles(userId: string, dto: ListFilesDto): Promise<FileListResponseDto> {
    try {
      const { 
        fileType, 
        contractId, 
        milestoneId, 
        page = 1, 
        limit = 20, 
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = dto;

      // Build filter query
      const filter: any = {
        uploadedBy: new Types.ObjectId(userId),
        isDeleted: false,
      };

      if (fileType) {
        filter.fileType = fileType;
      }

      if (contractId) {
        filter.contractId = new Types.ObjectId(contractId);
      }

      if (milestoneId) {
        filter.milestoneId = new Types.ObjectId(milestoneId);
      }

      // Calculate pagination
      const skip = (page - 1) * limit;
      const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      // Execute query
      const [files, total] = await Promise.all([
        this.fileModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('uploadedBy', 'firstName lastName email')
          .lean(),
        this.fileModel.countDocuments(filter),
      ]);

      // Transform to DTOs
      const filesDtos: FileMetadataDto[] = files.map((file: any) => ({
        id: file._id.toString(),
        filename: file.filename,
        originalName: file.originalName,
        url: file.url,
        size: file.size,
        mimeType: file.mimeType,
        fileType: file.fileType,
        description: file.description,
        contractId: file.contractId?.toString(),
        milestoneId: file.milestoneId?.toString(),
        disputeId: file.disputeId?.toString(),
        uploadedBy: file.uploadedBy._id.toString(),
        uploadedByName: `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}`,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      }));

      return {
        success: true,
        message: 'Files retrieved successfully',
        data: {
          files: filesDtos,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: skip + limit < total,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to list files for user ${userId}:`, error);
      throw new BadRequestException(`Failed to retrieve files: ${error.message}`);
    }
  }

  /**
   * Get file by ID
   * @param fileId - File ID
   * @param userId - ID of the user requesting the file
   * @returns Promise<FileResponseDto>
   */
  async getFileById(fileId: string, userId: string): Promise<FileResponseDto> {
    try {
      const file = await this.fileModel
        .findOne({
          _id: new Types.ObjectId(fileId),
          isDeleted: false,
        })
        .populate('uploadedBy', 'firstName lastName email')
        .lean();

      if (!file) {
        throw new NotFoundException('File not found');
      }

      // Check access (user must be uploader or have access via contract/milestone/dispute)
      const fileUploadedBy = (file.uploadedBy as any)._id.toString();
      if (fileUploadedBy !== userId) {
        // TODO: Add more sophisticated access control based on contract/milestone/dispute
        throw new ForbiddenException('You do not have access to this file');
      }

      const fileDto: FileMetadataDto = {
        id: (file._id as Types.ObjectId).toString(),
        filename: file.filename,
        originalName: file.originalName,
        url: file.url,
        size: file.size,
        mimeType: file.mimeType,
        fileType: file.fileType,
        description: file.description,
        contractId: file.contractId?.toString(),
        milestoneId: file.milestoneId?.toString(),
        disputeId: file.disputeId?.toString(),
        uploadedBy: fileUploadedBy,
        uploadedByName: `${(file.uploadedBy as any).firstName} ${(file.uploadedBy as any).lastName}`,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      };

      return {
        success: true,
        message: 'File retrieved successfully',
        data: fileDto,
      };
    } catch (error) {
      this.logger.error(`Failed to get file ${fileId}:`, error);
      
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException(`Failed to retrieve file: ${error.message}`);
    }
  }

  /**
   * Delete file (soft delete)
   * @param fileId - File ID
   * @param userId - ID of the user deleting the file
   * @param hardDelete - Whether to delete from Azure Blob Storage
   * @returns Promise<FileResponseDto>
   */
  async deleteFile(
    fileId: string, 
    userId: string, 
    hardDelete: boolean = false
  ): Promise<FileResponseDto> {
    try {
      const file = await this.fileModel.findOne({
        _id: new Types.ObjectId(fileId),
        isDeleted: false,
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      // Check if user owns the file
      if (file.uploadedBy.toString() !== userId) {
        throw new ForbiddenException('You do not have permission to delete this file');
      }

      // Soft delete
      file.isDeleted = true;
      file.deletedAt = new Date();
      file.deletedBy = new Types.ObjectId(userId);
      await file.save();

      // Hard delete from Azure Blob if requested
      if (hardDelete && file.blobName && file.containerName) {
        try {
          await this.azureBlobService.deleteFile(file.blobName, file.containerName);
          this.logger.log(`File deleted from Azure Blob: ${file.blobName}`);
        } catch (error) {
          this.logger.warn(`Failed to delete file from Azure Blob: ${error.message}`);
          // Continue even if blob deletion fails
        }
      }

      return {
        success: true,
        message: 'File deleted successfully',
        data: {
          id: (file._id as Types.ObjectId).toString(),
          filename: file.filename,
          originalName: file.originalName,
          url: file.url,
          size: file.size,
          mimeType: file.mimeType,
          fileType: file.fileType,
          description: file.description,
          uploadedBy: file.uploadedBy.toString(),
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileId}:`, error);
      
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get presigned download URL for file
   * @param fileId - File ID
   * @param userId - ID of the user requesting the URL
   * @param expiresInMinutes - URL expiration time in minutes (default 60)
   * @returns Promise<DownloadUrlResponseDto>
   */
  async getDownloadUrl(
    fileId: string, 
    userId: string, 
    expiresInMinutes: number = 60
  ): Promise<DownloadUrlResponseDto> {
    try {
      const file = await this.fileModel.findOne({
        _id: new Types.ObjectId(fileId),
        isDeleted: false,
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      // Check access
      if (file.uploadedBy.toString() !== userId) {
        // TODO: Add more sophisticated access control
        throw new ForbiddenException('You do not have access to this file');
      }

      // Generate presigned URL (if supported by Azure Blob Service)
      // For now, return the existing URL (Azure Blob URLs are publicly accessible by default)
      // In production, you should implement SAS tokens for secure access
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

      return {
        success: true,
        message: 'Download URL generated successfully',
        data: {
          url: file.url,
          expiresAt,
          filename: file.originalName,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to generate download URL for file ${fileId}:`, error);
      
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException(`Failed to generate download URL: ${error.message}`);
    }
  }

  /**
   * Update file metadata
   * @param fileId - File ID
   * @param userId - ID of the user updating the file
   * @param dto - Update data
   * @returns Promise<FileResponseDto>
   */
  async updateFileMetadata(
    fileId: string, 
    userId: string, 
    dto: UpdateFileMetadataDto
  ): Promise<FileResponseDto> {
    try {
      const file = await this.fileModel.findOne({
        _id: new Types.ObjectId(fileId),
        isDeleted: false,
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      // Check if user owns the file
      if (file.uploadedBy.toString() !== userId) {
        throw new ForbiddenException('You do not have permission to update this file');
      }

      // Update metadata
      if (dto.description !== undefined) {
        file.description = dto.description;
      }

      if (dto.fileType) {
        file.fileType = dto.fileType;
      }

      await file.save();

      return {
        success: true,
        message: 'File metadata updated successfully',
        data: {
          id: (file._id as Types.ObjectId).toString(),
          filename: file.filename,
          originalName: file.originalName,
          url: file.url,
          size: file.size,
          mimeType: file.mimeType,
          fileType: file.fileType,
          description: file.description,
          uploadedBy: file.uploadedBy.toString(),
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to update file ${fileId}:`, error);
      
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException(`Failed to update file: ${error.message}`);
    }
  }
}
