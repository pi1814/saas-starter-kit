import { useState } from 'react';
import { Loading } from '@/components/shared';
import { useSession } from 'next-auth/react';
import React from 'react';
import Header from './Header';
import Drawer from './Drawer';
import { useRouter } from 'next/navigation';

export default function AppShell({ children }) {
  const router = useRouter();
  const { status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Show loading state while session is loading
  if (status === 'loading') {
    return <Loading />;
  }

  // Redirect unauthenticated users to login page
  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null; // Return null instead of undefined
  }

  return (
    <div className="flex flex-col h-screen">
      <Header setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1">
        <div className="w-64">
          <Drawer sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </div>

        <main className="flex-1 p-3">{children}</main>
      </div>
    </div>
  );
}
