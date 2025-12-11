"use client";

import { CashDrawerSession, getCurrentDrawer } from "@/lib/api/cash-drawer.api";
import { getErrorMessage } from "@/lib/api";
import React, { useEffect, useState } from "react";
import CashDrawerModal from "./CashDrawerModal";

export default function DrawerStatusBadge() {
  const [currentSession, setCurrentSession] =
    useState<CashDrawerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentDrawer();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCurrentDrawer, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentDrawer = async () => {
    try {
      setError(null);
      const response = await getCurrentDrawer();
      setCurrentSession(response.data);
    } catch (err) {
      console.error("Error fetching current drawer:", err);
      setError(getErrorMessage(err));
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
      <div className="flex flex-col items-end gap-1">
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
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 max-w-[200px] text-right">
            {error}
          </div>
        )}
      </div>
      <CashDrawerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDrawerOpened={handleDrawerOpened}
        onDrawerClosed={handleDrawerClosed}
      />
    </>
  );
}
