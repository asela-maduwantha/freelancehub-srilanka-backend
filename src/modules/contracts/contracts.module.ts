import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Contract,
  ContractSchema,
} from '../../database/schemas/contract.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Proposal, ProposalSchema } from '../../database/schemas/proposal.schema';
import { PdfModule } from '../../services/pdf/pdf.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: User.name, schema: UserSchema },
      { name: Proposal.name, schema: ProposalSchema },
    ]),
    PdfModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class ContractsModule {}
