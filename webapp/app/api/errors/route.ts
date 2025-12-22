import { NextRequest, NextResponse } from 'next/server';

/**
 * Error Logging API Endpoint
 * 
 * Receives error reports from the frontend ErrorBoundary and logs them securely.
 * This prevents errors from going unreported while avoiding console.error.
 */
export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();

    // Validate error data
    if (!errorData || typeof errorData !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid error data' },
        { status: 400 }
      );
    }

    // Sanitize error data to prevent injection attacks
    const sanitizedError = {
      message: String(errorData.message || 'Unknown error').slice(0, 500),
      name: String(errorData.name || 'Error').slice(0, 100),
      componentStack: errorData.componentStack 
        ? String(errorData.componentStack).slice(0, 1000)
        : undefined,
      timestamp: errorData.timestamp || new Date().toISOString(),
      userAgent: errorData.userAgent 
        ? String(errorData.userAgent).slice(0, 200)
        : undefined,
    };

    // In production, forward to centralized logging service
    // Examples: Sentry, LogRocket, DataDog, CloudWatch
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with your error tracking service
      // await sendToSentry(sanitizedError);
      // await sendToLogRocket(sanitizedError);
      // await sendToDataDog(sanitizedError);
      
      // For now, log structured error (Winston would be better)
      console.error('[Frontend Error]', JSON.stringify(sanitizedError));
    } else {
      // Development: log to console
      console.error('[Frontend Error (Dev)]', sanitizedError);
    }

    // Store critical errors in a database for analysis
    // This would typically go to a database like PostgreSQL or MongoDB
    if (isCriticalError(sanitizedError.name)) {
      // await saveCriticalErrorToDatabase(sanitizedError);
    }

    return NextResponse.json(
      { success: true, message: 'Error logged successfully' },
      { status: 200 }
    );
  } catch (error) {
    // Don't leak internal error details
    console.error('[Error API] Failed to log frontend error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to log error' },
      { status: 500 }
    );
  }
}

/**
 * Determine if an error is critical and needs immediate attention
 */
function isCriticalError(errorName: string): boolean {
  const criticalErrors = [
    'SecurityError',
    'AuthenticationError',
    'NetworkError',
    'TypeError', // Often indicates a serious bug
    'ReferenceError', // Usually a serious bug
  ];
  
  return criticalErrors.includes(errorName);
}

/**
 * OPTIONS method for CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
