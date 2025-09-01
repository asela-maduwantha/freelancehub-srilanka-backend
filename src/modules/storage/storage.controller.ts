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
import { UploadResponseDto, UploadMultipleResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('storage')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload/single')
  @ApiOperation({ summary: 'Upload a single file to Azure Blob Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (image, PDF, etc.)',
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.path) {
      throw new BadRequestException('File upload failed - no file path');
    }

    try {
      const url = await this.storageService.uploadFile(file, folder || 'general');

      return {
        success: true,
        message: 'File uploaded successfully',
        data: {
          url,
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'File upload failed');
    }
  }

  @Post('upload/multiple')
  @ApiOperation({ summary: 'Upload multiple files to Azure Blob Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Files to upload',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload (images, PDFs, etc.)',
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
  @UseInterceptors(FilesInterceptor('files'))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ): Promise<UploadMultipleResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Validate each file
    for (const file of files) {
      if (!file || !file.path) {
        throw new BadRequestException('One or more files failed to upload');
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

      return {
        success: true,
        message: `${files.length} files uploaded successfully`,
        data: fileData,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'File upload failed');
    }
  }
}
