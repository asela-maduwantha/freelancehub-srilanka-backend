import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobServiceClient,
  BlockBlobClient,
  ContainerClient,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

export interface UploadResult {
  url: string;
  blobName: string;
  containerName: string;
  size: number;
  contentType: string;
}

export interface UploadOptions {
  containerName?: string;
  contentType?: string;
  metadata?: { [key: string]: string };
}

@Injectable()
export class AzureBlobService {
  private readonly logger = new Logger(AzureBlobService.name);
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;

  constructor(private readonly configService: ConfigService) {
    this.initializeBlobService();
  }

  private initializeBlobService(): void {
    const connectionString = this.configService.get<string>('azure.storage.connectionString');
    const accountName = this.configService.get<string>('azure.storage.accountName');
    const accountKey = this.configService.get<string>('azure.storage.accountKey');
    const containerName = this.configService.get<string>('azure.storage.containerName');

    if (!containerName) {
      this.logger.warn('Azure Storage container name is not configured. File upload functionality will be disabled.');
      return;
    }

    if (!connectionString && (!accountName || !accountKey)) {
      this.logger.warn('Azure Storage configuration is incomplete. Please provide either connection string or account name/key. File upload functionality will be disabled.');
      return;
    }

    try {
      if (connectionString && connectionString.trim() !== '') {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      } else if (accountName && accountKey) {
        const accountUrl = `https://${accountName}.blob.core.windows.net`;
        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
        this.blobServiceClient = new BlobServiceClient(accountUrl, sharedKeyCredential);
      } else {
        this.logger.warn('Azure Storage configuration is incomplete. File upload functionality will be disabled.');
        return;
      }

      this.containerClient = this.blobServiceClient.getContainerClient(containerName);
      this.logger.log('Azure Blob Storage service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Azure Blob Storage service:', error);
      this.logger.warn('File upload functionality will be disabled due to configuration errors.');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage is not properly configured. Please check your Azure configuration.');
    }

    try {
      const containerName = options.containerName || this.configService.get<string>('azure.storage.containerName');
      if (!containerName) {
        throw new Error('Container name is required for file upload.');
      }
      const containerClient = this.blobServiceClient.getContainerClient(containerName as string);

      // Ensure container exists
      await this.ensureContainerExists(containerName as string);

      // Generate unique blob name
      const blobName = this.generateBlobName(file.originalname);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Upload options
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: options.contentType || file.mimetype,
        },
        metadata: options.metadata || {},
      };

      // Upload the file
      const uploadResponse = await blockBlobClient.upload(file.buffer, file.size, uploadOptions);

      if (uploadResponse.errorCode) {
        throw new Error(`Upload failed: ${uploadResponse.errorCode}`);
      }

      this.logger.log(`File uploaded successfully: ${blobName}`);

      return {
        url: blockBlobClient.url,
        blobName,
        containerName: containerName as string,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error) {
      this.logger.error('File upload failed:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async uploadFromBuffer(
    buffer: Buffer,
    filename: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    if (!this.blobServiceClient) {
      throw new Error('Azure Blob Storage is not properly configured. Please check your Azure configuration.');
    }

    try {
      const containerName = options.containerName || this.configService.get<string>('azure.storage.containerName');
      if (!containerName) {
        throw new Error('Container name is required for buffer upload.');
      }
      const containerClient = this.blobServiceClient.getContainerClient(containerName as string);

      // Ensure container exists
      await this.ensureContainerExists(containerName as string);

      // Generate unique blob name
      const blobName = this.generateBlobName(filename);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Upload options
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: options.contentType || this.getContentTypeFromFilename(filename),
        },
        metadata: options.metadata || {},
      };

      // Upload the buffer
      const uploadResponse = await blockBlobClient.upload(buffer, buffer.length, uploadOptions);

      if (uploadResponse.errorCode) {
        throw new Error(`Upload failed: ${uploadResponse.errorCode}`);
      }

      this.logger.log(`Buffer uploaded successfully: ${blobName}`);

      return {
        url: blockBlobClient.url,
        blobName,
        containerName: containerName as string,
        size: buffer.length,
        contentType: uploadOptions.blobHTTPHeaders.blobContentType,
      };
    } catch (error) {
      this.logger.error('Buffer upload failed:', error);
      throw new Error(`Failed to upload buffer: ${error.message}`);
    }
  }

  async deleteFile(blobName: string, containerName?: string): Promise<void> {
    try {
      const container = containerName || this.configService.get<string>('azure.storage.containerName');
      if (!container) {
        throw new Error('Container name is required for file deletion.');
      }
      const containerClient = this.blobServiceClient.getContainerClient(container as string);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const deleteResponse = await blockBlobClient.deleteIfExists();

      if (deleteResponse.succeeded) {
        this.logger.log(`File deleted successfully: ${blobName}`);
      } else {
        this.logger.warn(`File not found for deletion: ${blobName}`);
      }
    } catch (error) {
      this.logger.error('File deletion failed:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async getFileUrl(blobName: string, containerName?: string, expiresInMinutes: number = 60): Promise<string> {
    try {
      const container = containerName || this.configService.get<string>('azure.storage.containerName');
      if (!container) {
        throw new Error('Container name is required for file URL generation.');
      }
      const containerClient = this.blobServiceClient.getContainerClient(container as string);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Generate SAS token for temporary access
      const sasToken = await this.generateSasToken(blobName, container as string, expiresInMinutes);

      return `${blockBlobClient.url}?${sasToken}`;
    } catch (error) {
      this.logger.error('Failed to generate file URL:', error);
      throw new Error(`Failed to generate file URL: ${error.message}`);
    }
  }

  private async ensureContainerExists(containerName: string): Promise<void> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists({
        access: 'blob', // Public read access for blobs
      });
    } catch (error) {
      this.logger.error(`Failed to create container ${containerName}:`, error);
      throw new Error(`Failed to create container: ${error.message}`);
    }
  }

  private generateBlobName(originalFilename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalFilename.split('.').pop();
    return `${timestamp}-${random}.${extension}`;
  }

  private getContentTypeFromFilename(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    const contentTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'zip': 'application/zip',
    };

    return extension ? contentTypes[extension] || 'application/octet-stream' : 'application/octet-stream';
  }

  private async generateSasToken(blobName: string, containerName: string, expiresInMinutes: number): Promise<string> {
    // Note: This is a simplified implementation
    // In production, you should use the @azure/storage-blob library's SAS token generation
    // For now, returning the blob URL without SAS token
    // TODO: Implement proper SAS token generation for secure access
    return '';
  }

  async getContainerInfo(containerName?: string): Promise<any> {
    try {
      const container = containerName || this.configService.get<string>('azure.storage.containerName');
      if (!container) {
        throw new Error('Container name is required for container info.');
      }
      const containerClient = this.blobServiceClient.getContainerClient(container as string);

      const properties = await containerClient.getProperties();
      return {
        name: container,
        lastModified: properties.lastModified,
        etag: properties.etag,
        leaseState: properties.leaseState,
        leaseStatus: properties.leaseStatus,
      };
    } catch (error) {
      this.logger.error('Failed to get container info:', error);
      throw new Error(`Failed to get container info: ${error.message}`);
    }
  }
}