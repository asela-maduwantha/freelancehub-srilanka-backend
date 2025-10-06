import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Job, JobSchema } from '../../database/schemas/job.schema';
import { Contract, ContractSchema } from '../../database/schemas/contract.schema';
import { Proposal, ProposalSchema } from '../../database/schemas/proposal.schema';
import { Payment, PaymentSchema } from '../../database/schemas/payment.schema';
import { Withdrawal, WithdrawalSchema } from '../../database/schemas/withdrawal.schema';
import { Review, ReviewSchema } from '../../database/schemas/review.schema';
import { Dispute, DisputeSchema } from '../../database/schemas/dispute.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Job.name, schema: JobSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Proposal.name, schema: ProposalSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Withdrawal.name, schema: WithdrawalSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Dispute.name, schema: DisputeSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
