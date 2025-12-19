# API Validation & Error Handling Guide

## Overview

This document describes the comprehensive validation and error handling system implemented for all API endpoints in the GXQ Studio platform.

## Middleware Architecture

### 1. Validation Middleware (`api/middleware/validation.ts`)

Provides comprehensive input validation for all API endpoints.

#### Features:
- **Type validation**: string, number, boolean, array, object, email, url, solana-address
- **Required field checking**: Ensure mandatory fields are present
- **Range validation**: Min/max length for strings, min/max value for numbers
- **Pattern matching**: Regex validation for complex formats
- **Enum validation**: Restrict values to predefined set
- **Custom validation**: Custom validation functions
- **Sanitization**: Remove dangerous characters and HTML tags
- **Rate limiting**: In-memory rate limiting (use Redis in production)

#### Usage Example:

```typescript
import { validateRequest, ValidationRule } from '../middleware/validation';

const rules: ValidationRule[] = [
  {
    field: 'username',
    type: 'string',
    required: true,
    min: 3,
    max: 50,
  },
  {
    field: 'walletAddress',
    type: 'solana-address',
    required: true,
  },
  {
    field: 'amount',
    type: 'number',
    required: true,
    min: 0,
    custom: (value) => value > 0 || 'Amount must be positive',
  },
];

// In your endpoint handler
const validation = validateRequest(req.body, rules);
if (!validation.valid) {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    details: validation.errors,
  });
}
```

### 2. Error Handler Middleware (`api/middleware/errorHandler.ts`)

Provides centralized error handling with consistent error responses.

#### Error Types:
- `ValidationError` (400): Input validation failures
- `AuthenticationError` (401): Missing or invalid authentication
- `AuthorizationError` (403): Insufficient permissions
- `NotFoundError` (404): Resource not found
- `RateLimitError` (429): Rate limit exceeded
- `ConfigurationError` (500): Missing environment variables
- `ExternalServiceError` (503): External service failures

#### Usage Example:

```typescript
import { withErrorHandler, ValidationError, checkRequiredEnv } from '../middleware/errorHandler';

export default withErrorHandler(async (req, res) => {
  // Check required environment variables
  checkRequiredEnv(['SOLANA_RPC_URL', 'WALLET_PRIVATE_KEY']);

  // Your endpoint logic
  if (!req.body.username) {
    throw new ValidationError('Username is required');
  }

  // Automatic error handling and consistent responses
  return res.status(200).json({ success: true, data: result });
});
```

### 3. CORS Middleware (`api/middleware/cors.ts`)

Handles Cross-Origin Resource Sharing for API endpoints.

#### Features:
- **Origin validation**: Whitelist allowed origins
- **Credentials support**: Enable/disable credentials
- **Preflight handling**: Automatic OPTIONS request handling
- **Environment-aware**: Different configs for dev/prod

#### Usage Example:

```typescript
import { withCors, getCorsOptions } from '../middleware/cors';

export default withCors(async (req, res) => {
  // Your endpoint logic
  return res.status(200).json({ success: true });
}, getCorsOptions());
```

## Endpoint Validation Standards

### All Endpoints Must:

1. **Validate Input**
   - Check required fields
   - Validate data types
   - Sanitize user input
   - Validate Solana addresses

2. **Handle Errors**
   - Use consistent error format
   - Log errors with context
   - Return appropriate HTTP status codes
   - Never expose sensitive information

3. **Implement Rate Limiting**
   - Protect against abuse
   - Use appropriate limits per endpoint
   - Return `429` with reset time

4. **Check Authentication** (where required)
   - Verify JWT tokens
   - Check token expiration
   - Validate user permissions

5. **Log Requests**
   - Log important operations
   - Include request IDs
   - Log errors with full context

## Error Response Format

