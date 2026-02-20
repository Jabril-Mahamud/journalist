export interface FocusPoint {
  id: number;
  name: string;
  created_at: string;
}

export interface JournalEntry {
  id: number;
  title: string;
  content: string;
  focus_points: FocusPoint[];
  created_at: string;
  updated_at: string;
}

export interface CreateEntryInput {
  title: string;
  content: string;
  focus_point_names: string[];
}

export interface UpdateEntryInput {
  title: string;
  content: string;
  focus_point_names: string[];
}
