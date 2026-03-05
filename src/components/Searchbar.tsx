'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchbarProps {
  placeholder?: string;
  onChange?: (value: string) => void;
}

const Searchbar: React.FC<SearchbarProps> = ({ 
  placeholder = "Search…", 
  onChange 
}) => {
  const [value, setValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="flex items-center gap-2 border-2 rounded-md px-4 py-2 w-full max-w-md bg-gray-100 dark:bg-gray-500 dark:border-gray-700">
      <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="bg-transparent outline-none w-full text-sm text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
      />
    </div>
  );
};

export default Searchbar;