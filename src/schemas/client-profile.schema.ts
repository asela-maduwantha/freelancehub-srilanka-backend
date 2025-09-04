import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class Location {
  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  province: string;
}

@Schema({ timestamps: true })
export class ClientProfile {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop()
  companyName: string;

  @Prop()
  industry: string;

  @Prop()
  companySize: string;

  @Prop()
  website: string;

  @Prop()
  description: string;

  @Prop({ type: Location })
  location: Location;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ClientProfileDocument = ClientProfile & Document;
export const ClientProfileSchema = SchemaFactory.createForClass(ClientProfile);

// Indexes
ClientProfileSchema.index({ userId: 1 }, { unique: true });
ClientProfileSchema.index({ industry: 1 });
ClientProfileSchema.index({ companySize: 1 });
