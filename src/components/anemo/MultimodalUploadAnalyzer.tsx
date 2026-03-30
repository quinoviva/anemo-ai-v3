'use client';

/**
 * MultimodalUploadAnalyzer
 * ========================
 * Redesigned image-upload analysis page for Anemo AI.
 *
 * Layout
 * ------
 * 1. Page header — matches Dashboard typography (font-light, tracking-tighter)
 * 2. 3-card bento grid — Skin / Under-eye / Fingernails, each with its own
 *    body-part colour accent (Amber / Crimson / Blue)
 * 3. Drag-and-drop drop zone → inline preview → scan HUD animation
 * 4. Per-card states: idle | uploading | analyzing | success | error
 * 5. "Run Full Analysis" CTA — enabled when all 3 succeed
 * 6. Optional CBC lab report upload step
 * 7. Final validation step → ImageAnalysisReport
 *
 * Design System
 * -------------
 * - .glass-panel / .glass-panel-hover / .glass-button from globals.css
 * - --primary (crimson), --background, --border, --muted-foreground CSS vars
 * - framer-motion for all transitions
 * - shadcn/ui: Button, Badge, Progress
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
  ChevronRight,
  FileText,
  Zap,
  ShieldAlert,
  Activity,
  Loader2,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
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
type CardStatus = 'idle' | 'analyzing' | 'success' | 'error';
type PageStep = 'capture' | 'cbc' | 'validating' | 'results';

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

interface CardConfig {
  id: BodyPart;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;          // hex for inline styles
  colorClass: string;     // Tailwind text-* for JSX
  borderClass: string;    // Tailwind border-*
  bgClass: string;        // Tailwind bg-*
  glowClass: string;      // Tailwind bg-* (blurred glow)
  hint: string;
}

const CARDS: CardConfig[] = [
  {
    id: 'skin',
    label: 'Palm · Skin',
    sublabel: '001',
    icon: <Hand strokeWidth={1.5} />,
    color: '#f59e0b',
    colorClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    bgClass: 'bg-amber-500/10',
    glowClass: 'bg-amber-500/20',
    hint: 'Hold your palm face-up. Ensure the creases are clearly visible.',
  },
  {
    id: 'under-eye',
    label: 'Conjunctiva · Eye',
    sublabel: '002',
    icon: <Eye strokeWidth={1.5} />,
    color: '#ef4444',
    colorClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    bgClass: 'bg-red-500/10',
    glowClass: 'bg-red-500/20',
    hint: 'Pull your lower eyelid slightly down. Look up toward a light source.',
  },
  {
    id: 'fingernails',
    label: 'Nailbed · Nail',
    sublabel: '003',
    icon: <Fingerprint strokeWidth={1.5} />,
    color: '#3b82f6',
    colorClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
    bgClass: 'bg-blue-500/10',
    glowClass: 'bg-blue-500/20',
    hint: 'Keep nails bare (no polish). Show 4 fingers flat to the camera.',
  },
];

// Per-card state shape
interface CardState {
  status: CardStatus;
  imageUrl: string | null;
  dataUri: string | null;
  analysisResult: string | null;
  description: string | null;
  error: string | null;
}

const INITIAL_CARD: CardState = {
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
      let w = img.width;
      let h = img.height;
      if (w > h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
      else if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
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
// UploadCard — single body-part card
// ─────────────────────────────────────────────────────────────────────────────

interface UploadCardProps {
  config: CardConfig;
  cardState: CardState;
  onFile: (file: File) => void;
  onRetry: () => void;
  onCamera: () => void;
}

function UploadCard({ config, cardState, onFile, onRetry, onCamera }: UploadCardProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const { status, imageUrl, analysisResult, error } = cardState;

  return (
    <motion.div
      layout
      className={cn(
        'relative overflow-hidden rounded-[2.5rem] glass-panel flex flex-col transition-all duration-500',
        status === 'success' && 'border-emerald-500/30',
        status === 'error' && 'border-red-500/30',
        status === 'idle' && config.borderClass,
        status === 'analyzing' && config.borderClass,
      )}
    >
      {/* Ambient glow */}
      <div
        className={cn(
          'absolute -top-24 -right-24 w-56 h-56 rounded-full blur-[80px] opacity-0 transition-opacity duration-700 pointer-events-none',
          config.glowClass,
          (status === 'idle' || status === 'analyzing') && 'opacity-30',
          status === 'success' && 'opacity-0',
          status === 'error' && 'opacity-0',
        )}
      />

      {/* Card header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-2xl border w-10 h-10 flex items-center justify-center', config.bgClass, config.borderClass)}>
            <span style={{ color: config.color }} className="w-5 h-5">{config.icon}</span>
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">{config.label}</p>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-[0.3em]">
              Specimen {config.sublabel}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <span className={cn('text-[9px] font-black uppercase tracking-[0.25em] px-3 py-1 rounded-full border', config.bgClass, config.borderClass, config.colorClass)}>
                Awaiting
              </span>
            </motion.div>
          )}
          {status === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">Scanning</span>
            </motion.div>
          )}
          {status === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400">Captured</span>
            </motion.div>
          )}
          {status === 'error' && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30">
              <XCircle className="w-3 h-3 text-red-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-red-400">Rejected</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image preview / drop zone */}
      <div className="px-6">
        <AnimatePresence mode="wait">
          {/* ── No image: drop zone ── */}
          {!imageUrl && status === 'idle' && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300',
                isDragging
                  ? cn('border-opacity-100 scale-[1.01]', config.borderClass, config.bgClass)
                  : 'border-border/40 hover:border-border/70 bg-muted/20 hover:bg-muted/30',
              )}
            >
              <div className={cn('p-3 rounded-2xl transition-all', isDragging ? config.bgClass : 'bg-muted/40')}>
                <UploadCloud className={cn('w-7 h-7 transition-colors', isDragging ? config.colorClass : 'text-muted-foreground')} />
              </div>
              <div className="text-center px-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  Drop image here, or <span style={{ color: config.color }} className="font-bold">browse</span>
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, JPG up to 8 MB</p>
              </div>
            </motion.div>
          )}

          {/* ── Analyzing: image + scan HUD overlay ── */}
          {imageUrl && status === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full aspect-video rounded-2xl overflow-hidden relative"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="specimen" className="w-full h-full object-cover blur-sm saturate-150" />

              {/* Dark backdrop */}
              <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

              {/* Scanning laser sweep */}
              <motion.div
                className="absolute inset-x-0 h-[2px] pointer-events-none"
                style={{ background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`, boxShadow: `0 0 12px 2px ${config.color}` }}
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              />

              {/* HUD corner brackets */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M5,15 L5,5 L15,5" fill="none" stroke={config.color} strokeWidth="1.5" strokeLinecap="round" />
                <path d="M85,5 L95,5 L95,15" fill="none" stroke={config.color} strokeWidth="1.5" strokeLinecap="round" />
                <path d="M5,85 L5,95 L15,95" fill="none" stroke={config.color} strokeWidth="1.5" strokeLinecap="round" />
                <path d="M85,95 L95,95 L95,85" fill="none" stroke={config.color} strokeWidth="1.5" strokeLinecap="round" />
              </svg>

              {/* Centre content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <HeartLoader size={40} strokeWidth={2} />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/70">
                  Neural Scan Active…
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Success: image + XAI description ── */}
          {imageUrl && status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="w-full aspect-video rounded-2xl overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="specimen" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {/* Success tick overlay */}
                <div className="absolute bottom-3 right-3">
                  <div className="p-1.5 rounded-full bg-emerald-500/80 backdrop-blur-sm">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              {/* XAI result blurb */}
              {analysisResult && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{analysisResult}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Error state ── */}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full aspect-video rounded-2xl overflow-hidden relative"
            >
              {imageUrl
                ? /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={imageUrl} alt="rejected" className="w-full h-full object-cover opacity-30" />
                : <div className="w-full h-full bg-red-950/30" />
              }
              <div className="absolute inset-0 bg-red-950/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4">
                <ShieldAlert className="w-8 h-8 text-red-400" />
                <p className="text-[11px] text-red-300 text-center leading-relaxed font-medium">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hint text */}
      <div className="px-6 pt-3">
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed italic">{config.hint}</p>
      </div>

      {/* Action buttons */}
      <div className="px-6 pb-6 pt-4 flex gap-2 mt-auto">
        {(status === 'idle' || status === 'error') && (
          <>
            <Button
              size="sm"
              onClick={() => fileRef.current?.click()}
              className={cn('flex-1 h-10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] gap-2 transition-all', config.bgClass, config.borderClass, config.colorClass, 'border hover:opacity-90')}
              style={{ backgroundColor: 'transparent' }}
            >
              <UploadCloud className="w-3.5 h-3.5" /> Upload
            </Button>
            <Button
              size="sm"
              onClick={onCamera}
              className="flex-1 h-10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] gap-2 text-white border-0 transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ backgroundColor: config.color }}
            >
              <Camera className="w-3.5 h-3.5" /> Camera
            </Button>
          </>
        )}
        {status === 'success' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            className="w-full h-9 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground gap-2"
          >
            <RefreshCw className="w-3 h-3" /> Retake
          </Button>
        )}
        {status === 'analyzing' && (
          <div className="w-full h-9 rounded-2xl bg-muted/30 flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Processing…</span>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CbcUploadCard — optional lab report upload
// ─────────────────────────────────────────────────────────────────────────────

interface CbcUploadCardProps {
  onFile: (file: File) => void;
  onSkip: () => void;
  isAnalyzing: boolean;
  cbcImageUrl: string | null;
}

function CbcUploadCard({ onFile, onSkip, isAnalyzing, cbcImageUrl }: CbcUploadCardProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto space-y-6"
    >
      <div className="text-center space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Optional · Step 4</p>
        <h2 className="text-3xl font-light tracking-tight">Lab Report <span className="text-blue-400 italic font-medium">Sync</span></h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Upload a CBC lab report photo to enhance accuracy. The AI cross-references hemoglobin values with your visual scan.
        </p>
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !isAnalyzing && fileRef.current?.click()}
        className={cn(
          'glass-panel rounded-[2rem] p-8 flex flex-col items-center gap-5 cursor-pointer transition-all duration-300',
          isDragging && 'border-blue-500/50 bg-blue-500/5 scale-[1.01]',
          isAnalyzing && 'pointer-events-none',
        )}
      >
        {isAnalyzing ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative">
              <motion.div
                className="w-16 h-16 rounded-full border-2 border-blue-500/20 flex items-center justify-center"
                animate={{ boxShadow: ['0 0 0 0 rgba(59,130,246,0.3)', '0 0 0 20px rgba(59,130,246,0)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <FileText className="w-7 h-7 text-blue-400 animate-pulse" />
              </motion.div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Parsing Lab Data…</p>
          </div>
        ) : cbcImageUrl ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cbcImageUrl} alt="CBC report" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <>
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-muted-foreground">
                Drop CBC report here, or <span className="text-blue-400 font-bold">browse</span>
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Photo of printed or digital report</p>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={isAnalyzing}
          className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-[0.2em] gap-2"
        >
          <UploadCloud className="w-4 h-4" /> Upload Report
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={isAnalyzing}
          className="flex-1 h-12 rounded-2xl glass-button text-[11px] font-black uppercase tracking-[0.2em] gap-2"
        >
          <SkipForward className="w-4 h-4" /> Skip
        </Button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ValidatingView — cross-modal validation spinner
// ─────────────────────────────────────────────────────────────────────────────

function ValidatingView() {
  const steps = [
    'Merging multimodal feature vectors…',
    'Running conjunctiva pallor index…',
    'Cross-referencing nailbed saturation…',
    'Applying hemoglobin regression model…',
    'Generating clinical summary…',
  ];
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStepIdx((i) => (i + 1) % steps.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-10 px-6"
    >
      <div className="relative">
        <motion.div
          className="w-28 h-28 rounded-full border-2 border-primary/20 flex items-center justify-center"
          animate={{ boxShadow: ['0 0 0 0 hsl(var(--primary)/0.3)', '0 0 0 28px hsl(var(--primary)/0)'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        >
          <Activity className="w-12 h-12 text-primary animate-pulse" />
        </motion.div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/10 animate-slow-pulse" />
      </div>

      <div className="text-center space-y-3 max-w-xs">
        <h3 className="text-2xl font-light tracking-tight">Validating Results</h3>
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="text-sm text-muted-foreground leading-relaxed"
          >
            {steps[stepIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-sm space-y-2">
        <Progress value={(stepIdx / (steps.length - 1)) * 100} className="h-1" />
        <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground text-center">
          {Math.round((stepIdx / (steps.length - 1)) * 100)}% complete
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface MultimodalUploadAnalyzerProps {
  onClose?: () => void;
}

export function MultimodalUploadAnalyzer({ onClose }: MultimodalUploadAnalyzerProps) {
  const { user } = useUser();
  const { toast } = useToast();

  // ── Page step ──────────────────────────────────────────────────────────────
  const [pageStep, setPageStep] = useState<PageStep>('capture');

  // ── Per-card state ─────────────────────────────────────────────────────────
  const [cards, setCards] = useState<Record<BodyPart, CardState>>({
    'skin': { ...INITIAL_CARD },
    'under-eye': { ...INITIAL_CARD },
    'fingernails': { ...INITIAL_CARD },
  });

  // ── Camera ─────────────────────────────────────────────────────────────────
  const [cameraTarget, setCameraTarget] = useState<BodyPart | null>(null);

  // ── CBC ────────────────────────────────────────────────────────────────────
  const [cbcImageUrl, setCbcImageUrl] = useState<string | null>(null);
  const [cbcResult, setCbcResult] = useState<any>(null);
  const [cbcAnalyzing, setCbcAnalyzing] = useState(false);

  // ── Validation & results ───────────────────────────────────────────────────
  const [validationResult, setValidationResult] = useState<any>(null);

  // Build ImageAnalysisReport-compatible analyses object
  const analysesForReport = React.useMemo<Record<string, AnalysisState>>(() => {
    const result: Record<string, AnalysisState> = {};
    for (const [key, c] of Object.entries(cards)) {
      result[key] = {
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
    return result;
  }, [cards]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const successCount = Object.values(cards).filter((c) => c.status === 'success').length;
  const allCaptured = successCount === 3;
  const anyAnalyzing = Object.values(cards).some((c) => c.status === 'analyzing');

  // ── Handle file selection for a body part ──────────────────────────────────
  const handleFile = useCallback(async (part: BodyPart, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 8 MB.', variant: 'destructive' });
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    const dataUri = await resizeImage(file);

    setCards((prev) => ({
      ...prev,
      [part]: { ...INITIAL_CARD, status: 'analyzing', imageUrl, dataUri },
    }));

    try {
      const result = await runGenerateImageDescription({ photoDataUri: dataUri, bodyPart: part });

      if (!result.isValid) {
        setCards((prev) => ({
          ...prev,
          [part]: { ...prev[part], status: 'error', error: result.description },
        }));
        toast({
          title: `${part} image rejected`,
          description: result.description,
          variant: 'destructive',
        });
        return;
      }

      setCards((prev) => ({
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
        ? 'AI at capacity — please wait 60 s and retry.'
        : err instanceof Error ? err.message : 'Unknown error';

      setCards((prev) => ({
        ...prev,
        [part]: { ...prev[part], status: 'error', error: msg },
      }));
      toast({ title: `${part} analysis failed`, description: msg, variant: 'destructive' });
    }
  }, [user, toast]);

  // ── Camera capture callback ────────────────────────────────────────────────
  const handleCameraCapture = useCallback((dataUri: string) => {
    if (!cameraTarget) return;
    setCameraTarget(null);
    const file = dataUriToFile(dataUri);
    handleFile(cameraTarget, file);
  }, [cameraTarget, handleFile]);

  // ── Retry a single card ────────────────────────────────────────────────────
  const retryCard = useCallback((part: BodyPart) => {
    const prev = cards[part];
    if (prev.imageUrl) URL.revokeObjectURL(prev.imageUrl);
    setCards((p) => ({ ...p, [part]: { ...INITIAL_CARD } }));
  }, [cards]);

  // ── CBC upload ─────────────────────────────────────────────────────────────
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

  // ── Skip CBC ───────────────────────────────────────────────────────────────
  const handleSkipCbc = useCallback(async () => {
    await runValidation(null);
  }, []);

  // ── Final cross-modal validation ───────────────────────────────────────────
  const runValidation = useCallback(async (cbcData: any) => {
    setPageStep('validating');
    try {
      const imageReport = {
        conjunctiva: cards['under-eye']?.analysisResult ?? '',
        skin: cards['skin']?.analysisResult ?? '',
        fingernails: cards['fingernails']?.analysisResult ?? '',
      };
      const validation = await validateMultimodalResults({
        medicalInfo: {},
        imageAnalysisReport: imageReport,
        cbcAnalysis: cbcData ? {
          hemoglobin: cbcData.parameters?.find((p: any) =>
            p.parameter?.toLowerCase().includes('hemoglobin'))?.value ?? 'N/A',
          rbc: cbcData.parameters?.find((p: any) =>
            p.parameter?.toLowerCase().includes('rbc'))?.value ?? 'N/A',
        } : undefined,
      });
      setValidationResult(validation);
    } catch {
      // proceed to results even if validation fails
    } finally {
      setTimeout(() => setPageStep('results'), 1500);
    }
  }, [cards]);

  // ── Reset everything ───────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    Object.values(cards).forEach((c) => { if (c.imageUrl) URL.revokeObjectURL(c.imageUrl); });
    if (cbcImageUrl) URL.revokeObjectURL(cbcImageUrl);
    setCards({ 'skin': { ...INITIAL_CARD }, 'under-eye': { ...INITIAL_CARD }, 'fingernails': { ...INITIAL_CARD } });
    setCbcImageUrl(null);
    setCbcResult(null);
    setValidationResult(null);
    setPageStep('capture');
  }, [cards, cbcImageUrl]);

  // ── Camera open: show RealTimeCamera fullscreen ────────────────────────────
  if (cameraTarget) {
    return (
      <RealTimeCamera
        bodyPart={cameraTarget === 'under-eye' ? 'under-eye' : cameraTarget === 'fingernails' ? 'fingernails' : 'skin'}
        onCapture={handleCameraCapture}
        onClose={() => setCameraTarget(null)}
      />
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (pageStep === 'results') {
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

  // ── Validating spinner ─────────────────────────────────────────────────────
  if (pageStep === 'validating') {
    return <ValidatingView />;
  }

  // ── CBC upload step ────────────────────────────────────────────────────────
  if (pageStep === 'cbc') {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Back button */}
        <div className="px-4 pt-4">
          <Button
            variant="ghost"
            onClick={() => setPageStep('capture')}
            disabled={cbcAnalyzing}
            className="group text-muted-foreground hover:text-foreground gap-3 uppercase text-[10px] font-black tracking-[0.3em] h-10 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <CbcUploadCard
            onFile={handleCbcFile}
            onSkip={handleSkipCbc}
            isAnalyzing={cbcAnalyzing}
            cbcImageUrl={cbcImageUrl}
          />
        </div>
      </div>
    );
  }

  // ── Main capture step ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col pb-10">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-6">
        <div className="flex items-start justify-between gap-4">
          {onClose && (
            <Button
              variant="ghost"
              onClick={onClose}
              className="group text-muted-foreground hover:text-foreground gap-3 uppercase text-[10px] font-black tracking-[0.3em] h-10 rounded-full shrink-0 mt-1"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back
            </Button>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tighter text-foreground leading-[0.95] flex flex-wrap items-baseline gap-x-3">
              <span className="opacity-70">Multimodal</span>
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400">
                Analysis
              </span>
              <span className="text-primary animate-pulse">.</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-2">
              Upload three specimens · AI visual screening
            </p>
          </div>

          {/* Global progress indicator */}
          <div className="shrink-0 flex flex-col items-end gap-1.5 mt-1">
            <div className="flex items-center gap-1.5">
              {CARDS.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-500',
                    cards[c.id].status === 'success' ? 'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]' :
                    cards[c.id].status === 'analyzing' ? 'animate-pulse bg-primary' :
                    cards[c.id].status === 'error' ? 'bg-red-400' :
                    'bg-muted-foreground/20',
                  )}
                />
              ))}
            </div>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
              {successCount}/3 captured
            </p>
          </div>
        </div>
      </div>

      {/* ── 3-card grid ─────────────────────────────────────────────────────── */}
      <div className="px-4 grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
        {CARDS.map((config) => (
          <UploadCard
            key={config.id}
            config={config}
            cardState={cards[config.id]}
            onFile={(f) => handleFile(config.id, f)}
            onRetry={() => retryCard(config.id)}
            onCamera={() => setCameraTarget(config.id)}
          />
        ))}
      </div>

      {/* ── CTA bar ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-6">
        <AnimatePresence>
          {allCaptured && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="glass-panel rounded-[2rem] p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold">All specimens captured</p>
                  <p className="text-[10px] text-muted-foreground">Ready to run cross-modal validation</p>
                </div>
              </div>
              <Button
                onClick={() => setPageStep('cbc')}
                className="w-full sm:w-auto h-12 px-8 rounded-full bg-primary text-white text-[11px] font-black uppercase tracking-[0.3em] gap-2 hover:scale-105 active:scale-95 transition-all shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.5)]"
              >
                <Zap className="w-4 h-4 fill-white" />
                Run Full Analysis
                <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress hint while still capturing */}
        {!allCaptured && (
          <div className="flex items-center justify-center gap-3 py-4">
            {anyAnalyzing ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[11px] font-semibold uppercase tracking-widest">Scanning…</span>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-[0.2em]">
                Upload all 3 specimens to continue
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
