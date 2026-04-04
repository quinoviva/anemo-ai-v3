'use client';

/**
 * MultimodalUploadAnalyzer — Sequential Camera-First Analysis
 * ===========================================================
 * Workflow:
 *   Step 1-3 (one at a time):
 *     → Camera (primary, inline) OR upload (secondary)
 *     → Gemini validates correct body part
 *     → Shows short XAI description → "Next" to proceed
 *     → Error + "Retry" if rejected
 *   Step 4 (optional): CBC lab report
 *   Step 5: Cross-modal validation spinner
 *   Step 6: Full diagnostic report (PDF + Firebase save)
 *
 * Design: Glassmorphism matching Dashboard, ultra-modern premium.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Hand,
  Fingerprint,
  UploadCloud,
  Camera,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  FileText,
  Zap,
  ShieldAlert,
  Activity,
  Loader2,
  SkipForward,
  Sparkles,
  AlertCircle,
  Heart,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import HeartLoader from '@/components/ui/HeartLoader';
import {
  runGenerateImageDescription,
  runAnalyzeCbcReport,
  saveImageForTraining,
  saveLabReportForTraining,
} from '@/app/actions';
import { runValidateMultimodalResults as validateMultimodalResults } from '@/app/actions';
import { ImageAnalysisReport } from './ImageAnalysisReport';
import type { AnalysisState } from './ImageAnalysisReport';
import { RealTimeCamera } from './RealTimeCamera';

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

type BodyPart = 'skin' | 'under-eye' | 'fingernails';
type CaptureStatus = 'idle' | 'analyzing' | 'success' | 'error';
type PagePhase = 'capture' | 'cbc' | 'validating' | 'results';

const MAX_FILE_SIZE = 8 * 1024 * 1024;

interface PartConfig {
  id: BodyPart;
  stepNum: number;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  hint: string;
  instruction: string;
}

const PARTS: PartConfig[] = [
  {
    id: 'skin',
    stepNum: 1,
    label: 'Palm Skin',
    sublabel: 'Palmar Analysis',
    icon: <Hand strokeWidth={1.5} />,
    color: '#f59e0b',
    colorClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    bgClass: 'bg-amber-500/10',
    hint: 'Hold your palm face-up in good lighting.',
    instruction: 'Position your open palm flat with fingers together. Ensure palm creases are clearly visible.',
  },
  {
    id: 'under-eye',
    stepNum: 2,
    label: 'Conjunctiva',
    sublabel: 'Palpebral Analysis',
    icon: <Eye strokeWidth={1.5} />,
    color: '#ef4444',
    colorClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    bgClass: 'bg-red-500/10',
    hint: 'Pull lower eyelid down gently and look upward.',
    instruction: 'Gently pull your lower eyelid downward. Look up toward a bright light source. The inner pink lining should be visible.',
  },
  {
    id: 'fingernails',
    stepNum: 3,
    label: 'Nailbed',
    sublabel: 'Capillary Analysis',
    icon: <Fingerprint strokeWidth={1.5} />,
    color: '#3b82f6',
    colorClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
    bgClass: 'bg-blue-500/10',
    hint: 'Show 4 bare fingernails. No polish or acrylics.',
    instruction: 'Hold 4 fingers flat, nails facing the camera. Ensure nails are completely bare with no polish.',
  },
];

interface CaptureState {
  status: CaptureStatus;
  imageUrl: string | null;
  dataUri: string | null;
  analysisResult: string | null;
  description: string | null;
  error: string | null;
}

const INITIAL_CAPTURE: CaptureState = {
  status: 'idle',
  imageUrl: null,
  dataUri: null,
  analysisResult: null,
  description: null,
  error: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function resizeImage(file: File, maxDim = 1600): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
      else if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')?.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', 0.88));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

function dataUriToFile(dataUri: string, name = 'capture.jpg'): File {
  const [header, b64] = dataUri.split(',');
  const mime = header.split(':')[1].split(';')[0];
  const bytes = atob(b64);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new File([buf], name, { type: mime });
}

// ─────────────────────────────────────────────────────────────────────────────
// StepProgressBar
// ─────────────────────────────────────────────────────────────────────────────

function StepProgressBar({
  currentStep,
  captures,
}: {
  currentStep: number;
  captures: Record<BodyPart, CaptureState>;
}) {
  return (
    <div className="flex items-center gap-2">
      {PARTS.map((part, idx) => {
        const cs = captures[part.id];
        const isDone = cs.status === 'success';
        const isCurrent = idx + 1 === currentStep;
        const isError = cs.status === 'error';

        return (
          <React.Fragment key={part.id}>
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  boxShadow: isCurrent ? `0 0 0 3px ${part.color}40` : 'none',
                }}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  isDone ? 'border-emerald-400 bg-emerald-500/20' :
                  isError ? 'border-red-400 bg-red-500/10' :
                  isCurrent ? `border-current bg-current/10` : 'border-border/40 bg-muted/20',
                )}
                style={isCurrent ? { borderColor: part.color, backgroundColor: `${part.color}15`, color: part.color } : {}}
              >
                {isDone
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  : isError
                    ? <XCircle className="w-4 h-4 text-red-400" />
                    : <span className={cn('w-4 h-4', isCurrent ? '' : 'text-muted-foreground/50')} style={isCurrent ? { color: part.color } : {}}>
                        {part.icon}
                      </span>
                }
              </motion.div>
              <span className={cn(
                'text-[8px] font-black uppercase tracking-[0.2em] transition-all',
                isCurrent ? 'opacity-100' : 'opacity-40',
              )} style={isCurrent ? { color: part.color } : {}}>
                {part.label}
              </span>
            </div>

            {idx < PARTS.length - 1 && (
              <motion.div
                className="flex-1 h-px transition-all duration-700"
                style={{
                  background: captures[PARTS[idx].id].status === 'success'
                    ? 'linear-gradient(90deg, #34d399, #34d399)'
                    : 'hsl(var(--border))',
                  opacity: 0.5,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CaptureStep — the main single-parameter step
// ─────────────────────────────────────────────────────────────────────────────

interface CaptureStepProps {
  part: PartConfig;
  captureState: CaptureState;
  onFile: (file: File) => void;
  onRetry: () => void;
  onCameraOpen: () => void;
  onNext: () => void;
  isLastStep: boolean;
  step: number;
}

function CaptureStep({
  part,
  captureState,
  onFile,
  onRetry,
  onCameraOpen,
  onNext,
  isLastStep,
  step,
}: CaptureStepProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { status, imageUrl, description, analysisResult, error } = captureState;

  return (
    <motion.div
      key={`step-${step}`}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="flex flex-col gap-5 w-full"
    >
      {/* ── Step header ── */}
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-2xl border flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: `${part.color}15`, borderColor: `${part.color}40` }}
        >
          <span className="w-6 h-6 flex items-center justify-center" style={{ color: part.color }}>{part.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground">
              Step {part.stepNum} of 3
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.4em]" style={{ color: part.color }}>
              · {part.sublabel}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
            Capture{' '}
            <span className="font-black italic" style={{ color: part.color }}>
              {part.label}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{part.instruction}</p>
        </div>
      </div>

      {/* ── Main action area ── */}
      <AnimatePresence mode="wait">

        {/* ── IDLE: Camera button + drag-drop upload ── */}
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Primary camera CTA */}
            <button
              onClick={onCameraOpen}
              className="group relative w-full rounded-[2rem] overflow-hidden border-2 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] focus:outline-none"
              style={{ borderColor: `${part.color}40`, backgroundColor: `${part.color}08` }}
            >
              {/* subtle glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(ellipse at center, ${part.color}15 0%, transparent 70%)` }} />

              <div className="relative flex flex-col items-center justify-center py-10 sm:py-14 gap-5">
                {/* Camera icon ring */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ backgroundColor: part.color }} />
                  <div className="relative w-20 h-20 rounded-full flex items-center justify-center border-2 backdrop-blur-sm"
                    style={{ backgroundColor: `${part.color}20`, borderColor: `${part.color}60` }}>
                    <Camera className="w-9 h-9" style={{ color: part.color }} />
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-base font-bold tracking-tight">Use Camera</p>
                  <p className="text-[11px] text-muted-foreground">{part.hint}</p>
                </div>

                <div
                  className="px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.3em] text-white transition-all group-hover:scale-105"
                  style={{ backgroundColor: part.color, boxShadow: `0 10px 30px -8px ${part.color}70` }}
                >
                  Open Camera
                </div>
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">or upload</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>

            {/* Upload zone */}
            <div
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'relative w-full rounded-2xl border border-dashed flex flex-col items-center justify-center gap-3 py-7 cursor-pointer transition-all duration-300',
                isDragging
                  ? 'scale-[1.01]'
                  : 'border-border/40 hover:border-border/70',
              )}
              style={isDragging ? {
                borderColor: part.color,
                backgroundColor: `${part.color}08`,
              } : {}}
            >
              <div className={cn('p-2.5 rounded-xl transition-all', isDragging ? '' : 'bg-muted/40')}
                style={isDragging ? { backgroundColor: `${part.color}20` } : {}}>
                <UploadCloud className="w-5 h-5 transition-colors" style={{ color: isDragging ? part.color : undefined }}
                  strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-muted-foreground">
                  Drop image here, or{' '}
                  <span className="font-bold" style={{ color: part.color }}>browse</span>
                </p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">PNG · JPG · up to 8 MB</p>
              </div>
            </div>

            <input ref={fileRef} type="file" accept="image/*" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
          </motion.div>
        )}

        {/* ── ANALYZING: Image preview + scan overlay ── */}
        {status === 'analyzing' && imageUrl && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full rounded-[2rem] overflow-hidden"
            style={{ aspectRatio: '4/3' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="specimen" className="w-full h-full object-cover blur-sm saturate-150 scale-105" />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" />

            {/* Scan sweep */}
            <motion.div
              className="absolute inset-x-0 h-[2px] pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent, ${part.color}, transparent)`,
                boxShadow: `0 0 16px 4px ${part.color}`,
              }}
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
            />

            {/* HUD corners */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {['M4,16 L4,4 L16,4', 'M84,4 L96,4 L96,16', 'M4,84 L4,96 L16,96', 'M96,84 L96,96 L84,96'].map((d, i) => (
                <path key={i} d={d} fill="none" stroke={part.color} strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
              ))}
            </svg>

            {/* Centre */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <HeartLoader size={44} strokeWidth={2} />
              <div className="text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white/70">
                  AI Analyzing…
                </p>
                <p className="text-[10px] text-white/40 mt-1">Validating specimen integrity</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── SUCCESS: Image + XAI description + Next button ── */}
        {status === 'success' && imageUrl && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* Image with success glow */}
            <div
              className="relative w-full rounded-[2rem] overflow-hidden"
              style={{ aspectRatio: '4/3', boxShadow: `0 0 0 2px ${part.color}30, 0 20px 60px -15px ${part.color}30` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="specimen" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Success badge */}
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/80 backdrop-blur-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Verified</span>
              </div>

              {/* Analysis result badge */}
              {analysisResult && (
                <div className="absolute bottom-4 left-4">
                  <div
                    className="px-3 py-1.5 rounded-full backdrop-blur-sm border text-[9px] font-black uppercase tracking-[0.3em]"
                    style={{
                      backgroundColor: `${part.color}30`,
                      borderColor: `${part.color}50`,
                      color: part.color,
                    }}
                  >
                    {analysisResult}
                  </div>
                </div>
              )}
            </div>

            {/* XAI description card */}
            {description && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-panel rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">AI Observation</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={onRetry}
                className="h-11 px-5 rounded-full glass-button text-[10px] font-black uppercase tracking-[0.2em] gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake
              </Button>
              <Button
                onClick={onNext}
                className="flex-1 h-11 rounded-full text-[11px] font-black uppercase tracking-[0.3em] gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: part.color,
                  boxShadow: `0 12px 30px -8px ${part.color}60`,
                  color: 'white',
                }}
              >
                {isLastStep ? (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    Run Full Analysis
                  </>
                ) : (
                  <>
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── ERROR: Contextual rejection card ── */}
        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* Error preview */}
            <div className="relative w-full rounded-[2rem] overflow-hidden border-2 border-red-500/30"
              style={{ aspectRatio: '4/3' }}>
              {imageUrl
                ? /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={imageUrl} alt="rejected" className="w-full h-full object-cover opacity-25" />
                : <div className="w-full h-full bg-red-950/30" />
              }
              <div className="absolute inset-0 bg-red-950/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6">
                <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/30">
                  <ShieldAlert className="w-8 h-8 text-red-400" />
                </div>
                <div className="text-center space-y-3">
                  <p className="text-2xl font-bold text-red-300 uppercase tracking-widest">Image Not Accepted</p>
                  <p className="text-lg text-red-300/90 leading-relaxed max-w-xs">{error}</p>
                </div>
              </div>
            </div>

            {/* Contextual guidance */}
            <div className="glass-panel rounded-2xl p-4 space-y-2 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400">What We Need Instead</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{part.instruction}</p>
            </div>

            {/* Retry actions */}
            <div className="flex gap-3">
              <Button
                onClick={onCameraOpen}
                className="flex-1 h-11 rounded-full text-[11px] font-black uppercase tracking-[0.2em] gap-2 text-white"
                style={{ backgroundColor: part.color }}
              >
                <Camera className="w-4 h-4" />
                Retry Camera
              </Button>
              <Button
                variant="ghost"
                onClick={() => fileRef.current?.click()}
                className="flex-1 h-11 rounded-full glass-button text-[10px] font-black uppercase tracking-[0.2em] gap-2"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload
              </Button>
            </div>

            <input ref={fileRef} type="file" accept="image/*" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { onRetry(); setTimeout(() => onFile(f), 50); } e.target.value = ''; }} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CbcStep
