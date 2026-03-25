'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchbarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

const Searchbar: React.FC<SearchbarProps> = ({ 
  placeholder = "Search...", 
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
}) => {
  const [internalValue, setInternalValue] = useState('');
  const isControlled = value !== undefined;
  const inputValue = isControlled ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <div className="flex items-center gap-2 border-2 rounded-md px-4 py-2 w-full max-w-md bg-gray-100 dark:bg-gray-500 dark:border-gray-700">
      <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="bg-transparent outline-none w-full text-sm text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
      />
    </div>
  );
};

export default Searchbar;

