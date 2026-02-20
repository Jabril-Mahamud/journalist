import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { useApi } from '../api';
import { JournalEntry, CreateEntryInput, UpdateEntryInput, FocusPoint } from '../api';

export function useEntries(
  skip = 0,
  limit = 50
): UseQueryResult<JournalEntry[], Error> {
  const api = useApi();
  return useQuery<JournalEntry[], Error>({
    queryKey: ['entries', { skip, limit }],
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

export function useCreateEntry(): UseMutationResult<
  JournalEntry,
  Error,
  CreateEntryInput,
  unknown
> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<JournalEntry, Error, CreateEntryInput>({
    mutationFn: (data) => api.createEntry(data),
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
    mutationFn: ({ id, data }) => api.updateEntry(id, data),
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
    mutationFn: (id) => api.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useFocusPoints(): UseQueryResult<FocusPoint[], Error> {
  const api = useApi();
  return useQuery<FocusPoint[], Error>({
    queryKey: ['focusPoints'],
    queryFn: () => api.getFocusPoints(),
  });
}

export function useDeleteFocusPoint(): UseMutationResult<
  void,
  Error,
  number,
  unknown
> {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (id) => api.deleteFocusPoint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['focusPoints'] });
    },
  });
}
