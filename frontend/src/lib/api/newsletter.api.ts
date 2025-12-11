import { ApiResponse, api } from "./index";

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriberCount {
  count: number;
}

/**
 * Subscribe to newsletter (public endpoint)
 */
export async function subscribeToNewsletter(
  email: string
): Promise<ApiResponse<NewsletterSubscriber>> {
  const response = await api.post<ApiResponse<NewsletterSubscriber>>(
    "/newsletter/subscribe",
    { email }
  );

  if (response.data.success && response.data.data) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to subscribe to newsletter"
  );
}

/**
 * Unsubscribe from newsletter (public endpoint)
 */
export async function unsubscribeFromNewsletter(
  email: string
): Promise<ApiResponse<void>> {
  const response = await api.post<ApiResponse<void>>(
    "/newsletter/unsubscribe",
    { email }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to unsubscribe from newsletter"
  );
}

/**
 * Get all newsletter subscribers (superuser only)
 */
export async function getNewsletterSubscribers(): Promise<
  ApiResponse<NewsletterSubscriber[]>
> {
  const response = await api.get<ApiResponse<NewsletterSubscriber[]>>(
    "/newsletter/subscribers"
  );

  if (response.data.success && response.data.data) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch newsletter subscribers"
  );
}

/**
 * Get newsletter subscriber count (superuser only)
 */
export async function getNewsletterSubscriberCount(): Promise<
  ApiResponse<SubscriberCount>
> {
  const response = await api.get<ApiResponse<SubscriberCount>>(
    "/newsletter/subscribers/count"
  );

  if (response.data.success && response.data.data) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch subscriber count"
  );
}
