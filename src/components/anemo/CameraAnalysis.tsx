'use client';

/**
 * CameraAnalysis
 * ==============
 * High-performance anemia analysis camera component for Anemo AI.
 *
 * Performance Architecture
 * ------------------------
 * - requestVideoFrameCallback drives per-frame luma sampling (decoupled from
 *   React's render loop — the UI stays at 60 fps).
 * - OffscreenCanvas handles frame capture off the main thread.
 * - 720p @ 30 fps constraints (1280×720, max 30 fps) prevent thermal
 *   throttling on iPhone 16 and similar high-end mobile browsers.
 * - useEnsembleModel runs 10-model inference in a dedicated Web Worker.
 *
 * Visual Design
 * -------------
 * - Stadium / oval shaped viewport that MORPHS per body-part via CSS clip-path.
 * - HUD overlay: animated corner brackets, scan-line, cross-hair and a
 *   colour-coded target frame — all change colour by body part.
 *     Eye  → Crimson  (#ef4444)
 *     Nail → Blue     (#3b82f6)
 *     Skin → Amber    (#f59e0b)
 * - Glassmorphism panels (.glass-panel, .glass-button) from globals.css.
 * - Design tokens: --primary (crimson), --background, --border, --muted, etc.
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Hand,
  Fingerprint,
  Activity,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  ChevronRight,
  Droplets,
  FlipHorizontal,
  Zap,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useEnsembleModel } from '@/hooks/use-ensemble-model';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { enqueueFirestoreSave } from '@/lib/offline-queue';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';
import type { BodyPart } from '@/lib/ensemble/consensus-engine';

// ─────────────────────────────────────────────────────────────────────────────
// Camera constraints — 720p @ 30 fps, no 4K
// ─────────────────────────────────────────────────────────────────────────────

// Portrait-first constraints — 720×1280 (9:16) for mobile portrait mode.
// On desktop the browser may clamp to the actual sensor; the UI adapts via CSS.
const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 720, max: 1080 },
  height: { ideal: 1280, max: 1920 },
  frameRate: { ideal: 30, max: 30 },
};

// TypeScript shim for requestVideoFrameCallback (not yet in lib.dom.d.ts)
type VideoWithRVFC = HTMLVideoElement & {
  requestVideoFrameCallback: (
    cb: (now: DOMHighResTimeStamp, meta: Record<string, unknown>) => void,
  ) => number;
  cancelVideoFrameCallback: (handle: number) => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CaptureStep = 'skin' | 'fingernails' | 'undereye';
type PanelStep = CaptureStep | 'analysing' | 'results';

interface CaptureData {
  dataUri: string;
  canvas: HTMLCanvasElement;
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD configuration per body-part
// ─────────────────────────────────────────────────────────────────────────────

interface HudConfig {
  /** Hex accent colour used for HUD decorations. */
  color: string;
  /** Tailwind text-* colour for labelling. */
  accentClass: string;
  /** CSS clip-path applied to the viewport container. */
  clipPath: string;
  /** Short status label shown in the REC HUD. */
  label: string;
  /** User-facing instruction shown below the viewport. */
  instruction: string;
}

