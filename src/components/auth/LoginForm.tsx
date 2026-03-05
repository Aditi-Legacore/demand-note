'use client'

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/zod";
import { signIn } from "next-auth/react";
// import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import LoginBg from "../../../public/assets/images/auth/login-bg.png";
import LoginLogoBg from "../../../public/assets/images/auth/logo.png";
import LoginGoogleBg from "../../../public/assets/images/auth/google-icon.webp";
// import { ControllerRenderProps, FieldValues } from "react-hook-form";

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginForm() {
  // const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const remembered = localStorage.getItem("rememberMe");
    if (remembered === "true") {
      setRememberMe(true);
      const email = localStorage.getItem("rememberedEmail");
      if (email) {
        form.setValue("email", email);
      }
    }
  }, [form]);

  const onSubmit = async (values: LoginFormData) => {
    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        ...values,
        redirect: false,
      });

      if (!res?.error) {
        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
          localStorage.setItem("rememberedEmail", values.email);
        } else {
          localStorage.removeItem("rememberMe");
          localStorage.removeItem("rememberedEmail");
        }
        window.location.href = "/";
      } else {
        alert("Invalid credentials");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center md:flex-row bg-white dark:bg-gray-900">
      {/* Left side: Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-gradient-to-br">
        <div className="relative w-full h-[70vh] lg:h-[80vh] xl:h-[90vh]"> {/* adjust height as needed */}
          <Image
            src={LoginBg}
            alt="Login illustration"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>


      {/* Right side: Form */}
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
            <h1 className="text-3xl font-bold text-gray-900">Sign In to your Account</h1>
            <p className="text-gray-600">Welcome back! Please enter your details.</p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="example@gmail.com"
                          className="pl-11 h-12 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="password"
                          className="pl-11 pr-11 h-12 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {showPassword ? (
                          <EyeOff
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 cursor-pointer"
                            onClick={() => setShowPassword(false)}
                          />
                        ) : (
                          <Eye
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 cursor-pointer"
                            onClick={() => setShowPassword(true)}
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  Forgot Password?
                </a>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging In...
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or sign in with</span>
                </div>
              </div>

              <div className="grid grid-cols-1">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 border-gray-300 hover:bg-gray-50 rounded-lg flex items-center justify-center"
                  onClick={() => signIn("google", { callbackUrl: "/" })}
                >
                  <Image
                    src={LoginGoogleBg}
                    alt="Google logo"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  <span>Google</span>
                </Button>

              </div>

              <div className="text-center">
                <span className="text-sm text-gray-600">Don&apos;t have an account? </span>

                <Link href="/signup" className="text-sm text-blue-600 hover:underline font-medium">
                  Sign Up
                </Link>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}