'use client';

import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

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

export function useApi() {
    const { getToken } = useAuth();

    async function fetchWithAuth(url: string, options: RequestInit = {}) {
        const token = await getToken();
        
        if (!token) {
            throw new Error('Not authenticated');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized - please sign in again');
            }
            throw new Error(`API error: ${response.status}`);
        }

        return response;
    }

    async function getEntries(): Promise<JournalEntry[]> {
        const res = await fetchWithAuth(`${API_URL}/entries/`);
        return res.json();
    }

    async function getEntry(id: number): Promise<JournalEntry> {
        const res = await fetchWithAuth(`${API_URL}/entries/${id}`);
        return res.json();
    }

    async function createEntry(entry: CreateEntryInput): Promise<JournalEntry> {
        const res = await fetchWithAuth(`${API_URL}/entries/`, {
            method: 'POST',
            body: JSON.stringify(entry),
        });
        return res.json();
    }

    async function updateEntry(id: number, entry: UpdateEntryInput): Promise<JournalEntry> {
        const res = await fetchWithAuth(`${API_URL}/entries/${id}`, {
            method: 'PUT',
            body: JSON.stringify(entry),
        });
        return res.json();
    }

    async function deleteEntry(id: number): Promise<void> {
        await fetchWithAuth(`${API_URL}/entries/${id}`, {
            method: 'DELETE',
        });
    }

    async function getFocusPoints(): Promise<FocusPoint[]> {
        const res = await fetchWithAuth(`${API_URL}/focus-points/`);
        return res.json();
    }

    async function createFocusPoint(name: string): Promise<FocusPoint> {
        const res = await fetchWithAuth(`${API_URL}/focus-points/`, {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        return res.json();
    }

    async function deleteFocusPoint(id: number): Promise<void> {
        await fetchWithAuth(`${API_URL}/focus-points/${id}`, {
            method: 'DELETE',
        });
    }

    return {
        getEntries,
        getEntry,
        createEntry,
        updateEntry,
        deleteEntry,
        getFocusPoints,
        createFocusPoint,
        deleteFocusPoint,
    };
}
