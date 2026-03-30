'use client';

/**
 * Anemo AI — useEnsembleModel React Hook
 *
 * Provides a single entry point for the UI to:
 *   1. Run the 10-model ensemble inference pipeline on captured images.
 *   2. Spawn and communicate with the Edge-AI consensus Web Worker.
 *   3. Stream the generated clinical report token-by-token.
 *   4. Report granular loading progress per model.
 *
 * Usage
 * -----
 * ```tsx
 * const {
 *   runAnalysis,
 *   report,
 *   isLoading,
 *   progress,
 *   severity,
 *   consensusHgb,
 *   dietaryRecommendations,
 *   error,
 *   reset,
 * } = useEnsembleModel();
 *
 * // Call with canvas/image elements for each body part
 * await runAnalysis({ Skin: skinCanvas, Fingernails: nailCanvas, Undereye: eyeCanvas });
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { BodyPart, ConsensusReport, InferenceProgressEvent } from '@/lib/ensemble/consensus-engine';
import type { SeverityClass } from '@/lib/ensemble/severity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnsembleProgress {
  /** Overall fraction 0–1. */
  fraction: number;
  /** Human-readable status message. */
  message: string;
  /** Which model is currently being processed (if any). */
  currentModelId?: string;
  /** Current pipeline phase. */
  phase: InferenceProgressEvent['phase'] | 'worker' | 'idle';
}