const HUD_CONFIGS: Record<CaptureStep, HudConfig> = {
  skin: {
    color: '#f59e0b',
    accentClass: 'text-amber-400',
    clipPath: 'inset(8% 12% 8% 12% round 40% / 45%)',
    label: 'PALM · SKIN SCAN',
    instruction: 'Center your palm face-up in the target frame',
  },
  fingernails: {
    color: '#3b82f6',
    accentClass: 'text-blue-400',
    clipPath: 'inset(15% 5% 15% 5% round 14px)',
    label: 'NAILBED · MATRIX SCAN',
    instruction: 'Hold fingernails flat — tips pointing toward the camera',
  },
  undereye: {
    color: '#ef4444',
    accentClass: 'text-red-400',
    clipPath: 'ellipse(47% 30% at 50% 50%)',
    label: 'CONJUNCTIVA · EYE SCAN',
    instruction: 'Pull your lower eyelid gently down and look slightly up',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Step configuration
// ─────────────────────────────────────────────────────────────────────────────

interface StepConfig {
  id: CaptureStep;
  label: string;
  bodyPartKey: BodyPart;
  icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
  {
    id: 'skin',
    label: 'Skin',
    bodyPartKey: 'Skin',
    icon: <Hand className="w-5 h-5" />,
  },
  {
    id: 'fingernails',
    label: 'Fingernails',
    bodyPartKey: 'Fingernails',
    icon: <Fingerprint className="w-5 h-5" />,
  },
  {
    id: 'undereye',
    label: 'Under-eye',
    bodyPartKey: 'Undereye',
    icon: <Eye className="w-5 h-5" />,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Explainable-AI descriptions (one per body part)
// ─────────────────────────────────────────────────────────────────────────────

const XAI_DESCRIPTIONS: Record<CaptureStep, string> = {
  undereye:
    'The AI detected that the inner lining of your lower eyelid is paler than the healthy baseline, which often indicates low iron levels. Healthy conjunctiva appears bright pink from active blood flow through fine capillaries.',
  fingernails:
    "Your nailbeds appear slightly washed-out compared to a healthy baseline. The tissue under the nails should look pink from oxygenated blood — reduced colour here often signals low hemoglobin.",
  skin: 'The AI detected that your palm skin tone is paler than the expected baseline. When red blood cell counts drop, the capillaries under the skin carry less oxygenated blood, producing visible pallor in the creases.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Severity colour mapping
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  Normal: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Mild: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Moderate: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Severe: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// Lux thresholds for quality warnings.
const LUX_MIN = 300;
const LUX_MAX = 8000;

// ─────────────────────────────────────────────────────────────────────────────
// TargetFrame — morphing SVG body-part guide
// ─────────────────────────────────────────────────────────────────────────────

function TargetFrame({
  step,
  color,
}: {
  step: CaptureStep;
  color: string;
}) {
  if (step === 'undereye') {
    return (
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        {/* Outer eyelid guide */}
        <path
          d="M15,50 Q50,18 85,50 Q50,82 15,50 Z"
          fill="none"
          stroke={color}
          strokeWidth="0.6"
          strokeDasharray="3 3"
          opacity="0.5"
        />
        {/* Inner conjunctiva target */}
        <path
          d="M25,50 Q50,32 75,50"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          opacity="0.9"
          strokeLinecap="round"
          className="animate-pulse"
        />
        <circle cx="50" cy="50" r="8" fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.7" />
        <text x="50" y="78" textAnchor="middle" fontSize="3.5" fontFamily="monospace" fontWeight="bold" fill={color} opacity="0.8" letterSpacing="1">
          ALIGN LOWER EYELID
        </text>
      </svg>
    );
  }

  if (step === 'fingernails') {
    return (
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        {/* Four nail outlines */}
        <rect x="10" y="28" width="16" height="44" rx="6" fill="none" stroke={color} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
        <rect x="30" y="22" width="16" height="48" rx="6" fill="none" stroke={color} strokeWidth="1.1" opacity="0.9" className="animate-pulse" />
        <rect x="50" y="24" width="16" height="46" rx="6" fill="none" stroke={color} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
        <rect x="70" y="34" width="16" height="36" rx="6" fill="none" stroke={color} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6" />
        {/* Nail bed indicator on primary nail */}
        <line x1="30" y1="52" x2="46" y2="52" stroke={color} strokeWidth="0.8" opacity="0.7" />
        <text x="50" y="86" textAnchor="middle" fontSize="3.5" fontFamily="monospace" fontWeight="bold" fill={color} opacity="0.8" letterSpacing="1">
          ALIGN NAIL MATRICES
        </text>
      </svg>
    );
  }

  // skin / palm
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
    >
      {/* Palm outline */}
      <rect x="28" y="18" width="44" height="56" rx="12" fill="none" stroke={color} strokeWidth="0.6" strokeDasharray="3 3" opacity="0.5" />
      {/* Palmar crease lines */}
      <path d="M32,36 Q50,32 68,36" fill="none" stroke={color} strokeWidth="0.9" opacity="0.8" className="animate-pulse" strokeLinecap="round" />
      <path d="M32,50 Q50,46 68,50" fill="none" stroke={color} strokeWidth="0.9" opacity="0.8" className="animate-pulse" strokeLinecap="round" />
      <path d="M32,64 Q50,60 68,64" fill="none" stroke={color} strokeWidth="0.9" opacity="0.8" className="animate-pulse" strokeLinecap="round" />
      <text x="50" y="86" textAnchor="middle" fontSize="3.5" fontFamily="monospace" fontWeight="bold" fill={color} opacity="0.8" letterSpacing="1">
        CENTER PALM CREASES
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD corner brackets — pure CSS/SVG element
// ─────────────────────────────────────────────────────────────────────────────

function HudBrackets({ color }: { color: string }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Top-left */}
      <path d="M4,13 L4,4 L13,4" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* Top-right */}
      <path d="M87,4 L96,4 L96,13" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* Bottom-left */}
      <path d="M4,87 L4,96 L13,96" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* Bottom-right */}
      <path d="M87,96 L96,96 L96,87" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* Centre cross-hair */}
      <line x1="46" y1="50" x2="54" y2="50" stroke={color} strokeWidth="0.6" opacity="0.8" />
      <line x1="50" y1="46" x2="50" y2="54" stroke={color} strokeWidth="0.6" opacity="0.8" />
      <circle cx="50" cy="50" r="1.2" fill={color} opacity="0.7" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface CameraAnalysisProps {
  onBack?: () => void;
}

export function CameraAnalysis({ onBack }: CameraAnalysisProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const savedRef = useRef(false);

  const {
    runAnalysis,
    progress,
    ensembleReport,
    severity,
    consensusHgb,
    report,
    dietaryRecommendations,
    error,
    reset,
  } = useEnsembleModel();

  // ── Step state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<PanelStep>('skin');
  const [stepIndex, setStepIndex] = useState(0);
  const [captures, setCaptures] = useState<Partial<Record<CaptureStep, CaptureData>>>({});

  // ── Camera state ────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const rvfcHandleRef = useRef<number | null>(null);
  const rafHandleRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [lux, setLux] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Hidden off-screen canvases — one per body-part for ensemble input
  const skinCanvasRef = useRef<HTMLCanvasElement>(null);
  const nailsCanvasRef = useRef<HTMLCanvasElement>(null);
  const eyeCanvasRef = useRef<HTMLCanvasElement>(null);

  const captureCanvasRefs: Record<CaptureStep, React.RefObject<HTMLCanvasElement | null>> =
    useMemo(
      () => ({ skin: skinCanvasRef, fingernails: nailsCanvasRef, undereye: eyeCanvasRef }),
      [],
    );

  // ── Computed helpers ────────────────────────────────────────────────────
  const isCaptureStep =
    step === 'skin' || step === 'fingernails' || step === 'undereye';
  const currentStepCfg = STEPS[stepIndex];
  const hudConfig = HUD_CONFIGS[currentStepCfg?.id ?? 'skin'];
  const lowLight = lux !== null && lux < LUX_MIN;
  const highLight = lux !== null && lux > LUX_MAX;
  const canCapture = cameraReady && !isCapturing && !lowLight && !highLight;

  // ── Camera initialisation ───────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
    setCameraError(null);
    setLux(null);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { ...CAMERA_CONSTRAINTS, facingMode },
        audio: false,
      });
      streamRef.current = newStream;
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setCameraError('no-device');
      } else if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setCameraError('permission-denied');
      } else {
        setCameraError('unknown');
      }
    }
  }, [facingMode]);

  // Start / stop camera depending on current step and facing mode.
  useEffect(() => {
    if (!isCaptureStep) return;
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, stepIndex, isCaptureStep]);

  // ── rVFC luma monitor ───────────────────────────────────────────────────
  // Samples a small central patch of each video frame to estimate lux.
  // Uses requestVideoFrameCallback when available (decoupled from rAF /
  // React render) and falls back to a throttled rAF loop.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;

    let stopped = false;
    let offscreen: OffscreenCanvas | null = null;
    let offCtx: OffscreenCanvasRenderingContext2D | null = null;

    const measureLuma = () => {
      if (!video || video.readyState < 2) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      // Sample a 10%-of-each-dimension patch from the centre.
      const sw = Math.max(1, Math.floor(vw * 0.1));
      const sh = Math.max(1, Math.floor(vh * 0.1));
      const sx = Math.floor((vw - sw) / 2);
      const sy = Math.floor((vh - sh) / 2);

      try {
        if (typeof OffscreenCanvas !== 'undefined') {
          if (!offscreen || offscreen.width !== sw || offscreen.height !== sh) {
            offscreen = new OffscreenCanvas(sw, sh);
            offCtx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
          }
          offCtx?.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
          const px = offCtx?.getImageData(0, 0, sw, sh)?.data;
          if (px) {
            let sum = 0;
            for (let i = 0; i < px.length; i += 4)
              sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
            // Rough heuristic: 1 luma unit ≈ 4 lux
            setLux(Math.round((sum / (px.length / 4)) * 4));
          }
        }
      } catch {
        // OffscreenCanvas may be blocked by cross-origin policies; ignore.
      }
    };

    const videoRVFC = video as VideoWithRVFC;

    if ('requestVideoFrameCallback' in video) {
      const tick = (_: DOMHighResTimeStamp, __: Record<string, unknown>) => {
        if (stopped) return;
        measureLuma();
        rvfcHandleRef.current = videoRVFC.requestVideoFrameCallback(tick);
      };
      rvfcHandleRef.current = videoRVFC.requestVideoFrameCallback(tick);
    } else {
      let lastTime = 0;
      const tick = (t: number) => {
        if (stopped) return;
        if (t - lastTime > 100) { lastTime = t; measureLuma(); }
        rafHandleRef.current = requestAnimationFrame(tick);
      };
      rafHandleRef.current = requestAnimationFrame(tick);
    }

    return () => {
      stopped = true;
      if (rvfcHandleRef.current !== null && 'cancelVideoFrameCallback' in video) {
        videoRVFC.cancelVideoFrameCallback(rvfcHandleRef.current);
        rvfcHandleRef.current = null;
      }
      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }
    };
  }, [cameraReady]);

  // Low-light toast — fires once per transition into low-light territory.
  const prevLowLightRef = useRef(false);
  const prevHighLightRef = useRef(false);
  useEffect(() => {
    if (lowLight && !prevLowLightRef.current) {
      toast({
        title: '⚠️ Low Light Detected',
        description: 'Please move to a brighter spot for the most accurate scan.',
      });
    }
    prevLowLightRef.current = lowLight;
  }, [lowLight, toast]);

  useEffect(() => {
    if (highLight && !prevHighLightRef.current) {
      toast({
        title: '☀️ Too Much Light',
        description: 'Reduce direct lighting or move to a shadier area for an accurate scan.',
      });
    }
    prevHighLightRef.current = highLight;
  }, [highLight, toast]);

  // ── Frame capture ────────────────────────────────────────────────────────
  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const cfg = STEPS[stepIndex];
    const canvasRef = captureCanvasRefs[cfg.id];

    try {
      let dataUri: string;

      // Prefer OffscreenCanvas so the DOM render thread stays unblocked.
      if (typeof OffscreenCanvas !== 'undefined') {
        const off = new OffscreenCanvas(vw, vh);
        const ctx = off.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
        if (!ctx) throw new Error('OffscreenCanvas context unavailable');
        ctx.drawImage(video, 0, 0, vw, vh);
        const blob = await off.convertToBlob({ type: 'image/png' });
        dataUri = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(blob);
        });
      } else {
        // Main-thread fallback
        const canvas = hiddenCanvasRef.current;
        if (!canvas) throw new Error('No fallback canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('No canvas context');
        canvas.width = vw;
        canvas.height = vh;
        ctx.drawImage(video, 0, 0, vw, vh);
        dataUri = canvas.toDataURL('image/png');
      }

      // Draw into the body-part canvas that will be passed to the ensemble.
      if (canvasRef.current) {
        const img = new Image();
        await new Promise<void>((res, rej) => {
          img.onload = () => {
            const c = canvasRef.current;
            if (!c) { res(); return; }
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext('2d')?.drawImage(img, 0, 0);
            img.src = ''; // free memory
            res();
          };
          img.onerror = rej;
          img.src = dataUri;
        });
      }

      setCaptures((prev) => ({
        ...prev,
        [cfg.id]: { dataUri, canvas: canvasRef.current! },
      }));

      // Advance to next step or begin ensemble.
      const nextIdx = stepIndex + 1;
      if (nextIdx < STEPS.length) {
        setStepIndex(nextIdx);
        setStep(STEPS[nextIdx].id);
        setCameraReady(false);
      } else {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setStep('analysing');
      }
    } catch (err) {
      toast({
        title: 'Capture Error',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
      haptic.error();
    } finally {
      setIsCapturing(false);
      setCountdown(null);
    }
  }, [stepIndex, captureCanvasRefs, toast]);

  const handleCaptureClick = useCallback(() => {
    if (!canCapture) return;
    setIsCapturing(true);
    let count = 3;
    setCountdown(count);
    const id = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(id);
        captureFrame();
      }
    }, 800);
  }, [canCapture, captureFrame]);

  // ── Run ensemble when step = 'analysing' ─────────────────────────────────
  useEffect(() => {
    if (step !== 'analysing') return;
    const inputs: Partial<Record<BodyPart, HTMLCanvasElement>> = {};
    if (skinCanvasRef.current) inputs.Skin = skinCanvasRef.current;
    if (nailsCanvasRef.current) inputs.Fingernails = nailsCanvasRef.current;
    if (eyeCanvasRef.current) inputs.Undereye = eyeCanvasRef.current;
    runAnalysis(inputs)
      .then(() => setStep('results'))
      .catch((err) => {
        console.error('Ensemble analysis failed:', err);
        toast({
          title: 'Analysis Rejected',
          description: err instanceof Error ? err.message : 'Quality check failed. Please retake the photos.',
          variant: 'destructive',
        });
        setStep('skin'); // reset to first step on error
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Scout quality gate ───────────────────────────────────────────────────
  useEffect(() => {
    if (!ensembleReport) return;
    const capturedKeys = new Set(
      Object.entries(captures)
        .filter(([, v]) => !!v)
        .map(([k]) => k),
    );
    for (const scout of ensembleReport.modelResults.filter((r) => r.tier === 1)) {
      const wasProvided =
        (scout.modelId.includes('skin') && capturedKeys.has('skin')) ||
        (scout.modelId.includes('nail') && capturedKeys.has('fingernails')) ||
        (scout.modelId.includes('eye') && capturedKeys.has('undereye'));
      if (!wasProvided || scout.qualityApproved) continue;
      const part = scout.modelName.includes('Skin')
        ? 'skin'
        : scout.modelName.includes('Nail')
          ? 'fingernail'
          : 'under-eye';
      toast({
        title: `Low quality ${part} image`,
        description:
          scout.confidence < 0.2
            ? 'Please move to a brighter spot and retake.'
            : 'Clean your lens and ensure the target is centred.',
        variant: 'destructive',
      });
    }
  }, [ensembleReport, captures, toast]);

  // ── Reset / retake ───────────────────────────────────────────────────────
  const handleRetake = () => {
    reset();
    savedRef.current = false;
    setStep('skin');
    setStepIndex(0);
    setCaptures({});
    setCameraReady(false);
    setLux(null);
  };

  // ── Persist results to Firebase (authenticated users only) ───────────────
  useEffect(() => {
    if (step !== 'results') return;
    if (!ensembleReport || severity === null || consensusHgb === null) return;
    if (!user || !firestore || user.isAnonymous) return;
    if (savedRef.current) return;
    savedRef.current = true;
    // Haptic feedback on scan complete
    haptic.success();

    // Browser notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Anemo — Scan Complete', {
            body: `${severity} detected. Est. Hgb: ${consensusHgb?.toFixed(1)} g/dL. Risk: ${Math.round(Math.max(0, Math.min(100, ((16 - (consensusHgb ?? 12)) / 11) * 100)))}`,
            icon: '/icons/icon-192x192.png',
        });
    }

    const riskIndex = Math.round(
      Math.max(0, Math.min(100, ((16 - consensusHgb) / 11) * 100)),
    );

    const saveData = {
      type: 'image',
      mode: 'live-camera',
      riskIndex,
      anemiaType: severity,
      confidenceScore: Math.round(
        (ensembleReport.allConfidenceScores.length > 0
          ? ensembleReport.allConfidenceScores.reduce((a, b) => a + b, 0) /
            ensembleReport.allConfidenceScores.length
          : 0) * 100
      ),
      imageAnalysisSummary:
        report ||
        `${severity} anemia indicators detected. Est. Hgb: ${consensusHgb.toFixed(1)} g/dL`,
      recommendations: dietaryRecommendations.join('\n') || '',
      hemoglobin: consensusHgb,
      fullAnalysis: report, // Explicitly store the full analysis report
      modelResults: ensembleReport.modelResults, // Store individual model scores
    };

    addDoc(collection(firestore, `users/${user.uid}/imageAnalyses`), {
      ...saveData,
      createdAt: serverTimestamp(),
    }).catch(() => {
      // Network failure — persist locally for retry when back online
      enqueueFirestoreSave(`users/${user.uid}/imageAnalyses`, saveData);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hidden off-screen canvases (never displayed) */}
      <canvas ref={hiddenCanvasRef} className="sr-only" aria-hidden />
      <canvas ref={skinCanvasRef} className="sr-only" aria-hidden />
      <canvas ref={nailsCanvasRef} className="sr-only" aria-hidden />
      <canvas ref={eyeCanvasRef} className="sr-only" aria-hidden />

      <AnimatePresence mode="wait">
        {isCaptureStep && (
          <motion.div
            key={`capture-${stepIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col flex-1"
          >
            <CameraView
              videoRef={videoRef}
              stepIndex={stepIndex}
              cameraReady={cameraReady}
              cameraError={cameraError}
              hudConfig={hudConfig}
              currentStep={currentStepCfg.id}
              lux={lux}
              lowLight={lowLight}
              highLight={highLight}
              isCapturing={isCapturing}
              countdown={countdown}
              canCapture={canCapture}
              isMirrored={facingMode === 'user'}
              onCameraReady={() => setCameraReady(true)}
              onCaptureClick={handleCaptureClick}
              onFlip={() => {
                setFacingMode((p) => (p === 'user' ? 'environment' : 'user'));
              }}
              onBack={() => {
                if (stepIndex > 0) {
                  setStepIndex((prev) => {
                    const newIdx = prev - 1;
                    setStep(STEPS[newIdx].id);
                    setCameraReady(false);
                    return newIdx;
                  });
                } else {
                  onBack?.();
                }
              }}
              onRetry={startCamera}
            />
          </motion.div>
        )}

        {step === 'analysing' && (
          <motion.div
            key="analysing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <AnalysingView progress={progress} error={error} />
          </motion.div>
        )}

        {step === 'results' && ensembleReport && severity !== null && consensusHgb !== null && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 overflow-y-auto"
          >
            <ResultsView
              ensembleReport={ensembleReport}
              severity={severity}
              consensusHgb={consensusHgb}
              report={report}
              dietaryRecommendations={dietaryRecommendations}
              captures={captures}
              onRetake={handleRetake}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CameraView — the live viewfinder with HUD
// ─────────────────────────────────────────────────────────────────────────────

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stepIndex: number;
  cameraReady: boolean;
  cameraError: string | null;
  hudConfig: HudConfig;
  currentStep: CaptureStep;
  lux: number | null;
  lowLight: boolean;
  highLight: boolean;
  isCapturing: boolean;
  countdown: number | null;
  canCapture: boolean;
  isMirrored: boolean;
  onCameraReady: () => void;
  onCaptureClick: () => void;
  onFlip: () => void;
  onBack: () => void;
  onRetry: () => void;
}

function CameraView({
  videoRef,
  stepIndex,
  cameraReady,
  cameraError,
  hudConfig,
  currentStep,
  lux,
  lowLight,
  highLight,
  isCapturing,
  countdown,
  canCapture,
  isMirrored,
  onCameraReady,
  onCaptureClick,
  onFlip,
  onBack,
  onRetry,
}: CameraViewProps) {
  const c = hudConfig.color;

  return (
    <div className="flex flex-col h-screen">

      {/* ── Step progress header ─────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="glass-panel rounded-[2rem] px-5 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div
                  className={cn(
                    'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300',
                    i < stepIndex
                      ? 'text-emerald-400'
                      : i === stepIndex
                        ? 'text-primary'
                        : 'text-muted-foreground/30',
                  )}
                >
                  {i < stepIndex ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <span
                      className={cn(
                        'w-3.5 h-3.5 rounded-full border text-[8px] flex items-center justify-center font-black shrink-0',
                        i === stepIndex
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/60 text-muted-foreground/40',
                      )}
                    >
                      {i + 1}
                    </span>
                  )}
                  <span className="hidden sm:block truncate">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/20 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Lux readout */}
          {lux !== null && (
            <div
              className={cn(
                'flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest shrink-0 transition-colors',
                lowLight ? 'text-red-400' : highLight ? 'text-amber-400' : 'text-emerald-400',
              )}
            >
              <Sun className="w-3 h-3" />
              <span>{lowLight ? '↓ Low' : highLight ? '↑ High' : `${lux < 9999 ? lux : '9999+'} lx`}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Viewport ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 min-h-0 overflow-hidden">
        <div className="relative w-full max-w-sm">

          {/* Ambient glow halo — colour-shifts with body part */}
          <div
            className="absolute -inset-4 rounded-[4rem] pointer-events-none transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse at center, ${c}18 0%, transparent 70%)`,
              filter: `blur(20px)`,
            }}
          />

          {/* Portrait viewport — 9:16, capped at 75vh */}
          <motion.div
            className="relative w-full bg-black overflow-hidden"
            style={{ borderRadius: '3rem', aspectRatio: '9/16', maxHeight: '75vh' }}
            animate={{ clipPath: hudConfig.clipPath }}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
          >
            {/* Live video feed — mirrored when using front camera */}
            {!cameraError && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onCanPlay={onCameraReady}
                className="absolute inset-0 w-full h-full object-cover"
                style={isMirrored ? { transform: 'scaleX(-1)' } : undefined}
              />
            )}

            {/* Camera initialising state */}
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black z-20">
                <div
                  className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: `${c}50`, borderTopColor: c }}
                />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">
                  Establishing Feed…
                </span>
              </div>
            )}

            {/* Camera error state */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black z-20 p-8 text-center">
                <AlertTriangle className="w-10 h-10 text-destructive" />
                <p className="text-sm text-muted-foreground">
                  {cameraError === 'permission-denied'
                    ? 'Camera permission denied. Allow access in your browser settings.'
                    : cameraError === 'no-device'
                      ? 'No camera found on this device.'
                      : 'Camera unavailable. Please try again.'}
                </p>
                <Button
                  size="sm"
                  onClick={onRetry}
                  className="glass-button rounded-full mt-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry
                </Button>
              </div>
            )}

            {/* ── HUD overlay ─────────────────────────────────────────── */}
            {cameraReady && (
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">

                {/* Subtle CRT scanlines */}
                <div
                  className="absolute inset-0 opacity-[0.025]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.6) 2px, rgba(255,255,255,0.6) 4px)',
                  }}
                />

                {/* Animated horizontal sweep line */}
                <motion.div
                  className="absolute left-0 right-0 h-[1px] pointer-events-none"
                  style={{ background: `linear-gradient(90deg, transparent, ${c}60, transparent)` }}
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
                />

                {/* HUD corner brackets */}
                <HudBrackets color={c} />

                {/* Body-part target frame */}
                <TargetFrame step={currentStep} color={c} />

                {/* Top-left: REC indicator + label */}
                <div className="absolute top-3 left-4 flex items-center gap-2 z-20">
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0"
                    style={{ backgroundColor: c, boxShadow: `0 0 10px 3px ${c}80` }}
                  />
                  <span
                    className="text-[9px] font-black uppercase tracking-[0.25em] drop-shadow"
                    style={{ color: c }}
                  >
                    REC // {hudConfig.label}
                  </span>
                </div>

                {/* Bottom-right: metrics badge */}
                <div className="absolute bottom-3 right-4 z-20">
                  <div
                    className="px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-xl flex flex-col gap-0.5"
                    style={{ border: `1px solid ${c}30` }}
                  >
                    <span
                      className="text-[9px] font-mono uppercase tracking-widest"
                      style={{ color: c }}
                    >
                      720p · 30 fps
                    </span>
                    {lux !== null && (
                      <span
                        className={cn(
                          'text-[9px] font-mono uppercase tracking-widest',
                          lowLight ? 'text-red-400' : highLight ? 'text-amber-400' : 'text-emerald-400',
                        )}
                      >
                        {lowLight ? '⚠ LOW LIGHT' : highLight ? '⚠ TOO BRIGHT' : `LUX ${lux}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Low-light overlay banner */}
                {lowLight && (
                  <div className="absolute inset-x-0 bottom-14 flex justify-center z-20">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 backdrop-blur-sm border border-red-500/30">
                      <Sun className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-red-300">
                        Move to a brighter spot
                      </span>
                    </div>
                  </div>
                )}

                {/* High-light overlay banner */}
                {highLight && (
                  <div className="absolute inset-x-0 bottom-14 flex justify-center z-20">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-500/30">
                      <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-amber-300">
                        Too much light — find shade
                      </span>
                    </div>
                  </div>
                )}

                {/* ANEMO AI Branded Watermark */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 backdrop-blur-sm z-20 pointer-events-none">
                  <Droplets className="w-2.5 h-2.5 text-white/40" />
                  <span className="text-[7px] font-black uppercase tracking-[0.45em] text-white/35">
                    ANEMO · AI
                  </span>
                </div>
              </div>
            )}

            {/* Countdown overlay */}
            <AnimatePresence>
              {countdown !== null && countdown > 0 && (
                <motion.div
                  initial={{ scale: 1.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center z-30 backdrop-blur-[2px]"
                  style={{ background: `${c}18` }}
                >
                  <span
                    className="text-[9rem] font-black leading-none drop-shadow-2xl"
                    style={{ color: 'white', textShadow: `0 0 60px ${c}` }}
                  >
                    {countdown}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* ── Control panel ───────────────────────────────────────────────── */}
      <div className="px-4 pb-6 shrink-0">
        <div className="glass-panel rounded-[2rem] p-5 space-y-4">
          {/* Instruction */}
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground italic leading-relaxed">
            {hudConfig.instruction}
          </p>

          {/* Light-quality bar */}
          {lux !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
                  Light Quality
                </span>
                <span
                  className={cn(
                    'text-[9px] uppercase tracking-widest font-mono font-bold',
                    lowLight ? 'text-red-400' : 'text-emerald-400',
                  )}
                >
                  {lowLight ? 'Poor' : lux < 600 ? 'Moderate' : 'Good'}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${Math.min(100, (lux / 1200) * 100)}%` }}
                  style={{ backgroundColor: lowLight ? '#ef4444' : '#10b981' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex items-center justify-between gap-4">
            {/* Back / previous step */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              disabled={isCapturing}
              className="h-12 w-12 rounded-full glass-button shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            {/* Main capture trigger */}
            <button
              onClick={onCaptureClick}
              disabled={!canCapture}
              aria-label="Capture image"
              className="relative h-[5.5rem] w-[5.5rem] rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{
                background: canCapture
                  ? `radial-gradient(circle at 40% 35%, ${c}ee, ${c}99)`
                  : '#6b7280',
                boxShadow: canCapture
                  ? `0 0 0 3px ${c}40, 0 0 40px 12px ${c}30`
                  : 'none',
              }}
            >
              {canCapture && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ border: `2px solid ${c}` }}
                />
              )}
              <Zap className="w-9 h-9 text-white fill-white relative z-10 drop-shadow" />
            </button>

            {/* Flip camera */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onFlip}
              disabled={isCapturing}
              className="h-12 w-12 rounded-full glass-button shrink-0"
            >
              <FlipHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysingView
