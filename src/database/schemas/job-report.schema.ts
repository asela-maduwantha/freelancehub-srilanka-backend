import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  FAKE_JOB = 'fake_job',
  DISCRIMINATION = 'discrimination',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

@Schema({
  timestamps: true,
  collection: 'job_reports',
})
export class JobReport extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  reporterId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Job' })
  jobId: Types.ObjectId;

  @Prop({ required: true, enum: ReportReason })
  reason: ReportReason;

  @Prop()
  description?: string;

  @Prop({ enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Prop()
  reviewedBy?: Types.ObjectId;

  @Prop()
  reviewedAt?: Date;

  @Prop()
  resolution?: string;

  @Prop({ default: Date.now })
  reportedAt: Date;
}

export const JobReportSchema = SchemaFactory.createForClass(JobReport);

// Create indexes
JobReportSchema.index({ reporterId: 1, jobId: 1 }, { unique: true });
JobReportSchema.index({ jobId: 1 });
JobReportSchema.index({ status: 1 });
JobReportSchema.index({ reportedAt: -1 });
