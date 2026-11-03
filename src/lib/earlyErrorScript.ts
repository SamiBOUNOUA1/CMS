/**
 * Inline <head> script: listens for browser errors from the very first moment,
 * before React has hydrated. Errors thrown during hydration (e.g. "Text content
 * does not match server-rendered HTML") fire before any useEffect runs, so a
 * listener added by a component would miss them. They are queued in
 * window.__errQ and sent once ClientErrorReporter mounts and takes over __errH.
 */
export const earlyErrorScript =
  `(function(){var w=window;w.__errQ=[];w.__errH=function(c){w.__errQ.length<50&&w.__errQ.push(c)};` +
  `w.addEventListener('error',function(ev){w.__errH({kind:'error',ev:ev})});` +
  `w.addEventListener('unhandledrejection',function(ev){w.__errH({kind:'rejection',ev:ev})})})()`;
