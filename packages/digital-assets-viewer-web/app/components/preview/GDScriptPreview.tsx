'use client';

import { useEffect, useState, useCallback } from 'react';
import hljs from 'highlight.js/lib/core';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Button } from '@/app/components/ui/button';

interface GDScriptPreviewProps {
  filePath: string;
}

// Basic GDScript patterns for highlighting
const GDSCRIPT_KEYWORDS = [
  'extends', 'class_name', 'func', 'var', 'const', 'enum', 'signal', 'export',
  'onready', 'remote', 'sync', 'master', 'puppet', 'tool', 'static', 'virtual',
  'override', 'if', 'elif', 'else', 'match', 'for', 'while', 'do', 'break',
  'continue', 'return', 'pass', 'match', 'in', 'and', 'or', 'not', 'is', 'as',
  'true', 'false', 'null', 'void', 'self', 'yield', 'await', 'breakpoint',
];

export function GDScriptPreview({ filePath }: GDScriptPreviewProps) {
  const [content, setContent] = useState<string>('');
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const highlightGDScript = useCallback((code: string): string => {
    // Escape HTML
    let result = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Highlight strings (including GDScript f-strings)
    result = result.replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="hljs-string">$&</span>');

    // Highlight comments (#)
    result = result.replace(/(#.*)$/gm, '<span class="hljs-comment">$1</span>');

    // Highlight numbers
    result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="hljs-number">$1</span>');

    // Highlight keywords
    const keywordPattern = new RegExp(`\\b(${GDSCRIPT_KEYWORDS.join('|')})\\b`, 'g');
    result = result.replace(keywordPattern, '<span class="hljs-keyword">$1</span>');

    // Highlight functions (words followed by '(')
    result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span class="hljs-function">$1</span>(');

    // Highlight built-in types (Vector2, Node, etc.)
    result = result.replace(/\b(Vector2|Vector3|Color|Rect2|Node|Node2D|Node3D|Spatial|Control|CanvasItem|Resource|Reference|Object|GDScript|Array|Dictionary|PackedStringArray|PackedInt32Array|PackedFloat32Array|PackedVector2Array|PackedVector3Array|String|int|float|bool)\b/g, '<span class="hljs-built_in">$1</span>');

    return result;
  }, []);

  useEffect(() => {
    async function fetchContent() {
      try {
        const response = await fetch(
          `/api/file?path=${encodeURIComponent(filePath)}`
        );
        if (response.ok) {
          const text = await response.text();
          setContent(text);
          try {
            const highlighted = highlightGDScript(text);
            setHighlightedCode(highlighted);
          } catch {
            setHighlightedCode(text);
          }
        } else {
          setError('Failed to load file');
        }
      } catch {
        setError('Failed to load file');
      }
    }
    fetchContent();
  }, [filePath, highlightGDScript]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
  }, [content]);

  if (error) {
    return <div className="p-4 text-destructive">{error}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          Copy
        </Button>
      </div>

      {/* Code */}
      <ScrollArea className="flex-1">
        <pre className="gdscript-code p-4 text-sm">
          {highlightedCode ? (
            <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          ) : (
            <code>{content || 'Loading...'}</code>
          )}
        </pre>
      </ScrollArea>
    </div>
  );
}
