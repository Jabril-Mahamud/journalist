'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  useEntry,
  useCreateEntry,
  useUpdateEntry,
  useDeleteEntry,
} from '@/lib/hooks/useEntries';
import { JournalEntry, CreateEntryInput } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EntryEditorProps {
  entryId?: number | null;
  onSave?: (entry: JournalEntry) => void;
  onDelete?: (id: number) => void;
}

type FormData = {
  title: string;
  body: string;
  tags: string;
};

const AUTOSAVE_DELAY = 2000;

type SaveStatus = 'editing' | 'saving' | 'saved';

export function EntryEditor({ entryId, onSave, onDelete }: EntryEditorProps) {
  const { data: entry, isLoading } = useEntry(entryId ?? 0);
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();
  
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('editing');
  const [currentEntryId, setCurrentEntryId] = useState<number | null>(entryId ?? null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty },
  } = useForm<FormData>({
    defaultValues: {
      title: '',
      body: '',
      tags: '',
    },
  });

  // Reset form when entryId changes or entry data loads
  useEffect(() => {
    if (entryId && entry) {
      reset({
        title: entry.title,
        body: entry.body,
        tags: entry.tags.join(', '),
      });
      setCurrentEntryId(entry.id);
      setSaveStatus('saved');
      isInitialLoadRef.current = false;
    } else if (!entryId) {
      reset({
        title: '',
        body: '',
        tags: '',
      });
      setCurrentEntryId(null);
      setSaveStatus('editing');
      isInitialLoadRef.current = true;
    }
  }, [entryId, entry, reset]);

  const parseTags = (tagsString: string): string[] => {
    return tagsString
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  };

  const performSave = useCallback(
    async (data: FormData) => {
      const entryData: CreateEntryInput = {
        title: data.title,
        body: data.body,
        tags: parseTags(data.tags),
      };

      setSaveStatus('saving');

      try {
        let savedEntry: JournalEntry;

        if (currentEntryId) {
          savedEntry = await updateEntry.mutateAsync({
            id: currentEntryId,
            data: entryData,
          });
        } else {
          savedEntry = await createEntry.mutateAsync(entryData);
          setCurrentEntryId(savedEntry.id);
        }

        setSaveStatus('saved');
        onSave?.(savedEntry);
      } catch (error) {
        setSaveStatus('editing');
        console.error('Failed to save entry:', error);
      }
    },
    [currentEntryId, createEntry, updateEntry, onSave]
  );

  // Auto-save on form changes
  useEffect(() => {
    const subscription = watch((value) => {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        return;
      }

      if (!isDirty) return;

      setSaveStatus('editing');

      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        if (value.title || value.body) {
          handleSubmit((data) => performSave(data))();
        }
      }, AUTOSAVE_DELAY);
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [watch, isDirty, handleSubmit, performSave]);

  const handleDelete = async () => {
    if (!currentEntryId) return;

    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteEntry.mutateAsync(currentEntryId);
        onDelete?.(currentEntryId);
        handleNewEntry();
      } catch (error) {
        console.error('Failed to delete entry:', error);
      }
    }
  };

  const handleNewEntry = () => {
    reset({
      title: '',
      body: '',
      tags: '',
    });
    setCurrentEntryId(null);
    setSaveStatus('editing');
    isInitialLoadRef.current = true;
  };

  const getStatusText = () => {
    switch (saveStatus) {
      case 'editing':
        return 'Editing...';
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved ✓';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded" />
        <div className="h-64 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNewEntry}
          >
            New Entry
          </Button>
          {currentEntryId && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteEntry.isPending}
            >
              Delete
            </Button>
          )}
        </div>
        <span
          className={cn(
            'text-sm text-muted-foreground transition-opacity',
            saveStatus === 'saved' && 'text-green-600'
          )}
        >
          {getStatusText()}
        </span>
      </div>

      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Entry title..."
            className="text-2xl font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Content</Label>
          <Textarea
            id="body"
            {...register('body')}
            placeholder="Write your thoughts..."
            rows={10}
            className="resize-none border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            {...register('tags')}
            placeholder="personal, work, ideas..."
            className="border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <p className="text-xs text-muted-foreground">
            Separate tags with commas
          </p>
        </div>
      </form>
    </div>
  );
}
