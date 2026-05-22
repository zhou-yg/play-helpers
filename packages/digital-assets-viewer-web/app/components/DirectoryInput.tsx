'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAssets } from '@/app/context/AssetContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

const STORAGE_KEY = 'dam-viewer-path-history';
const LAST_PATH_KEY = 'dam-viewer-last-path';
const MAX_HISTORY = 20;

export function DirectoryInput() {
  const { scan } = useAssets();
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load history and last path from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const lastPath = localStorage.getItem(LAST_PATH_KEY);
    if (lastPath) {
      setInputValue(lastPath);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveToHistory = useCallback((path: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((p) => p !== path);
      const newHistory = [path, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
    localStorage.setItem(LAST_PATH_KEY, path);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue.trim()) {
        const path = inputValue.trim();
        saveToHistory(path);
        setIsEditing(false);
        setIsOpen(false);
        // Trigger rescan with new path
        scan(path);
      }
    },
    [inputValue, saveToHistory, scan]
  );

  const handleHistorySelect = useCallback(
    (path: string) => {
      setInputValue(path);
      setIsOpen(false);
      saveToHistory(path);
      scan(path);
    },
    [saveToHistory, scan]
  );

  const handleRemoveHistory = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      setHistory((prev) => {
        const newHistory = prev.filter((p) => p !== path);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
        return newHistory;
      });
    },
    []
  );

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter project path (e.g. ~/godot/my-project)"
          className="w-64"
          autoFocus
        />
        <Button type="submit" size="sm">
          Go
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsEditing(false);
            setInputValue(localStorage.getItem(LAST_PATH_KEY) || '');
          }}
        >
          Cancel
        </Button>
      </form>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="max-w-[200px] truncate"
        >
          📁 {inputValue || 'Select directory'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
          ▼
        </Button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-popover border rounded-md shadow-lg z-50">
          {history.length > 0 ? (
            <div className="p-2 max-h-64 overflow-y-auto">
              <p className="text-xs text-muted-foreground px-2 pb-1">
                Recent directories
              </p>
              {history.map((path, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 hover:bg-accent rounded cursor-pointer text-sm"
                  onClick={() => handleHistorySelect(path)}
                >
                  <span className="truncate flex-1">{path}</span>
                  <button
                    className="text-muted-foreground hover:text-destructive px-1"
                    onClick={(e) => handleRemoveHistory(e, path)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No recent directories
            </div>
          )}
        </div>
      )}
    </div>
  );
}
