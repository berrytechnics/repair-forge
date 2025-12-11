"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { RevenueDataPoint } from "@/lib/api/reporting.api";
import { useTheme } from "@/lib/ThemeContext";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RevenueChartProps {
  data: RevenueDataPoint[];
  loading?: boolean;
  error?: string | null;
}

export default function RevenueChart({
  data,
  loading = false,
  error = null,
}: RevenueChartProps) {
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

    const labels = data.map((point) => format(parseISO(point.date), "MMM d"));
    const revenues = data.map((point) => point.revenue);

    const isDark = theme === "dark";
    const pointColor = isDark ? "#6366f1" : "#4f46e5";
    const lineColor = isDark ? "#818cf8" : "#6366f1";

    return {
      labels,
      datasets: [
        {
          label: "Revenue",
          data: revenues,
          borderColor: lineColor,
          backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            if (isDark) {
              gradient.addColorStop(0, "rgba(129, 140, 248, 0.3)");
              gradient.addColorStop(1, "rgba(129, 140, 248, 0.0)");
            } else {
              gradient.addColorStop(0, "rgba(99, 102, 241, 0.3)");
              gradient.addColorStop(1, "rgba(99, 102, 241, 0.0)");
            }
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: pointColor,
          pointBorderColor: pointColor,
          pointBorderWidth: 2,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: pointColor,
          pointHoverBorderWidth: 3,
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
          displayColors: false,
          callbacks: {
            label: (tooltipItem: TooltipItem<"line">) => {
              const value = tooltipItem.parsed.y;
              if (value === null || value === undefined) {
                return "Revenue: $0.00";
              }
              return `Revenue: ${new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(value)}`;
            },
            title: (tooltipItems: TooltipItem<"line">[]) => {
              return tooltipItems[0]?.label || "";
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
            callback: (value: string | number) => {
              const numValue = typeof value === "string" ? parseFloat(value) : value;
              if (isNaN(numValue)) {
                return "$0";
              }
              return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(numValue);
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
            Loading revenue data...
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
            No revenue data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}
