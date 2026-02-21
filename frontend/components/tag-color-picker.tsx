"use client"

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

const COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#14b8a6", "#3b82f6", "#6366f1", "#a855f7",
    "#ec4899", "#f43f5e", "#84cc16", "#06b6d4",
    "#8b5cf6", "#d946ef", "#64748b", "#78716c",
]

interface TagColorPickerProps {
    color: string
    onChange: (color: string) => void
}

export function TagColorPicker({ color, onChange }: TagColorPickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className="w-6 h-6 rounded-md border border-border cursor-pointer"
                    style={{ backgroundColor: color }}
                />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
                <div className="grid grid-cols-8 gap-1">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            className={`w-6 h-6 rounded-md cursor-pointer border-2 transition-opacity hover:opacity-90 ${
                                color === c ? 'border-ring' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: c }}
                            onClick={() => onChange(c)}
                        />
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
