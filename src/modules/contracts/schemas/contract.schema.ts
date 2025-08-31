import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ContractDocument = Contract & Document;

@Schema({ timestamps: true })
export class Contract {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  freelancerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Proposal', required: true })
  proposalId: Types.ObjectId;

  @Prop({
    type: {
      budget: Number,
      paymentType: {
        type: String,
        enum: ['fixed', 'hourly']
      },
      startDate: Date,
      endDate: Date,
      paymentSchedule: String
    },
    required: true
  })
  terms: {
    budget: number;
    paymentType: 'fixed' | 'hourly';
    startDate: Date;
    endDate: Date;
    paymentSchedule: string;
  };

  @Prop([{
    _id: { type: String, default: () => new Types.ObjectId().toString() },
    title: String,
    description: String,
    amount: Number,
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'submitted', 'approved', 'rejected'],
      default: 'pending'
    },
    submissions: [{
      files: [String],
      description: String,
      submittedAt: { type: Date, default: Date.now },
      feedback: String
    }]
  }])
  milestones: Array<{
    _id: string;
    title: string;
    description: string;
    amount: number;
    dueDate: Date;
    status: 'pending' | 'in-progress' | 'submitted' | 'approved' | 'rejected';
    submissions: Array<{
      files: string[];
      description: string;
      submittedAt: Date;
      feedback: string;
    }>;
  }>;

  @Prop({
    type: String,
    enum: ['active', 'completed', 'cancelled', 'disputed'],
    default: 'active'
  })
  status: 'active' | 'completed' | 'cancelled' | 'disputed';

  @Prop({ default: 0 })
  totalPaid: number;

  @Prop({ default: 0 })
  totalEscrow: number;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancellationReason?: string;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);
