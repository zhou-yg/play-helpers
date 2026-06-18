import React, { useState, useEffect, useCallback } from 'react';
import { TerrainConfig, TerrainDef, DecorationDef } from '@/lib/types';

interface ConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  configs: TerrainConfig[];
  terrainDefs: TerrainDef[];
  decorationDefs: DecorationDef[];
  onSave: (config: TerrainConfig) => void;
  onDelete: (index: number) => void;
}

export default function ConfigDrawer({
  isOpen,
  onClose,
  configs,
  terrainDefs,
  decorationDefs,
  onSave,
  onDelete,
}: ConfigDrawerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState('');
  const [terrainType, setTerrainType] = useState(terrainDefs[0]?.id || 'grass');
  const [heightMin, setHeightMin] = useState(0);
  const [heightMax, setHeightMax] = useState(10);
  const [selectedDecs, setSelectedDecs] = useState<string[]>([]);

  const resetForm = useCallback(() => {
    setName('');
    setTerrainType(terrainDefs[0]?.id || 'grass');
    setHeightMin(0);
    setHeightMax(10);
    setSelectedDecs([]);
    setEditingIndex(null);
    setIsNew(false);
  }, [terrainDefs]);

  const startEdit = useCallback(
    (index: number) => {
      const config = configs[index];
      if (config) {
        setName(config.name);
        setTerrainType(config.terrainType);
        setHeightMin(config.heightRange[0]);
        setHeightMax(config.heightRange[1]);
        setSelectedDecs(config.decorations);
        setEditingIndex(index);
        setIsNew(false);
      }
    },
    [configs],
  );

  const startNew = useCallback(() => {
    resetForm();
    setIsNew(true);
  }, [resetForm]);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    const config: TerrainConfig = {
      name: name.trim(),
      terrainType,
      height: 0,
      heightRange: [heightMin, heightMax],
      decorations: selectedDecs,
    };
    onSave(config);
    resetForm();
  }, [name, terrainType, heightMin, heightMax, selectedDecs, onSave, resetForm]);

  const toggleDecoration = useCallback((decId: string) => {
    setSelectedDecs((prev) =>
      prev.includes(decId) ? prev.filter((d) => d !== decId) : [...prev, decId],
    );
  }, []);

  const isEditing = editingIndex !== null || isNew;

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className={`config-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>Terrain Configs</h3>
          <button className="drawer-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="drawer-content">
          <div className="config-list">
            {configs.map((config, index) => (
              <div key={index} className="config-item">
                <div className="config-item-header">
                  <span className="config-name">{config.name}</span>
                  <span className="config-type">
                    {terrainDefs.find((t) => t.id === config.terrainType)?.icon}{' '}
                    {config.terrainType}
                  </span>
                </div>
                <div className="config-item-details">
                  <span>Height: {config.heightRange[0]}–{config.heightRange[1]}</span>
                </div>
                <div className="config-item-decorations">
                  {config.decorations.length === 0 ? (
                    <span className="no-decorations">No decorations</span>
                  ) : (
                    config.decorations.map((decId) => {
                      const def = decorationDefs.find((d) => d.id === decId);
                      return (
                        <span key={decId} className="dec-tag" title={def?.name}>
                          {def?.icon || decId}
                        </span>
                      );
                    })
                  )}
                </div>
                <div className="config-item-actions">
                  <button className="config-btn" onClick={() => startEdit(index)}>
                    Edit
                  </button>
                  <button
                    className="config-btn delete"
                    onClick={() => onDelete(index)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!isEditing && (
            <button className="add-new" onClick={startNew}>
              + Add New Config
            </button>
          )}

          {isEditing && (
            <div className="config-editor">
              <h4>{isNew ? 'New Config' : 'Edit Config'}</h4>
              <div className="editor-field">
                <label>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Config name"
                />
              </div>
              <div className="editor-field">
                <label>Terrain Type</label>
                <select value={terrainType} onChange={(e) => setTerrainType(e.target.value)}>
                  {terrainDefs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="editor-field">
                <label>Height Range</label>
                <div className="range-inputs">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={heightMin}
                    onChange={(e) => setHeightMin(Number(e.target.value))}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={heightMax}
                    onChange={(e) => setHeightMax(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="editor-field">
                <label>Decorations</label>
                <div className="decoration-toggles">
                  {decorationDefs.map((dec) => (
                    <button
                      key={dec.id}
                      className={`dec-toggle ${selectedDecs.includes(dec.id) ? 'active' : ''}`}
                      onClick={() => toggleDecoration(dec.id)}
                      title={dec.name}
                    >
                      {dec.icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="editor-actions">
                <button className="config-btn save" onClick={handleSave}>
                  Save
                </button>
                <button className="config-btn cancel" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
