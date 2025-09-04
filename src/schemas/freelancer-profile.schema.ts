import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class Availability {
  @Prop({ required: true, enum: ['available', 'busy', 'unavailable'] })
  status: string;

  @Prop()
  hoursPerWeek: number;

  @Prop({
    type: {
      timezone: String,
      schedule: Object
    }
  })
  workingHours: {
    timezone: string;
    schedule: object;
  };
}

@Schema({ _id: false })
export class Portfolio {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  imageUrl: string;

  @Prop()
  projectUrl: string;

  @Prop({ type: [String] })
  tags: string[];
}

@Schema({ _id: false })
export class Education {
  @Prop({ required: true })
  institution: string;

  @Prop({ required: true })
  degree: string;

  @Prop({ required: true })
  field: string;

  @Prop({ required: true })
  year: number;
}

@Schema({ _id: false })
export class Certification {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  issuer: string;

  @Prop({ required: true })
  year: number;

  @Prop()
  url: string;
}

@Schema({ _id: false })
export class Language {
  @Prop({ required: true })
  language: string;

  @Prop({ required: true, enum: ['basic', 'intermediate', 'fluent', 'native'] })
  proficiency: string;
}

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
export class FreelancerProfile {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  professionalTitle: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], required: true })
  skills: string[];

  @Prop({ type: [String], required: true })
  categories: string[];

  @Prop({ required: true, enum: ['beginner', 'intermediate', 'expert'] })
  experienceLevel: string;

  @Prop({ required: true })
  hourlyRate: number;

  @Prop({ type: Availability, required: true })
  availability: Availability;

  @Prop({ type: [Portfolio], default: [] })
  portfolio: Portfolio[];

  @Prop({ type: [Education], default: [] })
  education: Education[];

  @Prop({ type: [Certification], default: [] })
  certifications: Certification[];

  @Prop({ type: [Language], default: [] })
  languages: Language[];

  @Prop({ type: Location, required: true })
  location: Location;

  @Prop({ default: 0 })
  profileCompleteness: number;

  @Prop()
  publicProfileUrl: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export type FreelancerProfileDocument = FreelancerProfile & Document;
export const FreelancerProfileSchema = SchemaFactory.createForClass(FreelancerProfile);

// Indexes
FreelancerProfileSchema.index({ userId: 1 }, { unique: true });
FreelancerProfileSchema.index({ skills: 1 });
FreelancerProfileSchema.index({ categories: 1 });
FreelancerProfileSchema.index({ experienceLevel: 1 });
FreelancerProfileSchema.index({ hourlyRate: 1 });
FreelancerProfileSchema.index({ 'availability.status': 1 });
