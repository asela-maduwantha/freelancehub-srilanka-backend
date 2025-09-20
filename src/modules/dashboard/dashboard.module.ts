import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

// Import AuthModule for JWT services
import { AuthModule } from '../auth/auth.module';

// Schemas
import { Job, JobSchema } from '../../database/schemas/job.schema';
import { Proposal, ProposalSchema } from '../../database/schemas/proposal.schema';
import { Contract, ContractSchema } from '../../database/schemas/contract.schema';
import { Payment, PaymentSchema } from '../../database/schemas/payment.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Review, ReviewSchema } from '../../database/schemas/review.schema';

@Module({
  imports: [
    // Auth module for JWT services
    AuthModule,
    
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: Proposal.name, schema: ProposalSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: User.name, schema: UserSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}