export interface UseEnsembleModelReturn {
  /**
   * Kick off the full analysis pipeline for the provided image sources.
   * Resolves when the consensus report is fully generated.
   */
  runAnalysis: (
    inputs: Partial<Record<BodyPart, HTMLCanvasElement | HTMLImageElement | ImageData>>,
  ) => Promise<void>;
  /** Whether any analysis is currently in progress. */
  isLoading: boolean;
  /** Granular progress information. */
  progress: EnsembleProgress;
  /** Full {@link ConsensusReport} from the ensemble (null until complete). */
  ensembleReport: ConsensusReport | null;
  /** Final severity classification string. */
  severity: SeverityClass | null;
  /** Consensus Hgb estimate in g/dL. */
  consensusHgb: number | null;
  /** Streaming clinical report text (updates token-by-token during LLM generation). */
  report: string;
  /** Localised dietary recommendations for the detected severity. */
  dietaryRecommendations: string[];
  /** Last error message, if any. */
  error: string | null;
  /** Reset all state back to initial values. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const INITIAL_PROGRESS: EnsembleProgress = {
  fraction: 0,
  message: '',
  phase: 'idle',
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEnsembleModel(): UseEnsembleModelReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<EnsembleProgress>(INITIAL_PROGRESS);
  const [ensembleReport, setEnsembleReport] = useState<ConsensusReport | null>(null);
  const [severity, setSeverity] = useState<SeverityClass | null>(null);
  const [consensusHgb, setConsensusHgb] = useState<number | null>(null);
  const [report, setReport] = useState('');
  const [dietaryRecommendations, setDietaryRecommendations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const abortRef = useRef(false);

  // Tear down the worker when the component unmounts
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    workerRef.current?.postMessage({ type: 'ABORT' });
    setIsLoading(false);
    setProgress(INITIAL_PROGRESS);
    setEnsembleReport(null);
    setSeverity(null);
    setConsensusHgb(null);
    setReport('');
    setDietaryRecommendations([]);
    setError(null);
  }, []);

  const runAnalysis = useCallback(
    async (
      inputs: Partial<Record<BodyPart, HTMLCanvasElement | HTMLImageElement | ImageData>>,
    ): Promise<void> => {
      abortRef.current = false;
      setIsLoading(true);
      setError(null);
      setReport('');
      setProgress({ fraction: 0.02, message: 'Initialising ensemble…', phase: 'loading' });

      try {
        // Lazy-import the consensus engine (avoids bundling TF.js on the
        // initial page load — models are only loaded when the user triggers
        // an analysis).
        const { runEnsembleInference, runHeuristicFallback } = await import(
          '@/lib/ensemble/consensus-engine'
        );

        const onProgress = (event: InferenceProgressEvent) => {
          if (abortRef.current) return;
          setProgress({
            fraction: event.progress,
            message: event.message,
            currentModelId: event.modelId,
            phase: event.phase,
          });
        };

        let consensusResult: ConsensusReport;

        try {
          // Pass canvas/image elements directly into the engine
          const engineInputs = inputs as Parameters<typeof runEnsembleInference>[0];
          consensusResult = await runEnsembleInference(engineInputs, onProgress);
        } catch (tfErr) {
          // If TF.js models aren't available yet, use the heuristic fallback
          console.warn('[useEnsembleModel] TF.js engine failed, using heuristic fallback:', tfErr);
          const canvasInputs: Partial<Record<BodyPart, HTMLCanvasElement>> = {};
          for (const [bp, src] of Object.entries(inputs) as [BodyPart, any][]) {
            if (src instanceof HTMLCanvasElement) {
              canvasInputs[bp] = src;
            }
          }
          consensusResult = await runHeuristicFallback(canvasInputs);
        }

        if (abortRef.current) return;

        setEnsembleReport(consensusResult);
        setSeverity(consensusResult.severity.severity);
        setConsensusHgb(consensusResult.consensusHgb);

        // ── Spawn the Edge-AI Web Worker ─────────────────────────────────
        setProgress({
          fraction: 0.85,
          message: 'Starting Edge-AI reasoning engine…',
          phase: 'worker',
        });

        await runConsensusWorker(
          {
            allConfidenceScores: consensusResult.allConfidenceScores,
            modelResults: consensusResult.modelResults,
            consensusHgb: consensusResult.consensusHgb,
            severity: consensusResult.severity.severity,
          },
          {
            onToken: (token: string) => {
              if (abortRef.current) return;
              setReport((prev) => prev + token);
            },
            onLoading: (fraction: number, message: string) => {
              if (abortRef.current) return;
              setProgress({ fraction, message, phase: 'worker' });
            },
            onComplete: (payload: any) => {
              if (abortRef.current) return;
              setReport(payload.report);
              setDietaryRecommendations(payload.dietaryRecommendations ?? []);
              setProgress({ fraction: 1, message: 'Analysis complete', phase: 'worker' });
              setIsLoading(false);
            },
            onError: (msg: string) => {
              if (abortRef.current) return;
              setError(msg);
              setIsLoading(false);
            },
            workerRef,
          },
        );
      } catch (err) {
        if (abortRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setIsLoading(false);
      }
    },
    [],
  );

  return {
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
  };
}

// ---------------------------------------------------------------------------
// Internal: consensus worker lifecycle
// ---------------------------------------------------------------------------

interface WorkerCallbacks {
  onToken: (token: string) => void;
  onLoading: (fraction: number, message: string) => void;
  onComplete: (payload: any) => void;
  onError: (message: string) => void;
  workerRef: React.MutableRefObject<Worker | null>;
}

function runConsensusWorker(
  input: {
    allConfidenceScores: number[];
    modelResults: any[];
    consensusHgb: number;
    severity: SeverityClass;
  },
  callbacks: WorkerCallbacks,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Terminate any previous worker
    callbacks.workerRef.current?.terminate();

    try {
      const worker = new Worker('/workers/consensus-worker.js');
      callbacks.workerRef.current = worker;

      worker.onmessage = (event: MessageEvent) => {
        const { type, payload } = event.data;
        switch (type) {
          case 'LOADING':
            callbacks.onLoading(payload.progress, payload.message);
            break;
          case 'TOKEN':
            callbacks.onToken(payload.token);
            break;
          case 'COMPLETE':
            callbacks.onComplete(payload);
            worker.terminate();
            callbacks.workerRef.current = null;
            resolve();
            break;
          case 'ERROR':
            callbacks.onError(payload.message);
            worker.terminate();
            callbacks.workerRef.current = null;
            reject(new Error(payload.message));
            break;
        }
      };

      worker.onerror = (err) => {
        callbacks.onError(err.message ?? 'Worker error');
        callbacks.workerRef.current = null;
        reject(err);
      };

      worker.postMessage({ type: 'ANALYSE', payload: input });
    } catch (err) {
      // Web Workers may not be available in all environments
      const msg = err instanceof Error ? err.message : 'Failed to start consensus worker';
      callbacks.onError(msg);
      reject(err);
    }
  });
}
