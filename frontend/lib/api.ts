const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export interface JournalEntry {
    id: number;
    title: string;
    content: string;
    tags?: string;
    created_at: string;
    updated_at: string;
}

export async function getEntries(): Promise<JournalEntry[]> {
    const res = await fetch(`${API_URL}/entries/`);
    if (!res.ok) throw new Error('Failed to fetch entries');
    return res.json();
}

export async function getEntry(id: number): Promise<JournalEntry> {
    const res = await fetch(`${API_URL}/entries/${id}`);
    if (!res.ok) throw new Error('Failed to fetch entry');
    return res.json();
}

export async function createEntry(entry: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>) {
    const res = await fetch(`${API_URL}/entries/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error('Failed to create entry');
    return res.json();
}

export async function updateEntry(id: number, entry: Partial<JournalEntry>) {
    const res = await fetch(`${API_URL}/entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error('Failed to update entry');
    return res.json();
}

export async function deleteEntry(id: number) {
    const res = await fetch(`${API_URL}/entries/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete entry');
    return res.json();
}