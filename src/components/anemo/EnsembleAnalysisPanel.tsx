'use client';

/**
 * EnsembleAnalysisPanel
 * =====================
 * Multi-step body-part capture + 10-model heterogeneous ensemble inference.
 *
 * Workflow
 * --------
 * 1. Capture Skin      → LiveCameraAnalyzer
 * 2. Capture Fingernails → LiveCameraAnalyzer
 * 3. Capture Under-eye   → LiveCameraAnalyzer
 * 4. Run ensemble via useEnsembleModel hook (Web Worker for math)
 * 5. Show XAI per-body-part descriptions + Hgb estimate + severity
 *
 * Design tokens come from globals.css (.glass-panel, --primary, etc.)
 * so the page feels like a natural extension of the Anemo Dashboard.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Hand,
  Fingerprint,
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  ChevronRight,
  Droplets,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { GlassSurface } from '@/components/ui/glass-surface';
import { useToast } from '@/hooks/use-toast';
import { useEnsembleModel } from '@/hooks/use-ensemble-model';
import { LiveCameraAnalyzer, type CalibrationMetadata } from './LiveCameraAnalyzer';
import { cn } from '@/lib/utils';
import type { BodyPart } from '@/lib/ensemble/consensus-engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CaptureStep = 'skin' | 'fingernails' | 'undereye';
type PanelStep = CaptureStep | 'analysing' | 'results';

interface CapturedImages {
  skin: { dataUri: string; canvas: HTMLCanvasElement } | null;
  fingernails: { dataUri: string; canvas: HTMLCanvasElement } | null;
  undereye: { dataUri: string; canvas: HTMLCanvasElement } | null;
}

// ---------------------------------------------------------------------------
// XAI descriptions (per body part, per severity)
// ---------------------------------------------------------------------------

const XAI_DESCRIPTIONS: Record<CaptureStep, string> = {
  undereye:
    'The inner lining of your lower eyelid appears lighter than usual. Healthy eyes show a bright pink color from blood flow, but the AI detected a pale tone here.',
  fingernails:
    "Your nailbeds appear slightly washed-out. Usually, the skin under your nails should look pink; a lack of this color suggests blood isn't carrying enough oxygen.",
  skin: 'The AI detected that your skin tone is paler than your baseline, which is a common visual sign when red blood cell counts are low.',
};

// Minimum scout confidence to pass the quality gate (mirrors consensus-engine.ts).
const SCOUT_QUALITY_THRESHOLD = 0.4;

// ---------------------------------------------------------------------------
// Step configuration
// ---------------------------------------------------------------------------

interface StepConfig {
  id: CaptureStep;
  label: string;
  bodyPartKey: BodyPart;
  icon: React.ReactNode;
  instruction: string;
  liveBodyPart: 'skin' | 'under-eye' | 'fingernails';
}

const STEPS: StepConfig[] = [
  {
    id: 'skin',
    label: 'Skin',
    bodyPartKey: 'Skin',
    icon: <Hand className="w-5 h-5" />,
    instruction: 'Place your palm face-up in the camera frame.',
    liveBodyPart: 'skin',
  },
  {
    id: 'fingernails',
    label: 'Fingernails',
    bodyPartKey: 'Fingernails',
    icon: <Fingerprint className="w-5 h-5" />,
    instruction: 'Hold your fingernails flat against the frame.',
    liveBodyPart: 'fingernails',
  },
  {
    id: 'undereye',
    label: 'Under-eye',
    bodyPartKey: 'Undereye',
    icon: <Eye className="w-5 h-5" />,
    instruction: 'Pull down your lower eyelid slightly and look up.',
    liveBodyPart: 'under-eye',
  },
];

// ---------------------------------------------------------------------------
// Severity badge helpers
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<string, string> = {
  Normal: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Mild: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Moderate: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Severe: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EnsembleAnalysisPanelProps {
  onBack?: () => void;
}

export function EnsembleAnalysisPanel({ onBack }: EnsembleAnalysisPanelProps) {
  const { toast } = useToast();

  const {
    runAnalysis,
    isLoading,
    progress,
    ensembleReport,
    severity,
    consensusHgb,
    report,
    dietaryRecommendations,
    error,
    reset,
  } = useEnsembleModel();

  const [step, setStep] = useState<PanelStep>('skin');
  const [stepIndex, setStepIndex] = useState(0);
  const [captures, setCaptures] = useState<CapturedImages>({
    skin: null,
    fingernails: null,
    undereye: null,
  });

  // Hidden canvases for drawing captured images so they can be passed as
  // HTMLCanvasElement to the ensemble engine.
  const skinCanvasRef = useRef<HTMLCanvasElement>(null);
  const nailsCanvasRef = useRef<HTMLCanvasElement>(null);
  const eyeCanvasRef = useRef<HTMLCanvasElement>(null);

  const canvasRefs: Record<CaptureStep, React.RefObject<HTMLCanvasElement | null>> = {
    skin: skinCanvasRef,
    fingernails: nailsCanvasRef,
    undereye: eyeCanvasRef,
  };

  // Draw a dataUri into a canvas element.
  const drawToCanvas = useCallback(
    (dataUri: string, canvas: HTMLCanvasElement): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          resolve();
        };
        img.onerror = reject;
        img.src = dataUri;
      });
    },
    [],
  );

  const handleCapture = useCallback(
    async (
      _file: File,
      dataUri: string,
      _meta: CalibrationMetadata,
    ) => {
      const currentStepCfg = STEPS[stepIndex];
      const captureKey = currentStepCfg.id;
      const canvasRef = canvasRefs[captureKey];

      if (canvasRef.current) {
        await drawToCanvas(dataUri, canvasRef.current);
        setCaptures((prev) => ({
          ...prev,
          [captureKey]: { dataUri, canvas: canvasRef.current! },
        }));
      }

      // Advance to the next step or start analysis.
      const nextIndex = stepIndex + 1;
      if (nextIndex < STEPS.length) {
        setStepIndex(nextIndex);
        setStep(STEPS[nextIndex].id);
      } else {
        // All three body parts captured — kick off ensemble inference.
        setStep('analysing');
      }
    },
    [stepIndex, canvasRefs, drawToCanvas],
  );

  // When we enter the "analysing" step, run the ensemble.
  useEffect(() => {
    if (step !== 'analysing') return;

    const inputs: Partial<Record<BodyPart, HTMLCanvasElement>> = {};
    if (captures.skin?.canvas) inputs.Skin = captures.skin.canvas;
    if (captures.fingernails?.canvas) inputs.Fingernails = captures.fingernails.canvas;
    if (captures.undereye?.canvas) inputs.Undereye = captures.undereye.canvas;

    runAnalysis(inputs).then(() => {
      setStep('results');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Scout quality gate — toast when a Tier-1 scout processed an image but
  // rejected it for low quality (not simply skipped due to missing input).
  // We detect "skipped due to no image" by checking contributedToConsensus
  // against whether the matching body part was actually captured.
  useEffect(() => {
    if (!ensembleReport) return;
    const capturedBodyParts = new Set<string>(
      Object.entries(captures)
        .filter(([, v]) => v !== null)
        .map(([k]) => k), // 'skin' | 'fingernails' | 'undereye'
    );
    const scoutResults = ensembleReport.modelResults.filter((r) => r.tier === 1);
    for (const scout of scoutResults) {
      // Skip models that were omitted because no image was provided.
      const wasProvided =
        (scout.modelId.includes('skin') && capturedBodyParts.has('skin')) ||
        (scout.modelId.includes('nail') && capturedBodyParts.has('fingernails')) ||
        (scout.modelId.includes('eye') && capturedBodyParts.has('undereye'));
      if (!wasProvided) continue;

      if (!scout.qualityApproved) {
        const bodyPartName =
          scout.modelName.includes('Skin')
            ? 'skin image'
            : scout.modelName.includes('Fingernail') || scout.modelName.includes('Nail')
              ? 'fingernail image'
              : 'under-eye image';
        toast({
          title: `Low quality ${bodyPartName} detected`,
          description:
            scout.confidence < 0.2
              ? 'Move to a brighter area and retake the photo.'
              : 'Clean your lens and ensure the target is centred.',
          variant: 'destructive',
        });
      }
    }
  }, [ensembleReport, captures, toast]);

  const handleRetake = () => {
    reset();
    setStep('skin');
    setStepIndex(0);
    setCaptures({ skin: null, fingernails: null, undereye: null });
  };

  const handleBackClick = () => {
    if (step === 'results') {
      handleRetake();
    } else if (stepIndex === 0) {
      onBack?.();
    } else {
      setStepIndex((i) => i - 1);
      setStep(STEPS[stepIndex - 1].id);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────

  const currentStepCfg = STEPS[stepIndex];

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.id}>
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
              i < stepIndex
                ? 'text-emerald-400'
                : i === stepIndex
                  ? 'text-primary'
                  : 'text-muted-foreground/40',
            )}
          >
            {i < stepIndex ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <span
                className={cn(
                  'w-4 h-4 rounded-full border text-[9px] flex items-center justify-center',
                  i === stepIndex ? 'border-primary bg-primary/10' : 'border-border',
                )}
              >
                {i + 1}
              </span>
            )}
            <span className="hidden sm:block">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderCapture = () => (
    <motion.div
      key={`capture-${stepIndex}`}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {renderStepIndicator()}

      <GlassSurface intensity="medium" className="p-4 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            {currentStepCfg.icon}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{currentStepCfg.label} scan</h3>
            <p className="text-xs text-muted-foreground">{currentStepCfg.instruction}</p>
          </div>
        </div>
      </GlassSurface>

      <LiveCameraAnalyzer
        bodyPart={currentStepCfg.liveBodyPart}
        onCapture={handleCapture}
      />
    </motion.div>
  );

  const renderAnalysing = () => (
    <motion.div
      key="analysing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 space-y-8"
    >
      <div className="relative">
        <div className="w-24 h-24 rounded-full border-2 border-primary/20 flex items-center justify-center">
          <Cpu className="w-10 h-10 text-primary animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Running 10-Model Ensemble</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {progress.message || 'Initialising pipeline…'}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-2">
        <Progress value={Math.round(progress.fraction * 100)} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">
          {Math.round(progress.fraction * 100)}%
          {progress.currentModelId && ` · ${progress.currentModelId}`}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
    </motion.div>
  );

  const renderResults = () => {
    if (!ensembleReport || severity === null || consensusHgb === null) return null;

    const severityColor = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.Normal;

    return (
      <motion.div
        key="results"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Analysis Complete</h2>
            <p className="text-sm text-muted-foreground">
              {new Date(ensembleReport.timestamp).toLocaleString()}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetake} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retake
          </Button>
        </div>

        {/* Hgb + Severity */}
        <GlassSurface intensity="medium" className="p-6 rounded-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                Estimated Hemoglobin
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-light text-primary">
                  {consensusHgb.toFixed(1)}
                </span>
                <span className="text-lg text-muted-foreground">g/dL</span>
              </div>
            </div>
            <div className="text-right space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
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

          <div className="mt-4">
            <Progress
              value={Math.min(100, ((consensusHgb - 5) / (16 - 5)) * 100)}
              className="h-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>5 g/dL</span>
              <span>Normal ≥ 12 g/dL</span>
              <span>16 g/dL</span>
            </div>
          </div>
        </GlassSurface>

        {/* XAI per-body-part descriptions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Visual Markers Detected
          </h3>
          {STEPS.map((s) => {
            const captureData = captures[s.id];
            if (!captureData) return null;
            return (
              <GlassSurface key={s.id} intensity="low" className="p-4 rounded-xl flex gap-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={captureData.dataUri}
                    alt={`${s.label} capture`}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-primary">{s.icon}</span>
                    <span className="text-sm font-semibold">{s.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {XAI_DESCRIPTIONS[s.id]}
                  </p>
                </div>
              </GlassSurface>
            );
          })}
        </div>

        {/* Ensemble model breakdown */}
        {ensembleReport.modelResults.length > 0 && (
          <GlassSurface intensity="low" className="p-4 rounded-xl space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              10-Model Ensemble
            </h3>
            <div className="space-y-2">
              {ensembleReport.modelResults
                .filter((r) => r.contributedToConsensus)
                .map((r) => (
                  <div key={r.modelId} className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground w-5 text-right">
                      T{r.tier}
                    </span>
                    <span className="text-xs flex-1 truncate">{r.modelName}</span>
                    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${Math.round(r.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-10 text-right">
                      {r.estimatedHgb.toFixed(1)}
                    </span>
                  </div>
                ))}
            </div>
          </GlassSurface>
        )}

        {/* Dietary recommendations */}
        {dietaryRecommendations.length > 0 && (
          <GlassSurface intensity="low" className="p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Dietary Recommendations</h3>
            </div>
            <ul className="space-y-2">
              {dietaryRecommendations.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </GlassSurface>
        )}

        {/* AI narrative report */}
        {report && (
          <GlassSurface intensity="low" className="p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Clinical Screening Report</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {report}
            </p>
          </GlassSurface>
        )}

        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          This screen is generated by Anemo AI for non-invasive screening only and does not
          constitute a medical diagnosis. Please consult a licensed healthcare professional.
        </p>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      {onBack && step !== 'analysing' && (
        <Button
          variant="ghost"
          onClick={handleBackClick}
          className="group text-muted-foreground hover:text-foreground transition-colors gap-3 uppercase text-[10px] font-black tracking-[0.3em] h-12 rounded-full"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {step === 'results' ? 'Retake' : stepIndex === 0 ? 'Back' : 'Previous'}
        </Button>
      )}

      {/* Hidden canvases for drawing captured images */}
      <canvas ref={skinCanvasRef} className="hidden" aria-hidden="true" />
      <canvas ref={nailsCanvasRef} className="hidden" aria-hidden="true" />
      <canvas ref={eyeCanvasRef} className="hidden" aria-hidden="true" />

      <AnimatePresence mode="wait">
        {(step === 'skin' || step === 'fingernails' || step === 'undereye') &&
          renderCapture()}
        {step === 'analysing' && renderAnalysing()}
        {step === 'results' && renderResults()}
      </AnimatePresence>
    </div>
  );
}
