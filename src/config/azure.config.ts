import { registerAs } from '@nestjs/config';

export default registerAs('azure', () => ({
  storage: {
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME,
    blobServiceUrl: process.env.AZURE_STORAGE_BLOB_SERVICE_URL,
  },
}));