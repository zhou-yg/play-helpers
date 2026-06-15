import React, { useState, useCallback } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultExpanded = false,
  children,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <div className={`collapsible-section ${expanded ? 'collapsible-section-expanded' : ''}`}>
      <button className="collapsible-header" onClick={handleToggle}>
        <span className="collapsible-title">{title}</span>
        <span className={`collapsible-arrow ${expanded ? 'collapsible-arrow-down' : ''}`}>▸</span>
      </button>
      {expanded && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
};
