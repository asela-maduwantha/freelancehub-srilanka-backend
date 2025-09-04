// TypeScript type definitions for freelancer profile editing

export interface Location {
  country?: string;
  city?: string;
  timezone?: string;
}

export interface Language {
  language: string;
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
}

export interface Education {
  degree: string;
  institution: string;
  year: number;
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface PortfolioItem {
  title: string;
  description: string;
  images: string[];
  url?: string;
  tags: string[];
}

export interface WorkingHour {
  day: string;
  start: string;
  end: string;
}

export interface WorkingHours {
  timezone: string;
  schedule: Record<string, any>;
}

export interface Availability {
  status: 'available' | 'busy' | 'unavailable';
  hoursPerWeek: number;
  workingHours: WorkingHours;
}

export interface EditFreelancerProfileType {
  // Common Profile Fields
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  phone?: string;
  location?: Location;
  languages?: Language[];

  // Freelancer Profile Fields
  title?: string;
  bio?: string;
  skills?: string[];
  experience?: 'beginner' | 'intermediate' | 'expert';
  education?: Education[];
  certifications?: Certification[];
  portfolio?: PortfolioItem[];
  hourlyRate?: number;
  availability?: Availability;
}

// Utility type for partial updates
export type PartialFreelancerProfileUpdate = Partial<EditFreelancerProfileType>;

// Type for the complete freelancer profile (including read-only fields)
export interface FreelancerProfile extends EditFreelancerProfileType {
  // These would typically be read-only or calculated fields
  stats?: {
    projectsCompleted: number;
    totalEarnings: number;
    avgRating: number;
    responseRate: number;
    responseTime: number;
    completionRate: number;
  };
  status?: 'active' | 'suspended' | 'banned';
  lastLogin?: Date;
  followers?: string[];
  following?: string[];
}

// Type for API response
export interface FreelancerProfileResponse {
  success: boolean;
  data: FreelancerProfile;
  message?: string;
}

// Type for update request
export interface UpdateFreelancerProfileRequest {
  profileData: EditFreelancerProfileType;
}

// Type guards for validation
export const isValidProficiency = (value: string): value is Language['proficiency'] => {
  return ['basic', 'conversational', 'fluent', 'native'].includes(value);
};

export const isValidExperience = (value: string | undefined): value is NonNullable<EditFreelancerProfileType['experience']> => {
  return value !== undefined && ['beginner', 'intermediate', 'expert'].includes(value);
};

export const isValidAvailability = (value: Availability | undefined): value is NonNullable<EditFreelancerProfileType['availability']> => {
  return value !== undefined && ['available', 'busy', 'unavailable'].includes(value.status);
};

// Interface for freelancer search query
export interface FreelancerSearchQuery {
  page?: number;
  limit?: number;
  skills?: string;
  experienceLevel?: string;
  minRate?: string;
  maxRate?: string;
  availability?: string;
}
