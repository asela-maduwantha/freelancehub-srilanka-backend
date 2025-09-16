// src/modules/proposals/dto/update-proposal.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateProposalDto } from './create-proposal.dto';

export class UpdateProposalDto extends PartialType(CreateProposalDto) {}