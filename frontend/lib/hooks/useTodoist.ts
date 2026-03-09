/**
 * useTodoist.ts
 *
 * Caches Todoist data in React Query so repeated dialog opens are instant
 * instead of firing fresh network requests every time.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi, TodoistTask, Template } from '../api';

export const TODOIST_STATUS_KEY = ['todoist', 'status'] as const;
export const TODOIST_TASKS_KEY = ['todoist', 'tasks'] as const;
export const TEMPLATE_SUGGESTIONS_KEY = ['templates', 'suggestions'] as const;

// ── Status ─────────────────────────────────────────────────────────────────

export function useTodoistStatus() {
    const api = useApi();
    return useQuery<{ connected: boolean }, Error>({
        queryKey: TODOIST_STATUS_KEY,
        queryFn: () => api.getTodoistStatus(),
        // Status is stable — only changes when user connects/disconnects
        staleTime: 10 * 60 * 1000,
    });
}

// ── Tasks ──────────────────────────────────────────────────────────────────

export function useTodoistTasks(enabled = true) {
    const api = useApi();
    const { data: status } = useTodoistStatus();
    const connected = status?.connected ?? false;

    return useQuery<TodoistTask[], Error>({
        queryKey: TODOIST_TASKS_KEY,
        queryFn: () => api.getTodoistTasks(),
        enabled: enabled && connected,
        // Tasks change regularly — 2 minute stale time is a good balance
        staleTime: 2 * 60 * 1000,
    });
}

// ── Template suggestions ───────────────────────────────────────────────────

export function useTemplateSuggestions() {
    const api = useApi();
    return useQuery<Template[], Error>({
        queryKey: TEMPLATE_SUGGESTIONS_KEY,
        queryFn: () => api.getTemplateSuggestions(),
        // Suggestions are time-based — stale after 5 minutes
        staleTime: 5 * 60 * 1000,
    });
}

// ── Close task mutation ────────────────────────────────────────────────────

export function useCloseTodoistTask() {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: (taskId) => api.closeTodoistTask(taskId),
        onSuccess: (_data, taskId) => {
            // Remove from cache immediately
            queryClient.setQueryData<TodoistTask[]>(TODOIST_TASKS_KEY, (old = []) =>
                old.filter((t) => t.id !== taskId)
            );
        },
    });
}

// ── Reschedule task mutation ───────────────────────────────────────────────

export function useRescheduleTask() {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<void, Error, { taskId: string; dueDate: string }>({
        mutationFn: ({ taskId, dueDate }) => api.rescheduleTask(taskId, dueDate),
        onMutate: async ({ taskId, dueDate }) => {
            // Optimistically update the due date in cache
            queryClient.setQueryData<TodoistTask[]>(TODOIST_TASKS_KEY, (old = []) =>
                old.map((t) =>
                    t.id === taskId
                        ? {
                            ...t,
                            due: t.due
                                ? { ...t.due, date: dueDate }
                                : { date: dueDate, string: dueDate, is_recurring: false },
                        }
                        : t
                )
            );
        },
        onError: () => {
            // On failure, refetch to restore correct state
            queryClient.invalidateQueries({ queryKey: TODOIST_TASKS_KEY });
        },
    });
}