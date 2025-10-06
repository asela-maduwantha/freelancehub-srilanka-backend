import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'files',
})
export class File extends Document {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  blobName: string;

  @Prop({ required: true })
  containerName: string;

  @Prop({ required: true, min: 0 })
  size: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  uploadedBy: Types.ObjectId;

  @Prop({ 
    required: true, 
    enum: ['avatar', 'document', 'portfolio', 'evidence', 'milestone_deliverable', 'other'],
    default: 'document'
  })
  fileType: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Contract' })
  contractId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Milestone' })
  milestoneId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Dispute' })
  disputeId?: Types.ObjectId;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop()
  deletedBy?: Types.ObjectId;

  @Prop()
  expiresAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const FileSchema = SchemaFactory.createForClass(File);

// Create indexes
FileSchema.index({ uploadedBy: 1, createdAt: -1 });
FileSchema.index({ contractId: 1 }, { sparse: true });
FileSchema.index({ milestoneId: 1 }, { sparse: true });
FileSchema.index({ disputeId: 1 }, { sparse: true });
FileSchema.index({ fileType: 1 });
FileSchema.index({ isDeleted: 1 });
FileSchema.index({ createdAt: -1 });
