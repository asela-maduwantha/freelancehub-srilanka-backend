import { ApiProperty } from '@nestjs/swagger';

export class UploadAvatarResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  avatarUrl: string;
}
