/**
 * Turns a plain error object ({ kind, status, detail }) into the words a person
 * sees. Raw API errors are never the headline; the real validation message is
 * shown for 422 because the user can act on it.
 *
 * context: startup | profile | search | analysis | outreach | export
 */
export function describeError(error, context = 'startup') {
  const kind = error?.kind
  const detail = error?.detail || ''

  if (kind === 'network') {
    return {
      title: 'Omni Model couldn’t connect to the workspace',
      message: 'Check your internet connection and try again.',
      hint: 'If this keeps happening during development, the workspace owner may need to allow this site’s address (CORS).',
      cta: 'Retry',
      retryable: true,
    }
  }
  if (kind === 'timeout') {
    if (context === 'analysis') {
      return {
        title: 'The analysis took too long',
        message: 'This website may be slow or heavy. You can try again, or continue with the estimated score.',
        cta: 'Try Again',
        retryable: true,
      }
    }
    return {
      title: 'The workspace is taking too long to respond',
      message: 'It may still be waking up. Try again in a moment.',
      cta: 'Retry',
      retryable: true,
    }
  }
  if (kind === 'auth') {
    return {
      title: 'Unable to authenticate',
      message: 'Check the API configuration.',
      detail,
      retryable: false,
    }
  }
  if (kind === 'config') {
    return {
      title: 'The workspace needs attention',
      message: 'The backend configuration needs attention. Let the workspace owner know.',
      detail,
      cta: 'Retry',
      retryable: true,
    }
  }
  if (kind === 'notfound') {
    return {
      title: 'We couldn’t find that business profile',
      message: 'It may have been removed. Reload to refresh the list of profiles.',
      detail,
      cta: 'Reload',
      retryable: true,
    }
  }
  if (kind === 'validation') {
    return {
      title: 'That request wasn’t accepted',
      message: detail || 'Please check what you entered and try again.',
      retryable: false,
    }
  }
  if (kind === 'request') {
    return {
      title: 'Something went wrong with that request',
      message: 'This looks like a bug in Omni Model rather than something you did. The details were logged to the browser console.',
      retryable: false,
    }
  }
  if (kind === 'upstream') {
    if (context === 'analysis') {
      return {
        title: 'We couldn’t analyze this website',
        message: 'The website or analysis service may be unavailable. Some sites block automated readers.',
        detail,
        cta: 'Try Again',
        retryable: true,
      }
    }
    if (context === 'search') {
      return {
        title: 'We couldn’t complete this search',
        message: 'The company data source may be unavailable right now.',
        detail,
        cta: 'Try Again',
        retryable: true,
      }
    }
    return {
      title: 'A service Omni Model depends on is unavailable',
      message: 'Please try again in a moment.',
      detail,
      cta: 'Try Again',
      retryable: true,
    }
  }
  if (kind === 'empty') {
    return {
      title: 'Omni Model couldn’t read the workspace’s profile list',
      message: 'The server answered, but not with a profile Omni Model could use. Let the workspace owner know, or try again.',
      detail,
      cta: 'Retry',
      retryable: true,
    }
  }
  return {
    title: 'Something went wrong',
    message: 'Please try again. If it keeps happening, let the workspace owner know.',
    detail,
    cta: 'Try Again',
    retryable: true,
  }
}
