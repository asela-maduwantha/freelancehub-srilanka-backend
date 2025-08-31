import { Injectable } from '@nestjs/common';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;

  constructor(private configService: ConfigService) {
    const accountName = this.configService.get<string>('azure.storageAccountName');
    const accountKey = this.configService.get<string>('azure.storageAccountKey');
    const containerName = this.configService.get<string>('azure.containerName') || 'freelancehub';

    const accountUrl = `https://${accountName}.blob.core.windows.net`;
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`
    );

    this.containerClient = this.blobServiceClient.getContainerClient(containerName);
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'general'): Promise<string> {
    const fileName = `${folder}/${uuidv4()}-${file.originalname}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
      },
    });

    return blockBlobClient.url;
  }

  async uploadMultipleFiles(files: Express.Multer.File[], folder: string = 'general'): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, folder));
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

  async generateSasToken(fileName: string, expiresInMinutes: number = 60): Promise<string> {
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
