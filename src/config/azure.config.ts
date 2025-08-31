import { registerAs } from '@nestjs/config';

export default registerAs('azure', () => ({
  storageAccountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
  storageAccountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
  containerName: process.env.AZURE_CONTAINER_NAME || 'freelancehub',
}));