All errors follow this standard format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "username",
    "reason": "Username must be at least 3 characters"
  },
  "timestamp": 1703001234567,
  "requestId": "req_abc123"
}
```

## Validation Rules

### Common Validation Patterns

#### Solana Address Validation
```typescript
{
  field: 'walletAddress',
  type: 'solana-address',
  required: true,
}
```

#### Amount Validation
```typescript
{
  field: 'amount',
  type: 'number',
  required: true,
  min: 0,
  custom: (value) => value <= 1000000 || 'Amount too large',
}
```

#### Command Validation
```typescript
{
  field: 'command',
  type: 'string',
  required: true,
  enum: ['start', 'stop', 'pause', 'resume'],
}
```

## Rate Limiting

### Default Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/health` | 60 requests | 1 minute |
| `/api/admin/auth` | 5 requests | 15 minutes |
| `/api/monitor` | 10 requests | 1 minute |
| `/api/execute` | 5 requests | 1 minute |
| `/api/admin/*` | 30 requests | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1703001294567
```

## Testing Endpoints

### Automated Validation

Run the endpoint validation script:

```bash
npm run validate-endpoints http://localhost:3000
```

### Manual Testing

#### Test Health Endpoint
```bash
curl http://localhost:3000/api/health
```

#### Test Auth Endpoint
```bash
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

#### Test Protected Endpoint
```bash
curl http://localhost:3000/api/admin/metrics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Security Best Practices

### Input Validation
1. ✅ Always validate user input
2. ✅ Use type-safe validation
3. ✅ Sanitize HTML and scripts
4. ✅ Validate Solana addresses before use
5. ✅ Check array/object sizes

### Error Handling
1. ✅ Never expose stack traces in production
2. ✅ Log errors with full context
3. ✅ Use appropriate HTTP status codes
4. ✅ Return generic error messages to users
5. ✅ Log sensitive operations

### Authentication
1. ✅ Use JWT with expiration
2. ✅ Implement rate limiting on auth endpoints
3. ✅ Never log passwords or tokens
4. ✅ Use HTTPS in production
5. ✅ Rotate secrets regularly

### Rate Limiting
1. ✅ Implement per-IP rate limiting
2. ✅ Use stricter limits for auth endpoints
3. ✅ Return clear error messages
4. ✅ Consider using Redis for distributed systems
5. ✅ Monitor for abuse patterns

## Environment Configuration

### Required Variables

```env
# Required for all endpoints
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PRIVATE_KEY=your_base58_private_key

# Required for admin endpoints
ADMIN_USERNAME=admin
ADMIN_PASSWORD=strong_password
JWT_SECRET=your_32_character_secret

# Optional: Enhanced security
CRON_SECRET=your_cron_secret
```

### Validation on Startup

```typescript
import { checkRequiredEnv } from './middleware/errorHandler';

// Check at startup
checkRequiredEnv([
  'SOLANA_RPC_URL',
  'WALLET_PRIVATE_KEY',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'JWT_SECRET',
]);
```

## Monitoring & Debugging

### Request Logging

```typescript
console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
console.log('Headers:', req.headers);
console.log('Body:', req.body);
```

### Error Logging

```typescript
import { logError } from './middleware/errorHandler';

logError(error, {
  endpoint: req.url,
  method: req.method,
  ip: getClientIp(req),
  userId: req.user?.id,
});
```

### Health Monitoring

Monitor these metrics:
- Response times
- Error rates
- Rate limit hits
- Authentication failures
- RPC latency

## Common Issues & Solutions

### Issue: Validation Errors Not Showing

**Solution**: Ensure you're checking the `details` field in error responses.

### Issue: CORS Errors in Browser

**Solution**: Check that your domain is in the allowed origins list.

### Issue: Rate Limit Too Restrictive

**Solution**: Adjust rate limit parameters or implement user-based limits.

### Issue: Slow Endpoint Responses

**Solution**: 
1. Check RPC connection
2. Review database queries
3. Implement caching
4. Use connection pooling

## Next Steps

1. ✅ Implement validation for all endpoints
2. ✅ Add comprehensive error handling
3. ✅ Set up rate limiting
4. ✅ Configure CORS properly
5. ✅ Test all endpoints
6. ✅ Monitor errors in production
7. ✅ Document API changes

## Resources

- [TypeScript Type Guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
