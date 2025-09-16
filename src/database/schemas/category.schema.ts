import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'categories',
})
export class Category extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  icon?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  parentId?: Types.ObjectId;

  @Prop({ default: 0, min: 0 })
  order: number;

  @Prop({ type: [String], default: [] })
  subcategories: string[];

  @Prop({ default: 0, min: 0 })
  jobCount: number;

  @Prop()
  deletedAt?: Date;

  // Virtual fields
  get isSubcategory(): boolean {
    return !!this.parentId;
  }

  get hasSubcategories(): boolean {
    return this.subcategories && this.subcategories.length > 0;
  }

  get isDeleted(): boolean {
    return !!this.deletedAt;
  }
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Create indexes
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ parentId: 1 }, { sparse: true });
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ order: 1 });
CategorySchema.index({ deletedAt: 1 }, { sparse: true });

// Compound indexes
CategorySchema.index({ parentId: 1, order: 1 });
CategorySchema.index({ isActive: 1, order: 1 });

// Add virtual fields
CategorySchema.virtual('isSubcategory').get(function () {
  return !!this.parentId;
});

CategorySchema.virtual('hasSubcategories').get(function () {
  return this.subcategories && this.subcategories.length > 0;
});

CategorySchema.virtual('isDeleted').get(function () {
  return !!this.deletedAt;
});

// Pre-save middleware
CategorySchema.pre('save', function (next) {
  // Auto-generate slug from name if not provided
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Pre-find middleware to populate references
CategorySchema.pre(/^find/, function (next) {
  // Populate will be handled at query level to avoid TypeScript issues
  next();
});

// Ensure virtuals are included in JSON
CategorySchema.set('toJSON', { virtuals: true });
CategorySchema.set('toObject', { virtuals: true });
