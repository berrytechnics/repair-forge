/**
 * Utility functions for ticket status and priority styling
 */

/**
 * Get status color classes for ticket status badges
 * Includes both light and dark mode variants
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "assigned":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "on_hold":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "cancelled":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
}

/**
 * Get priority color classes for ticket priority badges
 * Includes both light and dark mode variants
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "low":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    case "medium":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "high":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "urgent":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
}

/**
 * Format ticket status for display (capitalize and replace underscores)
 */
export function formatStatus(status: string): string {
  return status
    .replace("_", " ")
    .charAt(0)
    .toUpperCase() + status.replace("_", " ").slice(1);
}

/**
 * Format ticket priority for display (capitalize)
 */
export function formatPriority(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

