'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, User, FileText, Scale, MapPin, Phone, Mail, Calendar } from "lucide-react";
import LoadingSkeleton from "@/components/ui/loading-skeleton";
import { IntakeData } from '@/types/intake';

interface ActivityLog {
  id: string;
  shortDescription: string;
  longDescription?: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
}

interface InformationTabProps {
  intake: IntakeData;
  activityLogs: ActivityLog[];
  loadingActivity: boolean;
  formatDate: (dateString: string | null) => string;
  setActiveTab: (tab: string) => void;
}

export default function InformationTab({
  intake,
  activityLogs,
  loadingActivity,
  formatDate,
  setActiveTab,
}: InformationTabProps) {
  if (loadingActivity) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2 space-y-6">
          <LoadingSkeleton
            message={null}
            rowCount={6}
            cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
            contentClassName="p-4 space-y-3"
            rowWidths={["w-1/3", "w-full", "w-5/6", "w-2/3", "w-3/4", "w-1/2"]}
          />
          <LoadingSkeleton
            message={null}
            rowCount={8}
            cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
            contentClassName="p-4 space-y-3"
            rowWidths={["w-1/3", "w-full", "w-4/5", "w-3/5", "w-2/3", "w-3/4", "w-1/2", "w-2/5"]}
          />
          <LoadingSkeleton
            message={null}
            rowCount={7}
            cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
            contentClassName="p-4 space-y-3"
            rowWidths={["w-1/3", "w-5/6", "w-2/3", "w-3/4", "w-4/5", "w-1/2", "w-3/5"]}
          />
        </div>
        <div className="lg:col-span-1">
          <LoadingSkeleton
            message={null}
            rowCount={5}
            cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
            contentClassName="p-4 space-y-3"
            rowWidths={["w-2/3", "w-full", "w-5/6", "w-3/4", "w-2/3"]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 ">
      <div className="lg:col-span-2 space-y-6">
        {/* Client Information */}
        <Card className="p-2 shadow-[var(--card-shadow)] dark:bg-gray-900">
          <p className="text-lg font-semibold text-foreground mb-0 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Client Information
          </p>
          <Separator className="mb-0" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Client Name</p>
              <p className="text-foreground font-medium">{intake.clientName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="text-foreground font-medium">{intake.gender || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>Phone Number</span>
              </div>
              <p className="text-foreground font-medium">{intake.phoneNumber || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </div>
              <p className="text-foreground font-medium">{intake.email}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Address</span>
              </div>
              <p className="text-foreground font-medium">{intake.address || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">City</p>
              <p className="text-foreground font-medium">{intake.city || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">ZIP</p>
              <p className="text-foreground font-medium">{intake.zip || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Date of Birth</span>
              </div>
              <p className="text-foreground font-medium">{formatDate(intake.dateOfBirth)}</p>
            </div>
          </div>
        </Card>

        {/* Accident Details */}
        <Card className="p-2 shadow-[var(--card-shadow)] dark:bg-gray-900">
          <p className="text-lg font-semibold text-foreground mb-0 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Accident Details
          </p>
          <Separator className="mb-0 " />
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Accident Date</p>
                <p className="text-foreground font-medium">{formatDate(intake.accidentDate)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Accident Time</p>
                <p className="text-foreground font-medium">{intake.accidentTime || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Accident Location</p>
                <p className="text-foreground font-medium">{intake.accidentLocation || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Ambulance</p>
                <p className="text-foreground font-medium">{intake.ambulance ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Accident Description</p>
              <p className="text-foreground leading-relaxed">{intake.accidentDescription || 'N/A'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Injuries</p>
                <p className="text-foreground font-medium">{intake.injuries || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Body Parts Affected</p>
                <p className="text-foreground font-medium">{intake.bodyPartsAffected || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Admitted</p>
                <p className="text-foreground font-medium">{intake.admitted ? 'Yes' : 'No'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Length of Stay</p>
                <p className="text-foreground font-medium">{intake.lengthOfStay || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Ambulance Company</p>
                <p className="text-foreground font-medium">{intake.ambulanceCompany || 'N/A'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Defendant 1 Information */}
        <Card className="p-2 shadow-[var(--card-shadow)] dark:bg-gray-900">
          <p className="text-lg font-semibold text-foreground mb-0 flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Defendant 1 Information
          </p>
          <Separator className="mb-0" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-foreground font-medium">{intake.defendant1Name || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="text-foreground font-medium">{intake.defendant1Address || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Carrier</p>
              <p className="text-foreground font-medium">{intake.defendant1Carrier || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Carrier Phone</p>
              <p className="text-foreground font-medium">{intake.defendant1CarrierPhone || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Policy</p>
              <p className="text-foreground font-medium">{intake.defendant1Policy || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Year</p>
              <p className="text-foreground font-medium">{intake.defendant1Year || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Make</p>
              <p className="text-foreground font-medium">{intake.defendant1Make || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Model</p>
              <p className="text-foreground font-medium">{intake.defendant1Model || 'N/A'}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-sm text-muted-foreground">Damage</p>
              <p className="text-foreground font-medium">{intake.defendant1Damage || 'N/A'}</p>
            </div>
          </div>
        </Card>

        {/* Defendant 2 Information */}
        <Card className="p-2 shadow-[var(--card-shadow)] dark:bg-gray-900">
          <p className="text-lg font-semibold text-foreground mb-0 flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Defendant 2 Information
          </p>
          <Separator className="mb-0" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-foreground font-medium">{intake.defendant2Name || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="text-foreground font-medium">{intake.defendant2Address || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Carrier</p>
              <p className="text-foreground font-medium">{intake.defendant2Carrier || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Carrier Phone</p>
              <p className="text-foreground font-medium">{intake.defendant2CarrierPhone || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Policy</p>
              <p className="text-foreground font-medium">{intake.defendant2Policy || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Year</p>
              <p className="text-foreground font-medium">{intake.defendant2Year || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Make</p>
              <p className="text-foreground font-medium">{intake.defendant2Make || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Model</p>
              <p className="text-foreground font-medium">{intake.defendant2Model || 'N/A'}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-sm text-muted-foreground">Damage</p>
              <p className="text-foreground font-medium">{intake.defendant2Damage || 'N/A'}</p>
            </div>
          </div>
        </Card>

        {/* Auto Insurance */}
        <Card className="p-2 shadow-[var(--card-shadow)] dark:bg-gray-900">
          <p className="text-lg font-semibold text-foreground mb-0 flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Auto Insurance
          </p>
          <Separator className="mb-0" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-foreground font-medium">{intake.autoName || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="text-foreground font-medium">{intake.autoPhone || 'N/A'}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="text-foreground font-medium">{intake.autoAddress || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Carrier</p>
              <p className="text-foreground font-medium">{intake.autoCarrier || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Agent</p>
              <p className="text-foreground font-medium">{intake.autoAgent || 'N/A'}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-sm text-muted-foreground">Policy</p>
              <p className="text-foreground font-medium">{intake.autoPolicy || 'N/A'}</p>
            </div>
          </div>
        </Card>

        {/* Health Insurance */}
        <Card className="p-2 shadow-[var(--card-shadow)] dark:bg-gray-900">
          <p className="text-lg font-semibold text-foreground mb-0 flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Health Insurance
          </p>
          <Separator className="mb-0" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Carrier</p>
              <p className="text-foreground font-medium">{intake.healthCarrier || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="text-foreground font-medium">{intake.healthPhone || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="text-foreground font-medium">{intake.healthType || 'N/A'}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="text-foreground font-medium">{intake.healthAddress || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Group</p>
              <p className="text-foreground font-medium">{intake.healthGroup || 'N/A'}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-sm text-muted-foreground">Policy</p>
              <p className="text-foreground font-medium">{intake.healthPolicy || 'N/A'}</p>
            </div>
          </div>
        </Card>

        {/* Medical Treatment */}
        <Card className="p-2 shadow-[var(--card-shadow)] dark:bg-gray-900">
          <p className="text-lg font-semibold text-foreground mb-0 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Medical Treatment
          </p>
          <Separator className="mb-0" />
          <div className="space-y-6">
            {/* Doctor/Hospital 1 */}
            <div className="border-l-2 border-primary/20 pl-4">
              <p className="text-md font-bold text-foreground mb-2">Doctor/Hospital 1</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="text-foreground font-medium">{intake.doctorHospital1 || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-foreground font-medium">{intake.address1 || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-foreground font-medium">{intake.phone1 || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Treatment Date</p>
                  <p className="text-foreground font-medium">{formatDate(intake.treatmentDate1)}</p>
                </div>
              </div>
            </div>

            {/* Doctor/Hospital 2 */}
            <div className="border-l-2 border-primary/20 pl-4">
              <p className="text-md font-bold text-foreground mb-2">Doctor/Hospital 2</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="text-foreground font-medium">{intake.doctorHospital2 || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-foreground font-medium">{intake.address2 || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-foreground font-medium">{intake.phone2 || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Treatment Date</p>
                  <p className="text-foreground font-medium">{formatDate(intake.treatmentDate2)}</p>
                </div>
              </div>
            </div>

            {/* Doctor/Hospital 3 */}
            <div className="border-l-2 border-primary/20 pl-4">
              <p className="text-md font-bold text-foreground mb-2">Doctor/Hospital 3</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="text-foreground font-medium">{intake.doctorHospital3 || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-foreground font-medium">{intake.address3 || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-foreground font-medium">{intake.phone3 || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Treatment Date</p>
                  <p className="text-foreground font-medium">{formatDate(intake.treatmentDate3)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Prior History */}
        <Card className="p-2 shadow-[var(--card-shadow)] dark:bg-gray-900">
          <p className="text-lg font-semibold text-foreground mb-0 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Prior History
          </p>
          <Separator className="mb-0" />
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Prior Injuries</p>
              <p className="text-foreground leading-relaxed">{intake.priorInjuries || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Prior Insurance Claims</p>
              <p className="text-foreground leading-relaxed">{intake.priorInsuranceClaims || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Prior Attorneys</p>
              <p className="text-foreground leading-relaxed">{intake.priorAttorneys || 'N/A'}</p>
            </div>
          </div>
        </Card>
      </div>
      <div className="lg:col-span-1">
        {/* Recent Activity */}
        <Card className="p-2 shadow-[var(--card-shadow)] sticky top-2 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-0">
            <p className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Activity
            </p>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('activity')}>
              View All Activity
            </Button>
          </div>
          <Separator className="mb-0" />
          {activityLogs.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No activity logs yet.</div>
          ) : (
            <div className="space-y-4">
              {activityLogs.slice(0, 5).map((log, index) => (
                <div key={log.id} className="flex gap-3">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                    {/* Connecting line - don't show for last item */}
                    {index < activityLogs.slice(0, 5).length - 1 && (
                      <div className="w-px h-6 bg-muted-foreground/30 mt-1"></div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <p className="text-sm font-medium text-foreground">{log.shortDescription}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.createdByName || log.createdBy} • {formatDate(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
