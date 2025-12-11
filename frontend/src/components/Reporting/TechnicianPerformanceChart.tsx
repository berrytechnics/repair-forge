"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { TechnicianPerformance } from "@/lib/api/reporting.api";
import { useTheme } from "@/lib/ThemeContext";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface TechnicianPerformanceChartProps {
  data: TechnicianPerformance[];
  loading?: boolean;
  error?: string | null;
}

export default function TechnicianPerformanceChart({
  data,
  loading = false,
  error = null,
}: TechnicianPerformanceChartProps) {
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

    const labels = data.map((item) => item.technicianName);
    const completed = data.map((item) => item.ticketsCompleted);

    const isDark = theme === "dark";
    const barColor = isDark ? "#10b981" : "#059669";
    const hoverColor = isDark ? "#34d399" : "#10b981";

    return {
      labels,
      datasets: [
        {
          label: "Tickets Completed",
          data: completed,
          backgroundColor: barColor,
          borderColor: barColor,
          borderWidth: 1,
          hoverBackgroundColor: hoverColor,
          hoverBorderColor: hoverColor,
        },
      ],
    };
  }, [data, theme]);

  const chartOptions = useMemo(() => {
    const isDark = theme === "dark";
    const textColor = isDark ? "#e5e7eb" : "#374151";
    const gridColor = isDark ? "#374151" : "#e5e7eb";

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: isDark ? "#1f2937" : "#fff",
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: gridColor,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            afterBody: (tooltipItems: TooltipItem<"bar">[]) => {
              const item = tooltipItems[0];
              if (!item) return [];
              const index = item.dataIndex;
              const tech = data[index];
              if (tech && tech.averageCompletionDays !== null) {
                return [`Avg Completion: ${tech.averageCompletionDays} days`];
              }
              return [];
            },
            label: (tooltipItem: TooltipItem<"bar">) => {
              const value = tooltipItem.parsed.y;
              return `Completed: ${value}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: gridColor,
            drawBorder: false,
          },
          ticks: {
            color: textColor,
            font: {
              size: 12,
            },
          },
        },
        y: {
          grid: {
            color: gridColor,
            drawBorder: false,
          },
          ticks: {
            color: textColor,
            font: {
              size: 12,
            },
            stepSize: 1,
          },
        },
      },
    };
  }, [data, theme]);

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
            Loading technician performance data...
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
            No technician performance data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}