// ─────────────────────────────────────────────────────────────────────────────

interface CbcStepProps {
  onFile: (file: File) => void;
  onSkip: () => void;
  isAnalyzing: boolean;
  cbcImageUrl: string | null;
}

function CbcStep({ onFile, onSkip, isAnalyzing, cbcImageUrl }: CbcStepProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className="flex flex-col gap-5 w-full"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex-shrink-0">
          <FileText className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-0.5">
            Optional · Step 4
          </div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
            Lab Report{' '}
            <span className="font-black italic text-blue-400">Sync</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Upload a CBC report photo to cross-reference hemoglobin values and boost accuracy.
          </p>
        </div>
      </div>

      {isAnalyzing ? (
        <div className="glass-panel rounded-[2rem] p-10 flex flex-col items-center gap-5">
          <motion.div
            className="w-16 h-16 rounded-full border-2 border-blue-500/30 flex items-center justify-center"
            animate={{ boxShadow: ['0 0 0 0 rgba(59,130,246,0.3)', '0 0 0 24px rgba(59,130,246,0)'] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <FileText className="w-7 h-7 text-blue-400 animate-pulse" />
          </motion.div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Parsing CBC Data…</p>
        </div>
      ) : cbcImageUrl ? (
        <div className="relative w-full rounded-[2rem] overflow-hidden border border-blue-500/30"
          style={{ aspectRatio: '4/3' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cbcImageUrl} alt="CBC report" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <div className="px-3 py-1.5 rounded-full bg-blue-500/70 backdrop-blur-sm">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Report Loaded</span>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'glass-panel rounded-[2rem] flex flex-col items-center justify-center gap-5 py-12 cursor-pointer transition-all duration-300 border',
            isDragging ? 'border-blue-500/50 bg-blue-500/5 scale-[1.01]' : 'border-border/40',
          )}
        >
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              Drop CBC report, or <span className="text-blue-400 font-bold">browse</span>
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">Photo of printed or on-screen report</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {!isAnalyzing && !cbcImageUrl && (
          <Button
            onClick={() => fileRef.current?.click()}
            className="flex-1 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-[0.25em] gap-2"
          >
            <UploadCloud className="w-4 h-4" /> Upload Report
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={isAnalyzing}
          className={cn(
            'h-12 rounded-full glass-button text-[11px] font-black uppercase tracking-[0.2em] gap-2',
            cbcImageUrl ? 'flex-1' : '',
          )}
        >
          <SkipForward className="w-4 h-4" />
          {cbcImageUrl ? 'Continue' : 'Skip'}
        </Button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ValidatingView
// ─────────────────────────────────────────────────────────────────────────────

function ValidatingView() {
  const steps = [
    'Merging multimodal feature vectors…',
    'Running conjunctiva pallor index…',
    'Cross-referencing nailbed saturation…',
    'Applying hemoglobin regression model…',
    'Generating clinical summary…',
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % steps.length), 1500);
    return () => clearInterval(id);
  }, []);

  const pct = Math.round((idx / (steps.length - 1)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-10 px-6 text-center"
    >
      {/* Pulsing icon */}
      <div className="relative">
        <motion.div
          className="w-32 h-32 rounded-full border-2 border-primary/20 flex items-center justify-center"
          animate={{ boxShadow: ['0 0 0 0 hsl(var(--primary)/0.25)', '0 0 0 32px hsl(var(--primary)/0)'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        >
          <Activity className="w-14 h-14 text-primary" />
        </motion.div>
      </div>

      <div className="space-y-3 max-w-xs">
        <h3 className="text-2xl font-light tracking-tight">Validating Results</h3>
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="text-sm text-muted-foreground"
          >
            {steps[idx]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-sm space-y-2">
        <Progress value={pct} className="h-1.5" />
        <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{pct}%</p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CyclePreAnalysisModal — shown for female users before first scan
// ─────────────────────────────────────────────────────────────────────────────

interface CyclePreAnalysisModalProps {
  onComplete: (context: string) => void;
  onSkip: () => void;
}

function CyclePreAnalysisModal({ onComplete, onSkip }: CyclePreAnalysisModalProps) {
  const [lmpDate, setLmpDate] = useState<string>('');
  const [cycleDescription, setCycleDescription] = useState<string>('');
  const [cycleLength, setCycleLength] = useState<string>('');
  const [isRegular, setIsRegular] = useState<boolean | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  const cycleDescriptionOptions = [
    'Regular (21–35 days)',
    'Irregular',
    'Currently Pregnant / Postpartum',
  ];

  const symptomOptions = [
    'Heavy menstrual flow (soaking >1 pad/hr)',
    'Unusual fatigue / low energy',
    'Dizziness or lightheadedness',
    'Pale skin or pale inner eyelids',
    'Shortness of breath on exertion',
    'Hair thinning or loss',
    'Cold hands or feet',
    'Brittle or spoon-shaped nails',
    'Cravings for non-food items (ice, dirt)',
  ];

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const handleComplete = () => {
    const ctx = [
      lmpDate ? `Last menstrual period: ${lmpDate}` : null,
      cycleDescription ? `Cycle description: ${cycleDescription}` : null,
      isRegular !== null ? `Cycle regularity: ${isRegular ? 'Regular' : 'Irregular'}` : null,
      cycleLength ? `Average cycle length: ${cycleLength} days` : null,
      symptoms.length > 0 ? `Reported symptoms: ${symptoms.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('. ');
    onComplete(ctx);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
    >
      <div className="w-full max-w-lg glass-panel rounded-[2.5rem] overflow-hidden border-rose-500/20">
        {/* Header */}
        <div className="p-8 border-b border-rose-500/10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-rose-400">Clinical Protocol</p>
              <h2 className="text-xl font-light tracking-tight">Cycle-Aware Screening</h2>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your menstrual cycle can affect hemoglobin levels. Providing this context helps Anemo AI deliver a more accurate, personalized analysis.
          </p>
        </div>

        {/* Step indicator */}
        <div className="px-8 pt-5 flex items-center gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-all duration-500',
                step >= s ? 'bg-rose-400' : 'bg-border/40'
              )}
            />
          ))}
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">
            {step}/2
          </span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-6"
            >
              {/* LMP date */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                  When did your last period start?
                </label>
                <input
                  type="date"
                  max={today}
                  value={lmpDate}
                  onChange={(e) => setLmpDate(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl glass-panel border border-border/60 focus:border-rose-400/60 focus:outline-none text-sm transition-colors bg-background/50"
                />
              </div>

              {/* Cycle description */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                  How would you describe your cycle?
                </p>
                <div className="flex flex-col gap-2">
                  {cycleDescriptionOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setCycleDescription(opt);
                        setIsRegular(opt === 'Regular (21–35 days)');
                      }}
                      className={cn(
                        'w-full h-11 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all text-left',
                        cycleDescription === opt
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                          : 'bg-muted/30 border-border/40 text-muted-foreground hover:border-rose-500/30',
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cycle length */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                  Average cycle length (days)?
                </label>
                <input
                  type="number"
                  min={21}
                  max={45}
                  placeholder="e.g. 28"
                  value={cycleLength}
                  onChange={(e) => setCycleLength(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl glass-panel border border-border/60 focus:border-rose-400/60 focus:outline-none text-sm transition-colors bg-background/50"
                />
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full h-12 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-black text-[10px] uppercase tracking-[0.3em]"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-6"
            >
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                  Which of these have you noticed recently?
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {symptomOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSymptom(s)}
                      className={cn(
                        'text-left px-4 py-3 rounded-2xl text-[10px] font-bold border transition-all',
                        symptoms.includes(s)
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-muted/20 border-border/30 text-muted-foreground hover:border-primary/20',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] italic text-muted-foreground/60 leading-relaxed pt-1">
                  These symptoms may indicate iron-deficiency anemia. Your answers help calibrate the AI analysis.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="h-12 px-6 rounded-full glass-button text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button
                  onClick={handleComplete}
                  className="flex-1 h-12 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-[0.3em]"
                >
                  <Zap className="w-4 h-4 mr-1 fill-white" /> Start Scan
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip option */}
        <div className="px-8 pb-8 text-center">
          <button
            onClick={onSkip}
            className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Skip — continue without cycle data
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export interface MultimodalUploadAnalyzerProps {
  onClose?: () => void;
}

export function MultimodalUploadAnalyzer({ onClose }: MultimodalUploadAnalyzerProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // ── Female pre-analysis check ─────────────────────────────────────────────
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData } = useDoc(userDocRef);

  const isFemale = userData?.medicalInfo?.sex === 'Female';
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [cycleContext, setCycleContext] = useState<string>('');
  const [hasCheckedGender, setHasCheckedGender] = useState(false);

  // When user data loads and user is female, show cycle modal before first capture
  useEffect(() => {
    if (!hasCheckedGender && userData && isFemale) {
      setHasCheckedGender(true);
      setShowCycleModal(true);
    } else if (!hasCheckedGender && userData && !isFemale) {
      setHasCheckedGender(true);
    }
  }, [userData, isFemale, hasCheckedGender]);

  const [pagePhase, setPagePhase] = useState<PagePhase>('capture');
  const [currentStep, setCurrentStep] = useState(1); // 1-based index into PARTS
  const [showCamera, setShowCamera] = useState(false);

  const [captures, setCaptures] = useState<Record<BodyPart, CaptureState>>({
    skin: { ...INITIAL_CAPTURE },
    'under-eye': { ...INITIAL_CAPTURE },
    fingernails: { ...INITIAL_CAPTURE },
  });

  const [cbcImageUrl, setCbcImageUrl] = useState<string | null>(null);
  const [cbcResult, setCbcResult] = useState<any>(null);
  const [cbcAnalyzing, setCbcAnalyzing] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const currentPart = PARTS[currentStep - 1];

  // ── Build report-compatible analyses map ──────────────────────────────────
  const analysesForReport = React.useMemo<Record<string, AnalysisState>>(() => {
    const out: Record<string, AnalysisState> = {};
    for (const [key, c] of Object.entries(captures)) {
      out[key] = {
        file: null,
        imageUrl: c.imageUrl,
        dataUri: c.dataUri,
        calibrationMetadata: null,
        description: c.description,
        isValid: c.status === 'success',
        analysisResult: c.analysisResult,
        error: c.error,
        status: c.status === 'success' ? 'success' : c.status === 'error' ? 'error' : 'idle',
      };
    }
    return out;
  }, [captures]);

  // ── Handle image file ─────────────────────────────────────────────────────
  const handleFile = useCallback(async (part: BodyPart, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Max 8 MB.', variant: 'destructive' });
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    const dataUri = await resizeImage(file);

    setCaptures((prev) => ({
      ...prev,
      [part]: { ...INITIAL_CAPTURE, status: 'analyzing', imageUrl, dataUri },
    }));

    try {
      const result = await runGenerateImageDescription({ photoDataUri: dataUri, bodyPart: part });

      if (!result.isValid) {
        setCaptures((prev) => ({
          ...prev,
          [part]: { ...prev[part], status: 'error', error: result.description },
        }));
        return;
      }

      setCaptures((prev) => ({
        ...prev,
        [part]: {
          ...prev[part],
          status: 'success',
          analysisResult: result.analysisResult,
          description: result.description,
        },
      }));

      saveImageForTraining(dataUri, part, result.analysisResult ?? '', user?.displayName ?? 'Anonymous');
    } catch (err: any) {
      const msg = err?.message?.includes('429')
        ? 'AI at capacity — please wait a moment and retry.'
        : err instanceof Error ? err.message : 'Analysis failed.';
      setCaptures((prev) => ({
        ...prev,
        [part]: { ...prev[part], status: 'error', error: msg },
      }));
    }
  }, [user, toast]);

  // ── Camera capture ────────────────────────────────────────────────────────
  const handleCameraCapture = useCallback((dataUri: string) => {
    setShowCamera(false);
    const file = dataUriToFile(dataUri);
    handleFile(currentPart.id, file);
  }, [currentPart, handleFile]);

  // ── Retry ─────────────────────────────────────────────────────────────────
  const handleRetry = useCallback((part: BodyPart) => {
    setCaptures((prev) => {
      const c = prev[part];
      if (c.imageUrl) URL.revokeObjectURL(c.imageUrl);
      return { ...prev, [part]: { ...INITIAL_CAPTURE } };
    });
  }, []);

  // ── Next step ─────────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (currentStep < 3) {
      setCurrentStep((s) => s + 1);
    } else {
      setPagePhase('cbc');
    }
  }, [currentStep]);

  // ── CBC ───────────────────────────────────────────────────────────────────
  const handleCbcFile = useCallback(async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setCbcImageUrl(imageUrl);
    setCbcAnalyzing(true);
    try {
      const dataUri = await resizeImage(file);
      const result = await runAnalyzeCbcReport({ photoDataUri: dataUri });
      setCbcResult(result);
      saveLabReportForTraining(dataUri, result.summary, user?.displayName ?? 'Anonymous');
      toast({ title: 'Lab report processed', description: 'CBC data merged with visual scan.' });
      await runValidation(result);
    } catch {
      toast({ title: 'CBC parse failed', description: 'Continuing without lab data.', variant: 'destructive' });
      await runValidation(null);
    } finally {
      setCbcAnalyzing(false);
    }
  }, [user, toast]);

  const handleSkipCbc = useCallback(async () => {
    await runValidation(null);
  }, []);

  const runValidation = useCallback(async (cbcData: any) => {
    setPagePhase('validating');
    try {
      const imageReport = {
        conjunctiva: captures['under-eye']?.analysisResult ?? '',
        skin: captures['skin']?.analysisResult ?? '',
        fingernails: captures['fingernails']?.analysisResult ?? '',
      };
      const validation = await validateMultimodalResults({
        medicalInfo: {
          sex: userData?.medicalInfo?.sex ?? '',
          age: userData?.medicalInfo?.age ?? '',
          ...(cycleContext ? { menstrualContext: cycleContext } : {}),
        },
        imageAnalysisReport: imageReport,
        cbcAnalysis: cbcData ? {
          hemoglobin: cbcData.parameters?.find((p: any) => p.parameter?.toLowerCase().includes('hemoglobin'))?.value ?? 'N/A',
          rbc: cbcData.parameters?.find((p: any) => p.parameter?.toLowerCase().includes('rbc'))?.value ?? 'N/A',
        } : undefined,
      });
      setValidationResult(validation);
    } catch {
      // proceed to results anyway
    } finally {
      setTimeout(() => setPagePhase('results'), 1800);
    }
  }, [captures, userData, cycleContext]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    Object.values(captures).forEach((c) => { if (c.imageUrl) URL.revokeObjectURL(c.imageUrl); });
    if (cbcImageUrl) URL.revokeObjectURL(cbcImageUrl);
    setCaptures({ skin: { ...INITIAL_CAPTURE }, 'under-eye': { ...INITIAL_CAPTURE }, fingernails: { ...INITIAL_CAPTURE } });
    setCbcImageUrl(null);
    setCbcResult(null);
    setValidationResult(null);
    setCurrentStep(1);
    setPagePhase('capture');
  }, [captures, cbcImageUrl]);

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Female pre-scan cycle modal
  if (showCycleModal) {
    return (
      <CyclePreAnalysisModal
        onComplete={(ctx) => {
          setCycleContext(ctx);
          setShowCycleModal(false);
        }}
        onSkip={() => setShowCycleModal(false)}
      />
    );
  }

  // Render: fullscreen camera overlay
  if (showCamera) {
    return (
      <RealTimeCamera
        bodyPart={currentPart.id}
        accentColor={currentPart.color}
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  // Render: results
  if (pagePhase === 'results') {
    return (
      <div className="px-4 pb-10 pt-4">
        <ImageAnalysisReport
          analyses={analysesForReport}
          labReport={cbcResult}
          onReset={handleReset}
        />
      </div>
    );
  }

  // Render: validating
  if (pagePhase === 'validating') {
    return <ValidatingView />;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Main layout — shared chrome for capture + cbc steps
  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Header chrome ── */}
      <div className="relative px-4 sm:px-6 pt-5 pb-4">
        {/* Back button */}
        <div className="flex items-center justify-between mb-5">
          {onClose && pagePhase === 'capture' && currentStep === 1 ? (
            <Button
              variant="ghost"
              onClick={onClose}
              className="group text-muted-foreground hover:text-foreground gap-2.5 uppercase text-[9px] font-black tracking-[0.35em] h-9 rounded-full"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </Button>
          ) : pagePhase === 'capture' && currentStep > 1 ? (
            <Button
              variant="ghost"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              className="group text-muted-foreground hover:text-foreground gap-2.5 uppercase text-[9px] font-black tracking-[0.35em] h-9 rounded-full"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </Button>
          ) : pagePhase === 'cbc' ? (
            <Button
              variant="ghost"
              onClick={() => setPagePhase('capture')}
              disabled={cbcAnalyzing}
              className="group text-muted-foreground hover:text-foreground gap-2.5 uppercase text-[9px] font-black tracking-[0.35em] h-9 rounded-full"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {/* Global title */}
          <div className="text-right">
            <p className="text-[8px] font-black uppercase tracking-[0.5em] text-muted-foreground/60">
              Anemo AI · Multimodal
            </p>
          </div>
        </div>

        {/* Page title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tighter leading-tight mb-1">
          <span className="opacity-60">Anemia</span>{' '}
          <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400">
            Screening
          </span>
          <span className="text-primary">.</span>
        </h1>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-5">
          Visual multimodal analysis · 3-parameter specimen
        </p>

        {/* Step progress — only during capture phase */}
        {pagePhase === 'capture' && (
          <StepProgressBar currentStep={currentStep} captures={captures} />
        )}
      </div>

      {/* ── Ambient glow behind content ── */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[180px] pointer-events-none opacity-[0.06] -z-10"
        style={{ backgroundColor: currentPart.color }} />

      {/* ── Step content ── */}
      <div className="flex-1 px-4 sm:px-6 pb-10">
        <AnimatePresence mode="wait">
          {pagePhase === 'capture' && (
            <CaptureStep
              key={`capture-${currentStep}`}
              part={currentPart}
              captureState={captures[currentPart.id]}
              onFile={(f) => handleFile(currentPart.id, f)}
              onRetry={() => handleRetry(currentPart.id)}
              onCameraOpen={() => setShowCamera(true)}
              onNext={handleNext}
              isLastStep={currentStep === 3}
              step={currentStep}
            />
          )}
          {pagePhase === 'cbc' && (
            <CbcStep
              key="cbc"
              onFile={handleCbcFile}
              onSkip={handleSkipCbc}
              isAnalyzing={cbcAnalyzing}
              cbcImageUrl={cbcImageUrl}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
