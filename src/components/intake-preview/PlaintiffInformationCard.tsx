'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IntakeData } from '@/types/intake';

interface PlaintiffInformationCardProps {
  intake: IntakeData;
  formatDate: (dateString: string | null) => string;
}

export default function PlaintiffInformationCard({ intake, formatDate }: PlaintiffInformationCardProps) {
  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-green-600">Plaintiff Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
            <p className="text-black dark:text-gray-200">{intake.clientName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gender</p>
            <p className="text-black dark:text-gray-200">{intake.gender || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
            <p className="text-black dark:text-gray-200">{intake.phoneNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
            <p className="text-black dark:text-gray-200">{intake.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</p>
            <p className="text-black dark:text-gray-200">{intake.address || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">City</p>
            <p className="text-black dark:text-gray-200">{intake.city || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Zip</p>
            <p className="text-black dark:text-gray-200">{intake.zip || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</p>
            <p className="text-black dark:text-gray-200">{formatDate(intake.dateOfBirth)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
