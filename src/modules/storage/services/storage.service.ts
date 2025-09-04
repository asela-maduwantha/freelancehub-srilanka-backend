import { Injectable } from '@nestjs/common';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;

  constructor(private configService: ConfigService) {
    const accountName = this.configService.get<string>(
      'azure.storageAccountName',
    );
    const accountKey = this.configService.get<string>(
      'azure.storageAccountKey',
    );
    const containerName =
      this.configService.get<string>('azure.containerName') || 'freelancehub';

    const accountUrl = `https://${accountName}.blob.core.windows.net`;
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`,
    );

    this.containerClient =
      this.blobServiceClient.getContainerClient(containerName);
    this.ensureContainerExists();

    // Ensure uploads directory exists
    if (!fs.existsSync('./uploads')) {
      fs.mkdirSync('./uploads', { recursive: true });
    }
  }

  private async ensureContainerExists(): Promise<void> {
    try {
      const exists = await this.containerClient.exists();
      if (!exists) {
        await this.containerClient.create({ access: 'blob' });
      }
    } catch (error) {
      console.error('Error ensuring container exists:', error);
    }
  }

  private validateFileType(mimeType: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
    ];
    return allowedTypes.includes(mimeType);
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<string> {
    if (!file || !file.path) {
      throw new Error('Invalid file provided');
    }

    if (!this.validateFileType(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    const fileName = `${folder}/${uuidv4()}-${file.originalname}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);

    try {
      // Read file from disk since we're using dest storage
      const filePath = path.resolve(file.path);
      const fileBuffer = fs.readFileSync(filePath);

      await blockBlobClient.uploadData(fileBuffer, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
        },
      });

      // Clean up the temporary file
      fs.unlinkSync(filePath);

      return blockBlobClient.url;
    } catch (error) {
      // Clean up the temporary file in case of error
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'general',
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const urlParts = fileUrl.split('/');
    const fileName = urlParts.slice(-2).join('/'); // Get folder/filename
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);

    await blockBlobClient.deleteIfExists();
  }

  async getFileUrl(fileName: string): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
    return blockBlobClient.url;
  }

  async generateSasToken(
    fileName: string,
    expiresInMinutes: number = 60,
  ): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);

    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + expiresInMinutes);

    const sasToken = await blockBlobClient.generateSasUrl({
      expiresOn,
      permissions: {
        read: true,
        write: false,
        delete: false,
        add: false,
        create: false,
        update: false,
        process: false,
        deleteVersion: false,
        permanentDelete: false,
        list: false,
        filter: false,
        setImmutabilityPolicy: false,
        permanentDeleteVersion: false,
        tag: false,
        move: false,
        execute: false,
        setExpiry: false,
        setLegalHold: false,
        setPolicy: false,
        getStatus: false,
        getAccountInfo: false,
        getMetadata: false,
        getTags: false,
        getUserDelegationKey: false,
        setMetadata: false,
        setTags: false,
        getBlobTags: false,
        setBlobTags: false,
        getBlobMetadata: false,
        setBlobMetadata: false,
        getBlobProperties: false,
        setBlobProperties: false,
        getBlobAccessPolicy: false,
        setBlobAccessPolicy: false,
        getContainerProperties: false,
        getContainerMetadata: false,
        setContainerMetadata: false,
        getContainerAccessPolicy: false,
        setContainerAccessPolicy: false,
        listBlob: false,
        getBlob: false,
        getAccountInfoForBlob: false,
      } as any,
    });

    return sasToken;
  }

  async getContainerInfo() {
    const properties = await this.containerClient.getProperties();
    return {
      name: this.containerClient.containerName,
      properties,
    };
  }
}
