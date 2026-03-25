import {
  LayoutDashboard,
  ListChecks,
  BarChart2,
  FolderTree,
  ClipboardList,
  FileText,
  FolderOpen,
  Users,
  FilePenLine,
} from "lucide-react";
import { findMenuRouteAccess } from "./menuAccess";
// import { Key, ReactNode } from "react";

export interface MenuItem {
  // description: ReactNode;
  // title: ReactNode;
  // href: Key | null | undefined;
  label: string;
  path: string;
  activePaths?: string[];
  icon: React.ElementType;
  styles?: {
    active?: string;
    inactive?: string;
  };
  allowedRoles?: string[]; // Optional: specify which roles can see this item
}

const allowedRolesFor = (path: string) =>
  findMenuRouteAccess(path)?.allowedRoles;

export const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    allowedRoles: allowedRolesFor("/"),
    // description: undefined,
    // title: undefined,
    // href: undefined
  },
  {
    label: "Users List",
    path: "/users",
    icon: Users,
    allowedRoles: allowedRolesFor("/users"),
    // description: undefined,
    // title: undefined,
    // href: undefined
  },
  {
    label: "Leads",
    path: "/leads",
    icon: ClipboardList,
    allowedRoles: allowedRolesFor("/leads"),
    // description: undefined,
    // title: undefined,
    // href: undefined
  },
  {
    label: "Intake",
    path: "/intake-list",
    activePaths: ["/intake-list", "/intake-preview", "/intake-form"],
    icon: ListChecks,
    allowedRoles: allowedRolesFor("/intake-list"),
    // description: undefined,
    // title: undefined,
    // href: undefined
  },
  
  {
    label: "Stages",
    path: "/stages",
    icon: FolderTree,
    allowedRoles: allowedRolesFor("/stages"),
    // description: undefined,
    // title: undefined,
    // href: undefined
  },
  {
    label: "Reports",
    path: "/reports",
    icon: BarChart2,
    allowedRoles: allowedRolesFor("/reports"),
    // description: undefined,
    // title: undefined,
    // href: undefined
  },
  {
    label: "Forms",
    path: "/forms",
    icon: FileText,
    allowedRoles: allowedRolesFor("/forms"),
    // description: undefined,
    // title: undefined,
    // href: undefined
  },
  {
    label: "Form Templates",
    path: "/form-templates",
    icon: FileText,
    allowedRoles: allowedRolesFor("/form-templates"),
    // description: undefined,
    // title: undefined,
    // href: undefined
  },
  {
    label: "Documents",
    path: "/documents",
    icon: FolderOpen,
    allowedRoles: allowedRolesFor("/documents"),
    // description: undefined,
    // title: undefined,
    // href: undefined
  },
  {
    label: "Demand Notes",
    path: "/demand-notes",
    icon: FolderOpen,
    allowedRoles: allowedRolesFor("/demand-notes"),
    // description: undefined,
    // title: undefined,
    // href: undefined
  },
  {
    label: "Prompt Management",
    path: "/prompt-management",
    icon: FilePenLine,
    allowedRoles: allowedRolesFor("/prompt-management"),
  },
  
];
