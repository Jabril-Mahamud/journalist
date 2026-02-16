export interface JournalEntry {
  id: number;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type CreateEntryInput = Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>;

export type UpdateEntryInput = Partial<Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>>;
