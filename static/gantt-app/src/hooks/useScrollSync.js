import { useRef, useCallback } from 'react';

export function useScrollSync() {
  const sidebarRef = useRef(null);
  const timelineRef = useRef(null);
  const isSyncingRef = useRef(false);

  const onSidebarScroll = useCallback(() => {
    if (isSyncingRef.current || !timelineRef.current || !sidebarRef.current) return;
    isSyncingRef.current = true;
    timelineRef.current.scrollTop = sidebarRef.current.scrollTop;
    requestAnimationFrame(() => { isSyncingRef.current = false; });
  }, []);

  const onTimelineScroll = useCallback(() => {
    if (isSyncingRef.current || !sidebarRef.current || !timelineRef.current) return;
    isSyncingRef.current = true;
    sidebarRef.current.scrollTop = timelineRef.current.scrollTop;
    requestAnimationFrame(() => { isSyncingRef.current = false; });
  }, []);

  return { sidebarRef, timelineRef, onSidebarScroll, onTimelineScroll };
}
