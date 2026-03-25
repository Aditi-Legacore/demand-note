import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAppAdminSession } from "@/lib/roles";
import PromptManagementPage from "@/components/prompt-management/PromptManagementPage";

export default async function PromptManagementRoute() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth-choice");
  }
  if (!isAppAdminSession(session)) {
    redirect("/");
  }

  return <PromptManagementPage />;
}
