"use client";

import { UserProvider } from "@/state/UserContext";
import { EmployeesProvider } from "@/state/EmployeesContext";
import { A3Provider } from "@/state/A3Context";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from 'next/navigation';
import "./globals.css";
import A3Navbar from '@/components/A3Navbar';
import { useUser } from '@/state/UserContext';

export const ActiveRouteContext = React.createContext('');

function NavbarAndAuth({ activeKey }) {
  // This component runs inside UserProvider so useUser is safe here.
  const { user, setUser } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // wait for client hydration/router to be available before rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) return null;

  const logOut = () => setUser(null);

  const handleSelect = (key) => {
    // navigate based on key
    if (key === 'home') return router.push('/home');
    if (key === 'create') return router.push('/create');
    // fallback: navigate to root
    return router.push('/');
  };

  // A3Navbar expects an onSelect prop that is called like onSelect('home') in the JSX
  const onSelect = (key) => () => handleSelect(key);

  // If some editor area is active but there's no user, hide the navbar.
  // Wait until router/pathname is available and client has mounted before rendering
  if (!mounted || !activeKey) return null;

  return <A3Navbar onSelect={onSelect} activeKey={activeKey} logOut={logOut} />;
}

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const activeKey = React.useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts[0] === 'home') return 'home';
    if (parts[0] === 'create') return 'create';
    return parts[0] || '';
  }, [pathname]);


  return (
    <html lang="en">
      <body className={`font-sans`}>
        <A3Provider>
          <EmployeesProvider>
            <UserProvider>
              <ActiveRouteContext.Provider value={activeKey}>
                <NavbarAndAuth activeKey={activeKey} />
                {children}
              </ActiveRouteContext.Provider>
            </UserProvider>
          </EmployeesProvider>
        </A3Provider>
      </body>
    </html>
  );
}
