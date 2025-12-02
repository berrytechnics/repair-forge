# Debugging Authorization Issue

## User Data (from database)
- ✅ User has `company_id`: `0994ccdf-41e0-48b0-a3fa-2fcbef4b2422`
- ✅ User has `current_location_id`: `c768fa22-7c31-40d7-8b63-40f760007aa7`
- ✅ Location belongs to correct company
- ✅ Permissions exist (42 admin permissions)
- ✅ Admin has `settings.access` permission

## Possible Issues

### 1. Check Browser Console
Open browser DevTools (F12) → Network tab → Try logging in → Check which API call fails:
- `/api/auth/me` - Should return user with permissions
- `/api/ticket` - Requires location context
- `/api/customers` - Requires tenant context
- `/api/reporting/dashboard-stats` - Requires location context and role check

### 2. Check Backend Logs
Look for errors mentioning:
- "Company context required"
- "User must have a current location set"
- "User does not have access to this location"
- Permission-related errors

### 3. Test Individual Endpoints
After logging in, check if these work:
```bash
# Get your JWT token from browser localStorage/sessionStorage
# Then test endpoints:
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/auth/me
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/ticket
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/customers
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/reporting/dashboard-stats
```

### 4. Most Likely Issue
The error "you are not authorized" appears briefly, then redirects. This suggests:
1. Login succeeds ✅
2. `/me` might succeed ✅
3. Dashboard loads ✅
4. **One of the dashboard API calls fails** ❌
5. Error interceptor redirects to login

The dashboard calls:
- `getTickets()` → `/api/ticket` (requires `requireLocationContext`)
- `getCustomers()` → `/api/customers` (requires `requireTenantContext`)
- `getDashboardStats()` → `/api/reporting/dashboard-stats` (requires `requireLocationContext` + `requireRole`)

### 5. Quick Fix to Try
The location middleware should auto-set location for admins, but if it's not working, you can manually set it in TablePlus:

```sql
-- Check current location
SELECT id, current_location_id FROM users WHERE email = 'test@test.com';

-- If current_location_id is NULL, set it:
UPDATE users 
SET current_location_id = 'c768fa22-7c31-40d7-8b63-40f760007aa7'
WHERE email = 'test@test.com';
```

### 6. Check JWT Token
The JWT token contains `userId` and `companyId`. When verified, it fetches fresh user from DB. 
If the user object from DB doesn't have `company_id`, that would cause the error.

## Next Steps
1. Check browser console Network tab to see exact failing endpoint
2. Check backend logs for error messages
3. Verify the failing endpoint's middleware requirements
4. Test the endpoint directly with curl using your JWT token

