import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Skill {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Category' })
  categoryId: Types.ObjectId;

  @Prop()
  description: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  popularity: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export type SkillDocument = Skill & Document;
export const SkillSchema = SchemaFactory.createForClass(Skill);

// Indexes
SkillSchema.index({ name: 1 });
SkillSchema.index({ categoryId: 1 });
SkillSchema.index({ isActive: 1 });
SkillSchema.index({ popularity: -1 });
