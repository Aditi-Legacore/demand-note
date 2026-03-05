'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { ApexOptions } from 'apexcharts';
import {
  LayoutDashboard,
  PieChart,
  TrendingUp,
} from 'lucide-react';

import ResetPasswordModal from '@/components/auth/ResetPasswordModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type IntakeRecord = {
  id: string;
  createdAt: string;
  isDraft: boolean;
};

type LeadRecord = {
  id: string;
  createdAt: string;
  status: string;
};

type UserRecord = {
  id: string;
  status: boolean;
};

type DemandNoteRecord = {
  id: string;
  updatedAt: string;
  status?: string;
};

type AdminUsersResponse = {
  users?: UserRecord[];
};

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });


function toSafeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getPastSevenDaysLabels(): string[] {
  const labels: string[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
  }

  return labels;
}

function getDailyCountsForPastWeek(dates: string[]): number[] {
  const counts = new Array(7).fill(0);
  const now = new Date();

  dates.forEach((dateStr) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return;

    const diffMs = now.getTime() - date.getTime();
    const dayDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (dayDiff >= 0 && dayDiff < 7) {
      const index = 6 - dayDiff;
      counts[index] += 1;
    }
  });

  return counts;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [showReset, setShowReset] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [intakes, setIntakes] = useState<IntakeRecord[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [demandNotes, setDemandNotes] = useState<DemandNoteRecord[]>([]);

  useEffect(() => {
    if (
      session?.user?.status === true &&
      session?.user?.forcePasswordReset === false
    ) {
      setShowReset(true);
    }
  }, [session]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoadingData(true);

      try {
        const [intakesRes, leadsRes, usersRes, notesRes] = await Promise.all([
          fetch('/api/intake'),
          fetch('/api/leads'),
          fetch('/api/admin/users'),
          fetch('/api/demand-notes'),
        ]);

        const [intakesJson, leadsJson, usersJson, notesJson] = await Promise.all([
          intakesRes.ok ? intakesRes.json() : Promise.resolve([]),
          leadsRes.ok ? leadsRes.json() : Promise.resolve([]),
          usersRes.ok ? usersRes.json() : Promise.resolve({ users: [] }),
          notesRes.ok ? notesRes.json() : Promise.resolve([]),
        ]);

        setIntakes(toSafeArray<IntakeRecord>(intakesJson));
        setLeads(toSafeArray<LeadRecord>(leadsJson));

        const usersPayload = (usersJson as AdminUsersResponse) || {};
        setUsers(toSafeArray<UserRecord>(usersPayload.users));

        setDemandNotes(toSafeArray<DemandNoteRecord>(notesJson));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setIntakes([]);
        setLeads([]);
        setUsers([]);
        setDemandNotes([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (status === 'authenticated') {
      void fetchDashboardData();
    }
  }, [status]);

  const totalCases = intakes.length;
  const completedCases = intakes.filter((intake) => !intake.isDraft).length;
  const draftCases = intakes.filter((intake) => intake.isDraft).length;
  const openLeads = leads.filter((lead) => lead.status !== 'completed').length;
  const completedLeads = leads.filter(
    (lead) => lead.status.toLowerCase() === 'completed'
  ).length;
  const newLeads = leads.filter((lead) => lead.status.toLowerCase() === 'new').length;
  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status).length;
  const inactiveUsers = totalUsers - activeUsers;
  const totalDemandNotes = demandNotes.length;
  const completedDemandNotes = demandNotes.filter((note) => {
    const noteStatus = (note.status || '').toLowerCase();
    return noteStatus === 'completed' || noteStatus === 'published';
  }).length;
  const draftDemandNotes = demandNotes.filter(
    (note) => (note.status || '').toLowerCase() === 'draft'
  ).length;
  const demandNoteCompletionRate =
    totalDemandNotes > 0 ? Math.round((completedDemandNotes / totalDemandNotes) * 100) : 0;

  const weekLabels = useMemo(() => getPastSevenDaysLabels(), []);

  const weeklyActivityData = useMemo(() => {
    const intakeDates = intakes.map((item) => item.createdAt);
    const noteDates = demandNotes.map((item) => item.updatedAt);
    return getDailyCountsForPastWeek([...intakeDates, ...noteDates]);
  }, [intakes, demandNotes]);

  const radialSeries = [demandNoteCompletionRate];

  const radialOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'radialBar',
        sparkline: { enabled: true },
      },
      plotOptions: {
        radialBar: {
          hollow: { size: '62%' },
          dataLabels: {
            name: {
              show: true,
              offsetY: 24,
              fontSize: '14px',
              color: '#64748b',
            },
            value: {
              formatter: (value: number) => `${Math.round(value)}%`,
              fontSize: '26px',
              fontWeight: 600,
              offsetY: -16,
            },
          },
        },
      },
      colors: ['#0f766e'],
      labels: ['Demand Notes Completed'],
      stroke: {
        lineCap: 'round',
      },
    }),
    []
  );

  const trendOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'area',
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      colors: ['#0f766e'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.3,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      xaxis: {
        categories: weekLabels,
      },
      yaxis: {
        labels: { formatter: (value) => `${Math.floor(value)}` },
      },
      grid: {
        borderColor: '#e2e8f0',
      },
      tooltip: {
        y: {
          formatter: (value) => `${Math.floor(value)} items`,
        },
      },
    }),
    [weekLabels]
  );

  const trendSeries = [
    {
      name: 'Intakes + Notes',
      data: weeklyActivityData,
    },
  ];

  if (status === 'loading') return null;

  return (
    <>
      {showReset && <ResetPasswordModal />}

      {/* <div
        className={`min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 transition ${
          showReset ? 'pointer-events-none blur-sm' : ''
        }`}
      > */}
<div className="mb-6 flex items-center gap-3"> 
          <LayoutDashboard className="h-6 w-6 text-teal-700" />
          <p className="text-xl font-bold text-foreground">Dashboard</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
          <Link href="/intake-list" className="block h-full">
            <Card className="h-full dark:bg-gray-900 shadow-[0_14px_22px_-14px_rgba(59,130,246,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_28px_-14px_rgba(59,130,246,0.65)]">
              <CardContent className="pt-6 min-h-[132px]">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Cases</p>
                {isLoadingData ? (
                  <>
                    <div className="mt-2 h-8 w-20 animate-pulse rounded-md bg-slate-200" />
                    <div className="mt-2 h-4 w-40 animate-pulse rounded-md bg-slate-200" />
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-red-900 dark:text-white">{totalCases}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {`Completed: ${completedCases} | Draft: ${draftCases}`}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
          <Link href="/leads" className="block h-full">
            <Card className="h-full dark:bg-gray-900 shadow-[0_14px_22px_-14px_rgba(245,158,11,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_28px_-14px_rgba(245,158,11,0.65)]">
              <CardContent className="pt-6 min-h-[132px]">
                <p className="text-sm text-slate-500 dark:text-slate-400">Open Leads</p>
                {isLoadingData ? (
                  <>
                    <div className="mt-2 h-8 w-20 animate-pulse rounded-md bg-slate-200" />
                    <div className="mt-2 h-4 w-40 animate-pulse rounded-md bg-slate-200" />
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-red-900 dark:text-white">{openLeads}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {`Completed: ${completedLeads} | New: ${newLeads}`}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
          <Link href="/demand-notes" className="block h-full">
            <Card className="h-full dark:bg-gray-900 shadow-[0_14px_22px_-14px_rgba(16,185,129,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_28px_-14px_rgba(16,185,129,0.65)]">
              <CardContent className="pt-6 min-h-[132px]">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Demand Notes</p>
                {isLoadingData ? (
                  <>
                    <div className="mt-2 h-8 w-20 animate-pulse rounded-md bg-slate-200" />
                    <div className="mt-2 h-4 w-40 animate-pulse rounded-md bg-slate-200" />
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-red-900 dark:text-white">{totalDemandNotes}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {`Completed: ${completedDemandNotes} | Draft: ${draftDemandNotes}`}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
          <Link href="/users" className="block h-full">
            <Card className="h-full dark:bg-gray-900 shadow-[0_14px_22px_-14px_rgba(139,92,246,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_28px_-14px_rgba(139,92,246,0.65)]">
              <CardContent className="pt-6 min-h-[132px]">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p>
                {isLoadingData ? (
                  <>
                    <div className="mt-2 h-8 w-20 animate-pulse rounded-md bg-slate-200" />
                    <div className="mt-2 h-4 w-40 animate-pulse rounded-md bg-slate-200" />
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-red-900 dark:text-white">{totalUsers}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {`Active: ${activeUsers} | Inactive: ${inactiveUsers}`}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* <div className="mb-6">
          <h2 className="mb-3 text-lg font-medium text-red-900">Menus</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Card className="h-full border-slate-200 transition hover:-translate-y-0.5 hover:border-teal-700 hover:shadow-sm">
                    <CardContent className="flex items-start gap-3 p-5">
                      <div className="rounded-lg bg-teal-100 p-2 text-teal-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div> */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 dark:bg-gray-900 shadow-[0_18px_26px_-16px_rgba(13,148,136,0.55)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="h-4 w-4 text-teal-700" />
                Radial Chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="h-[280px] w-full animate-pulse rounded-md bg-slate-200" />
              ) : (
                <Chart options={radialOptions} series={radialSeries} type="radialBar" height={280} />
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 dark:bg-gray-900 shadow-[0_18px_26px_-16px_rgba(14,116,144,0.55)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-teal-700" />
                Weekly Graph
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="h-[280px] w-full animate-pulse rounded-md bg-slate-200" />
              ) : (
                <Chart options={trendOptions} series={trendSeries} type="area" height={280} />
              )}
            </CardContent>
          </Card>
        </div>
      {/* </div> */}
    </>
  );
}
     
