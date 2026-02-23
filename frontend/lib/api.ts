'use client';

import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export interface Project {
    id: number;
    name: string;
    color: string;
    created_at: string;
}

export interface JournalEntry {
    id: number;
    title: string;
    content: string;
    projects: Project[];
    created_at: string;
    updated_at: string;
}

export interface CreateEntryInput {
    title: string;
    content: string;
    project_names: string[];
}

export interface UpdateEntryInput {
    title: string;
    content: string;
    project_names: string[];
}

export interface TodoistTask {
    id: string;
    content: string;
    description: string;
    is_completed: boolean;
    priority: number;
    due?: {
        date: string;
        string: string;
        is_recurring: boolean;
    } | null;
    project_id?: string | null;
    project_name?: string | null;
    url: string;
}

export interface EntryTaskLink {
    id: number;
    todoist_task_id: string;
    created_at: string;
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
            const body = await response.json().catch(() => ({}));
            throw new Error(body.detail || `API error: ${response.status}`);
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

    async function getProjects(): Promise<Project[]> {
        const res = await fetchWithAuth(`${API_URL}/projects/`);
        return res.json();
    }

    async function createProject(name: string): Promise<Project> {
        const res = await fetchWithAuth(`${API_URL}/projects/`, {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        return res.json();
    }

    async function deleteProject(id: number): Promise<void> {
        await fetchWithAuth(`${API_URL}/projects/${id}`, {
            method: 'DELETE',
        });
    }

    async function updateProjectColor(id: number, color: string): Promise<Project> {
        const res = await fetchWithAuth(`${API_URL}/projects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ color }),
        });
        return res.json();
    }

    async function getTodoistStatus(): Promise<{ connected: boolean }> {
        const res = await fetchWithAuth(`${API_URL}/todoist/status`);
        return res.json();
    }

    async function saveTodoistToken(token: string): Promise<{ connected: boolean }> {
        const res = await fetchWithAuth(`${API_URL}/todoist/token`, {
            method: 'PUT',
            body: JSON.stringify({ token }),
        });
        return res.json();
    }

    async function deleteTodoistToken(): Promise<void> {
        await fetchWithAuth(`${API_URL}/todoist/token`, { method: 'DELETE' });
    }

    async function getTodoistTasks(): Promise<TodoistTask[]> {
        const res = await fetchWithAuth(`${API_URL}/todoist/tasks`);
        return res.json();
    }

    async function closeTodoistTask(taskId: string): Promise<void> {
        await fetchWithAuth(`${API_URL}/todoist/tasks/${taskId}/close`, {
            method: 'POST',
        });
    }

    async function getEntryTasks(entryId: number): Promise<EntryTaskLink[]> {
        const res = await fetchWithAuth(`${API_URL}/entries/${entryId}/tasks`);
        return res.json();
    }

    async function linkTaskToEntry(entryId: number, todoistTaskId: string): Promise<EntryTaskLink> {
        const res = await fetchWithAuth(`${API_URL}/entries/${entryId}/tasks`, {
            method: 'POST',
            body: JSON.stringify({ todoist_task_id: todoistTaskId }),
        });
        return res.json();
    }

    async function unlinkTaskFromEntry(entryId: number, todoistTaskId: string): Promise<void> {
        await fetchWithAuth(`${API_URL}/entries/${entryId}/tasks/${todoistTaskId}`, {
            method: 'DELETE',
        });
    }

    return {
        getEntries,
        getEntry,
        createEntry,
        updateEntry,
        deleteEntry,
        getProjects,
        createProject,
        deleteProject,
        updateProjectColor,
        getTodoistStatus,
        saveTodoistToken,
        deleteTodoistToken,
        getTodoistTasks,
        closeTodoistTask,
        getEntryTasks,
        linkTaskToEntry,
        unlinkTaskFromEntry,
    };
}
