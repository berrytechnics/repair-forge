# Billing Operations Guide

This guide covers operational procedures specific to subscription billing and payment processing.

## Table of Contents

- [Subscription Management](#subscription-management)
- [Billing Troubleshooting](#billing-troubleshooting)
- [Payment Processing Issues](#payment-processing-issues)
- [Webhook Handling](#webhook-handling)
- [Manual Billing Operations](#manual-billing-operations)

## Subscription Management

### View Subscription Status

```bash
# Via API (requires authentication)
curl -H "Authorization: Bearer <token>" https://yourdomain.com/api/subscriptions

# Via database
docker compose -f docker-compose.prod.yml exec postgres psql -U circuit_sage_user -d circuit_sage_db -c "SELECT * FROM subscriptions WHERE company_id = '<company-id>';"
```

### Check Billing Calculation

```bash
# View locations for a company
docker compose -f docker-compose.prod.yml exec postgres psql -U circuit_sage_user -d circuit_sage_db -c "SELECT id, name, is_free FROM locations WHERE company_id = '<company-id>' AND deleted_at IS NULL;"

# Calculate expected billing
# Formula: (total_locations - free_locations) × $50
```

### Subscription Status Values

- `pending` - Subscription created but not yet active
- `active` - Subscription is active and billing normally
- `past_due` - Payment failed, subscription needs attention
- `cancelled` - Subscription has been cancelled
- `expired` - Subscription has expired

### Update Subscription Status

```bash
# Via database (use with caution)
docker compose -f docker-compose.prod.yml exec postgres psql -U circuit_sage_user -d circuit_sage_db -c "UPDATE subscriptions SET status = 'active' WHERE id = '<subscription-id>';"
```

## Billing Troubleshooting

### Subscription Not Created

**Symptoms:**
- Company has multiple locations but no subscription record
- Billing calculation shows $0

**Troubleshooting:**
1. Check location count:
   ```sql
   SELECT COUNT(*) FROM locations WHERE company_id = '<company-id>' AND deleted_at IS NULL;
   ```

2. Check if first location is marked as free:
   ```sql
   SELECT id, name, is_free FROM locations WHERE company_id = '<company-id>' AND deleted_at IS NULL ORDER BY created_at ASC;
   ```

3. Verify subscription creation logic in `backend/src/services/billing.service.ts`

### Incorrect Billing Amount

**Symptoms:**
- Monthly amount doesn't match expected calculation
- Billing amount doesn't update when locations are added/removed

**Troubleshooting:**
1. Verify location count:
   ```sql
   SELECT
     COUNT(*) as total,
     COUNT(*) FILTER (WHERE is_free = false) as billable,
     COUNT(*) FILTER (WHERE is_free = true) as free
   FROM locations
   WHERE company_id = '<company-id>' AND deleted_at IS NULL;
   ```

2. Expected amount: `billable × $50`

3. Check subscription record:
   ```sql
   SELECT monthly_amount, location_count FROM subscriptions WHERE company_id = '<company-id>';
   ```

4. Recalculate billing:
   - Update location count
   - Recalculate monthly amount
   - Update subscription record

### Past Due Subscriptions

**Symptoms:**
- Subscription status is `past_due`
- Users cannot access non-free locations
- Payment processing failures

**Troubleshooting:**
1. Check payment history:
   ```sql
   SELECT * FROM subscription_payments
   WHERE subscription_id = '<subscription-id>'
   ORDER BY created_at DESC LIMIT 10;
   ```

2. Review payment failure reasons:
   ```sql
   SELECT failure_reason, status, amount, created_at
   FROM subscription_payments
   WHERE subscription_id = '<subscription-id>' AND status = 'failed'
   ORDER BY created_at DESC;
   ```

3. Check Square subscription status (if using Square):
   - Log into Square dashboard
   - Check subscription status
   - Review payment method

4. Resolve payment issue:
   - Update payment method
   - Retry payment
   - Update subscription status to `active`

## Payment Processing Issues

### Payment Not Processing

**Symptoms:**
- Autopay enabled but payments not processing
- No payment records created

**Troubleshooting:**
1. Check subscription autopay status:
   ```sql
   SELECT autopay_enabled, square_subscription_id, square_card_id
   FROM subscriptions
   WHERE company_id = '<company-id>';
   ```

2. Verify Square integration:
   - Check Square credentials are configured
   - Verify Square subscription exists
   - Check Square webhook configuration

3. Review billing scheduler logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs backend | grep -i billing
   ```

### Payment Processing Failures

**Symptoms:**
- Payment records show `failed` status
- Failure reason in payment record

**Troubleshooting:**
1. Review failure reasons:
   ```sql
   SELECT failure_reason, amount, billing_period_start, billing_period_end
   FROM subscription_payments
   WHERE status = 'failed'
   ORDER BY created_at DESC;
   ```

2. Common failure reasons:
   - Insufficient funds
   - Expired card
   - Invalid payment method
   - Square API errors

3. Resolve:
   - Contact customer to update payment method
   - Retry payment manually if needed
   - Update subscription status

### Refund Processing

**Symptoms:**
- Need to refund a subscription payment
- Refund not processing

**Troubleshooting:**
1. Find payment record:
   ```sql
   SELECT * FROM subscription_payments
   WHERE square_payment_id = '<payment-id>';
   ```

2. Process refund via Square dashboard or API

3. Update payment record:
   ```sql
   UPDATE subscription_payments
   SET status = 'refunded', updated_at = NOW()
   WHERE id = '<payment-id>';
   ```

## Webhook Handling

### Square Webhook Configuration

1. **Webhook URL**: `https://yourdomain.com/api/payments/webhooks/square`

2. **Required Events**:
   - `subscription.updated` - Subscription status changes
   - `payment.updated` - Payment status updates

3. **Verify Webhook Signature**:
   - Square signs webhooks with HMAC-SHA256
   - Verify signature in webhook handler

### Webhook Troubleshooting

**Symptoms:**
- Webhooks not received
- Subscription status not updating

**Troubleshooting:**
1. Check webhook logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs backend | grep -i webhook
   ```

2. Verify webhook endpoint is accessible:
   ```bash
   curl -X POST https://yourdomain.com/api/payments/webhooks/square
   ```

3. Check Square webhook configuration:
   - Log into Square dashboard
   - Verify webhook URL is correct
   - Check webhook delivery status

4. Review webhook handler code:
   - `backend/src/routes/payment.routes.ts`
   - Verify signature validation
   - Check error handling

## Manual Billing Operations

### Manual Payment Processing

If autopay fails or is disabled:

1. **Create payment record manually**:
   ```sql
   INSERT INTO subscription_payments (
     id, subscription_id, company_id, amount, status,
     billing_period_start, billing_period_end, location_count,
     created_at, updated_at
   ) VALUES (
     gen_random_uuid(),
     '<subscription-id>',
     '<company-id>',
     100.00,
     'pending',
     '<start-date>',
     '<end-date>',
     2,
     NOW(),
     NOW()
   );
   ```

2. **Process payment via Square**:
   - Use Square dashboard or API
   - Record Square payment ID

3. **Update payment record**:
   ```sql
   UPDATE subscription_payments
   SET square_payment_id = '<square-payment-id>',
       status = 'succeeded',
       updated_at = NOW()
   WHERE id = '<payment-id>';
   ```

### Adjust Subscription Amount

If billing amount needs manual adjustment:

```sql
UPDATE subscriptions
SET monthly_amount = <new-amount>,
    updated_at = NOW()
WHERE id = '<subscription-id>';
```

**Note:** This should only be done in exceptional circumstances. Normal billing should be calculated automatically.

### Mark Location as Free

To exempt a location from billing:

```sql
UPDATE locations
SET is_free = true,
    updated_at = NOW()
WHERE id = '<location-id>' AND company_id = '<company-id>';
```

**Note:** This will trigger automatic subscription recalculation.

### Disable Billing for Company

To temporarily disable billing:

```sql
UPDATE subscriptions
SET status = 'cancelled',
    updated_at = NOW()
WHERE company_id = '<company-id>';
```

**Note:** This will restrict access to non-free locations. Use with caution.

## Monitoring Billing

### Daily Billing Check

```bash
# Check subscriptions due for billing today
docker compose -f docker-compose.prod.yml exec postgres psql -U circuit_sage_user -d circuit_sage_db -c "
SELECT s.id, s.company_id, c.name, s.monthly_amount, s.status
FROM subscriptions s
JOIN companies c ON s.company_id = c.id
WHERE s.billing_day = EXTRACT(DAY FROM CURRENT_DATE)
  AND s.status = 'active'
  AND s.deleted_at IS NULL;
"
```

### Monthly Billing Report

```sql
SELECT
  c.name as company_name,
  s.monthly_amount,
  s.status,
  COUNT(DISTINCT l.id) as location_count,
  COUNT(DISTINCT l.id) FILTER (WHERE l.is_free = false) as billable_locations,
  SUM(sp.amount) FILTER (WHERE sp.status = 'succeeded' AND sp.billing_period_start >= DATE_TRUNC('month', CURRENT_DATE)) as paid_this_month
FROM subscriptions s
JOIN companies c ON s.company_id = c.id
LEFT JOIN locations l ON l.company_id = c.id AND l.deleted_at IS NULL
LEFT JOIN subscription_payments sp ON sp.subscription_id = s.id
WHERE s.deleted_at IS NULL
GROUP BY c.name, s.monthly_amount, s.status, s.id
ORDER BY s.monthly_amount DESC;
```

## Emergency Procedures

### Billing System Down

1. **Temporarily disable billing restrictions**:
   - Comment out billing middleware checks
   - Allow all locations to be accessible
   - Monitor for abuse

2. **Process payments manually**:
   - Use Square dashboard
   - Record payments in database
   - Reconcile when system is restored

### Data Corruption

1. **Stop accepting new data**
2. **Restore from backup**
3. **Verify data integrity**
4. **Resume operations**

## Support Contacts

- **Billing Issues**: [Your billing support email]
- **Payment Processing**: Square Support or your payment provider
- **Technical Issues**: See [OPERATIONS.md](./OPERATIONS.md)

