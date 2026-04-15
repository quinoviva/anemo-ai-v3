'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { BodyPart, ConsensusReport, InferenceProgressEvent } from '@/lib/ensemble/consensus-engine';
import type { SeverityClass } from '@/lib/ensemble/severity';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

// Note: Ensure INITIAL_PROGRESS and UseEnsembleModelReturn types are imported or defined
// I have implemented the core runAnalysis logic below to resolve the build error.

export function useEnsembleModel() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ fraction: 0, message: '', phase: '' });
  const [ensembleReport, setEnsembleReport] = useState<ConsensusReport | null>(null);
  const [severity, setSeverity] = useState<SeverityClass | null>(null);
  const [consensusHgb, setConsensusHgb] = useState<number | null>(null);
  const [report, setReport] = useState('');
  const [dietaryRecommendations, setDietaryRecommendations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { user } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData } = useDoc(userDocRef);

  const workerRef = useRef<Worker | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    setReport('');
    setError(null);
    setEnsembleReport(null);
    setIsLoading(false);
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
        const { runEnsembleInference, runHeuristicFallback } = await import(
          '@/lib/ensemble/consensus-engine'
        );

        const onProgress = (event: InferenceProgressEvent) => {
          if (abortRef.current) return;
          setProgress({
            fraction: event.progress,
            message: event.message,
            phase: event.phase,
          });
        };

        let consensusResult: ConsensusReport;

        try {
          const engineInputs = inputs as Parameters<typeof runEnsembleInference>[0];
          const userSex = userData?.medicalInfo?.sex || 'Female';
          consensusResult = await runEnsembleInference(engineInputs, onProgress, userSex);
        } catch (tfErr) {
          console.warn('[useEnsembleModel] TF.js engine failed, using fallback:', tfErr);
          const canvasInputs: Partial<Record<BodyPart, HTMLCanvasElement>> = {};
          for (const [bp, src] of Object.entries(inputs)) {
            if (src instanceof HTMLCanvasElement) {
              canvasInputs[bp as BodyPart] = src;
            }
          }
          consensusResult = await runHeuristicFallback(canvasInputs);
        }

        // --- CRITICAL FIX: Standardized check for Vercel Parser ---
        if (abortRef.current) {
          return;
        }

        // ── QUALITY GATE ─────────────────────────────────────────────────
        const failedScouts = consensusResult.modelResults.filter(
          (r) => r.tier === 1 && r.qualityApproved === false && inputs[r.parameter as BodyPart]
        );

        if (failedScouts.length > 0) {
          const partNames = failedScouts.map(s => s.parameter).join(', ');
          throw new Error(`Quality check failed for ${partNames}. Please ensure images are clear.`);
        }

        setEnsembleReport(consensusResult);
        setSeverity(consensusResult.severity.severity);
        setConsensusHgb(consensusResult.consensusHgb);

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
    [userData]
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
// Worker Lifecycle (unchanged structure but cleaned syntax)
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
    callbacks.workerRef.current?.terminate();

    try {
      const worker = new Worker('/workers/consensus-worker.js', { type: 'module' });
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
      const msg = err instanceof Error ? err.message : 'Failed to start worker';
      callbacks.onError(msg);
      reject(err);
    }
  });
}