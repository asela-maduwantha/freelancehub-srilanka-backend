import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DisputeDocument = Dispute & Document;

@Schema({ timestamps: true })
export class Dispute {
  @Prop({ type: Types.ObjectId, ref: 'Contract', required: true })
  contractId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  initiatorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  respondentId: Types.ObjectId;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  description: string;

  @Prop([{
    uploadedBy: { type: Types.ObjectId, ref: 'User' },
    description: String,
    files: [String],
    uploadedAt: { type: Date, default: Date.now }
  }])
  evidence: Array<{
    uploadedBy: Types.ObjectId;
    description: string;
    files: string[];
    uploadedAt: Date;
  }>;

  @Prop([{
    senderId: { type: Types.ObjectId, ref: 'User' },
    message: String,
    timestamp: { type: Date, default: Date.now }
  }])
  messages: Array<{
    senderId: Types.ObjectId;
    message: string;
    timestamp: Date;
  }>;

  @Prop({
    type: String,
    enum: ['open', 'under-review', 'resolved', 'closed'],
    default: 'open'
  })
  status: 'open' | 'under-review' | 'resolved' | 'closed';

  @Prop({
    type: {
      decidedBy: { type: Types.ObjectId, ref: 'User' },
      decision: String,
      refundAmount: Number,
      timestamp: Date
    }
  })
  resolution?: {
    decidedBy: Types.ObjectId;
    decision: string;
    refundAmount: number;
    timestamp: Date;
  };
}

export const DisputeSchema = SchemaFactory.createForClass(Dispute);
