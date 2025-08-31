import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Contract, ContractSchema } from '../contracts/schemas/contract.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Dispute, DisputeSchema } from '../disputes/schemas/dispute.schema';
import { Review, ReviewSchema } from '../reviews/schemas/review.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Dispute.name, schema: DisputeSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
