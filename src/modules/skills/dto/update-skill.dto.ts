import { PartialType } from '@nestjs/swagger';
import { CreateSkillDto } from './create-skill.dto';
import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSkillDto extends PartialType(CreateSkillDto) {
  @ApiProperty({
    description: 'Popularity score of the skill',
    example: 100,
    required: false,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  popularity?: number;
}
