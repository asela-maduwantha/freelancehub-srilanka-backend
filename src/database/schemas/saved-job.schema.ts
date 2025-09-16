import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'saved_jobs',
})
export class SavedJob extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  freelancerId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Job' })
  jobId: Types.ObjectId;

  @Prop({ default: Date.now })
  savedAt: Date;
}

export const SavedJobSchema = SchemaFactory.createForClass(SavedJob);

// Create indexes
SavedJobSchema.index({ freelancerId: 1, jobId: 1 }, { unique: true });
SavedJobSchema.index({ freelancerId: 1 });
SavedJobSchema.index({ jobId: 1 });
