'use client';

import React from 'react';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PlaintiffInformationCard from './PlaintiffInformationCard';
import LoadingSkeleton from '@/components/ui/loading-skeleton';
import { IntakeData } from '@/types/intake';

interface ActivityLog {
  id: string;
  shortDescription: string;
  longDescription?: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
}

interface ActivityLogTabProps {
  activityLogs: ActivityLog[];
  loadingActivity: boolean;
  newActivityAction: string;
  setNewActivityAction: (value: string) => void;
  newActivityDetails: string;
  setNewActivityDetails: (value: string) => void;
  addActivityLog: () => void;
  formatDate: (dateString: string | null) => string;
  intake: IntakeData;
  showPlaintiffCard: boolean;
  setShowPlaintiffCard: (show: boolean) => void;
}

export default function ActivityLogTab({
  activityLogs,
  loadingActivity,
  formatDate,
  intake,
  showPlaintiffCard,
  setShowPlaintiffCard,
}: ActivityLogTabProps) {
  return (
    <div className="relative">
      {/* Plaintiff Info Button at top right */}
      <div className="flex justify-end mb-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPlaintiffCard(!showPlaintiffCard)}
          className="bg-green-600 text-white hover:bg-green-700 rounded-full p-3 shadow-lg lg:hidden"
          title="Plaintiff Info Button"
        >
          <User className="w-5 h-5" />
        </Button>
      </div>

      <Card className="w-full dark:bg-gray-900 bg-white shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
        {loadingActivity ? (
          <LoadingSkeleton
            message={null}
            rowCount={3}
            cardClassName="shadow-none border-none bg-transparent"
            contentClassName="p-0 space-y-3"
            rowWidths={["w-full", "w-5/6", "w-4/6"]}
          />
        ) : (
          <div className="space-y-6">
            {activityLogs.map((log, index) => (
              <div key={log.id} className="flex gap-4">
                {/* Left side - Timeline with icon */}
                <div className="flex flex-col items-center">
                  {/* Icon circle */}
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  
                  {/* Connecting line - don't show for last item */}
                  {index < activityLogs.length - 1 && (
                    <div className="w-0.5 h-full min-h-[40px] bg-gray-300 dark:bg-gray-600 mt-2"></div>
                  )}
                </div>

                {/* Right side - Description */}
                <div className="flex-1">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {log.shortDescription}
                    </p>
                    {log.longDescription && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        {log.longDescription}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      {formatDate(log.createdAt)} by {log.createdByName || log.createdBy}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {activityLogs.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No activity logs yet
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Sliding Plaintiff Info Card */}
    {showPlaintiffCard && (
      <div className="fixed inset-0 z-50 lg:hidden">
        {/* Centered Responsive Card */}
        <div className="absolute top-1/2 left-1/2 w-[90vw] h-[80vh] bg-white dark:bg-gray-900 shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ease-in-out rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPlaintiffCard(false)}
            className="absolute top-2 right-2 z-10 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </Button>
          <div className="p-4 overflow-y-auto h-full pt-10">
            <PlaintiffInformationCard intake={intake} formatDate={formatDate} />
          </div>
        </div>
      </div>
    )}

    {/* Desktop small card */}
    {showPlaintiffCard && (
      <div className="hidden lg:block absolute top-0 right-0 w-80 bg-white dark:bg-gray-900 shadow-lg rounded-lg transform transition-transform duration-300 ease-in-out z-10">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-green-600">Plaintiff Information</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPlaintiffCard(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </Button>
        </div>
        <div className="p-4 overflow-y-auto max-h-96">
          <PlaintiffInformationCard intake={intake} formatDate={formatDate} />
        </div>
      </div>
    )}
  </div>
  );
}
