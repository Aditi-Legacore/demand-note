"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Settings, Bell, Mail, Sun, Moon, Loader2, Menu, X, Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { subscribeToNotificationSocket } from "@/lib/notifications/client";
import Searchbar from "./Searchbar";
import QuickIntakeForm from "./forms/QuickIntakeForm";
import SettingsSidebar from "./SettingsSidebar";
import NotificationsDropdown from "./NotificationsModal";
import MessagesDropdown from "./MessagesModal";
import { Button } from "./ui/button";
import Avatar from "../../public/avatar.png";
import Image from "next/image";
import { useGlobalSearch } from "@/contexts/GlobalSearchContext";
import { useRouter } from "next/navigation";

type GlobalSearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
  keepQuery?: boolean;
};

const Navbar: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const { query: searchQuery, setQuery: setSearchQuery } = useGlobalSearch();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickIntakeOpen, setQuickIntakeOpen] = useState(false);
  const [quickIntakeKey, setQuickIntakeKey] = useState(0);
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [messagesModalOpen, setMessagesModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const quickIntakeRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !session?.user?.id) return;

    let isActive = true;
    const loadCount = async () => {
      try {
        const res = await fetch("/api/notifications?limit=5");
        if (res.ok) {
          const data = await res.json();
          if (isActive) {
            setUnreadNotifications(data.unreadCount || 0);
          }
        }
      } catch (error) {
        console.error("Failed to load notification count:", error);
      }
    };

    void loadCount();

    const unsubscribe = subscribeToNotificationSocket((notification) => {
      if (!isActive) return;
      if (notification.userId === session.user.id && notification.readAt === null) {
        setUnreadNotifications((prev) => prev + 1);
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [mounted, session?.user?.id]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (quickIntakeRef.current && !quickIntakeRef.current.contains(event.target as Node)) {
        setQuickIntakeOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      // Close notifications dropdown
      if (!(event.target as Element)?.closest('[data-notifications]') && !(event.target as Element)?.closest('[data-notifications-button]')) {
        setNotificationsModalOpen(false);
      }
      // Close messages dropdown
      if (!(event.target as Element)?.closest('[data-messages]') && !(event.target as Element)?.closest('[data-messages-button]')) {
        setMessagesModalOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedQuery = searchQuery.trim();

  useEffect(() => {
    if (!mounted) return;

    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError(null);

        const fetchJson = async (url: string) => {
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) {
            throw new Error(`Request failed: ${res.status}`);
          }
          return res.json();
        };

        const [
          usersRes,
          leadsRes,
          intakesRes,
          demandNotesRes,
          documentsRes,
          formsRes,
          formTemplatesRes,
        ] = await Promise.allSettled([
          fetchJson("/api/admin/users?includeDeleted=true"),
          fetchJson("/api/leads"),
          fetchJson("/api/intake"),
          fetchJson("/api/demand-notes?full=true"),
          fetchJson("/api/documents"),
          fetchJson("/api/forms"),
          fetchJson("/api/form-templates"),
        ]);

        const users = usersRes.status === "fulfilled" ? usersRes.value?.users ?? [] : [];
        const leads = leadsRes.status === "fulfilled" ? leadsRes.value ?? [] : [];
        const intakes = intakesRes.status === "fulfilled" ? intakesRes.value ?? [] : [];
        const demandNotes = demandNotesRes.status === "fulfilled" ? demandNotesRes.value?.notes ?? [] : [];
        const documents = documentsRes.status === "fulfilled" ? documentsRes.value ?? [] : [];
        const forms = formsRes.status === "fulfilled" ? formsRes.value ?? [] : [];
        const formTemplates = formTemplatesRes.status === "fulfilled" ? formTemplatesRes.value ?? [] : [];

        const queryLower = normalizedQuery.toLowerCase();
        const matches = (value?: string | null) =>
          typeof value === "string" && value.toLowerCase().includes(queryLower);

        const results: GlobalSearchResult[] = [];

        users
          .filter((user: { email?: string; firstName?: string; lastName?: string; roles?: string[] }) =>
            matches(user.email) ||
            matches(user.firstName) ||
            matches(user.lastName) ||
            (user.roles || []).some((role) => matches(role))
          )
          .slice(0, 5)
          .forEach((user: { id: string; email?: string; firstName?: string; lastName?: string; roles?: string[] }) => {
            const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
            results.push({
              id: user.id,
              type: "Users",
              title: fullName || user.email || "User",
              subtitle: user.email || fullName || "",
              href: "/users",
              keepQuery: true,
            });
          });

        leads
          .filter((lead: { name?: string; contact?: string; email?: string; phone?: string; caseType?: string; referenceId?: string }) =>
            matches(lead.name) ||
            matches(lead.contact) ||
            matches(lead.email) ||
            matches(lead.phone) ||
            matches(lead.caseType) ||
            matches(lead.referenceId)
          )
          .slice(0, 5)
          .forEach((lead: { id: string; name?: string; contact?: string; caseType?: string; referenceId?: string }) => {
            results.push({
              id: lead.id,
              type: "Leads",
              title: lead.name || lead.referenceId || "Lead",
              subtitle: [lead.contact, lead.caseType].filter(Boolean).join(" • "),
              href: "/leads",
              keepQuery: true,
            });
          });

        intakes
          .filter((intake: { id: string; clientName?: string; Lead?: { caseType?: string } }) =>
            matches(intake.clientName) ||
            matches(intake.id) ||
            matches(intake.Lead?.caseType)
          )
          .slice(0, 5)
          .forEach((intake: { id: string; clientName?: string; Lead?: { caseType?: string } }) => {
            results.push({
              id: intake.id,
              type: "Intakes",
              title: intake.clientName || intake.id,
              subtitle: intake.Lead?.caseType || "",
              href: `/intake-preview/${intake.id}`,
            });
          });

        demandNotes
          .filter((note: { id: string; title?: string; clientName?: string; claimNumber?: string }) =>
            matches(note.title) ||
            matches(note.clientName) ||
            matches(note.claimNumber) ||
            matches(note.id)
          )
          .slice(0, 5)
          .forEach((note: { id: string; title?: string; clientName?: string; claimNumber?: string }) => {
            results.push({
              id: note.id,
              type: "Demand Notes",
              title: note.title || note.clientName || "Demand Note",
              subtitle: note.clientName || note.claimNumber || "",
              href: `/demand-notes/${note.id}`,
            });
          });

        documents
          .filter((doc: { id: string; clientName?: string; caseType?: string; files?: string[] }) =>
            matches(doc.clientName) ||
            matches(doc.caseType) ||
            matches(doc.id) ||
            (doc.files || []).some((file) => matches(file))
          )
          .slice(0, 5)
          .forEach((doc: { id: string; clientName?: string; caseType?: string; files?: string[] }) => {
            results.push({
              id: doc.id,
              type: "Documents",
              title: doc.clientName || doc.id,
              subtitle: doc.caseType || (doc.files || [])[0] || "",
              href: `/documents/${doc.id}`,
            });
          });

        forms
          .filter((form: { id: string; template?: { title?: string }; user?: { firstName?: string; lastName?: string; email?: string }; matter?: { title?: string } }) => {
            const userName = [form.user?.firstName, form.user?.lastName].filter(Boolean).join(" ");
            return (
              matches(form.template?.title) ||
              matches(userName) ||
              matches(form.user?.email) ||
              matches(form.matter?.title)
            );
          })
          .slice(0, 5)
          .forEach((form: { id: string; template?: { title?: string }; user?: { firstName?: string; lastName?: string; email?: string }; matter?: { title?: string } }) => {
            const userName = [form.user?.firstName, form.user?.lastName].filter(Boolean).join(" ");
            results.push({
              id: form.id,
              type: "Forms",
              title: form.template?.title || "Form Submission",
              subtitle: [userName || form.user?.email, form.matter?.title].filter(Boolean).join(" • "),
              href: "/forms",
              keepQuery: true,
            });
          });

        formTemplates
          .filter((template: { id: string; title?: string; language?: string }) =>
            matches(template.title) || matches(template.language) || matches(template.id)
          )
          .slice(0, 5)
          .forEach((template: { id: string; title?: string; language?: string }) => {
            results.push({
              id: template.id,
              type: "Form Templates",
              title: template.title || "Form Template",
              subtitle: template.language || "",
              href: `/form-templates/${template.id}`,
            });
          });

        setSearchResults(results);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSearchError("Failed to load search results.");
          setSearchResults([]);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mounted, normalizedQuery]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, GlobalSearchResult[]> = {};
    searchResults.forEach((result) => {
      if (!groups[result.type]) {
        groups[result.type] = [];
      }
      groups[result.type].push(result);
    });
    return groups;
  }, [searchResults]);

  const highlightText = (text: string) => {
    if (!normalizedQuery) return text;
    const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedQuery})`, "ig"));
    return parts.map((part, index) => {
      if (part.toLowerCase() === normalizedQuery.toLowerCase()) {
        return (
          <mark key={index} className="rounded-sm bg-yellow-200/70 px-0.5 text-gray-900 dark:bg-yellow-500/30 dark:text-white">
            {part}
          </mark>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (!mounted) return null;

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");
  const handleSelectResult = (result: GlobalSearchResult) => {
    if (!result.keepQuery) {
      setSearchQuery("");
    }
    setSearchOpen(false);
    router.push(result.href);
  };

  return (
    <nav className="sticky top-0 z-30 flex justify-between items-center px-4 py-3 lg:px-6 lg:py-4 shadow-sm bg-white dark:bg-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800">
      {/* Left Section - Search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 lg:pl-0">
        {/* Mobile: Smaller search, Desktop: Medium search */}
        <div
          ref={searchRef}
          className="relative flex-1 max-w-40 sm:max-w-xs md:max-w-md lg:max-w-lg ml-auto sm:ml-0"
        >
          <Searchbar
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setSearchOpen(false);
              }
            }}
            placeholder="Search everything..."
          />

          {searchOpen && normalizedQuery.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 z-50">
              {normalizedQuery.length < 2 && (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  Type at least 2 characters to search.
                </div>
              )}

              {normalizedQuery.length >= 2 && searchLoading && (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  Searching...
                </div>
              )}

              {normalizedQuery.length >= 2 && searchError && (
                <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {searchError}
                </div>
              )}

              {normalizedQuery.length >= 2 && !searchLoading && !searchError && searchResults.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  No results found.
                </div>
              )}

              {normalizedQuery.length >= 2 && !searchLoading && !searchError && searchResults.length > 0 && (
                <div className="max-h-96 overflow-y-auto">
                  {Object.entries(groupedResults).map(([group, items]) => (
                    <div key={group} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                      <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {group}
                      </div>
                      {items.map((item) => (
                        <button
                          key={`${group}-${item.id}`}
                          type="button"
                          onClick={() => handleSelectResult(item)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {highlightText(item.title)}
                          </div>
                          {item.subtitle && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {highlightText(item.subtitle)}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Actions - Hidden on Mobile/Tablet */}
      <div className="hidden lg:flex items-center gap-1 xl:gap-2">

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsSidebarOpen(true)}
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>

        {/* Notifications */}
        <div className="relative" data-notifications-button>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setNotificationsModalOpen(!notificationsModalOpen)}
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Button>
          <div data-notifications>
            <NotificationsDropdown isOpen={notificationsModalOpen} onClose={() => setNotificationsModalOpen(false)} />
          </div>
        </div>

        {/* Messages */}
        <div className="relative" data-messages-button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMessagesModalOpen(!messagesModalOpen)}
            aria-label="Messages"
            title="Messages"
          >
            <Mail className="w-5 h-5" />
          </Button>
          <div data-messages>
            <MessagesDropdown isOpen={messagesModalOpen} onClose={() => setMessagesModalOpen(false)} />
          </div>
        </div>

        {/* Quick Intake */}
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => { setQuickIntakeKey(prev => prev + 1); setQuickIntakeOpen(true); }}>
             <Plus className="w-4 h-2 mr-2" />
              Quick Intake
        </Button>
        
        {/* Profile Dropdown */}
        <div className="relative ml-2" ref={dropdownRef}>
          <Button
            variant="ghost"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5"
            aria-label="User menu"
          >
            <Image
              src={session?.user?.image || Avatar}
              alt="User Avatar"
              className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600"
            />
          </Button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {session?.user?.email || "user@example.com"}
                </p>
              </div>
              <ul className="py-1">
                <li>
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    My Profile
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    Inbox
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    Settings
                  </Button>
                </li>
                <li className="border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      setIsLoggingOut(true);
                      try {
                        await signOut({ callbackUrl: '/login' });
                      } finally {
                        setIsLoggingOut(false);
                      }
                    }}
                    disabled={isLoggingOut}
                    className="w-full justify-start text-red-600 dark:text-red-400 text-sm"
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Logging Out...
                      </>
                    ) : (
                      "Logout"
                    )}
                  </Button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Mobile/Tablet Actions */}
      <div className="flex lg:hidden items-center gap-1 sm:gap-2">

        {/* Theme Toggle - Always visible */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>

        {/* Notification Bell - Visible on tablet */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:block relative"
          onClick={() => setNotificationsModalOpen(!notificationsModalOpen)}
        >
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </Button>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className="absolute top-full left-0 right-0 mt-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg lg:hidden max-h-[calc(100vh-4rem)] overflow-y-auto"
        >
          <div className="p-4 space-y-3">
            {/* User Info Section */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <Image
                src={session?.user?.image || "/avatar.png"}
                alt="User Avatar"
                width={48} // 12 * 4 = 48px
                height={48}
                className="rounded-full border-2 border-gray-300 dark:border-gray-600"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {session?.user?.email || "user@example.com"}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-1">
              <Button
                variant="ghost"
                onClick={() => { setSettingsSidebarOpen(true); setMobileMenuOpen(false); }}
                className="w-full justify-start"
              >
                <Settings className="w-5 h-5 shrink-0" />
                <span className="font-medium">Settings</span>
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start relative sm:hidden"
              >
                <Bell className="w-5 h-5 shrink-0" />
                <span className="font-medium">Notifications</span>
                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full" />
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start"
              >
                <Mail className="w-5 h-5 shrink-0" />
                <span className="font-medium">Messages</span>
              </Button>
            </div>

            {/* Profile Actions */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
              <Button variant="ghost" className="w-full justify-start">
                My Profile
              </Button>

              <Button variant="ghost" className="w-full justify-start">
                Inbox
              </Button>

              <Button
                variant="ghost"
                onClick={async () => {
                  setIsLoggingOut(true);
                  try {
                    await signOut({ callbackUrl: '/login' });
                  } finally {
                    setIsLoggingOut(false);
                  }
                }}
                disabled={isLoggingOut}
                className="w-full justify-start text-red-600 dark:text-red-400 font-medium"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging Out...
                  </>
                ) : (
                  "Logout"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Intake Slider */}
      <div className={`fixed top-0 right-0 h-162.5 w-125 bg-white dark:bg-gray-900 shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${quickIntakeOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center border-b border-gray-200  dark:border-gray-700">
          <h6 className="text-sm font-bold">Intake</h6>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuickIntakeOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </Button>
        </div>
        <div className="p-4 h-full overflow-y-auto">
          <QuickIntakeForm key={quickIntakeKey} onClose={() => setQuickIntakeOpen(false)} />
        </div>
      </div>

      {/* Settings Sidebar */}
      <SettingsSidebar isOpen={settingsSidebarOpen} onClose={() => setSettingsSidebarOpen(false)} />


    </nav>
  );
};

export default Navbar;
