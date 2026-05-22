'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAssets } from '@/app/context/AssetContext';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { TYPE_ICONS } from '@/app/lib/fileTypes';
import { Asset } from '@/app/types/assets';

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  assets: Asset[];
}

function buildTree(assets: Asset[]): TreeNode {
  const root: TreeNode = {
    name: 'root',
    path: '',
    children: new Map(),
    assets: [],
  };

  for (const asset of assets) {
    const parts = asset.relativePath.split('/');
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          children: new Map(),
          assets: [],
        });
      }
      current = current.children.get(part)!;
    }
    current.assets.push(asset);
  }

  return root;
}

function filterEmptyNodes(node: TreeNode): TreeNode | null {
  const filteredChildren = new Map<string, TreeNode>();

  for (const [name, child] of Array.from(node.children.entries())) {
    const filteredChild = filterEmptyNodes(child);
    if (filteredChild !== null) {
      filteredChildren.set(name, filteredChild);
    }
  }

  if (node.assets.length > 0 || filteredChildren.size > 0) {
    return {
      ...node,
      children: filteredChildren,
    };
  }

  return null;
}

function TreeNodeComponent({
  node,
  depth,
  expandedPaths,
  selectedAsset,
  selectedFolder,
  onSelectAsset,
  onToggle,
  onSelectFolder,
}: {
  node: TreeNode;
  depth: number;
  expandedPaths: Set<string>;
  selectedAsset: Asset | null;
  selectedFolder: string | null;
  onSelectAsset: (asset: Asset) => void;
  onToggle: (path: string) => void;
  onSelectFolder: (path: string | null) => void;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren = node.children.size > 0;
  const hasFiles = node.assets.length > 0;
  const isSelected = selectedFolder === node.path;

  if (!hasChildren && !hasFiles) {
    return null;
  }

  const handleFolderClick = () => {
    if (hasChildren) {
      onToggle(node.path);
    }
    // Toggle folder selection
    if (isSelected) {
      onSelectFolder(null);
    } else {
      onSelectFolder(node.path);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 px-2 cursor-pointer hover:bg-accent rounded text-sm ${
          isSelected ? 'bg-accent font-medium' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleFolderClick}
      >
        <span className="text-xs w-4">
          {hasChildren && (isExpanded ? '▼' : '▶')}
        </span>
        <span className="text-muted-foreground">📁</span>
        <span className="truncate">{node.name}</span>
      </div>

      {isExpanded && hasChildren && (
        <>
          {Array.from(node.children.values()).map((child) => (
            <TreeNodeComponent
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedAsset={selectedAsset}
              selectedFolder={selectedFolder}
              onSelectAsset={onSelectAsset}
              onToggle={onToggle}
              onSelectFolder={onSelectFolder}
            />
          ))}
        </>
      )}

      {isExpanded && hasFiles && (
        <>
          {node.assets.map((asset) => (
            <div
              key={asset.id}
              className={`flex items-center gap-1 py-0.5 px-2 cursor-pointer hover:bg-accent rounded text-sm ${
                selectedAsset?.id === asset.id ? 'bg-accent font-medium' : ''
              }`}
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
              onClick={() => onSelectAsset(asset)}
            >
              <span className="text-xs w-4"></span>
              <span>{TYPE_ICONS[asset.type]}</span>
              <span className="truncate">{asset.name}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function FileTree() {
  const { assets, selectedAsset, selectedFolder, selectAsset, selectFolder } = useAssets();
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const isInternalSelect = useRef(false);

  const filteredTree = useMemo(() => {
    const tree = buildTree(assets);
    return filterEmptyNodes(tree);
  }, [assets]);

  // Auto-expand when selectedAsset changes
  useEffect(() => {
    if (selectedAsset && filteredTree) {
      const parts = selectedAsset.relativePath.split('/');
      const pathsToExpand: string[] = [];

      let current = filteredTree;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current.children.has(part)) {
          const childPath = parts.slice(0, i + 1).join('/');
          pathsToExpand.push(childPath);
          current = current.children.get(part)!;
        } else {
          break;
        }
      }

      if (pathsToExpand.length > 0) {
        isInternalSelect.current = true;
        setExpandedPaths((prev) => {
          const next = new Set(prev);
          pathsToExpand.forEach((p) => next.add(p));
          return next;
        });
        // Reset flag after state update
        setTimeout(() => {
          isInternalSelect.current = false;
        }, 0);
      }
    }
  }, [selectedAsset, filteredTree]);

  // Auto-expand first level on mount
  useEffect(() => {
    if (filteredTree && filteredTree.children.size > 0 && expandedPaths.size === 0) {
      setExpandedPaths(
        new Set(
          Array.from(filteredTree.children.values()).map((c) => c.path)
        )
      );
    }
  }, [filteredTree]);

  const togglePath = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  if (!filteredTree) {
    return (
      <div className="h-full flex flex-col border-r bg-card">
        <div className="p-2 border-b">
          <h2 className="font-semibold text-sm">Files</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">No assets found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-r bg-card">
      <div className="p-2 border-b">
        <h2 className="font-semibold text-sm">Files</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-2">
          {Array.from(filteredTree.children.values()).map((child) => (
            <TreeNodeComponent
              key={child.path}
              node={child}
              depth={0}
              expandedPaths={expandedPaths}
              selectedAsset={selectedAsset}
              selectedFolder={selectedFolder}
              onSelectAsset={selectAsset}
              onToggle={togglePath}
              onSelectFolder={selectFolder}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
