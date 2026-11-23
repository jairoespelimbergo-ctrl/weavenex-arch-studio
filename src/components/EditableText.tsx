import React from 'react';

interface EditableTextProps {
  value: string;
  onChange: (next: string) => void;
  editMode: boolean;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
  className?: string;
}

export function EditableText({
  value,
  onChange,
  editMode,
  as: Tag = 'span',
  className = ''
}: EditableTextProps) {
  if (!editMode) {
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const next = e.currentTarget.textContent ?? '';
        if (next !== value) {
          onChange(next);
        }
      }}
      className={`${className} outline-none ring-1 ring-dashed ring-[#D9381E]/70 focus:ring-2 focus:ring-solid focus:ring-[#D9381E] focus:bg-[#0B0C0E]/60 px-1 -mx-1 transition-all cursor-text`}
      title="Click to edit text"
    >
      {value}
    </Tag>
  );
}
