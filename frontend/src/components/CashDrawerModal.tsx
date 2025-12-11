"use client";

import {
  CashDrawerSession,
  closeDrawer,
  getCurrentDrawer,
  openDrawer,
} from "@/lib/api/cash-drawer.api";
import React, { useEffect, useState, useMemo } from "react";

interface CashDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDrawerOpened?: (session: CashDrawerSession) => void;
  onDrawerClosed?: (session: CashDrawerSession) => void;
}

interface DenominationCount {
  label: string;
  value: number;
  count: number;
}

const BILL_DENOMINATIONS: DenominationCount[] = [
  { label: "$100", value: 100, count: 0 },
  { label: "$50", value: 50, count: 0 },
  { label: "$20", value: 20, count: 0 },
  { label: "$10", value: 10, count: 0 },
  { label: "$5", value: 5, count: 0 },
  { label: "$1", value: 1, count: 0 },
];

const COIN_DENOMINATIONS: DenominationCount[] = [
  { label: "$1.00", value: 1.0, count: 0 },
  { label: "$0.50", value: 0.5, count: 0 },
  { label: "$0.25", value: 0.25, count: 0 },
  { label: "$0.10", value: 0.1, count: 0 },
  { label: "$0.05", value: 0.05, count: 0 },
  { label: "$0.01", value: 0.01, count: 0 },
];

