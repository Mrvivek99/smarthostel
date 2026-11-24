'use client';
import { Search, X } from 'lucide-react';

export function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={`relative ${className}`} role="search">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-10 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-navy-400 hover:text-navy-700">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
