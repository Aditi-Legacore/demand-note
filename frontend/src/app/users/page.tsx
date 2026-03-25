'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users, UserCog, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import UsersListTable from "@/components/table/UsersListTable";
import AddUserModal from "@/components/users/AddUserModal";
import FilterBar from "@/components/ui/FilterBar";
import FilterSidebar from "@/components/ui/FilterSidebar";
import ActiveFilters from "@/components/ui/ActiveFilters";
import LoadingSkeleton from "@/components/ui/loading-skeleton";
import { useGlobalSearch } from "@/contexts/GlobalSearchContext";

interface User {
  id: string;
  email: string;
  roles: string[];
  password: string | null;
  createdAt: string;
  updatedAt: string;
  status: boolean;
  firstName?: string;
  requestPassword: boolean;
  isDeletedUser: boolean;
}

const UsersList = () => {
  const [openAddUser, setOpenAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { query: searchQuery, setQuery: setSearchQuery } = useGlobalSearch();
  const [statusFilter, setStatusFilter] = useState("all"); // Renamed from filterValue
  const [roleFilter, setRoleFilter] = useState("all");
  const [showFiltersSidebar, setShowFiltersSidebar] = useState(false);

  // const handleUserAdded = () => {
  //   setRefreshKey(prev => prev + 1);
  // };

  const handleUserUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setOpenAddUser(true);
  };

  const handleModalClose = () => {
    setOpenAddUser(false);
    setEditingUser(null);
  };

  const handleModalSuccess = () => {
    handleUserUpdated();
  };

  // Fetch ALL users (including deleted) in a single API call
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        // Fetch all users without any filter
        const res = await fetch('/api/admin/users?includeDeleted=true');
        const data = await res.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [refreshKey]); // Only re-fetch when refreshKey changes

  // Get unique roles for filter options (from roles array)
  const uniqueRoles = useMemo(() => {
    const allRoles = users.flatMap(user => user.roles || []);
    const roles = [...new Set(allRoles)].filter(Boolean);
    return roles.sort();
  }, [users]);

  // Filtered users based on search and filters (client-side filtering)
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      const matchesSearch =
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.roles && user.roles.some((role: string) => 
          role.toLowerCase().includes(searchQuery.toLowerCase())
        ));

      // Status filter - handle deleted separately
      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus = user.status === true && user.isDeletedUser === false;
      } else if (statusFilter === "inactive") {
        matchesStatus = user.status === false && user.isDeletedUser === false;
      } else if (statusFilter === "deleted") {
        matchesStatus = user.isDeletedUser === true;
      } else if (statusFilter === "all") {
        matchesStatus = user.isDeletedUser === false; // Only show non-deleted users
      }
      
      // Role filter
      const matchesRole = roleFilter === "all" || 
        (user.roles && user.roles.includes(roleFilter));

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  // Reset filters function
  const resetFilters = () => {
    setRoleFilter("all");
  };

  // Active filters for display
  const activeFilters = useMemo(() => {
    const filters = [];
    if (searchQuery) {
      filters.push({
        label: `Search: "${searchQuery}"`,
        onRemove: () => setSearchQuery("")
      });
    }
    if (statusFilter !== "all") {
      const statusLabel = statusFilter === "active" ? "Active" : 
                         statusFilter === "inactive" ? "Initialized" : 
                         statusFilter === "deleted" ? "Deleted" : "All";
      filters.push({
        label: `Status: ${statusLabel}`,
        onRemove: () => setStatusFilter("all")
      });
    }
    if (roleFilter !== "all") {
      filters.push({
        label: `Role: ${roleFilter}`,
        onRemove: () => setRoleFilter("all")
      });
    }
    return filters;
  }, [searchQuery, statusFilter, roleFilter, setSearchQuery]);

  // Calculate counts for each role (only for non-deleted users)
  const roleCounts = useMemo(() => {
    const counts: Record<string, { active: number; inactive: number }> = {};
    
    users
      .filter(user => !user.isDeletedUser) // Only count non-deleted users
      .forEach(user => {
        if (user.roles && Array.isArray(user.roles)) {
          user.roles.forEach((role: string) => {
            if (!counts[role]) {
              counts[role] = { active: 0, inactive: 0 };
            }
            if (user.status) {
              counts[role].active += 1;
            } else {
              counts[role].inactive += 1;
            }
          });
        }
      });
    
    return counts;
  }, [users]);

  // Get counts for specific roles
  const adminCounts = roleCounts['admin'] || { active: 0, inactive: 0 };
  const customerCounts = roleCounts['Customer'] || { active: 0, inactive: 0 };
  const legacoreCounts = roleCounts['Legacore User'] || { active: 0, inactive: 0 };

  // Total users count (excluding deleted)
  const totalActiveUsers = users.filter(user => !user.isDeletedUser).length;

  return (
    <main className="min-h-screen p-2 md:p-0">
      <div className="max-w-8xl mx-auto space-y-4">
{/* Header with Add Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <p className="text-xl font-bold text-foreground">User Management</p>
            <p className="text-muted-foreground mt-1">
              Manage users, roles, and permissions
            </p>
          </div>
          <Button className="h-8 gap-1" onClick={() => {
            setEditingUser(null);
            setOpenAddUser(true);
          }}>
            <Plus className="w-4 h-4" />
            Add New User
          </Button>
        </div>

        {/* 4 Summary Cards - Compact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
          {loading ? (
            <>
              <LoadingSkeleton
                key="users-total"
                message={null}
                rowCount={2}
                cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
                contentClassName="p-4 space-y-3"
              />
              <LoadingSkeleton
                key="users-admins"
                message={null}
                rowCount={2}
                cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
                contentClassName="p-2.5 space-y-2"
              />
              <LoadingSkeleton
                key="users-customers"
                message={null}
                rowCount={2}
                cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
                contentClassName="p-2.5 space-y-2"
              />
              <LoadingSkeleton
                key="users-legacore"
                message={null}
                rowCount={2}
                cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
                contentClassName="p-2.5 space-y-2"
              />
            </>
          ) : (
            <>
              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Users</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{totalActiveUsers}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="p-1 bg-blue-50 dark:bg-blue-900/30 rounded-sm">
                        <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          <span className="text-[15px] text-gray-500 dark:text-gray-400">{users.filter(u => u.status && !u.isDeletedUser).length}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          <span className="text-[15px] text-gray-500 dark:text-gray-400">{users.filter(u => !u.status && !u.isDeletedUser).length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
                <CardContent className="p-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Admins</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{adminCounts.active + adminCounts.inactive}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="p-1 bg-purple-50 dark:bg-purple-900/30 rounded-sm">
                        <UserCog className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          <span className="text-[15px] text-gray-500 dark:text-gray-400">{adminCounts.active}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          <span className="text-[15px] text-gray-500 dark:text-gray-400">{adminCounts.inactive}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
                <CardContent className="p-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Customers</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{customerCounts.active + customerCounts.inactive}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="p-1 bg-green-50 dark:bg-green-900/30 rounded-sm">
                        <UserCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          <span className="text-[15px] text-gray-500 dark:text-gray-400">{customerCounts.active}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          <span className="text-[15px] text-gray-500 dark:text-gray-400">{customerCounts.inactive}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm">
                <CardContent className="p-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Legacore</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{legacoreCounts.active + legacoreCounts.inactive}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="p-1 bg-orange-50 dark:bg-orange-900/30 rounded-sm">
                        <Users className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          <span className="text-[15px] text-gray-500 dark:text-gray-400">{legacoreCounts.active}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          <span className="text-[15px] text-gray-500 dark:text-gray-400">{legacoreCounts.inactive}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filter Bar */}
        <Card className="bg-white dark:bg-gray-900">
          <CardContent>
            <FilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchPlaceholder="Search by email, name, or role..."
              filterValue={statusFilter}
              setFilterValue={setStatusFilter}
              filterOptions={[
                { value: "all", label: "All Users" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Initialized" },
                { value: "deleted", label: "Deleted" },
              ]}
              filterPlaceholder="Filter by status"
              onMoreFilters={() => setShowFiltersSidebar(true)}
            />
          </CardContent>
        </Card>

        {/* Active Filters */}
        <ActiveFilters filters={activeFilters} />

        {/* Users Table */}
        {/* <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm"> */}
          {loading ? (
            <LoadingSkeleton
              message="Loading users..."
              rowCount={5}
              rowWidths={[
                "w-full",
                "w-5/6",
                "w-4/5",
                "w-3/4",
                "w-2/3",
              ]}
              cardClassName="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-none rounded-sm"
              contentClassName="p-4 space-y-3"
            />
          ) : (
            <UsersListTable 
              users={filteredUsers} 
              onUserUpdate={() => setRefreshKey(prev => prev + 1)} 
              onEdit={handleEditUser}
              isDeletedFilter={statusFilter === 'deleted'} 
              loading={loading} 
            />
          )}
        {/* </div> */}

        {/* Filter Sidebar */}
        <FilterSidebar
          isOpen={showFiltersSidebar}
          onClose={() => setShowFiltersSidebar(false)}
          caseTypeFilter={roleFilter}
          setCaseTypeFilter={setRoleFilter}
          caseTypeOptions={[
            { value: "all", label: "All Roles" },
            ...uniqueRoles.map((role) => ({ value: role || "", label: role || "" })),
          ]}
          dateFromFilter=""
          setDateFromFilter={() => {}}
          dateToFilter=""
          setDateToFilter={() => {}}
          referralSourceFilter=""
          setReferralSourceFilter={() => {}}
          referralSourceOptions={[]}
          onResetFilters={resetFilters}
          showReferralSource={false}
        />

        {/* Add/Edit User Modal */}
        <AddUserModal
          open={openAddUser}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          userData={editingUser}
        />
      </div>
    </main>
  );
};

export default UsersList;
