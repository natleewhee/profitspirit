"use client";

import { THEME_OPTIONS, STATUS_OPTIONS } from "@/lib/labels";

type Props = {
  theme: string;
  status: string;
  onThemeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export function FilterBar({ theme, status, onThemeChange, onStatusChange }: Props) {
  return (
    <div className="flex flex-wrap gap-4">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Theme</span>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
        >
          <option value="ALL">All themes</option>
          {THEME_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Status</span>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
