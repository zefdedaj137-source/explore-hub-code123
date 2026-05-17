export interface Profile {
  id: string;
  full_name: string;
  age: number;
  gender: string;
  location: string;
  city: string | null;
  country: string | null;
  bio: string | null;
  interests: string[];
  profile_image_url: string | null;
  profile_images?: string[];
  video_intro_url?: string | null;
  verified: boolean | null;
  is_premium?: boolean | null;
  zodiac_sign: string | null;
  religion: string | null;
  latitude: number | null;
  longitude: number | null;
  travel_mode_active?: boolean | null;
  travel_city?: string | null;
  travel_latitude?: number | null;
  travel_longitude?: number | null;
  distance_km?: number;
  work?: string | null;
  education?: string | null;
  height?: string | null;
  height_cm?: number | null;
  timestamp?: string;
  looking_for?: string[];
  lifestyle?: string | null;
  drinking?: string | null;
  smoking?: string | null;
  pets?: string | null;
  last_active?: string | null;
  booster_active?: boolean | null;
  booster_expires_at?: string | null;
  mood_emoji?: string | null;
  mood_text?: string | null;
  soundtrack_title?: string | null;
  soundtrack_artist?: string | null;
  soundtrack_url?: string | null;
  soundtrack_source?: string | null;
  gender_preference?: string | null;
}

export interface StoryItem {
  id: string;
  media_type: string;
  media_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
}
