import React from 'react';
import { Mail, X } from 'lucide-react';
import { Button } from './ui/button';

interface Message {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  time: string;
  read: boolean;
}

const dummyMessages: Message[] = [
  {
    id: '1',
    sender: 'John Doe',
    subject: 'Update on Case #1234',
    preview: 'Hi, I wanted to provide an update on the case...',
    time: '5 minutes ago',
    read: false,
  },
  {
    id: '2',
    sender: 'Jane Smith',
    subject: 'Document Review Required',
    preview: 'Please review the attached documents for the upcoming hearing...',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '3',
    sender: 'Legal Team',
    subject: 'Meeting Reminder',
    preview: 'Reminder: Team meeting scheduled for tomorrow at 2 PM.',
    time: '2 hours ago',
    read: true,
  },
  {
    id: '4',
    sender: 'Client Support',
    subject: 'Welcome to Legacore',
    preview: 'Thank you for choosing our services. Here\'s how to get started...',
    time: '1 day ago',
    read: true,
  },
].slice(0, 4);

interface MessagesDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessagesDropdown: React.FC<MessagesDropdownProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50" data-messages>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            <h5 className="font-normal text-gray-900 dark:text-white text-xs">Messages</h5>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-6 w-6"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {dummyMessages.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No messages
          </div>
        ) : (
          dummyMessages.map((message) => (
            <div
              key={message.id}
              className={`p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                message.read ? '' : 'bg-blue-50 dark:bg-blue-900/10'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h6 className="font-medium text-xs text-gray-900 dark:text-white truncate">
                      {message.sender}
                    </h6>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                      {message.time}
                    </span>
                  </div>
                  <h6 className="font-medium text-xs text-gray-700 dark:text-gray-200 mb-1 truncate">
                    {message.subject}
                  </h6>
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                    {message.preview}
                  </p>
                </div>
                {!message.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0"></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <Button variant="ghost" className="w-full text-sm" onClick={onClose}>
          View All Messages
        </Button>
      </div>
    </div>
  );
};

export default MessagesDropdown;
