import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StorageService } from './services/storage.service';
import { UploadResponseDto, UploadMultipleResponseDto, FileDataDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimit } from '../../common/guards/rate-limit.guard';

@ApiTags('storage')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('files')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload/single')
  @RateLimit({ requests: 20, windowMs: 300000 }) // 20 uploads per 5 minutes
  @ApiOperation({ summary: 'Upload a single file to Azure Blob Storage with enhanced security' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (image, PDF, etc.) - Max 10MB',
        },
        folder: {
          type: 'string',
          example: 'contracts',
          description: 'Folder name in blob container (optional)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: UploadResponseDto,
  })
  @UseInterceptors(FileInterceptor('file', {
    limits: { 
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 1,
    },
    fileFilter: (req, file, cb) => {
      // Enhanced file type validation
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
      const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/zip', 'application/x-rar-compressed'
      ];
      
      const extname = allowedTypes.test(file.originalname.toLowerCase());
      const mimetype = allowedMimeTypes.includes(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        return cb(new Error('Invalid file type. Allowed: jpeg, jpg, png, gif, pdf, doc, docx, txt, zip, rar'), false);
      }
    }
  }))
  async uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ): Promise<FileDataDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Additional file validation
    if (file.size === 0) {
      throw new BadRequestException('Empty file not allowed');
    }

    if (!file.path) {
      throw new BadRequestException('File upload failed - no file path');
    }

    try {
      const url = await this.storageService.uploadFile(file, folder || 'general');

      return {
        url,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'File upload failed');
    }
  }

  @Post('upload/multiple')
  @RateLimit({ requests: 10, windowMs: 300000 }) // 10 multi-uploads per 5 minutes
  @ApiOperation({ summary: 'Upload multiple files to Azure Blob Storage with enhanced security' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Files to upload (max 5 files)',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload (max 5 files, 10MB each)',
        },
        folder: {
          type: 'string',
          example: 'contracts',
          description: 'Folder name in blob container (optional)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
    type: UploadMultipleResponseDto,
  })
  @UseInterceptors(FilesInterceptor('files', 5, {
    limits: { 
      fileSize: 10 * 1024 * 1024, // 10MB per file
      files: 5,
    },
    fileFilter: (req, file, cb) => {
      // Enhanced file type validation
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
      const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/zip', 'application/x-rar-compressed'
      ];
      
      const extname = allowedTypes.test(file.originalname.toLowerCase());
      const mimetype = allowedMimeTypes.includes(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        return cb(new Error('Invalid file type. Allowed: jpeg, jpg, png, gif, pdf, doc, docx, txt, zip, rar'), false);
      }
    }
  }))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ): Promise<Array<{ url: string; fileName: string; mimeType: string; size: number }>> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Enhanced validation for multiple files
    if (files.length > 5) {
      throw new BadRequestException('Maximum 5 files allowed per upload');
    }

    // Validate each file
    for (const file of files) {
      if (!file || !file.path) {
        throw new BadRequestException('Invalid file in upload');
      }
      
      if (file.size === 0) {
        throw new BadRequestException(`Empty file not allowed: ${file.originalname}`);
      }
      
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestException(`File too large: ${file.originalname} (max 10MB)`);
      }
    }

    try {
      const urls = await this.storageService.uploadMultipleFiles(files, folder || 'general');

      const fileData = files.map((file, index) => ({
        url: urls[index],
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      }));

      return fileData;
    } catch (error) {
      throw new BadRequestException(error.message || 'File upload failed');
    }
  }
}
