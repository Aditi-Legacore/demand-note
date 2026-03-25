import { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login - Legasys",
  description: "Sign in to your Legacore account",
};

export default function LoginPage() {
  // return <LoginForm />;
  return (
     <div className="min-h-screen bg-white dark:bg-gray-900 p-4 sm:p-6 lg:p-8">          
       <LoginForm />         
    </div>
  );
}
