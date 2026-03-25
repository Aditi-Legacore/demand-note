'use client';

import React from 'react';
import { Clock } from 'lucide-react';

export default function ComingSoonPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
      <Clock className="w-16 h-16 mb-4 text-gray-500 animate-pulse" />
      <h1 className="text-3xl font-semibold text-gray-800 mb-2">
        Coming Soon...
      </h1>
      <p className="text-gray-500 text-lg max-w-md">
        We’re working hard to bring this page to life. Stay tuned!
      </p>
    </div>
  );
}
