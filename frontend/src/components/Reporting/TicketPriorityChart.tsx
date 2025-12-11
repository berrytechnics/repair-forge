"use client";

import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Pie } from "react-chartjs-2";
import { PriorityDistribution } from "@/lib/api/reporting.api";
import { useTheme } from "@/lib/ThemeContext";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale);

interface TicketPriorityChartProps {
  data: PriorityDistribution[];
  loading?: boolean;
  error?: string | null;
}

const priorityColors: Record<string, string> = {
  urgent: "#dc2626", // red
  high: "#f97316", // orange
  medium: "#eab308", // yellow
  low: "#22c55e", // green
};

const priorityLabels: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default function TicketPriorityChart({
  data,
  loading = false,
  error = null,
}: TicketPriorityChartProps) {
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = data.map((item) => priorityLabels[item.priority] || item.priority);
    const counts = data.map((item) => item.count);
    const backgroundColors = data.map((item) => priorityColors[item.priority] || "#6b7280");

    return {
      labels,
      datasets: [
        {
          label: "Tickets",
          data: counts,
          backgroundColor: backgroundColors,
          borderColor: theme === "dark" ? "#1f2937" : "#fff",
          borderWidth: 2,
        },
      ],
    };
  }, [data, theme]);

  const chartOptions = useMemo(() => {
    const isDark = theme === "dark";
    const textColor = isDark ? "#e5e7eb" : "#374151";

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right" as const,
          labels: {
            color: textColor,
            padding: 15,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          backgroundColor: isDark ? "#1f2937" : "#fff",
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: isDark ? "#374151" : "#e5e7eb",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (tooltipItem: TooltipItem<"pie">) => {
              const label = tooltipItem.label || "";
              const value = tooltipItem.parsed || 0;
              const total = tooltipItem.dataset.data.reduce(
                (sum: number, val: number) => sum + val,
                0
              );
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    };
  }, [theme]);

  if (!isMounted) {
    return (
      <div className="h-64 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-gray-500 dark:text-gray-400">Loading chart...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Loading ticket priority data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No ticket priority data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <Pie data={chartData} options={chartOptions} />
    </div>
  );
}
