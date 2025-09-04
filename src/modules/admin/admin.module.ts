import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { Project, ProjectSchema } from '../../schemas/project.schema';
import { Contract, ContractSchema } from '../../schemas/contract.schema';
import { Payment, PaymentSchema } from '../../schemas/payment.schema';
import { Dispute, DisputeSchema } from '../../schemas/dispute.schema';
import { Review, ReviewSchema } from '../../schemas/review.schema';

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
