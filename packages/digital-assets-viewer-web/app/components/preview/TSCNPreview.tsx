'use client';

import { useEffect, useState } from 'react';
import { ScrollArea } from '@/app/components/ui/scroll-area';

interface TSCNPreviewProps {
  filePath: string;
}

export function TSCNPreview({ filePath }: TSCNPreviewProps) {
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        const response = await fetch(
          `/api/file?path=${encodeURIComponent(filePath)}`
        );
        if (response.ok) {
          const text = await response.text();
          setContent(text);
        } else {
          setError('Failed to load file');
        }
      } catch {
        setError('Failed to load file');
      }
    }
    fetchContent();
  }, [filePath]);

  if (error) {
    return <div className="p-4 text-destructive">{error}</div>;
  }

  return (
    <ScrollArea className="h-full">
      <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-all">
        {content || 'Loading...'}
      </pre>
    </ScrollArea>
  );
}
