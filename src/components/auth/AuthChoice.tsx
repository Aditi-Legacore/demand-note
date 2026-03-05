'use client'

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserPlus, LogIn } from "lucide-react";
import LoginBg from "../../../public/assets/images/auth/login-bg.png";
import LoginLogoBg from "../../../public/assets/images/auth/logo.png";

export default function AuthChoice() {
  return (
    <div className="min-h-screen flex flex-col justify-center md:flex-row bg-white">
      {/* Left side: Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-gradient-to-br">
        <div className="relative w-full h-[70vh] lg:h-[80vh] xl:h-[90vh]">
          <Image
            src={LoginBg}
            alt="Auth illustration"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Right side: Choice */}
      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Title */}
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 md:w-[50px] md:h-[50px] bg-white rounded-lg flex items-center justify-center overflow-hidden">
                <Image
                  src={LoginLogoBg}
                  alt="Logo"
                  width={50}
                  height={50}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-semibold text-gray-900">Legasys</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome to Legasys</h1>
            <p className="text-gray-600">Please choose how you&apos;d like to proceed.</p>
          </div>

          {/* Cards */}
          <div className="space-y-4">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="text-center space-y-4">
                <UserPlus className="w-12 h-12 text-blue-600 mx-auto" />
                <h2 className="text-xl font-semibold text-gray-900">New User</h2>
                <p className="text-gray-600">Create a new account to get started.</p>
                <Button asChild className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                  <Link href="/signup">Create Account</Link>
                </Button>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="text-center space-y-4">
                <LogIn className="w-12 h-12 text-green-600 mx-auto" />
                <h2 className="text-xl font-semibold text-gray-900">Existing User</h2>
                <p className="text-gray-600">Sign in to your existing account.</p>
                <Button asChild variant="outline" className="w-full h-12 border-gray-300 hover:bg-gray-50 rounded-lg font-medium">
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
