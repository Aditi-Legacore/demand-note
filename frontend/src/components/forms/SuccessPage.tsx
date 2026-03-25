import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuccessPageProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  onContinue?: () => void;
  continueText?: string;
  isEmbedded?: boolean;
}

const SuccessPage: React.FC<SuccessPageProps> = ({
  title,
  message,
  icon,
  onContinue,
  continueText = "Continue",
  isEmbedded = false
}) => {
  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else if (isEmbedded && typeof window !== 'undefined' && window.self !== window.top) {
      window.parent.postMessage('formCompleted', '*');
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
          {icon || <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        {onContinue && (
          <Button
            onClick={handleContinue}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {continueText}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SuccessPage;
