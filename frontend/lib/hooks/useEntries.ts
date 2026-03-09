import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { useApi } from '../api';
import { JournalEntry, CreateEntryInput, UpdateEntryInput, Project } from '../api';

// ── Stable query keys ─────────────────────────────────────────────────────────
// Using a single canonical key for the full list means all pages share the same
// cache entry. Previously the key included {skip, limit} which caused misses.

export const ENTRIES_KEY = ['entries'] as const;
export const PROJECTS_KEY = ['projects'] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useEntries(): UseQueryResult<JournalEntry[], Error> {
  const api = useApi();
  return useQuery<JournalEntry[], Error>({
    queryKey: ENTRIES_KEY,
    queryFn: () => api.getEntries(),
  });
}

export function useEntry(id: number): UseQueryResult<JournalEntry, Error> {
  const api = useApi();
  return useQuery<JournalEntry, Error>({
    queryKey: ['entry', id],
    queryFn: () => api.getEntry(id),
    enabled: id > 0,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateEntry(): UseMutationResult<
  JournalEntry,
  Error,
  CreateEntryInput,
  { previous: JournalEntry[] | undefined }
> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<
    JournalEntry,
    Error,
    CreateEntryInput,
    { previous: JournalEntry[] | undefined }
  >({
    mutationFn: (data) => api.createEntry(data),

    // Optimistically prepend the new entry so the list updates instantly
    onMutate: async (newEntry) => {
      await queryClient.cancelQueries({ queryKey: ENTRIES_KEY });
      const previous = queryClient.getQueryData<JournalEntry[]>(ENTRIES_KEY);

      queryClient.setQueryData<JournalEntry[]>(ENTRIES_KEY, (old = []) => {
        const optimistic: JournalEntry = {
          id: -(Date.now()), // temp negative id — replaced on settle
          title: newEntry.title,
          content: newEntry.content,
          projects: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return [optimistic, ...old];
      });

      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Roll back on failure
      if (context?.previous) {
        queryClient.setQueryData(ENTRIES_KEY, context.previous);
      }
    },

    onSettled: () => {
      // Always sync with server to get the real id + resolved projects
      queryClient.invalidateQueries({ queryKey: ENTRIES_KEY });
    },
  });
}

export function useUpdateEntry(): UseMutationResult<
  JournalEntry,
  Error,
  { id: number; data: UpdateEntryInput },
  { previous: JournalEntry[] | undefined }
> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<
    JournalEntry,
    Error,
    { id: number; data: UpdateEntryInput },
    { previous: JournalEntry[] | undefined }
  >({
    mutationFn: ({ id, data }) => api.updateEntry(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ENTRIES_KEY });
      const previous = queryClient.getQueryData<JournalEntry[]>(ENTRIES_KEY);

      queryClient.setQueryData<JournalEntry[]>(ENTRIES_KEY, (old = []) =>
        old.map((entry) =>
          entry.id === id
            ? { ...entry, title: data.title, content: data.content, updated_at: new Date().toISOString() }
            : entry
        )
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ENTRIES_KEY, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ENTRIES_KEY });
    },
  });
}

export function useDeleteEntry(): UseMutationResult<
  void,
  Error,
  number,
  { previous: JournalEntry[] | undefined }
> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    number,
    { previous: JournalEntry[] | undefined }
  >({
    mutationFn: (id) => api.deleteEntry(id),

    // Remove the entry immediately — no spinner, instant feedback
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ENTRIES_KEY });
      const previous = queryClient.getQueryData<JournalEntry[]>(ENTRIES_KEY);

      queryClient.setQueryData<JournalEntry[]>(ENTRIES_KEY, (old = []) =>
        old.filter((entry) => entry.id !== id)
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ENTRIES_KEY, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ENTRIES_KEY });
    },
  });
}

// ── Projects ──────────────────────────────────────────────────────────────────

export function useProjects(): UseQueryResult<Project[], Error> {
  const api = useApi();
  return useQuery<Project[], Error>({
    queryKey: PROJECTS_KEY,
    queryFn: () => api.getProjects(),
    // Projects barely change — keep them fresh for 10 minutes
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateProject(): UseMutationResult<Project, Error, string, unknown> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<Project, Error, string>({
    mutationFn: (name) => api.createProject(name),
    onSuccess: (newProject) => {
      // Append optimistically — no full refetch needed
      queryClient.setQueryData<Project[]>(PROJECTS_KEY, (old = []) => [...old, newProject]);
    },
  });
}

export function useDeleteProject(): UseMutationResult<void, Error, number, unknown> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (id) => api.deleteProject(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Project[]>(PROJECTS_KEY, (old = []) =>
        old.filter((p) => p.id !== id)
      );
      // Entries referencing this project need updating
      queryClient.invalidateQueries({ queryKey: ENTRIES_KEY });
    },
  });
}

export function useUpdateProjectColor(): UseMutationResult<
  Project,
  Error,
  { id: number; color: string },
  unknown
> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<Project, Error, { id: number; color: string }>({
    mutationFn: ({ id, color }) => api.updateProjectColor(id, color),
    onSuccess: (updated) => {
      // Update the specific project in cache without a full refetch
      queryClient.setQueryData<Project[]>(PROJECTS_KEY, (old = []) =>
        old.map((p) => (p.id === updated.id ? updated : p))
      );
      // Also patch the color inside any cached entries
      queryClient.setQueryData<JournalEntry[]>(ENTRIES_KEY, (old = []) =>
        old.map((entry) => ({
          ...entry,
          projects: entry.projects.map((p) =>
            p.id === updated.id ? { ...p, color: updated.color } : p
          ),
        }))
      );
    },
  });
}