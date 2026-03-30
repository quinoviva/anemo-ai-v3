'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Zap, Scan, CameraOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type PermissionStatus = 'requesting' | 'granted' | 'denied' | 'unavailable';

interface RealTimeCameraProps {
    bodyPart: 'skin' | 'under-eye' | 'fingernails';
    onCapture: (dataUri: string) => void;
    onClose: () => void;
    /** Accent colour hex used for HUD elements */
    accentColor?: string;
}

const PART_CONFIG = {
    'under-eye': {
        label: 'CONJUNCTIVA SCAN',
        hint: 'Pull lower eyelid down · look up toward light',
        color: '#ef4444',
    },
    'skin': {
        label: 'PALMAR SKIN SCAN',
        hint: 'Hold palm face-up · centre palm creases in frame',
        color: '#f59e0b',
    },
    'fingernails': {
        label: 'NAILBED SCAN',
        hint: 'Bare nails only · 4 fingers flat toward camera',
        color: '#3b82f6',
    },
} as const;

function BodyPartOverlay({ bodyPart, color }: { bodyPart: RealTimeCameraProps['bodyPart']; color: string }) {
    if (bodyPart === 'under-eye') return (
        <svg viewBox="0 0 100 56" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <path d="M12,28 Q50,6 88,28 Q50,50 12,28" fill="none" stroke={color} strokeWidth="0.5" opacity="0.4" />
            <path d="M18,28 Q50,12 82,28" fill="none" stroke={color} strokeWidth="1.2" opacity="0.9">
                <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite"/>
            </path>
            <circle cx="50" cy="28" r="7" fill="none" stroke={color} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.6"/>
            {/* crosshair */}
            <line x1="48" y1="28" x2="52" y2="28" stroke={color} strokeWidth="0.8" opacity="0.8"/>
            <line x1="50" y1="26" x2="50" y2="30" stroke={color} strokeWidth="0.8" opacity="0.8"/>
        </svg>
    );
    if (bodyPart === 'skin') return (
        <svg viewBox="0 0 100 56" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <rect x="28" y="6" width="44" height="44" rx="8" fill="none" stroke={color} strokeWidth="0.6" strokeDasharray="3 3" opacity="0.5"/>
            <line x1="28" y1="18" x2="72" y2="18" stroke={color} strokeWidth="0.5" opacity="0.7">
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.5s" repeatCount="indefinite"/>
            </line>
            <line x1="28" y1="28" x2="72" y2="28" stroke={color} strokeWidth="0.8" opacity="0.9"/>
            <line x1="28" y1="38" x2="72" y2="38" stroke={color} strokeWidth="0.5" opacity="0.7">
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.5s" repeatCount="indefinite"/>
            </line>
        </svg>
    );
    // fingernails
    return (
        <svg viewBox="0 0 100 56" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            {[12,28,44,60].map((x, i) => (
                <rect key={i} x={x} y={i === 1 ? 8 : 12} width="14" height={i === 1 ? 36 : 32} rx="4"
                    fill="none" stroke={color} strokeWidth={i === 1 ? "0.9" : "0.5"}
                    strokeDasharray={i === 1 ? "0" : "2 2"} opacity={i === 1 ? "0.9" : "0.5"}>
                    {i === 1 && <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite"/>}
                </rect>
            ))}
        </svg>
    );
}

export function RealTimeCamera({ bodyPart, onCapture, onClose, accentColor }: RealTimeCameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [permStatus, setPermStatus] = useState<PermissionStatus>('requesting');
    const [isCountingDown, setIsCountingDown] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const [isCameraReady, setIsCameraReady] = useState(false);

    const cfg = PART_CONFIG[bodyPart];
    const color = accentColor ?? cfg.color;

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }, []);

    const startCamera = useCallback(async () => {
        setPermStatus('requesting');
        setIsCameraReady(false);

        if (!navigator.mediaDevices?.getUserMedia) {
            setPermStatus('unavailable');
            return;
        }

        try {
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280, max: 1280 },
                    height: { ideal: 720, max: 720 },
                    frameRate: { ideal: 30, max: 30 },
                },
                audio: false,
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = mediaStream;

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                await videoRef.current.play().catch(() => {});
                setIsCameraReady(true);
            }
            setPermStatus('granted');
        } catch (err: any) {
            const name = err?.name ?? '';
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
                setPermStatus('denied');
            } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                setPermStatus('unavailable');
            } else {
                setPermStatus('denied');
            }
        }
    }, []);

    useEffect(() => {
        startCamera();
        return () => { stopStream(); };
    }, [startCamera, stopStream]);

    const handleCapture = useCallback(() => {
        if (!isCameraReady || isCountingDown) return;
        setIsCountingDown(true);
        let count = 3;
        setCountdown(count);
        const iv = setInterval(() => {
            count -= 1;
            setCountdown(count);
            if (count === 0) {
                clearInterval(iv);
                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (!video || !canvas) { setIsCountingDown(false); return; }
                canvas.width = video.videoWidth || 1280;
                canvas.height = video.videoHeight || 720;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const uri = canvas.toDataURL('image/jpeg', 0.92);
                    stopStream();
                    onCapture(uri);
                }
                setIsCountingDown(false);
            }
        }, 800);
    }, [isCameraReady, isCountingDown, onCapture, stopStream]);

    const handleClose = useCallback(() => {
        stopStream();
        onClose();
    }, [onClose, stopStream]);

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* grid bg */}
            <div className="absolute inset-0 bg-grid-white/[0.015] bg-[size:28px_28px] pointer-events-none" />

            {/* ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[160px] opacity-20 pointer-events-none"
                style={{ background: color }} />

            {/* ─── Permission-denied / unavailable screen ─── */}
            <AnimatePresence>
                {(permStatus === 'denied' || permStatus === 'unavailable') && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative z-10 flex flex-col items-center gap-8 px-8 max-w-sm text-center"
                    >
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
                            <CameraOff className="w-12 h-12 text-white/50 mx-auto" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-2xl font-light tracking-tight text-white">
                                {permStatus === 'denied' ? 'Camera Access Denied' : 'No Camera Found'}
                            </h2>
                            <p className="text-sm text-white/50 leading-relaxed">
                                {permStatus === 'denied'
                                    ? 'Please allow camera access in your browser settings, then retry.'
                                    : 'No camera was detected on this device. Please upload an image instead.'}
                            </p>
                        </div>
                        <div className="flex gap-3 w-full">
                            {permStatus === 'denied' && (
                                <Button onClick={startCamera}
                                    className="flex-1 h-12 rounded-full text-[11px] font-black uppercase tracking-[0.3em] gap-2"
                                    style={{ backgroundColor: color }}>
                                    <Settings className="w-4 h-4" /> Retry
                                </Button>
                            )}
                            <Button variant="ghost" onClick={handleClose}
                                className="flex-1 h-12 rounded-full bg-white/5 border border-white/10 text-white text-[11px] font-black uppercase tracking-[0.3em]">
                                <X className="w-4 h-4 mr-2" /> Close
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Requesting spinner ─── */}
            <AnimatePresence>
                {permStatus === 'requesting' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="relative z-10 flex flex-col items-center gap-6"
                    >
                        <div className="w-20 h-20 rounded-full border-2 flex items-center justify-center"
                            style={{ borderColor: `${color}40` }}>
                            <Scan className="w-9 h-9 animate-pulse" style={{ color }} />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white/40">
                            Requesting Camera…
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Live camera view ─── */}
            {(permStatus === 'granted' || permStatus === 'requesting') && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: permStatus === 'granted' ? 1 : 0, scale: permStatus === 'granted' ? 1 : 0.97 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-full max-w-2xl mx-4 sm:mx-auto"
                    style={{ aspectRatio: '4/3' }}
                >
                    {/* viewport */}
                    <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden border shadow-2xl"
                        style={{ borderColor: `${color}30` }}>

                        <video ref={videoRef} autoPlay playsInline muted
                            className="w-full h-full object-cover" />

                        {/* body-part overlay */}
                        {isCameraReady && (
                            <div className="absolute inset-0">
                                <BodyPartOverlay bodyPart={bodyPart} color={color} />
                            </div>
                        )}

                        {/* corner HUD brackets */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {[['M4,14 L4,4 L14,4', 'M86,4 L96,4 L96,14', 'M4,86 L4,96 L14,96', 'M96,86 L96,96 L86,96']].flat().map((d, i) => (
                                <path key={i} d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
                            ))}
                        </svg>

                        {/* REC badge */}
                        <div className="absolute top-5 left-5 flex items-center gap-2.5 z-20">
                            <div className="w-2.5 h-2.5 rounded-full animate-pulse shadow-lg"
                                style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/80">
                                {cfg.label}
                            </span>
                        </div>

                        {/* ISO readout */}
                        <div className="absolute bottom-5 right-5 z-20 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-xl border border-white/10">
                            <span className="text-[9px] font-mono uppercase tracking-widest"
                                style={{ color }}>
                                AE·LOCK · 720P · 30FPS
                            </span>
                        </div>

                        {/* Countdown overlay */}
                        <AnimatePresence>
                            {isCountingDown && (
                                <motion.div
                                    initial={{ scale: 1.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] z-50"
                                    style={{ background: `${color}25` }}
                                >
                                    <span className="text-[10rem] font-black text-white leading-none drop-shadow-2xl">
                                        {countdown}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}

            {/* ─── Controls ─── */}
            {permStatus === 'granted' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative z-20 mt-8 flex flex-col items-center gap-5"
                >
                    <div className="flex items-center gap-6">
                        <Button variant="ghost" size="icon"
                            className="h-16 w-16 rounded-full bg-white/5 border border-white/10 text-white hover:bg-red-500/20 hover:text-red-400 transition-all"
                            onClick={handleClose} disabled={isCountingDown}>
                            <X className="w-6 h-6" />
                        </Button>

                        <button
                            onClick={handleCapture}
                            disabled={isCountingDown || !isCameraReady}
                            className="relative h-20 w-20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-2xl"
                            style={{ backgroundColor: color, boxShadow: `0 20px 60px -10px ${color}80` }}
                        >
                            <div className="absolute inset-0 rounded-full border-4 border-white/20" />
                            <Zap className="w-8 h-8 fill-white text-white drop-shadow-lg" />
                        </button>
                    </div>

                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/30 text-center max-w-[260px] leading-relaxed">
                        {cfg.hint}
                    </p>
                </motion.div>
            )}

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
