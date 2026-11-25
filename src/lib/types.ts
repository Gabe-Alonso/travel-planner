export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email?: string | null;
};

export type Role = "leader" | "member";

export type Trip = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  invite_code: string;
  vote_deadline: string | null;
  decided_destination_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type Member = {
  trip_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  profile: Profile | null;
};

export type Destination = {
  id: string;
  trip_id: string;
  name: string;
  region: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  added_by: string | null;
  created_at: string;
};

export type Vote = {
  trip_id: string;
  user_id: string;
  destination_id: string;
};

export type LinkItem = {
  id: string;
  trip_id: string;
  name: string;
  url: string | null;
  image_url: string | null;
  site_name: string | null;
  notes: string | null;
  added_by: string | null;
  created_at: string;
  category?: string | null;
  price?: string | null;
};

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};
