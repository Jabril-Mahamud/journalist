import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryResult,
    UseMutationResult,
} from '@tanstack/react-query';
import { useApi } from '../api';
import { Template, CreateTemplateInput, UpdateTemplateInput } from '../api';

export function useTemplates(): UseQueryResult<Template[], Error> {
    const api = useApi();
    return useQuery<Template[], Error>({
        queryKey: ['templates'],
        queryFn: () => api.getTemplates(),
    });
}

export function useCreateTemplate(): UseMutationResult<
    Template,
    Error,
    CreateTemplateInput,
    unknown
> {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation<Template, Error, CreateTemplateInput>({
        mutationFn: (data) => api.createTemplate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
    });
}

export function useUpdateTemplate(): UseMutationResult<
    Template,
    Error,
    { id: number; data: UpdateTemplateInput },
    unknown
> {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation<Template, Error, { id: number; data: UpdateTemplateInput }>({
        mutationFn: ({ id, data }) => api.updateTemplate(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
    });
}

export function useDeleteTemplate(): UseMutationResult<void, Error, number, unknown> {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation<void, Error, number>({
        mutationFn: (id) => api.deleteTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
    });
}

export function useForkTemplate(): UseMutationResult<Template, Error, number, unknown> {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation<Template, Error, number>({
        mutationFn: (id) => api.forkTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
    });
}