// ─────────────────────────────────────────────────────────────────────────────

function AnalysingView({
  progress,
  error,
}: {
  progress: { fraction: number; message: string; currentModelId?: string };
  error: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-20 px-6 space-y-10">
      {/* Pulsing CPU icon with rings */}
      <div className="relative">
        <motion.div
          className="w-28 h-28 rounded-full border-2 border-primary/20 flex items-center justify-center"
          animate={{ boxShadow: ['0 0 0 0 hsl(var(--primary)/0.3)', '0 0 0 24px hsl(var(--primary)/0)'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        >
          <Cpu className="w-12 h-12 text-primary animate-pulse" />
        </motion.div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/10 animate-slow-pulse" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-2xl font-light tracking-tight">Running 10-Model Ensemble</h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          {progress.message || 'Initialising pipeline…'}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-2">
        <Progress value={Math.round(progress.fraction * 100)} className="h-1.5" />
        <p className="text-[10px] text-muted-foreground text-center font-mono uppercase tracking-widest">
          {Math.round(progress.fraction * 100)}%
          {progress.currentModelId && ` · ${progress.currentModelId}`}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm glass-panel rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultsView
// ─────────────────────────────────────────────────────────────────────────────

interface ResultsViewProps {
  ensembleReport: NonNullable<ReturnType<typeof useEnsembleModel>['ensembleReport']>;
  severity: string;
  consensusHgb: number;
  report: string;
  dietaryRecommendations: string[];
  captures: Partial<Record<CaptureStep, CaptureData>>;
  onRetake: () => void;
}

function ResultsView({
  ensembleReport,
  severity,
  consensusHgb,
  report,
  dietaryRecommendations,
  captures,
  onRetake,
}: ResultsViewProps) {
  const severityColor = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.Normal;
  const hgbPercent = Math.min(100, Math.max(0, ((consensusHgb - 5) / 11) * 100));

  return (
    <div className="space-y-4 px-4 pb-10 pt-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light tracking-tight">Analysis Complete</h2>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5 uppercase tracking-widest">
            {new Date(ensembleReport.timestamp).toLocaleString()}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetake}
          className="glass-button rounded-full gap-2 h-9 px-4"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retake
        </Button>
      </div>

      {/* ── Hemoglobin card ──────────────────────────────────────────────── */}
      <div className="glass-panel rounded-[2rem] p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-semibold">
              Estimated Hemoglobin
            </p>
            <div className="flex items-baseline gap-2">
              <motion.span
                className="text-6xl font-light text-primary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {consensusHgb.toFixed(1)}
              </motion.span>
              <span className="text-lg text-muted-foreground">g/dL</span>
            </div>
          </div>
          <div className="text-right space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-semibold">
              Severity
            </p>
            <Badge
              className={cn(
                'text-sm px-4 py-1.5 border rounded-full font-semibold',
                severityColor,
              )}
            >
              {severity}
            </Badge>
          </div>
        </div>

        {/* Hgb scale bar */}
        <div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${hgbPercent}%` }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 1, 0.5, 1] }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5 font-mono uppercase tracking-widest">
            <span>5 g/dL</span>
            <span>Normal ≥ 12</span>
            <span>16 g/dL</span>
          </div>
        </div>
      </div>

      {/* ── XAI per-body-part cards ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1">
          Visual Markers Detected
        </h3>
        {STEPS.map((s) => {
          const cap = captures[s.id];
          if (!cap) return null;
          const hud = HUD_CONFIGS[s.id];
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="glass-panel glass-panel-hover rounded-2xl p-4 flex gap-4"
            >
              {/* Thumbnail */}
              <div
                className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border bg-muted"
                style={{ borderColor: `${hud.color}30` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cap.dataUri}
                  alt={`${s.label} capture`}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span style={{ color: hud.color }}>{s.icon}</span>
                  <span className="text-sm font-semibold">{s.label}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {XAI_DESCRIPTIONS[s.id]}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Ensemble model breakdown ─────────────────────────────────────── */}
      {ensembleReport.modelResults.filter((r) => r.contributedToConsensus).length > 0 && (
        <div className="glass-panel rounded-2xl p-4 space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            10-Model Ensemble Breakdown
          </h3>
          <div className="space-y-2">
            {ensembleReport.modelResults
              .filter((r) => r.contributedToConsensus)
              .map((r) => (
                <div key={r.modelId} className="flex items-center gap-3">
                  <span className="text-[9px] text-muted-foreground w-5 text-right font-mono shrink-0">
                    T{r.tier}
                  </span>
                  <span className="text-xs flex-1 truncate text-muted-foreground">
                    {r.modelName}
                  </span>
                  <div className="w-20 h-1 rounded-full bg-muted overflow-hidden shrink-0">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${Math.round(r.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground w-10 text-right font-mono shrink-0">
                    {r.estimatedHgb.toFixed(1)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Dietary recommendations ──────────────────────────────────────── */}
      {dietaryRecommendations.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-sm font-semibold">Dietary Recommendations</h3>
          </div>
          <ul className="space-y-1.5">
            {dietaryRecommendations.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary mt-0.5 shrink-0">·</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── AI clinical report ───────────────────────────────────────────── */}
      {report && (
        <div className="glass-panel rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-sm font-semibold">Clinical Screening Report</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {report}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[9px] text-muted-foreground text-center leading-relaxed px-4 pb-2">
        This screen is generated by Anemo AI for non-invasive screening only and does not
        constitute a medical diagnosis. Please consult a licensed healthcare professional.
      </p>
    </div>
  );
}
