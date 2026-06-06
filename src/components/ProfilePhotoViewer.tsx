import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, AlertCircle } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ViewerParams {
  url: string;
  name?: string | null;
  originRect?: DOMRect | null;
  isOwn?: boolean;
  statusText?: string;
  onOwnPhotoAction?: () => void;
}

interface ProfilePhotoViewerContextType {
  openViewer: (params: ViewerParams) => void;
  closeViewer: () => void;
}

type PhotoLoadState = 'loading-thumb' | 'loading-full' | 'loaded' | 'error';

interface ViewState extends ViewerParams {
  thumbLoaded: boolean;
  fullLoaded: boolean;
  loadError: boolean;
  scale: number;
  position: { x: number; y: number };
  dragY: number;
  overlayVisible: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_VELOCITY_THRESHOLD = 800;
const DRAG_DISMISS_RATIO = 0.4;
const ANIM_DURATION = 0.28;
const ANIM_EASING: [number, number, number, number] = [0.32, 0, 0.67, 0];
const OVERLAY_FADE_DELAY = 400;
const OVERLAY_FADE_DURATION = 0.2;

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

const ProfilePhotoViewerContext = createContext<ProfilePhotoViewerContextType | null>(null);

export function useProfilePhotoViewer() {
  const ctx = useContext(ProfilePhotoViewerContext);
  if (!ctx) throw new Error('useProfilePhotoViewer must be used within ProfilePhotoViewerProvider');
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Hook: reduced motion                                              */
/* ------------------------------------------------------------------ */

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ */
/*  Helper: get image final size (fills width or height, constrained) */
/* ------------------------------------------------------------------ */

function getImageFinalSize(img: HTMLImageElement, vw: number, vh: number) {
  const natW = img.naturalWidth || vw;
  const natH = img.naturalHeight || vh;
  const maxW = vw * 0.92;
  const maxH = vh * 0.85;
  const scaleX = maxW / natW;
  const scaleY = maxH / natH;
  const s = Math.min(scaleX, scaleY, 1);
  return { w: natW * s, h: natH * s };
}

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

export function ProfilePhotoViewerProvider({ children }: { children: ReactNode }) {
  const [vs, setVs] = useState<ViewState | null>(null);
  const reduced = useReducedMotion();

  /* refs for gesture tracking */
  const touchRef = useRef({ startX: 0, startY: 0, startDist: 0, startScale: 1,
    startPosX: 0, startPosY: 0, lastTap: 0, lastTapX: 0, lastTapY: 0,
    isPinching: false, velocityY: 0, lastMoveY: 0, lastMoveTime: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pristineThemeColor = useRef('');
  const unsubRef = useRef<(() => void) | null>(null);

  /* ---------- open / close ---------- */

  const closeViewer = useCallback(() => {
    if (typeof document !== 'undefined') {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (pristineThemeColor.current) meta?.setAttribute('content', pristineThemeColor.current);
      else meta?.removeAttribute('content');
      unsubRef.current?.();
      unsubRef.current = null;
    }
    setVs(null);
  }, []);

  const openViewer = useCallback((params: ViewerParams) => {
    if (typeof document !== 'undefined') {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const meta = document.querySelector('meta[name="theme-color"]');
      pristineThemeColor.current = meta?.getAttribute('content') || '';
      meta?.setAttribute('content', '#000000');
      window.history.pushState({ profilePhotoViewer: true }, '');
      const onPop = () => closeViewer();
      window.addEventListener('popstate', onPop);
      unsubRef.current = () => window.removeEventListener('popstate', onPop);
    }
    setVs({
      ...params,
      url: params.url,
      thumbLoaded: false,
      fullLoaded: false,
      loadError: false,
      scale: MIN_SCALE,
      position: { x: 0, y: 0 },
      dragY: 0,
      overlayVisible: false,
    });
  }, [closeViewer]);

  /* ---------- photo load ---------- */

  const handleThumbLoad = useCallback(() => {
    setVs(prev => prev ? { ...prev, thumbLoaded: true } : prev);
  }, []);

  const handleFullLoad = useCallback(() => {
    setVs(prev => prev ? { ...prev, fullLoaded: true } : prev);
  }, []);

  const handleLoadError = useCallback(() => {
    setVs(prev => prev ? { ...prev, loadError: true, fullLoaded: true } : prev);
  }, []);

  const handleRetry = useCallback(() => {
    setVs(prev => prev ? { ...prev, loadError: false, fullLoaded: false, thumbLoaded: false } : prev);
  }, []);

  /* ---------- gestures ---------- */

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!vs || vs.loadError) return;
    const t = touchRef.current;
    const now = Date.now();

    if (e.touches.length === 2) {
      t.isPinching = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      t.startDist = Math.hypot(dx, dy);
      t.startScale = vs.scale;
      t.startPosX = vs.position.x;
      t.startPosY = vs.position.y;
      return;
    }

    t.isPinching = false;
    t.startX = e.touches[0].clientX;
    t.startY = e.touches[0].clientY;
    t.startScale = vs.scale;
    t.startPosX = vs.position.x;
    t.startPosY = vs.position.y;
    t.lastMoveY = e.touches[0].clientY;
    t.lastMoveTime = now;
    t.velocityY = 0;

    /* double-tap detection */
    const dt = now - t.lastTap;
    t.lastTap = now;
    if (dt < 300 && Math.abs(e.touches[0].clientX - t.lastTapX) < 30 && Math.abs(e.touches[0].clientY - t.lastTapY) < 30) {
      const tapX = e.touches[0].clientX;
      const tapY = e.touches[0].clientY;
      t.lastTapX = 0;
      t.lastTapY = 0;
      if (vs.scale === MIN_SCALE) {
        /* zoom towards the tapped point */
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const offX = (tapX - vw / 2) * (1 - DOUBLE_TAP_SCALE);
        const offY = (tapY - vh / 2) * (1 - DOUBLE_TAP_SCALE);
        setVs(prev => prev ? { ...prev, scale: DOUBLE_TAP_SCALE, position: { x: offX, y: offY } } : prev);
      } else {
        setVs(prev => prev ? { ...prev, scale: MIN_SCALE, position: { x: 0, y: 0 } } : prev);
      }
      return;
    }
    t.lastTapX = e.touches[0].clientX;
    t.lastTapY = e.touches[0].clientY;
  }, [vs]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!vs || vs.loadError) return;
    const t = touchRef.current;
    const now = Date.now();

    if (e.touches.length === 2 && t.isPinching) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      let newScale = t.startScale * (dist / t.startDist);
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
      const scaleDelta = newScale / t.startScale;
      setVs(prev => prev ? {
        ...prev,
        scale: newScale,
        position: {
          x: t.startPosX * scaleDelta,
          y: t.startPosY * scaleDelta,
        },
      } : prev);
      return;
    }

