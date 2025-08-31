import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProposalDocument = Proposal & Document;

@Schema({ timestamps: true })
export class Proposal {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  freelancerId: Types.ObjectId;

  @Prop({ required: true })
  coverLetter: string;

  @Prop({ required: true })
  proposedBudget: number;

  @Prop({
    type: {
      value: Number,
      unit: {
        type: String,
        enum: ['days', 'weeks', 'months']
      }
    },
    required: true
  })
  proposedDuration: {
    value: number;
    unit: 'days' | 'weeks' | 'months';
  };

  @Prop([{
    title: String,
    description: String,
    amount: Number,
    duration: Number
  }])
  milestones: Array<{
    title: string;
    description: string;
    amount: number;
    duration: number;
  }>;

  @Prop([{
    name: String,
    url: String,
    type: String
  }])
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;

  @Prop({
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  })
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';

  @Prop({ default: false })
  clientViewed: boolean;

  @Prop()
  clientViewedAt?: Date;
}

export const ProposalSchema = SchemaFactory.createForClass(Proposal);
