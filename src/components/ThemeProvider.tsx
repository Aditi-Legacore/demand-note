'use client';

import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { ThemeProvider as CustomThemeProvider } from '@/contexts/ThemeContext';
import { GlobalSearchProvider } from '@/contexts/GlobalSearchContext';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <CustomThemeProvider>
          <GlobalSearchProvider>
            {children}
            <Toaster />
          </GlobalSearchProvider>
        </CustomThemeProvider>
      </ThemeProvider>
    </SessionProvider>
  );
};
