# Incident Response Guide

This guide provides procedures for responding to incidents and outages in Circuit Sage.

## Table of Contents

- [Incident Classification](#incident-classification)
- [Response Procedures](#response-procedures)
- [Common Incidents](#common-incidents)
- [Communication](#communication)
- [Post-Incident Review](#post-incident-review)

## Incident Classification

### Severity Levels

**Critical (P1)**
- Complete service outage
- Data loss or corruption
- Security breach
- Payment processing failure affecting multiple customers

**High (P2)**
- Partial service outage
- Performance degradation affecting majority of users
- Billing calculation errors
- Single customer payment processing failure

**Medium (P3)**
- Minor feature outage
- Performance issues affecting subset of users
- Non-critical bugs

**Low (P4)**
- Cosmetic issues
- Minor bugs with workarounds
- Documentation issues

## Response Procedures

### Initial Response (First 5 Minutes)

1. **Acknowledge Incident**
   - Confirm incident exists
   - Classify severity level
   - Notify team if needed

2. **Assess Impact**
   - Check health endpoint: `curl https://yourdomain.com/api/health`
   - Review error logs: `docker compose -f docker-compose.prod.yml logs --tail=100`
   - Check monitoring dashboards
   - Identify affected users/features

3. **Contain Impact**
   - Enable maintenance mode if needed
   - Stop accepting new requests if necessary
   - Isolate affected components

### Investigation (5-30 Minutes)

1. **Gather Information**
   ```bash
   # Check service status
   docker compose -f docker-compose.prod.yml ps

   # Review recent logs
   docker compose -f docker-compose.prod.yml logs --tail=500 backend
   docker compose -f docker-compose.prod.yml logs --tail=500 frontend
   docker compose -f docker-compose.prod.yml logs --tail=500 postgres

   # Check system resources
   docker stats
   df -h
   free -h
   ```

2. **Identify Root Cause**
   - Review error messages
   - Check recent deployments
   - Review database queries
   - Check external service status

3. **Document Findings**
   - Record symptoms
   - Note affected components
   - Document error messages
   - Capture logs

### Resolution

1. **Choose Resolution Strategy**
   - **Quick Fix**: Apply immediate fix if safe
   - **Rollback**: Revert to previous version if recent deployment caused issue
   - **Workaround**: Implement temporary workaround
   - **Full Fix**: Implement proper fix if time permits

2. **Implement Fix**
   - Follow change procedures
   - Test fix in staging if possible
   - Deploy fix
   - Verify resolution

3. **Verify Resolution**
   - Check health endpoint
   - Test affected functionality
   - Monitor logs for errors
   - Confirm with users if needed

### Recovery

1. **Restore Normal Operations**
   - Disable maintenance mode
   - Resume normal traffic
   - Monitor closely

2. **Verify Data Integrity**
   - Check database consistency
   - Verify recent transactions
   - Review audit logs

3. **Communicate Resolution**
   - Notify affected users
   - Update status page
   - Document resolution

## Common Incidents

### Service Outage

**Symptoms:**
- Health endpoint returns 503
- Frontend shows error page
- API returns 500 errors

**Response:**
1. Check Docker containers: `docker compose -f docker-compose.prod.yml ps`
2. Review logs for errors
3. Check database connectivity
4. Verify environment variables
5. Restart services if needed: `docker compose -f docker-compose.prod.yml restart`

**Resolution:**
- Fix underlying issue
- Restart affected services
- Verify health endpoint returns 200

### Database Connection Failure

**Symptoms:**
- Health check shows database disconnected
- API errors mentioning database
- Connection timeout errors

**Response:**
1. Check database container: `docker compose -f docker-compose.prod.yml ps postgres`
2. Review database logs: `docker compose -f docker-compose.prod.yml logs postgres`
3. Test connection: `docker compose -f docker-compose.prod.yml exec postgres psql -U circuit_sage_user -d circuit_sage_db`
4. Check connection pool settings

**Resolution:**
- Restart database if needed
- Adjust connection pool settings
- Check for connection leaks
- Verify database credentials

### High Memory Usage

**Symptoms:**
- Slow response times
- Out of memory errors
- Container restarts

**Response:**
1. Check memory usage: `docker stats`
2. Review application logs for memory leaks
3. Check database query performance
4. Review recent code changes

**Resolution:**
- Restart services to free memory
- Optimize queries
- Increase container memory limits
- Fix memory leaks

### Billing Calculation Errors

**Symptoms:**
- Incorrect subscription amounts
- Billing not updating when locations change
- Payment processing failures

**Response:**
1. Review billing calculation logic
2. Check location records: `SELECT * FROM locations WHERE company_id = '<id>'`
3. Verify subscription records: `SELECT * FROM subscriptions WHERE company_id = '<id>'`
4. Review billing service logs

**Resolution:**
- Recalculate billing amounts
- Update subscription records
- Fix calculation logic if needed
- Reconcile payments

### Payment Processing Failure

**Symptoms:**
- Payments not processing
- Subscription status stuck at past_due
- Webhook failures

**Response:**
1. Check payment integration status
2. Review payment logs: `docker compose -f docker-compose.prod.yml logs backend | grep -i payment`
3. Verify Square/webhook configuration
4. Check payment records in database

**Resolution:**
- Fix payment integration
- Retry failed payments
- Update payment methods
- Reconcile payment records

### Security Incident

**Symptoms:**
- Unauthorized access attempts
- Suspicious activity in logs
- Data breach indicators

**Response:**
1. **Immediate Actions**
   - Isolate affected systems
   - Preserve logs and evidence
   - Change compromised credentials
   - Review access logs

2. **Investigation**
   - Identify attack vector
   - Assess data exposure
   - Review security configurations
   - Check for data exfiltration

3. **Containment**
   - Block malicious IPs
   - Rotate all secrets
   - Update security settings
   - Patch vulnerabilities

**Resolution:**
- Implement security fixes
- Update security policies
- Notify affected users if required
- Report to authorities if needed

## Communication

### Internal Communication

- **Slack/Team Chat**: Use dedicated incident channel
- **Status Updates**: Update every 15-30 minutes during incident
- **Escalation**: Escalate to senior team members for P1 incidents

### External Communication

- **Status Page**: Update status page with incident details
- **User Notifications**: Email affected users for P1/P2 incidents
- **Social Media**: Post updates if service is public-facing

### Communication Template

```
Subject: [INCIDENT] Service Outage - [Brief Description]

Status: [Investigating/Identified/Monitoring/Resolved]

Summary:
[Brief description of incident]

Impact:
[What is affected and who is impacted]

Timeline:
[Key events and timestamps]

Next Update:
[When next update will be provided]

For updates, visit: [Status page URL]
```

## Post-Incident Review

### Within 24 Hours

1. **Document Incident**
   - Timeline of events
   - Root cause analysis
   - Resolution steps taken
   - Impact assessment

2. **Identify Improvements**
   - What went well
   - What could be improved
   - Process improvements
   - Technical improvements

### Within 1 Week

1. **Implement Improvements**
   - Fix root causes
   - Update procedures
   - Improve monitoring
   - Add safeguards

2. **Share Learnings**
   - Document lessons learned
   - Update runbooks
   - Train team members
   - Update incident response procedures

### Incident Report Template

```markdown
# Incident Report: [Title]

**Date**: [Date]
**Duration**: [Start time] - [End time]
**Severity**: [P1/P2/P3/P4]
**Status**: [Resolved]

## Summary
[Brief summary of incident]

## Timeline
- [Time] - [Event]
- [Time] - [Event]
- [Time] - [Event]

## Root Cause
[Detailed root cause analysis]

## Impact
- Users affected: [Number]
- Features affected: [List]
- Data impact: [Description]

## Resolution
[Steps taken to resolve]

## Prevention
[Measures to prevent recurrence]

## Action Items
- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]
```

## Emergency Contacts

- **On-Call Engineer**: [Contact]
- **Team Lead**: [Contact]
- **Infrastructure**: [Contact]
- **Security**: [Contact]

## Escalation Path

1. **Level 1**: On-call engineer
2. **Level 2**: Team lead
3. **Level 3**: Engineering manager
4. **Level 4**: CTO/VP Engineering

## Prevention

### Proactive Measures

1. **Monitoring**
   - Set up comprehensive monitoring
   - Configure alerts for critical metrics
   - Regular health checks

2. **Testing**
   - Regular load testing
   - Chaos engineering
   - Disaster recovery drills

3. **Documentation**
   - Keep runbooks updated
   - Document common issues
   - Maintain incident history

4. **Process**
   - Code review requirements
   - Deployment procedures
   - Change management