    if (e.touches.length === 1 && !t.isPinching) {
      const dy = e.touches[0].clientY - t.startY;
      const dt = now - t.lastMoveTime;
      t.velocityY = dt > 0 ? (e.touches[0].clientY - t.lastMoveY) / dt * 1000 : 0;
      t.lastMoveY = e.touches[0].clientY;
      t.lastMoveTime = now;

      if (vs.scale > MIN_SCALE) {
        /* pan */
        e.preventDefault();
        setVs(prev => prev ? {
          ...prev,
          position: {
            x: t.startPosX + (e.touches[0].clientX - t.startX),
            y: t.startPosY + (e.touches[0].clientY - t.startY),
          },
        } : prev);
      } else {
        /* swipe to dismiss */
        if (dy > 0) {
          e.preventDefault();
          setVs(prev => prev ? { ...prev, dragY: dy } : prev);
        }
      }
    }
  }, [vs]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!vs) return;
    const t = touchRef.current;
    t.isPinching = false;

    if (vs.scale > MIN_SCALE) {
      /* when zoomed, allow it to stay */
      return;
    }

    const dy = vs.dragY;
    const vel = Math.abs(t.velocityY);

    if (vel > SWIPE_VELOCITY_THRESHOLD && t.velocityY > 0) {
      closeViewer();
      return;
    }

    if (dy / window.innerHeight >= DRAG_DISMISS_RATIO) {
      closeViewer();
      return;
    }

    if (dy > 1) {
      setVs(prev => prev ? { ...prev, dragY: 0 } : prev);
    }
  }, [vs, closeViewer]);

  /* ---------- keyboard ---------- */

  useEffect(() => {
    if (!vs) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    containerRef.current?.focus();
    return () => window.removeEventListener('keydown', handler);
  }, [vs, closeViewer]);

  /* ---------- overlay auto-hide ---------- */

  useEffect(() => {
    if (!vs) return;
    const timer = setTimeout(() => {
      setVs(prev => prev ? { ...prev, overlayVisible: true } : prev);
    }, OVERLAY_FADE_DELAY);
    return () => clearTimeout(timer);
  }, [vs ? vs.url : null]);

  /* ---------- compute animation origin ---------- */

  const hasOrigin = vs?.originRect && !reduced;
  const origin = hasOrigin ? vs!.originRect! : null;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 375;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 812;
  const centerX = vw / 2;
  const centerY = vh / 2;
  const finalW = vw * 0.92;
  const finalH = vh * 0.85;

  /* ---------- render ---------- */

  return (
    <ProfilePhotoViewerContext.Provider value={{ openViewer, closeViewer }}>
      {children}
      <AnimatePresence>
        {vs && (
          <motion.div
            ref={containerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={vs.name ? `${vs.name}'s profile photo` : 'Profile photo viewer'}
            initial={{ opacity: 0 }}
            animate={{
              opacity: vs.dragY > 0 ? Math.max(0, 1 - vs.dragY / (window.innerHeight * 0.4)) : 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.15 : ANIM_DURATION, ease: ANIM_EASING }}
            className="fixed inset-0 z-[100] touch-none select-none"
            onClick={(e) => {
              if (e.target === containerRef.current) closeViewer();
            }}
            style={{ backgroundColor: `rgba(0,0,0,${vs.dragY > 0 ? Math.max(0.3, 0.92 * (1 - vs.dragY / (window.innerHeight * 0.4))) : 0.92})` }}
          >
            {/* ---- TOP BAR ---- */}
            <AnimatePresence>
              {vs.overlayVisible && !reduced && (
                <motion.div
                  key="top-bar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: OVERLAY_FADE_DURATION }}
                  className="absolute top-0 left-0 right-0 z-10"
                  style={{
                    height: 80,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                    paddingTop: 'env(safe-area-inset-top, 0px)',
                  }}
                >
                  <div className="flex items-center justify-between px-4 h-full">
                    <button
                      onClick={(e) => { e.stopPropagation(); closeViewer(); }}
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                      aria-label="Close photo viewer"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                    <span className="text-sm font-medium text-white/90 truncate max-w-[60%] text-center">
                      {vs.name || ''}
                    </span>
                    <div className="w-10" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ---- PHOTO ---- */}
            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden"
              style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                setVs(prev => prev ? { ...prev, overlayVisible: !prev.overlayVisible } : prev);
              }}
            >
              {/* case: no url (show initials) */}
              {vs.loadError ? (
                <div className="flex flex-col items-center gap-3">
                  <AlertCircle className="w-10 h-10 text-white/40" />
                  <p className="text-sm text-white/50">Could not load photo</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRetry(); }}
                    className="text-xs text-white/60 underline underline-offset-2 hover:text-white/80"
                  >
                    Try again
                  </button>
                </div>
              ) : !vs.url ? (
                <div className="w-60 h-60 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center">
                  <span className="text-6xl font-bold text-white/80">
                    {vs.name ? vs.name.trim().slice(0, 2).toUpperCase() : '?'}
                  </span>
                </div>
                  ) : (
                    <motion.div
                      key={vs.url}
                      className="relative flex items-center justify-center"
                      initial={origin ? {
                        x: origin.left + origin.width / 2 - centerX,
                        y: origin.top + origin.height / 2 - centerY,
                        width: origin.width,
                        height: origin.height,
                      } : { scale: 0.85, opacity: 0 }}
                      animate={vs.dragY > 0 ? {
                        x: 0,
                        y: vs.dragY,
                        width: finalW * Math.max(0.65, 1 - vs.dragY / (window.innerHeight * 0.8)),
                        height: finalH * Math.max(0.65, 1 - vs.dragY / (window.innerHeight * 0.8)),
                        borderRadius: '0%',
                      } : {
                        x: 0,
                        y: 0,
                        width: finalW,
                        height: finalH,
                        borderRadius: '0%',
                      }}
                      exit={origin ? {
                        x: origin.left + origin.width / 2 - centerX,
                        y: origin.top + origin.height / 2 - centerY,
                        width: origin.width,
                        height: origin.height,
                        borderRadius: '50%',
                        opacity: 0,
                        transition: { duration: reduced ? 0.1 : ANIM_DURATION, ease: ANIM_EASING },
                      } : { scale: 0.85, opacity: 0, transition: { duration: reduced ? 0.1 : ANIM_DURATION } }}
                      transition={origin ? {
                        duration: reduced ? 0.15 : ANIM_DURATION,
                        ease: ANIM_EASING,
                      } : { duration: reduced ? 0.1 : 0.2 }}
                      style={{
                        maxWidth: finalW,
                        maxHeight: finalH,
                        transform: vs.scale > MIN_SCALE ? `scale(${vs.scale}) translate(${vs.position.x}px, ${vs.position.y}px)` : undefined,
                        borderRadius: origin ? '50%' : '0%',
                        willChange: 'transform, width, height',
                      }}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      {/* blurred thumbnail layer */}
                      {!vs.fullLoaded && (
                        <img
                          src={vs.url}
                          alt=""
                          className="block w-full h-full object-contain"
                          style={{ filter: 'blur(24px)', opacity: vs.thumbLoaded ? 1 : 0 }}
                          onLoad={handleThumbLoad}
                          onError={() => {}}
                        />
                      )}
                      {/* full-res layer */}
                      <img
                        ref={imgRef}
                        src={vs.url}
                        alt={vs.name ?? 'Profile photo'}
                        className="absolute inset-0 w-full h-full object-contain"
                        loading="lazy"
                        style={{ opacity: vs.fullLoaded ? 1 : 0, transition: 'opacity 0.2s ease' }}
                        onLoad={handleFullLoad}
                        onError={handleLoadError}
                        draggable={false}
                      />
                </motion.div>
              )}
            </div>

            {/* ---- BOTTOM BAR ---- */}
            <AnimatePresence>
              {vs.overlayVisible && !reduced && (
                <motion.div
                  key="bottom-bar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: OVERLAY_FADE_DURATION }}
                  className="absolute bottom-0 left-0 right-0 z-10"
                  style={{
                    height: 100,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                  }}
                >
                  <div className="flex items-end justify-between px-5 pb-5 h-full">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">
                        {vs.name || 'User'}
                      </span>
                      {vs.statusText ? (
                        <span className="text-xs text-white/60 mt-0.5">{vs.statusText}</span>
                      ) : null}
                      {vs.loadError && !vs.url && (
                        <span className="text-xs text-white/50 mt-0.5">Photo not available</span>
                      )}
                    </div>
                    {vs.isOwn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeViewer();
                          vs.onOwnPhotoAction?.();
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-medium"
                        aria-label="Change photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Change photo
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </ProfilePhotoViewerContext.Provider>
  );
}
