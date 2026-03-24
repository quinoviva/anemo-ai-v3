'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X, Zap, Scan, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import HeartLoader from '../ui/HeartLoader';

interface RealTimeCameraProps {
    bodyPart: 'skin' | 'under-eye' | 'fingernails';
    onCapture: (dataUri: string) => void;
    onClose: () => void;
}

export function RealTimeCamera({ bodyPart, onCapture, onClose }: RealTimeCameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCountingDown, setIsCountingDown] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const [isCameraReady, setIsCameraReady] = useState(false);

    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setIsCameraReady(true);
            }
        } catch (err) {
            console.error("Camera access failed:", err);
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current || !isCameraReady) return;
        
        setIsCountingDown(true);
        let count = 3;
        setCountdown(count);
        
        const interval = setInterval(() => {
            count--;
            setCountdown(count);
            if (count === 0) {
                clearInterval(interval);
                captureFrame();
            }
        }, 800);
    };

    const captureFrame = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUri = canvas.toDataURL('image/png');
            onCapture(dataUri);
            setIsCountingDown(false);
        }
    };

    const Overlay = () => {
        switch (bodyPart) {
            case 'under-eye':
                return (
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
                        {/* Eye Contour Trace */}
                        <path d="M20,50 Q50,20 80,50 Q50,80 20,50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-red-500/40" />
                        <path d="M25,50 Q50,30 75,50" fill="none" stroke="currentColor" strokeWidth="1" className="text-red-500 animate-pulse" />
                        <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" className="text-red-400" />
                        <text x="50" y="85" textAnchor="middle" className="text-[3px] font-black uppercase tracking-[0.4em] fill-red-500 italic">Align Lower Eyelid to Red Line</text>
                    </svg>
                );
            case 'skin':
                return (
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
                        {/* Palm Trace */}
                        <rect x="25" y="20" width="50" height="60" rx="10" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" className="text-amber-500/40" />
                        <path d="M30,35 L70,35 M30,50 L70,50 M30,65 L70,65" stroke="currentColor" strokeWidth="0.5" className="text-amber-500 animate-pulse" />
                        <text x="50" y="85" textAnchor="middle" className="text-[3px] font-black uppercase tracking-[0.4em] fill-amber-500 italic">Center Palm Creases</text>
                    </svg>
                );
            case 'fingernails':
                return (
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
                        {/* 4 Fingernails Line Trace */}
                        <g className="text-blue-500">
                             <rect x="15" y="30" width="15" height="40" rx="5" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                             <rect x="35" y="25" width="15" height="45" rx="5" fill="none" stroke="currentColor" strokeWidth="0.8" className="animate-pulse" />
                             <rect x="55" y="30" width="15" height="40" rx="5" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                             <rect x="75" y="40" width="15" height="30" rx="5" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                        </g>
                        <text x="50" y="85" textAnchor="middle" className="text-[3px] font-black uppercase tracking-[0.4em] fill-blue-500 italic">Align Fingernails with Matrices</text>
                    </svg>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]" />
            
            <div className="relative w-full max-w-4xl aspect-[4/3] sm:aspect-video bg-black rounded-[3rem] md:rounded-[4.5rem] overflow-hidden border border-white/10 shadow-2xl isolate scale-90 sm:scale-100 transition-transform">
                {!isCameraReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black z-50">
                        <Scan className="w-16 h-16 text-primary animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-[0.5em] text-muted-foreground italic">Establishing Neural Feed...</span>
                    </div>
                )}
                
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover transition-all duration-1000 grayscale group-hover:grayscale-0"
                />
                
                <div className="absolute inset-0">
                    <Overlay />
                </div>

                {/* Animated HUD Elements */}
                <div className="absolute top-8 left-8 flex items-center gap-6 z-20">
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                    <span className="text-[12px] font-bold text-white uppercase tracking-widest drop-shadow-md">REC // LIVE_FEED_{bodyPart.toUpperCase()}</span>
                </div>

                <div className="absolute bottom-8 right-8 z-20">
                    <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col gap-2">
                        <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest leading-none">ISO 800 // AE LOCKED</span>
                        <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest leading-none mt-1">SPECTRUM_SYNC: 100%</span>
                    </div>
                </div>

                <AnimatePresence>
                    {isCountingDown && (
                        <motion.div 
                            initial={{ scale: 2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-sm z-[100]"
                        >
                            <span className="text-[8rem] sm:text-[10rem] font-black text-white italic leading-none drop-shadow-2xl">{countdown}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="mt-12 flex items-center gap-8 relative z-[210]">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-20 w-20 rounded-full bg-white/5 border border-white/10 text-white hover:bg-red-500/20 hover:text-red-500 transition-all active:scale-90"
                    onClick={onClose}
                    disabled={isCountingDown}
                >
                    <X className="w-8 h-8" />
                </Button>
                
                <Button 
                    size="lg" 
                    className="h-24 px-16 rounded-full bg-primary text-white text-[14px] font-black tracking-[0.8em] uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_40px_100px_-20px_rgba(220,38,38,0.6)] group relative overflow-hidden disabled:opacity-50"
                    onClick={handleCapture}
                    disabled={isCountingDown || !isCameraReady}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <div className="flex items-center gap-6">
                        <Zap className="w-6 h-6 fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                        <span className="drop-shadow-md">Matrix Lock</span>
                    </div>
                </Button>
            </div>

            <div className="mt-12 text-center max-w-sm px-8">
                <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] leading-relaxed italic">
                    Place target in neural overlay. Keep device steady for spectral locking.
                </p>
            </div>
        </div>
    );
}
