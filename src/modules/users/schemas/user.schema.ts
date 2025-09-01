import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ required: false })
  otpCode?: string;

  @Prop({ required: false })
  otpExpiry?: Date;

  @Prop({
    type: [String],
    enum: ['freelancer', 'client', 'both', 'admin'],
    default: ['client'],
  })
  role: string[];

  @Prop({ type: String, enum: ['freelancer', 'client'] })
  activeRole: string;

  // Common Profile
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  profilePicture: string;

  @Prop()
  phone: string;

  @Prop({
    type: {
      country: String,
      city: String,
      timezone: String,
    },
  })
  location: {
    country: string;
    city: string;
    timezone: string;
  };

  @Prop({
    type: [
      {
        language: String,
        proficiency: {
          type: String,
          enum: ['basic', 'conversational', 'fluent', 'native'],
        },
      },
    ],
  })
  languages: {
    language: string;
    proficiency: string;
  }[];

  // Freelancer Profile
  @Prop({
    type: {
      title: String,
      bio: { type: String, maxlength: 1000 },
      skills: [String],
      experience: {
        type: String,
        enum: ['beginner', 'intermediate', 'expert'],
      },
      education: [
        {
          degree: String,
          institution: String,
          year: Number,
        },
      ],
      certifications: [
        {
          name: String,
          issuer: String,
          date: Date,
          url: String,
        },
      ],
      portfolio: [
        {
          title: String,
          description: String,
          images: [String],
          url: String,
          tags: [String],
        },
      ],
      hourlyRate: Number,
      availability: {
        type: String,
        enum: ['full-time', 'part-time', 'not-available', 'available'],
      },
      workingHours: {
        timezone: String,
        hours: [
          {
            day: String,
            start: String,
            end: String,
          },
        ],
      },
    },
  })
  freelancerProfile: {
    title: string;
    bio: string;
    skills: string[];
    experience: string;
    education: {
      degree: string;
      institution: string;
      year: number;
    }[];
    certifications: {
      name: string;
      issuer: string;
      date: Date;
      url: string;
    }[];
    portfolio: {
      title: string;
      description: string;
      images: string[];
      url: string;
      tags: string[];
    }[];
    hourlyRate: number;
    availability: string;
    workingHours: {
      timezone: string;
      hours: {
        day: string;
        start: string;
        end: string;
      }[];
    };
  };

  // Client Profile
  @Prop({
    type: {
      companyName: String,
      companySize: { type: String, enum: ['1-10', '11-50', '51-200', '200+'] },
      industry: String,
      website: String,
      description: String,
      verified: { type: Boolean, default: false },
    },
  })
  clientProfile: {
    companyName: string;
    companySize: string;
    industry: string;
    website: string;
    description: string;
    verified: boolean;
  };

  // Statistics
  @Prop({
    type: {
      projectsCompleted: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      avgRating: { type: Number, default: 0 },
      responseRate: { type: Number, default: 0 },
      responseTime: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
    },
  })
  stats: {
    projectsCompleted: number;
    totalEarnings: number;
    totalSpent: number;
    avgRating: number;
    responseRate: number;
    responseTime: number;
    completionRate: number;
  };

  // Payment Info
  @Prop()
  stripeCustomerId: string;

    @Prop({
    type: [{
      id: String,
      type: String,
      last4: String,
      isDefault: { type: Boolean, default: false },
    }],
  })
  paymentMethods: {
    id: string;
    type: string;
    last4: string;
    isDefault: boolean;
  }[];

  // Social Features
  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  followers: string[];

  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  following: string[];

  // System Fields
  @Prop({
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active',
  })
  status: string;

  @Prop()
  lastLogin: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
