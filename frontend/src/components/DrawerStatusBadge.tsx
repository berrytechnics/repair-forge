"use client";

import { CashDrawerSession, getCurrentDrawer } from "@/lib/api/cash-drawer.api";
import React, { useEffect, useState } from "react";
import CashDrawerModal from "./CashDrawerModal";

export default function DrawerStatusBadge() {
  const [currentSession, setCurrentSession] =
    useState<CashDrawerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCurrentDrawer();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCurrentDrawer, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentDrawer = async () => {
    try {
      const response = await getCurrentDrawer();
      setCurrentSession(response.data);
    } catch (err) {
      console.error("Error fetching current drawer:", err);
      setCurrentSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrawerOpened = (session: CashDrawerSession) => {
    setCurrentSession(session);
  };

  const handleDrawerClosed = () => {
    setCurrentSession(null);
  };

  if (isLoading) {
    return (
      <div className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          currentSession
            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
        } hover:opacity-80 transition-opacity`}
      >
        {currentSession ? (
          <span>
            Drawer Open - ${currentSession.openingAmount.toFixed(2)}
          </span>
        ) : (
          <span>Drawer Closed</span>
        )}
      </button>
      <CashDrawerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDrawerOpened={handleDrawerOpened}
        onDrawerClosed={handleDrawerClosed}
      />
    </>
  );
}



