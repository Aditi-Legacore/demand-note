'use client';

import React from 'react';
import { X } from 'lucide-react';
import LightDarkMode from './ui/theme/LightDarkMode';
import ColorCustomization from './ui/theme/ColorCustomization';
import ThemeDirection from './ui/theme/ThemeDirection';
import { useTheme } from '@/contexts/ThemeContext';

interface SettingsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ isOpen, onClose }) => {
  const { direction } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-transparent bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`relative ${direction === 'rtl' ? 'mr-auto' : 'ml-auto'} w-80 max-w-[90vw] h-full bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Theme Mode */}
            <LightDarkMode />

            {/* Primary Color */}
            <ColorCustomization />

            {/* Direction */}
            <ThemeDirection />

            {/* Other Settings */}
            <div>
              <h6 className="text-sm font-semibold text-foreground mb-4">Account</h6>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  My Profile
                </button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  Inbox
                </button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  Notifications
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsSidebar;
