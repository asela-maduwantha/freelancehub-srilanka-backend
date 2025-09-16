import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddSkillsDto {
  @ApiProperty({
    description: 'Array of skills to add',
    example: ['JavaScript', 'React', 'Node.js'],
  })
  @IsNotEmpty()
  @IsString({ each: true })
  skills: string[];
}
