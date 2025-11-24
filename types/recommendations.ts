export interface TipsCategory {
  places: string[];
  what_to_get: string[];
}

export interface SeasonInfo {
  event: string;
  ideas?: string[];
  locations?: string[];
}

export interface City {
  name: string;
  interests: string[];
  food_preferences: string[];
  tour_type: Record<string, string>;
  seasons: Record<string, SeasonInfo>;
  tips: Record<string, TipsCategory>;
}

export interface Country {
  name: string;
  cities: City[];
}

export interface RecommendationsData {
  countries: Country[];
}
