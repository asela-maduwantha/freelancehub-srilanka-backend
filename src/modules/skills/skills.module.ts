import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { Skill, SkillSchema } from '../../database/schemas/skill.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // Auth module for JWT services and guards
    AuthModule,

    // Mongoose models
    MongooseModule.forFeature([
      { name: Skill.name, schema: SkillSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
