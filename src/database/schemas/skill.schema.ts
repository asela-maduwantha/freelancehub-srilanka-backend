// src/database/schemas/skill.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'skills',
})
export class Skill extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  synonyms: string[];

  @Prop({ type: [String], default: [] })
  relatedSkills: string[];

  @Prop({ default: 'technical' })
  category: string;

  @Prop({ default: 'intermediate' })
  difficulty: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0, min: 0 })
  usageCount: number;

  @Prop({ default: 0, min: 0 })
  demandScore: number;

  @Prop()
  icon?: string;

  @Prop()
  color?: string;

  @Prop()
  deletedAt?: Date;

  // Virtual fields
  get isDeleted(): boolean {
    return !!this.deletedAt;
  }

  get hasSynonyms(): boolean {
    return this.synonyms && this.synonyms.length > 0;
  }

  get hasRelatedSkills(): boolean {
    return this.relatedSkills && this.relatedSkills.length > 0;
  }
}

export const SkillSchema = SchemaFactory.createForClass(Skill);

// Create indexes
SkillSchema.index({ slug: 1 }, { unique: true });
SkillSchema.index({ category: 1 });
SkillSchema.index({ difficulty: 1 });
SkillSchema.index({ isActive: 1 });
SkillSchema.index({ usageCount: -1 });
SkillSchema.index({ demandScore: -1 });
SkillSchema.index({ deletedAt: 1 }, { sparse: true });

// Text search index
SkillSchema.index(
  {
    name: 'text',
    description: 'text',
    synonyms: 'text',
  },
  {
    weights: {
      name: 10,
      synonyms: 5,
      description: 1,
    },
  },
);

// Add virtual fields
SkillSchema.virtual('isDeleted').get(function () {
  return !!this.deletedAt;
});

SkillSchema.virtual('hasSynonyms').get(function () {
  return this.synonyms && this.synonyms.length > 0;
});

SkillSchema.virtual('hasRelatedSkills').get(function () {
  return this.relatedSkills && this.relatedSkills.length > 0;
});

// Pre-save middleware
SkillSchema.pre('save', function (next) {
  // Auto-generate slug from name if not provided
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Ensure virtuals are included in JSON
SkillSchema.set('toJSON', { virtuals: true });
SkillSchema.set('toObject', { virtuals: true });
