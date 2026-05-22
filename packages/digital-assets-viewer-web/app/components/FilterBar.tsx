'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAssets } from '@/app/context/AssetContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { AssetType } from '@/app/types/assets';
import { TYPE_LABELS, TYPE_ICONS } from '@/app/lib/fileTypes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

const ASSET_TYPES: AssetType[] = ['image', 'video', 'audio', 'model3d'];

export function FilterBar() {
  const { filters, setFilters, isLoading, scan } = useAssets();
  const [searchInput, setSearchInput] = useState(filters.search);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setFilters]);

  const toggleType = useCallback((type: AssetType) => {
    setFilters({
      types: filters.types.includes(type)
        ? filters.types.filter(t => t !== type)
        : [...filters.types, type],
    });
  }, [filters.types, setFilters]);

  const handleSortByChange = useCallback((value: string) => {
    setFilters({ sortBy: value as 'name' | 'size' | 'modifiedAt' });
  }, [setFilters]);

  const handleSortOrderChange = useCallback((value: string) => {
    setFilters({ sortOrder: value as 'asc' | 'desc' });
  }, [setFilters]);

  return (
    <div className="flex flex-col gap-4 p-4 border-b">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search */}
        <Input
          placeholder="Search assets..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
        />

        {/* Sort By */}
        <Select value={filters.sortBy} onValueChange={handleSortByChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">Size</SelectItem>
            <SelectItem value="modifiedAt">Modified</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Order */}
        <Select value={filters.sortOrder} onValueChange={handleSortOrderChange}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Asc</SelectItem>
            <SelectItem value="desc">Desc</SelectItem>
          </SelectContent>
        </Select>

        {/* Refresh Button */}
        <Button variant="outline" onClick={() => scan()} disabled={isLoading}>
          {isLoading ? 'Scanning...' : 'Refresh'}
        </Button>
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {ASSET_TYPES.map((type) => (
          <Badge
            key={type}
            variant={filters.types.includes(type) ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleType(type)}
          >
            {TYPE_ICONS[type]} {TYPE_LABELS[type]}
          </Badge>
        ))}
        {filters.types.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ types: [] })}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
