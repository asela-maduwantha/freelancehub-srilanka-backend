import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateSkillDto } from './create-skill.dto';

export class BatchCreateSkillDto {
  @ApiProperty({ type: [CreateSkillDto], description: 'Array of skills to create' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSkillDto)
  skills: CreateSkillDto[];
}
