import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import {
  UploadFileDto,
  UploadFileSuccessResponseDto,
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
    return this.filesService.uploadDocument(file, uploadDto.description);
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
}
