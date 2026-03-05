'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IntakeData } from '@/types/intake';
import PlaintiffInformationCard from './PlaintiffInformationCard';

interface IntakeInformationTabProps {
  intake: IntakeData;
  formatDate: (dateString: string | null) => string;
}

export default function IntakeInformationTab({ intake, formatDate }: IntakeInformationTabProps) {
  const [showPlaintiffCard, setShowPlaintiffCard] = useState(false);

  return (
    <div className="space-y-6 relative">
      {/* Plaintiff Information at the top - on responsive screens */}
      <div className="block lg:hidden">
        <PlaintiffInformationCard intake={intake} formatDate={formatDate} />
      </div>

      {/* Accident Information */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <p className="text-xl font-bold mb-4 text-green-600">Accident Information</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <p className="text-black dark:text-gray-200"><strong>Date:</strong> {formatDate(intake.accidentDate)}</p>
          <p className="text-black dark:text-gray-200"><strong>Time:</strong> {intake.accidentTime || 'N/A'}</p>
          <p className="text-black dark:text-gray-200"><strong>Location:</strong> {intake.accidentLocation || 'N/A'}</p>
          <p className="text-black dark:text-gray-200 md:col-span-2"><strong>Description:</strong> {intake.accidentDescription || 'N/A'}</p>
        </div>
      </div>

      {/* Defendant 1 Information */}
      {intake.defendant1Name && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <p className="text-xl font-bold mb-4 text-green-600">Defendant 1 Information</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <p className="text-black dark:text-gray-200"><strong>Name:</strong> {intake.defendant1Name}</p>
            <p className="text-black dark:text-gray-200"><strong>Address:</strong> {intake.defendant1Address || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Carrier:</strong> {intake.defendant1Carrier || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Carrier Phone:</strong> {intake.defendant1CarrierPhone || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Year:</strong> {intake.defendant1Year || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Make:</strong> {intake.defendant1Make || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Model:</strong> {intake.defendant1Model || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Damage:</strong> {intake.defendant1Damage || 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Defendant 2 Information */}
      {intake.defendant2Name && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <p className="text-xl font-bold mb-4 text-green-600">Defendant 2 Information</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <p className="text-black dark:text-gray-200"><strong>Name:</strong> {intake.defendant2Name}</p>
            <p className="text-black dark:text-gray-200"><strong>Address:</strong> {intake.defendant2Address || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Carrier:</strong> {intake.defendant2Carrier || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Carrier Phone:</strong> {intake.defendant2CarrierPhone || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Policy:</strong> {intake.defendant2Policy || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Year:</strong> {intake.defendant2Year || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Make:</strong> {intake.defendant2Make || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Model:</strong> {intake.defendant2Model || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Damage:</strong> {intake.defendant2Damage || 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Auto Insurance */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <p className="text-xl font-bold mb-4 text-green-600">Auto Insurance</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <p className="text-black dark:text-gray-200"><strong>Name:</strong> {intake.autoName || 'N/A'}</p>
          <p className="text-black dark:text-gray-200"><strong>Phone:</strong> {intake.autoPhone || 'N/A'}</p>
          <p className="text-black dark:text-gray-200"><strong>Address:</strong> {intake.autoAddress || 'N/A'}</p>
          <p className="text-black dark:text-gray-200"><strong>Agent:</strong> {intake.autoAgent || 'N/A'}</p>
          <p className="text-black dark:text-gray-200"><strong>Policy:</strong> {intake.autoPolicy || 'N/A'}</p>
        </div>
      </div>

      {/* Health Insurance */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <p className="text-xl font-bold mb-4 text-green-600">Health Insurance</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <p className="text-black dark:text-gray-200"><strong>Carrier Name:</strong> {intake.healthCarrier || 'N/A'}</p>
          <p className="text-black dark:text-gray-200"><strong>Phone:</strong> {intake.healthPhone || 'N/A'}</p>
          <p className="text-black dark:text-gray-200"><strong>Address:</strong> {intake.healthAddress || 'N/A'}</p>
          <p className="text-black dark:text-gray-200"><strong>Policy:</strong> {intake.healthPolicy || 'N/A'}</p>
        </div>
      </div>

      {/* Medical Treatment */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <p className="text-xl font-bold mb-4 text-green-600">Medical Treatment</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <p className="text-black dark:text-gray-200"><strong>Ambulance:</strong> {intake.ambulance ? 'Yes' : 'No'}</p>
          <p className="text-black dark:text-gray-200"><strong>Ambulance Company:</strong> {intake.ambulanceCompany || 'N/A'}</p>
          <p className="text-black dark:text-gray-200"><strong>Admitted:</strong> {intake.admitted ? 'Yes' : 'No'}</p>
          <p className="text-black dark:text-gray-200"><strong>Length of Stay:</strong> {intake.lengthOfStay || 'N/A'}</p>
        </div>
        {intake.doctorHospital1 && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
            <h4 className="font-medium text-green-600 mb-2">Treatment 1</h4>
            <p className="text-black dark:text-gray-200"><strong>Doctor/Hospital:</strong> {intake.doctorHospital1}</p>
            <p className="text-black dark:text-gray-200"><strong>Address:</strong> {intake.address1 || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Phone:</strong> {intake.phone1 || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Treatment Date:</strong> {formatDate(intake.treatmentDate1)}</p>
          </div>
        )}
        {intake.doctorHospital2 && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
            <h4 className="font-medium text-green-600 mb-2">Treatment 2</h4>
            <p className="text-black dark:text-gray-200"><strong>Doctor/Hospital:</strong> {intake.doctorHospital2}</p>
            <p className="text-black dark:text-gray-200"><strong>Address:</strong> {intake.address2 || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Phone:</strong> {intake.phone2 || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Treatment Date:</strong> {formatDate(intake.treatmentDate2)}</p>
          </div>
        )}
        {intake.doctorHospital3 && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
            <h4 className="font-medium text-green-600 mb-2">Treatment 3</h4>
            <p className="text-black dark:text-gray-200"><strong>Doctor/Hospital:</strong> {intake.doctorHospital3}</p>
            <p className="text-black dark:text-gray-200"><strong>Address:</strong> {intake.address3 || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Phone:</strong> {intake.phone3 || 'N/A'}</p>
            <p className="text-black dark:text-gray-200"><strong>Treatment Date:</strong> {formatDate(intake.treatmentDate3)}</p>
          </div>
        )}
      </div>

      {/* Injuries */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <p className="text-xl font-bold mb-4 text-green-600">Injuries</p>
        <p className="text-black dark:text-gray-200 mb-2"><strong>Body Parts Affected:</strong> {intake.bodyPartsAffected || 'N/A'}</p>
        <p className="text-black dark:text-gray-200 mb-2"><strong>Prior Injuries:</strong> {intake.priorInjuries || 'N/A'}</p>
        <p className="text-black dark:text-gray-200 mb-2"><strong>Prior Insurance Claims:</strong> {intake.priorInsuranceClaims || 'N/A'}</p>
        <p className="text-black dark:text-gray-200"><strong>Prior Attorneys:</strong> {intake.priorAttorneys || 'N/A'}</p>
      </div>

      {/* Sliding Plaintiff Info Card */}
      {showPlaintiffCard && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowPlaintiffCard(false)}
          />
          {/* Small Card */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 max-h-96 bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-green-600">Plaintiff Information</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPlaintiffCard(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-80">
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
              <X className="w-5 h-5" />
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
