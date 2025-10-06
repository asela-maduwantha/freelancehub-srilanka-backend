import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpStatus,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import {
  UploadFileDto,
  UploadFileSuccessResponseDto,
  ListFilesDto,
  FileListResponseDto,
  FileResponseDto,
  UpdateFileMetadataDto,
  DownloadUrlResponseDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a document file',
    description: 'Upload documents like deliverables for milestones. Supports PDF, DOC, DOCX, TXT, ZIP, and image files up to 10MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Document file and optional metadata',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, DOC, DOCX, TXT, ZIP, images)',
        },
        description: {
          type: 'string',
          description: 'Optional description for the file',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File uploaded successfully',
    type: UploadFileSuccessResponseDto,
    schema: {
      example: {
        success: true,
        message: 'File uploaded successfully',
        data: {
          filename: 'milestone-deliverable.pdf',
          url: 'https://yourstorageaccount.blob.core.windows.net/documents/1234567890-abc123.pdf',
          size: 2048576,
          type: 'application/pdf',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or validation error',
    schema: {
      example: {
        statusCode: 400,
        message: 'File size exceeds the maximum limit of 10MB',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error during file upload',
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: Pick<UploadFileDto, 'description'>,
    @CurrentUser('id') userId: string,
  ): Promise<UploadFileSuccessResponseDto> {
    return this.filesService.uploadDocument(file, userId, uploadDto.description);
  }

  @Get('supported-types')
  @ApiOperation({
    summary: 'Get supported file types',
    description: 'Returns a list of supported MIME types for file uploads',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of supported file types',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Supported file types retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            supportedTypes: {
              type: 'array',
              items: { type: 'string' },
              example: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'application/zip',
                'image/jpeg',
                'image/png',
              ],
            },
            maxFileSize: { type: 'number', example: 10485760 },
            maxFileSizeMB: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  async getSupportedFileTypes() {
    const supportedTypes = this.filesService.getSupportedFileTypes();
    const maxFileSize = this.filesService.getMaxFileSize();

    return {
      success: true,
      message: 'Supported file types retrieved successfully',
      data: {
        supportedTypes,
        maxFileSize,
        maxFileSizeMB: Math.round(maxFileSize / (1024 * 1024)),
      },
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List user files',
    description: 'Get a list of files uploaded by the user with filtering and pagination',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Files retrieved successfully',
    type: FileListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async listFiles(
    @CurrentUser('id') userId: string,
    @Query() dto: ListFilesDto,
  ): Promise<FileListResponseDto> {
    return this.filesService.listFiles(userId, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get file by ID',
    description: 'Retrieve detailed information about a specific file',
  })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File retrieved successfully',
    type: FileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to this file',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getFileById(
    @Param('id') fileId: string,
    @CurrentUser('id') userId: string,
  ): Promise<FileResponseDto> {
    return this.filesService.getFileById(fileId, userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete file',
    description: 'Soft delete a file (or permanently delete from storage)',
  })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiQuery({
    name: 'hardDelete',
    required: false,
    type: Boolean,
    description: 'Whether to permanently delete from Azure Blob Storage',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File deleted successfully',
    type: FileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Permission denied',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async deleteFile(
    @Param('id') fileId: string,
    @CurrentUser('id') userId: string,
    @Query('hardDelete') hardDelete?: boolean,
  ): Promise<FileResponseDto> {
    return this.filesService.deleteFile(fileId, userId, hardDelete);
  }

  @Get(':id/download-url')
  @ApiOperation({
    summary: 'Get download URL',
    description: 'Generate a presigned URL for downloading the file',
  })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiQuery({
    name: 'expiresInMinutes',
    required: false,
    type: Number,
    description: 'URL expiration time in minutes (default 60)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download URL generated successfully',
    type: DownloadUrlResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getDownloadUrl(
    @Param('id') fileId: string,
    @CurrentUser('id') userId: string,
    @Query('expiresInMinutes') expiresInMinutes?: number,
  ): Promise<DownloadUrlResponseDto> {
    return this.filesService.getDownloadUrl(fileId, userId, expiresInMinutes);
  }

  @Put(':id/metadata')
  @ApiOperation({
    summary: 'Update file metadata',
    description: 'Update file description and file type',
  })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiBody({ type: UpdateFileMetadataDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File metadata updated successfully',
    type: FileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Permission denied',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async updateFileMetadata(
    @Param('id') fileId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateFileMetadataDto,
  ): Promise<FileResponseDto> {
    return this.filesService.updateFileMetadata(fileId, userId, dto);
  }
}
