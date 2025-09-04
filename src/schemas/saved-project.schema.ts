import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class SavedProject {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Project' })
  projectId: Types.ObjectId;

  @Prop({ default: Date.now })
  savedAt: Date;
}

export type SavedProjectDocument = SavedProject & Document;
export const SavedProjectSchema = SchemaFactory.createForClass(SavedProject);

// Indexes
SavedProjectSchema.index({ userId: 1 });
SavedProjectSchema.index({ projectId: 1 });
SavedProjectSchema.index({ userId: 1, projectId: 1 }, { unique: true });
SavedProjectSchema.index({ savedAt: -1 });
