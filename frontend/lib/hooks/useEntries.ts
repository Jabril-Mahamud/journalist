import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import {
  fetchEntries,
  fetchEntry,
  createEntry,
  updateEntry,
  deleteEntry,
} from '../api';
import { JournalEntry, CreateEntryInput, UpdateEntryInput } from '../types';

export function useEntries(
  skip = 0,
  limit = 50
): UseQueryResult<JournalEntry[], Error> {
  return useQuery<JournalEntry[], Error>({
    queryKey: ['entries', { skip, limit }],
    queryFn: () => fetchEntries(skip, limit),
  });
}

export function useEntry(id: number): UseQueryResult<JournalEntry, Error> {
  return useQuery<JournalEntry, Error>({
    queryKey: ['entry', id],
    queryFn: () => fetchEntry(id),
    enabled: id > 0,
  });
}

export function useCreateEntry(): UseMutationResult<
  JournalEntry,
  Error,
  CreateEntryInput,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation<JournalEntry, Error, CreateEntryInput>({
    mutationFn: createEntry,
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
  const queryClient = useQueryClient();

  return useMutation<JournalEntry, Error, { id: number; data: UpdateEntryInput }>({
    mutationFn: ({ id, data }) => updateEntry(id, data),
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
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: deleteEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}