export default function CashDrawerModal({
  isOpen,
  onClose,
  onDrawerOpened,
  onDrawerClosed,
}: CashDrawerModalProps) {
  const [currentSession, setCurrentSession] =
    useState<CashDrawerSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"open" | "close">("open");

  // Form state for opening drawer
  const [openingBills, setOpeningBills] = useState<DenominationCount[]>(
    BILL_DENOMINATIONS.map((d) => ({ ...d }))
  );
  const [openingCoins, setOpeningCoins] = useState<DenominationCount[]>(
    COIN_DENOMINATIONS.map((d) => ({ ...d }))
  );

  // Form state for closing drawer
  const [closingBills, setClosingBills] = useState<DenominationCount[]>(
    BILL_DENOMINATIONS.map((d) => ({ ...d }))
  );
  const [closingCoins, setClosingCoins] = useState<DenominationCount[]>(
    COIN_DENOMINATIONS.map((d) => ({ ...d }))
  );
  const [checksAmount, setChecksAmount] = useState("");
  const [creditCardAmount, setCreditCardAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Calculate total from counts
  const calculateTotalFromCounts = (
    bills: DenominationCount[],
    coins: DenominationCount[],
    checks: number = 0,
    creditCard: number = 0
  ): number => {
    const billsTotal = bills.reduce(
      (sum, bill) => sum + bill.value * bill.count,
      0
    );
    const coinsTotal = coins.reduce(
      (sum, coin) => sum + coin.value * coin.count,
      0
    );
    return Math.round((billsTotal + coinsTotal + checks + creditCard) * 100) / 100;
  };

  // Calculate cash-only total (for variance calculation)
  const calculateCashTotal = (
    bills: DenominationCount[],
    coins: DenominationCount[]
  ): number => {
    const billsTotal = bills.reduce(
      (sum, bill) => sum + bill.value * bill.count,
      0
    );
    const coinsTotal = coins.reduce(
      (sum, coin) => sum + coin.value * coin.count,
      0
    );
    return Math.round((billsTotal + coinsTotal) * 100) / 100;
  };

  const openingCountedTotal = useMemo(
    () => calculateTotalFromCounts(openingBills, openingCoins),
    [openingBills, openingCoins]
  );

  const closingCashTotal = useMemo(
    () => calculateCashTotal(closingBills, closingCoins),
    [closingBills, closingCoins]
  );

  const closingChecksAmount = useMemo(
    () => parseFloat(checksAmount) || 0,
    [checksAmount]
  );

  const closingCreditCardAmount = useMemo(
    () => parseFloat(creditCardAmount) || 0,
    [creditCardAmount]
  );

  const closingCountedTotal = useMemo(
    () => calculateTotalFromCounts(
      closingBills,
      closingCoins,
      closingChecksAmount,
      closingCreditCardAmount
    ),
    [closingBills, closingCoins, closingChecksAmount, closingCreditCardAmount]
  );

  // Fetch current drawer session when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCurrentDrawer();
    } else {
      // Reset form when modal closes
      setNotes("");
      setError("");
      setOpeningBills(BILL_DENOMINATIONS.map((d) => ({ ...d })));
      setOpeningCoins(COIN_DENOMINATIONS.map((d) => ({ ...d })));
      setClosingBills(BILL_DENOMINATIONS.map((d) => ({ ...d })));
      setClosingCoins(COIN_DENOMINATIONS.map((d) => ({ ...d })));
      setChecksAmount("");
      setCreditCardAmount("");
    }
  }, [isOpen]);


  const fetchCurrentDrawer = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getCurrentDrawer();
      if (response.data) {
        setCurrentSession(response.data);
        setMode("close");
      } else {
        setCurrentSession(null);
        setMode("open");
      }
    } catch (err) {
      console.error("Error fetching current drawer:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch drawer status"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amount = openingCountedTotal;
    if (amount <= 0) {
      setError("Please count the cash in the drawer");
      return;
    }

    setIsLoading(true);
    try {
      const response = await openDrawer({
        openingAmount: amount,
      });
      if (response.data) {
        setCurrentSession(response.data);
        setMode("close");
        setOpeningBills(BILL_DENOMINATIONS.map((d) => ({ ...d })));
        setOpeningCoins(COIN_DENOMINATIONS.map((d) => ({ ...d })));
        onDrawerOpened?.(response.data);
      }
    } catch (err) {
      console.error("Error opening drawer:", err);
      setError(
        err instanceof Error ? err.message : "Failed to open drawer"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentSession) {
      setError("No drawer session found");
      return;
    }

    // For closing, we only use cash amount for variance calculation
    // Checks and credit cards are tracked separately but don't affect cash variance
    const cashAmount = closingCashTotal;
    if (cashAmount <= 0) {
      setError("Please count the cash in the drawer");
      return;
    }

    setIsLoading(true);
    try {
      const response = await closeDrawer(currentSession.id, {
        closingAmount: cashAmount,
        notes: notes || undefined,
      });
      if (response.data) {
        setCurrentSession(null);
        setMode("open");
        setNotes("");
        setClosingBills(BILL_DENOMINATIONS.map((d) => ({ ...d })));
        setClosingCoins(COIN_DENOMINATIONS.map((d) => ({ ...d })));
        setChecksAmount("");
        setCreditCardAmount("");
        onDrawerClosed?.(response.data);
        onClose();
      }
    } catch (err) {
      console.error("Error closing drawer:", err);
      setError(
        err instanceof Error ? err.message : "Failed to close drawer"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateBillCount = (
    index: number,
    count: number,
    isOpening: boolean
  ) => {
    if (isOpening) {
      const updated = [...openingBills];
      updated[index].count = Math.max(0, Math.floor(count));
      setOpeningBills(updated);
    } else {
      const updated = [...closingBills];
      updated[index].count = Math.max(0, Math.floor(count));
      setClosingBills(updated);
    }
  };

  const updateCoinCount = (
    index: number,
    count: number,
    isOpening: boolean
  ) => {
    if (isOpening) {
      const updated = [...openingCoins];
      updated[index].count = Math.max(0, Math.floor(count));
      setOpeningCoins(updated);
    } else {
      const updated = [...closingCoins];
      updated[index].count = Math.max(0, Math.floor(count));
      setClosingCoins(updated);
    }
  };

  const renderCountingInterface = (isOpening: boolean) => {
    const bills = isOpening ? openingBills : closingBills;
    const coins = isOpening ? openingCoins : closingCoins;
    const cashTotal = isOpening
      ? openingCountedTotal
      : closingCashTotal;
    const total = isOpening ? openingCountedTotal : closingCountedTotal;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isOpening ? "Count Cash" : "Count Drawer Contents"}
          </h4>
          <div className="text-right">
            {!isOpening && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Cash: ${cashTotal.toFixed(2)}
              </div>
            )}
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {isOpening ? `Total: $${total.toFixed(2)}` : `Total: $${total.toFixed(2)}`}
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
          <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">
            Bills
          </h4>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {bills.map((bill, index) => (
              <div key={bill.label} className="flex items-center gap-2">
                <label className="w-16 text-sm text-gray-700 dark:text-gray-300">
                  {bill.label}:
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={bill.count || ""}
                  onChange={(e) =>
                    updateBillCount(
                      index,
                      parseInt(e.target.value) || 0,
                      isOpening
                    )
                  }
                  className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="0"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">
                  ${(bill.value * bill.count).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">
            Coins
          </h4>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {coins.map((coin, index) => (
              <div key={coin.label} className="flex items-center gap-2">
                <label className="w-16 text-sm text-gray-700 dark:text-gray-300">
                  {coin.label}:
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={coin.count || ""}
                  onChange={(e) =>
                    updateCoinCount(
                      index,
                      parseInt(e.target.value) || 0,
                      isOpening
                    )
                  }
                  className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="0"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">
                  ${(coin.value * coin.count).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {!isOpening && (
            <>
              <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">
                  Other Payments
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="w-24 text-sm text-gray-700 dark:text-gray-300">
                      Checks:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={checksAmount}
                      onChange={(e) => setChecksAmount(e.target.value)}
                      className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="0.00"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">
                      ${closingChecksAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-24 text-sm text-gray-700 dark:text-gray-300">
                      Credit Card:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={creditCardAmount}
                      onChange={(e) => setCreditCardAmount(e.target.value)}
                      className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="0.00"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">
                      ${closingCreditCardAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black opacity-30"
        onClick={onClose}
      ></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          {mode === "open" ? "Open Cash Drawer" : "Close Cash Drawer"}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        {mode === "open" ? (
          <form onSubmit={handleOpenDrawer}>
            <div className="space-y-4">
              {renderCountingInterface(true)}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Opening..." : "Open Drawer"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCloseDrawer}>
            <div className="space-y-4">
              {currentSession && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div className="mb-2">
                      <strong>Opened:</strong>{" "}
                      {new Date(currentSession.openedAt).toLocaleString()}
                    </div>
                    <div className="mb-2">
                      <strong>Opening Amount:</strong> $
                      {currentSession.openingAmount.toFixed(2)}
                    </div>
                    {currentSession.expectedAmount !== null && (
                      <div>
                        <strong>Expected Amount:</strong> $
                        {currentSession.expectedAmount.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {renderCountingInterface(false)}
              {currentSession?.expectedAmount !== null &&
                closingCashTotal > 0 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                      <div>
                        <strong>Cash Variance:</strong> $
                        {(
                          closingCashTotal -
                          (currentSession.expectedAmount || 0)
                        ).toFixed(2)}
                        {closingCashTotal >
                        (currentSession.expectedAmount || 0) ? (
                          <span className="text-green-600 dark:text-green-400">
                            {" "}
                            (Over)
                          </span>
                        ) : closingCashTotal <
                          (currentSession.expectedAmount || 0) ? (
                          <span className="text-red-600 dark:text-red-400">
                            {" "}
                            (Short)
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">
                            {" "}
                            (Exact)
                          </span>
                        )}
                      </div>
                      {closingChecksAmount > 0 && (
                        <div>
                          <strong>Checks:</strong> ${closingChecksAmount.toFixed(2)}
                        </div>
                      )}
                      {closingCreditCardAmount > 0 && (
                        <div>
                          <strong>Credit Card:</strong> ${closingCreditCardAmount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Optional notes about the drawer closing"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Closing..." : "Close Drawer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
