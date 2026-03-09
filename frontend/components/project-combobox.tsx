"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Project } from "@/lib/api";
import { useProjects } from "@/lib/hooks/useEntries";

// ⚡ Replaced manual loadProjects() + useEffect with useProjects() hook.
// The hook reads from React Query's shared cache, so if the Prefetcher
// (or any other page) has already fetched projects, this renders
// instantly with zero extra network requests.

interface ProjectComboboxProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

export function ProjectCombobox({
    value,
    onChange,
    placeholder = "Add projects...",
}: ProjectComboboxProps) {
    const [inputValue, setInputValue] = React.useState("");
    const { data: existingProjects = [], isLoading: loading } = useProjects();

    const handleSelect = (project: string) => {
        const trimmedProject = project.trim().toLowerCase();
        if (trimmedProject && !value.includes(trimmedProject)) {
            onChange([...value, trimmedProject]);
            setInputValue("");
        }
    };

    const handleRemove = (projectToRemove: string) => {
        onChange(value.filter((project) => project !== projectToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && inputValue) {
            e.preventDefault();
            handleSelect(inputValue);
        }
    };

    const filteredSuggestions = existingProjects.filter(
        (project: Project) =>
            !value.includes(project.name) &&
            project.name.includes(inputValue.toLowerCase()),
    );

    const showCreateNew =
        inputValue &&
        !existingProjects.some(
            (project: Project) => project.name.toLowerCase() === inputValue.toLowerCase(),
        );

    return (
        <div className="space-y-3">
            {value.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {value.map((project) => (
                        <Badge
                            key={project}
                            variant="secondary"
                            className="gap-1 pr-1 capitalize"
                        >
                            {project}
                            <button
                                type="button"
                                onClick={() => handleRemove(project)}
                                className="ml-1 rounded-sm hover:bg-secondary-foreground/20 p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            <Command className="border">
                <CommandInput
                    placeholder={placeholder}
                    value={inputValue}
                    onValueChange={setInputValue}
                    onKeyDown={handleKeyDown}
                />
                <CommandList>
                    {!loading && filteredSuggestions.length === 0 && !showCreateNew && (
                        <CommandEmpty>No projects found.</CommandEmpty>
                    )}

                    {showCreateNew && (
                        <CommandGroup heading="Create New">
                            <CommandItem
                                value={inputValue}
                                onSelect={() => handleSelect(inputValue)}
                                className="text-primary"
                            >
                                <Check className="mr-2 h-4 w-4 opacity-0" />
                                Create &ldquo;{inputValue}&rdquo;
                            </CommandItem>
                        </CommandGroup>
                    )}

                    {filteredSuggestions.length > 0 && (
                        <CommandGroup heading="Existing Projects">
                            {filteredSuggestions.map((project: Project) => (
                                <CommandItem
                                    key={project.id}
                                    value={project.name}
                                    onSelect={() => handleSelect(project.name)}
                                    className="capitalize"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value.includes(project.name) ? "opacity-100" : "opacity-0",
                                        )}
                                    />
                                    <span
                                        className="w-2 h-2 rounded-full mr-2"
                                        style={{ backgroundColor: project.color }}
                                    />
                                    {project.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </Command>
        </div>
    );
}