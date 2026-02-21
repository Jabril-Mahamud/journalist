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
import { useApi, FocusPoint } from "@/lib/api";

interface TagComboboxProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

export function TagCombobox({
    value,
    onChange,
    placeholder = "Add focus points...",
}: TagComboboxProps) {
    const [inputValue, setInputValue] = React.useState("");
    const [existingFocusPoints, setExistingFocusPoints] = React.useState<
        FocusPoint[]
    >([]);
    const [loading, setLoading] = React.useState(true);
    const api = useApi();

    React.useEffect(() => {
        loadFocusPoints();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadFocusPoints = async () => {
        try {
            const points = await api.getFocusPoints();
            setExistingFocusPoints(points);
        } catch (error) {
            console.error("Error loading focus points:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (focusPoint: string) => {
        const trimmedPoint = focusPoint.trim().toLowerCase();
        if (trimmedPoint && !value.includes(trimmedPoint)) {
            onChange([...value, trimmedPoint]);
            setInputValue("");
        }
    };

    const handleRemove = (focusPointToRemove: string) => {
        onChange(value.filter((point) => point !== focusPointToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && inputValue) {
            e.preventDefault();
            handleSelect(inputValue);
        }
    };

    const filteredSuggestions = existingFocusPoints.filter(
        (point) =>
            !value.includes(point.name) &&
            point.name.includes(inputValue.toLowerCase()),
    );

    const showCreateNew =
        inputValue &&
        !existingFocusPoints.some(
            (point) => point.name.toLowerCase() === inputValue.toLowerCase(),
        );

    return (
        <div className="space-y-3">
            {/* Selected Focus Points */}
            {value.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {value.map((focusPoint) => (
                        <Badge
                            key={focusPoint}
                            variant="secondary"
                            className="gap-1 pr-1 capitalize"
                        >
                            {focusPoint}
                            <button
                                type="button"
                                onClick={() => handleRemove(focusPoint)}
                                className="ml-1 rounded-sm hover:bg-secondary-foreground/20 p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Command Component */}
            <Command className="border">
                <CommandInput
                    placeholder={placeholder}
                    value={inputValue}
                    onValueChange={setInputValue}
                    onKeyDown={handleKeyDown}
                />
                <CommandList>
                    {!loading && filteredSuggestions.length === 0 && !showCreateNew && (
                        <CommandEmpty>No focus points found.</CommandEmpty>
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
                        <CommandGroup heading="Existing Focus Points">
                            {filteredSuggestions.map((point) => (
                                <CommandItem
                                    key={point.id}
                                    value={point.name}
                                    onSelect={() => handleSelect(point.name)}
                                    className="capitalize"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value.includes(point.name) ? "opacity-100" : "opacity-0",
                                        )}
                                    />
                                    <span
                                        className="w-2 h-2 rounded-full mr-2"
                                        style={{ backgroundColor: point.color }}
                                    />
                                    {point.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </Command>
        </div>
    );
}
