import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { useApi } from '../api';
import { JournalEntry, CreateEntryInput, UpdateEntryInput, Project } from '../api';

export function useEntries(
  skip = 0,
  limit = 50
): UseQueryResult<JournalEntry[], Error> {
  const api = useApi();
  return useQuery<JournalEntry[], Error>({
    queryKey: ['entries', { skip, limit }],
    queryFn: async () => {
      return await api.getEntries();
    },
  });
}

export function useEntry(id: number): UseQueryResult<JournalEntry, Error> {
  const api = useApi();
  return useQuery<JournalEntry, Error>({
    queryKey: ['entry', id],
    queryFn: async () => {
      return await api.getEntry(id);
    },
    enabled: id > 0,
  });
}

export function useCreateEntry(): UseMutationResult<
  JournalEntry,
  Error,
  CreateEntryInput,
  unknown
> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<JournalEntry, Error, CreateEntryInput>({
    mutationFn: async (data) => {
      return await api.createEntry(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useUpdateEntry(): UseMutationResult<
  JournalEntry,
  Error,
  { id: number; data: UpdateEntryInput },
  unknown
> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<JournalEntry, Error, { id: number; data: UpdateEntryInput }>({
    mutationFn: async ({ id, data }) => {
      return await api.updateEntry(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useDeleteEntry(): UseMutationResult<
  void,
  Error,
  number,
  unknown
> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.deleteEntry(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useProjects(): UseQueryResult<Project[], Error> {
  const api = useApi();
  return useQuery<Project[], Error>({
    queryKey: ['projects'],
    queryFn: async () => {
      return await api.getProjects();
    },
  });
}

export function useCreateProject(): UseMutationResult<
  Project,
  Error,
  string,
  unknown
> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<Project, Error, string>({
    mutationFn: async (name) => {
      return await api.createProject(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject(): UseMutationResult<
  void,
  Error,
  number,
  unknown
> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.deleteProject(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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
    mutationFn: async ({ id, color }) => {
      return await api.updateProjectColor(id, color);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}
