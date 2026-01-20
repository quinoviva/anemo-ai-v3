
'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TagInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  placeholder?: string;
  value: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({
  placeholder,
  value = [],
  onChange,
  className,
  ...props
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !value.includes(trimmedValue)) {
      const newTags = [...value, trimmedValue];
      onChange(newTags);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = value.filter((tag) => tag !== tagToRemove);
    onChange(newTags);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap gap-2 mb-2 min-h-[24px]">
        {value.map((tag, index) => (
          <Badge key={index} variant="secondary" className="px-2 py-1 text-sm flex items-center gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X size={14} />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={placeholder || 'Type and press Enter...'}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="flex-1"
          {...props}
        />
        <Button type="button" variant="outline" onClick={addTag} disabled={!inputValue.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}
