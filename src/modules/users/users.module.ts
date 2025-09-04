import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { UserAnalyticsService } from './services/user-analytics.service';
import { 
  User, 
  UserSchema,
  FreelancerProfile,
  FreelancerProfileSchema,
  ClientProfile,
  ClientProfileSchema,
  Otp,
  OtpSchema,
  Project,
  ProjectSchema,
  Contract,
  ContractSchema,
  Proposal,
  ProposalSchema,
  Payment,
  PaymentSchema
} from '../../schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: FreelancerProfile.name, schema: FreelancerProfileSchema },
      { name: ClientProfile.name, schema: ClientProfileSchema },
      { name: Otp.name, schema: OtpSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Proposal.name, schema: ProposalSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UserAnalyticsService],
  exports: [UsersService, UserAnalyticsService],
})
export class UsersModule {}
