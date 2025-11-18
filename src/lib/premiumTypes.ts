// Premium features type definitions

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url?: string;
  caption?: string;
  duration: number;
  created_at: string;
  expires_at: string;
  views_count: number;
  profile?: {
    id: string;
    full_name: string;
    profile_image_url: string | null;
    verified: boolean;
  };
  has_viewed?: boolean;
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  viewed_at: string;
  viewer?: {
    id: string;
    full_name: string;
    profile_image_url: string | null;
  };
}

export interface VideoProfile {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string;
  duration: number;
  is_active: boolean;
  created_at: string;
}

export interface Verification {
  id: string;
  user_id: string;
  verification_type: 'selfie' | 'id_document' | 'phone' | 'email';
  status: 'pending' | 'approved' | 'rejected';
  media_url?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewer_notes?: string;
}

export interface MatchingPreferences {
  id: string;
  user_id: string;
  importance_distance: number;
  importance_age: number;
  importance_interests: number;
  importance_education: number;
  importance_lifestyle: number;
  deal_breakers: string[];
  updated_at: string;
}

export interface MatchScore {
  id: string;
  user_id: string;
  target_user_id: string;
  compatibility_score: number;
  distance_score?: number;
  age_score?: number;
  interest_score?: number;
  education_score?: number;
  lifestyle_score?: number;
  calculated_at: string;
}

export interface ProfileCompleteness {
  id: string;
  user_id: string;
  has_photo: boolean;
  has_bio: boolean;
  has_interests: boolean;
  has_video_profile: boolean;
  has_verified: boolean;
  completeness_score: number;
  updated_at: string;
}

export interface StoryWithProfile extends Story {
  profile: NonNullable<Story['profile']>;
  stories?: StoryWithProfile[];
}
