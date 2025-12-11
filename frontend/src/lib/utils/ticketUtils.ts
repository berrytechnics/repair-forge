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
      return "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100";
    case "assigned":
      return "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100";
    case "on_hold":
      return "bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100";
    case "cancelled":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
}

/**
 * Get priority color classes for ticket priority badges
 * Includes both light and dark mode variants
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "low":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    case "medium":
      return "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100";
    case "high":
      return "bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100";
    case "urgent":
      return "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
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
