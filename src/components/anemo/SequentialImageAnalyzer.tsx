'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera,
    Upload,
    CheckCircle,
    X,
    Cpu,
    Eye,
    Hand,
    User,
    ArrowRight,
    ChevronLeft,
    Zap,
    Loader2,
    ShieldAlert,
    Fingerprint,
    Search,
    LayoutGrid,
    Database,
    History,
    Workflow,
    Terminal,
    Scan,
    Info,
    Activity
} from 'lucide-react';
import { RealTimeCamera } from './RealTimeCamera';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { runGenerateImageDescription, runAnalyzeCbcReport, saveImageForTraining, saveLabReportForTraining } from '@/app/actions';
import { ImageAnalysisReport } from './ImageAnalysisReport';
import { validateMultimodalResults } from '@/ai/flows/validate-multimodal-results';
import { useUser } from '@/firebase';
import HeartLoader from '@/components/ui/HeartLoader';
import { cn } from '@/lib/utils';
import { AnalysisGuide } from './AnalysisGuide';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// Types
type BodyPart = 'skin' | 'under-eye' | 'fingernails';
type Step = 'intro' | 'skin' | 'under-eye' | 'fingernails' | 'cbc-decision' | 'cbc-capture' | 'analyzing' | 'results';
type AnalysisStage = 'idle' | 'uploading' | 'quality-check' | 'anemia-detection' | 'complete' | 'failed';

interface SequentialImageAnalyzerProps {
    onClose: () => void;
    isOpen?: boolean;
    isPage?: boolean;
}

export function SequentialImageAnalyzer({ onClose, isOpen, isPage }: SequentialImageAnalyzerProps) {
    const { user } = useUser();
    const { toast } = useToast();

    // State
    const [currentStep, setCurrentStep] = useState<Step>('intro');
    const [showGuide, setShowGuide] = useState(false);
    const [images, setImages] = useState<Record<BodyPart, string | null>>({
        skin: null,
        'under-eye': null,
        fingernails: null
    });
    const [analysisResults, setAnalysisResults] = useState<Record<BodyPart, any>>({
        skin: null,
        'under-eye': null,
        fingernails: null
    });

    const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('idle');
    const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
    const [qualityError, setQualityError] = useState<string | null>(null);
    const [cbcImage, setCbcImage] = useState<string | null>(null);
    const [cbcResult, setCbcResult] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [validationResult, setValidationResult] = useState<any>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const addLog = (message: string) => {
        setDiagnosticLogs(prev => [...prev.slice(-2), message]);
    };

    useEffect(() => {
        if (!isPage && !isOpen) {
            setTimeout(() => {
                setCurrentStep('intro');
                setShowGuide(false);
                setImages({ skin: null, 'under-eye': null, fingernails: null });
                setAnalysisResults({ skin: null, 'under-eye': null, fingernails: null });
                setCbcImage(null);
                setCbcResult(null);
                setValidationResult(null);
                setAnalysisStage('idle');
                setDiagnosticLogs([]);
                setQualityError(null);
            }, 500);
        }
    }, [isOpen, isPage]);

    const getThemeColor = (step: Step) => {
        if (step === 'skin') return { primary: 'amber', glow: 'bg-amber-500/20', text: 'text-amber-500', border: 'border-amber-500/20' };
        if (step === 'under-eye') return { primary: 'red', glow: 'bg-red-500/20', text: 'text-red-500', border: 'border-red-500/20' };
        if (step === 'fingernails') return { primary: 'blue', glow: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-blue-500/20' };
        return { primary: 'primary', glow: 'bg-primary/20', text: 'text-primary', border: 'border-primary/20' };
    };

    const theme = getThemeColor(currentStep);

    const handleImageSelect = async (file: File, part: BodyPart) => {
        if (!file) return;

        const dataUri = await resizeImage(file);
        setImages(prev => ({ ...prev, [part]: dataUri }));
        setAnalysisStage('quality-check');
        setDiagnosticLogs([]);

        addLog(`[SYNC] Initializing ${part.toUpperCase()} Protocol`);

        try {
            await new Promise(r => setTimeout(r, 1000));
            const result = await runGenerateImageDescription({ photoDataUri: dataUri, bodyPart: part });

            if (!result.isValid) {
                setAnalysisStage('failed');
                setQualityError(result.description);
                return;
            }

            setAnalysisStage('anemia-detection');
            addLog(`[SYNC] Mapping Spectral Indices...`);
            await new Promise(r => setTimeout(r, 1500));

            setAnalysisResults(prev => ({ ...prev, [part]: result }));
            saveImageForTraining(dataUri, part, result.analysisResult, user?.displayName || 'Anonymous');
            setAnalysisStage('complete');

            setTimeout(() => {
                setAnalysisStage('idle');
                if (part === 'skin') setCurrentStep('under-eye');
                else if (part === 'under-eye') setCurrentStep('fingernails');
                else if (part === 'fingernails') setCurrentStep('cbc-decision');
                setShowGuide(false);
            }, 1500);
        } catch (error: any) {
            console.error("CAPTURE_FAILURE:", error);
            setAnalysisStage('failed');

            // Check for Gemini/Genkit Quota Errors (429)
            if (error?.message?.includes('429') || error?.message?.includes('Quota exceeded')) {
                setQualityError("AI Protocol at Capacity. Please wait 60 seconds for neural node reset and try again.");
            } else {
                setQualityError("Check connection.");
            }
        }
    };

    const handleCbcSelect = async (file: File) => {
        if (!file) return;
        const dataUri = await resizeImage(file);
        setCbcImage(dataUri);
        setIsAnalyzing(true);
        try {
            const result = await runAnalyzeCbcReport({ photoDataUri: dataUri });
            setCbcResult(result);
            saveLabReportForTraining(dataUri, result.summary, user?.displayName || 'Anonymous');
            setTimeout(() => {
                setIsAnalyzing(false);
                performFinalAnalysis(result);
            }, 1500);
        } catch (error) {
            setIsAnalyzing(false);
            setCbcImage(null);
        }
    };

    const performFinalAnalysis = async (cbcData: any = null) => {
        setCurrentStep('analyzing');
        setIsAnalyzing(true);
        try {
            const imageAnalysisReport = {
                conjunctiva: analysisResults['under-eye']?.analysisResult || '',
                skin: analysisResults['skin']?.analysisResult || '',
                fingernails: analysisResults['fingernails']?.analysisResult || '',
            };

            const validation = await validateMultimodalResults({
                medicalInfo: {},
                imageAnalysisReport,
                cbcAnalysis: cbcData ? {
                    hemoglobin: cbcData.parameters.find((p: any) => p.parameter.toLowerCase().includes('hemoglobin'))?.value || 'N/A',
                    rbc: cbcData.parameters.find((p: any) => p.parameter.toLowerCase().includes('rbc'))?.value || 'N/A',
                } : undefined
            });
            setValidationResult(validation);
            setTimeout(() => {
                setIsAnalyzing(false);
                setCurrentStep('results');
            }, 2000);
        } catch (error) {
            setCurrentStep('results');
            setIsAnalyzing(false);
        }
    };

    const StepCard = ({ title, description, icon: Icon, onUpload, image, stepId }: any) => {
        const fileInputRef = useRef<HTMLInputElement>(null);

        if (isCameraOpen && stepId) {
            return (
                <RealTimeCamera
                    bodyPart={stepId as BodyPart}
                    onCapture={(uri) => {
                        setIsCameraOpen(false);
                        handleImageSelect(dataUriToBlob(uri), stepId as BodyPart);
                    }}
                    onClose={() => setIsCameraOpen(false)}
                />
            );
        }

        if (showGuide && stepId) {
            return (
                <div className="absolute inset-0 z-[100] bg-background">
                    <ScrollArea className="h-full w-full">
                        <div className="p-4 sm:p-8 lg:p-12">
                            <AnalysisGuide bodyPart={stepId} onComplete={() => setShowGuide(false)} />
                        </div>
                    </ScrollArea>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                        <Button variant="secondary" className="rounded-full h-12 px-8 text-[11px] font-bold uppercase tracking-widest bg-background/80 backdrop-blur-xl border border-white/10" onClick={() => setShowGuide(false)}>
                            <X className="w-4 h-4 mr-3" /> Dismiss Protocol
                        </Button>
                    </div>
                </div>
            )
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-full w-full max-w-4xl mx-auto px-4 py-8 space-y-12 md:space-y-16 relative z-10">
                <div className="relative group w-full max-w-[min(100%,480px)] aspect-square self-center">
                    <div className={cn("absolute inset-[-40px] md:inset-[-60px] blur-[80px] md:blur-[120px] opacity-20 rounded-full transition-all duration-1000", theme.glow)} />

                    <div className="relative w-full h-full rounded-[3rem] md:rounded-[4rem] bg-background/40 glass-panel border border-white/10 overflow-hidden isolate flex items-center justify-center shadow-2xl">
                        <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px]" />

                        <AnimatePresence mode="wait">
                            {image ? (
                                <motion.div key="image" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                                    <img src={image} className={cn("w-full h-full object-cover grayscale transition-all duration-1000", (analysisStage !== 'idle' && analysisStage !== 'complete') && "blur-xl saturate-150")} />
                                    {(analysisStage !== 'idle' && analysisStage !== 'failed' && analysisStage !== 'complete') && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-black/40 dark:bg-black/60 backdrop-blur-3xl overflow-hidden">
                                            {/* Scanning Laser Effect */}
                                            <motion.div
                                                animate={{ top: ['0%', '100%', '0%'] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                                className={cn("absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent z-10 shadow-[0_0_15px]", theme.primary === 'amber' ? 'shadow-amber-500/50' : theme.primary === 'red' ? 'shadow-red-500/50' : 'shadow-blue-500/50')}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                                            <HeartLoader size={90} strokeWidth={1} />
                                            <div className="flex flex-col items-center gap-3">
                                                <span className="text-[12px] font-medium tracking-[0.2em] text-foreground opacity-70">spectral analysis active</span>
                                                <div className="flex gap-1">
                                                    {[0, 1, 2].map(i => (
                                                        <motion.div
                                                            key={i}
                                                            animate={{ opacity: [0.2, 1, 0.2] }}
                                                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                                            className="w-1 h-1 rounded-full bg-primary"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {analysisStage === 'failed' && (
                                        <motion.div
                                            initial="hidden"
                                            animate="visible"
                                            exit="hidden"
                                            variants={{
                                                hidden: { opacity: 0, filter: 'blur(10px)' },
                                                visible: { opacity: 1, filter: 'blur(0px)', transition: { staggerChildren: 0.1, duration: 0.5 } }
                                            }}
                                            className="absolute inset-0 z-50 overflow-hidden flex flex-col items-center justify-center p-6 sm:p-10 text-center"
                                        >
                                            {/* Breach Context Background */}
                                            <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute inset-0 bg-red-950/40 backdrop-blur-2xl border border-red-500/10 shadow-[inset_0_0_100px_rgba(220,38,38,0.2)]" 
                                            />
                                            
                                            {/* Dynamic Error Ripple Overlay */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full mix-blend-screen opacity-50 pointer-events-none">
                                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15)_0%,transparent_50%)] animate-pulse" />
                                            </div>

                                            <div className="relative z-10 flex flex-col items-center max-w-md w-full gap-8">
                                                
                                                {/* Animated Glitch Icon Container */}
                                                <motion.div
                                                    variants={{
                                                        hidden: { scale: 0.5, opacity: 0, rotate: -15 },
                                                        visible: { scale: 1, opacity: 1, rotate: 0 }
                                                    }}
                                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                                    className="relative"
                                                >
                                                    <motion.div
                                                        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.6, 0.2] }}
                                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                                        className="absolute inset-[-20%] rounded-full bg-red-600/20 blur-xl"
                                                    />
                                                    <div className="w-24 h-24 rounded-full bg-red-950/60 border border-red-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.3)] relative overflow-hidden isolate">
                                                        <motion.div 
                                                            animate={{ y: ['-100%', '100%'] }}
                                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                                            className="absolute inset-x-0 h-px bg-red-400 z-10 opacity-30 shadow-[0_0_10px_rgba(248,113,113,1)]" 
                                                        />
                                                        <ShieldAlert className="w-10 h-10 text-red-500 relative z-20 drop-shadow-md" strokeWidth={1.5} />
                                                    </div>
                                                </motion.div>

                                                <motion.div 
                                                    variants={{
                                                        hidden: { y: 20, opacity: 0 },
                                                        visible: { y: 0, opacity: 1 }
                                                    }}
                                                    className="space-y-6 w-full"
                                                >
                                                    
                                                    {/* Central Error Typography */}
                                                    <div className="bg-red-950/30 p-6 md:p-8 border-y md:border-y-0 md:border border-red-500/20 md:rounded-3xl shadow-2xl relative overflow-hidden group">
                                                         <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
                                                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-3xl shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
                                                         
                                                         <div className="space-y-4">
                                                             <h3 className="flex items-center justify-center gap-3 text-[10px] md:text-xs font-bold text-red-500 tracking-[0.3em] uppercase opacity-90">
                                                                 <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]" /> 
                                                                 Specimen Rejected
                                                             </h3>
                                                             <p className="text-xl md:text-2xl font-medium text-foreground tracking-tight leading-snug drop-shadow-md pb-2 text-balance">
                                                                 {qualityError || "Neural synthesis failed due to severe optical anomaly."}
                                                             </p>
                                                         </div>
                                                    </div>

                                                    {/* Integrated Telemetry Feed */}
                                                    {diagnosticLogs.length > 0 && (
                                                        <div className="flex flex-col gap-1.5 opacity-60 bg-background/20 p-4 rounded-2xl mx-auto w-fit">
                                                            {diagnosticLogs.map((log, i) => (
                                                                <div key={i} className="flex items-center justify-start gap-3 w-full text-left">
                                                                    <span className="text-[10px] font-mono text-red-500 shadow-sm">»</span>
                                                                    <span className="text-[10px] font-mono text-foreground tracking-widest leading-none drop-shadow-sm line-clamp-1">{log}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.div>

                                                <motion.div
                                                    variants={{
                                                        hidden: { y: 20, opacity: 0 },
                                                        visible: { y: 0, opacity: 1 }
                                                    }}
                                                    className="w-full pt-4"
                                                >
                                                    <Button
                                                        size="lg"
                                                        className="w-full max-w-[280px] h-16 rounded-full bg-red-600 border border-red-500/20 text-white text-sm font-bold tracking-widest uppercase transition-all hover:bg-red-500 hover:scale-[1.03] active:scale-95 shadow-[0_20px_40px_-10px_rgba(220,38,38,0.4)] relative overflow-hidden ring-1 ring-white/10 group"
                                                        onClick={() => { setImages(prev => ({ ...prev, [stepId]: null })); setAnalysisStage('idle'); }}
                                                    >
                                                        <div className="absolute inset-x-0 h-1 bg-white/30 top-0 group-hover:translate-y-16 transition-transform duration-700" />
                                                        Re-initialize Sensor
                                                    </Button>
                                                </motion.div>
                                            </div>

                                            {/* Low Opacity Noise Grain */}
                                            <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('/noise.png')]" />
                                        </motion.div>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="flex flex-col items-center gap-10">
                                    <div className="relative group">
                                        <motion.div
                                            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"
                                        />
                                        <div className="p-12 md:p-16 rounded-full bg-white/[0.02] border border-white/10 shadow-2xl relative z-10 transition-all duration-700 group-hover:bg-white/[0.05] group-hover:scale-110">
                                            <Icon className={cn("w-24 h-24 md:w-36 md:h-36 opacity-20 transition-opacity duration-700 group-hover:opacity-40", theme.text)} strokeWidth={1} />
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-4">
                                        <span className="text-[11px] font-medium tracking-[0.4em] text-foreground/30">awaiting signal</span>
                                        <div className="h-[1px] w-8 bg-foreground/10" />
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>

                        {analysisStage !== 'idle' && (
                            <div className="absolute bottom-6 inset-x-6 z-[60]">
                                <div className="p-3 rounded-2xl bg-card/80 dark:bg-black/80 backdrop-blur-3xl border border-foreground/5 shadow-2xl space-y-1">
                                    {diagnosticLogs.map((log, i) => (
                                        <p key={i} className="text-[10px] font-mono text-foreground tracking-widest leading-none flex items-center gap-2">
                                            <span className={cn("opacity-40", theme.text)}>»</span>
                                            <span className="opacity-60">{log}</span>
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-6 left-6 w-10 h-10 border-l border-t border-primary/20 rounded-tl-2xl" />
                            <div className="absolute bottom-6 right-6 w-10 h-10 border-r border-b border-primary/20 rounded-br-2xl" />
                        </div>
                    </div>
                </div>

                <div className="space-y-6 w-full text-center relative z-20">
                    <div className="space-y-4">
                        <h2 className="text-[clamp(1.8rem,8vw,4.5rem)] font-black tracking-tighter text-foreground leading-[1.1]">
                            {title.split(' ')[0]} <span className={cn("italic-font", theme.text)}>{title.split(' ').slice(1).join(' ')}</span>
                        </h2>
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-px w-8 bg-foreground/10" />
                            <p className="text-[13px] md:text-base text-muted-foreground font-medium tracking-wide leading-relaxed max-w-lg px-2">{description}</p>
                            <div className="h-px w-8 bg-foreground/10" />
                        </div>
                    </div>

                    {analysisStage === 'idle' && (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 px-6">
                            <Button
                                size="lg"
                                className="w-full sm:w-72 h-16 rounded-[1.8rem] bg-white/[0.05] border border-white/10 hover:bg-white/10 text-foreground transition-all flex items-center justify-start px-8 gap-6 group/btn relative overflow-hidden shadow-lg"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="p-2.5 bg-white/10 rounded-xl group-hover/btn:bg-white group-hover/btn:text-black transition-all"><Upload className="w-5 h-5" /></div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-left">Upload Specimen</span>
                            </Button>
                            <Button
                                size="lg"
                                className={cn("w-full sm:w-72 h-16 rounded-[1.8rem] text-white flex items-center justify-start px-8 gap-6 group/btn hover:scale-105 active:scale-95 transition-all shadow-xl relative overflow-hidden",
                                    theme.primary === 'amber' ? 'bg-amber-600 shadow-amber-600/30' :
                                        theme.primary === 'red' ? 'bg-red-600 shadow-red-600/30' :
                                            theme.primary === 'blue' ? 'bg-blue-600 shadow-blue-600/30' : 'bg-primary shadow-primary/30'
                                )}
                                onClick={() => setIsCameraOpen(true)}
                            >
                                <div className="p-2.5 bg-foreground/5 rounded-xl transition-colors group-hover:bg-primary/20"><Camera className="w-5 h-5" /></div>
                                <span className="text-[11px] font-bold tracking-widest text-left uppercase">Activate Camera</span>
                            </Button>
                        </div>
                    )}

                    <button className="flex items-center gap-3 mx-auto text-muted-foreground hover:text-foreground transition-all group px-6 py-3 rounded-full hover:bg-foreground/5 mt-4" onClick={() => setShowGuide(true)}>
                        <Search className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                        <span className="text-[10px] font-bold tracking-widest uppercase">Clinical Protocol</span>
                    </button>

                    <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                </div>
            </div>
        );
    };

    // --- HIGH-FIDELITY SPECIMEN UTILITIES ---
    const resizeImage = (f: File, maxDim = 1600): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;
                if (w > h && w > maxDim) { h *= maxDim / w; w = maxDim; }
                else if (h > maxDim) { w *= maxDim / h; h = maxDim; }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(f);
        });
    };

    const dataUriToBlob = (dataUri: string): File => {
        const byteString = atob(dataUri.split(',')[1]);
        const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        return new File([blob], "capture.png", { type: mimeString });
    };

    const MainLayout = (
        <div className={cn(
            "relative w-full overflow-hidden flex flex-col md:flex-row bg-background isolate",
            isPage ? "min-h-screen" : "max-w-7xl w-full h-[95vh] rounded-[3rem] md:rounded-[4.5rem] shadow-2xl border border-white/5"
        )}>
            <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:40px_40px] z-0" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay z-0" />

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    transition={{ duration: 1.2, ease: "anticipate" }}
                    className={cn("absolute inset-[-20%] blur-[120px] md:blur-[220px] rounded-full pointer-events-none opacity-20", theme.glow)}
                />
            </AnimatePresence>

            {/* Improved Highly Readable Sidebar */}
            <aside className="w-full md:w-24 lg:w-[360px] bg-background/50 backdrop-blur-3xl border-b md:border-b-0 md:border-r border-white/10 p-6 md:p-8 lg:p-12 z-30 flex md:flex-col items-center md:items-start justify-between relative isolate">
                <div className="w-full text-left">
                    <div className="hidden md:flex flex-col gap-6 mb-16 lg:mb-28">
                        <div className="inline-flex items-center gap-4 px-4 py-2 rounded-full bg-white/5 border border-white/10 w-fit">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_theme(colors.emerald.500)]" />
                            <span className="text-[10px] font-black tracking-widest text-foreground uppercase">ANEMO</span>
                        </div>
                    </div>

                    <div className="flex md:flex-col gap-6 md:gap-12 overflow-x-auto no-scrollbar md:overflow-visible w-full py-4 md:py-0">
                        {[
                            { id: 'skin', label: 'Dermal Lock', code: 'PX01', icon: User },
                            { id: 'under-eye', label: 'Ocular Hub', code: 'PX02', icon: Eye },
                            { id: 'fingernails', label: 'Ungual Matrix', code: 'PX03', icon: Hand },
                            { id: 'cbc-decision', label: 'Clinical Sync', code: 'PX04', icon: Database }
                        ].map((step) => {
                            const isDone = images[step.id as BodyPart] !== null || (step.id === 'cbc-decision' && (cbcResult !== null || currentStep === 'results'));
                            const isAt = currentStep === step.id || (step.id === 'cbc-decision' && currentStep === 'cbc-capture');
                            const sTheme = getThemeColor(step.id as Step);
                            const sColor = step.id === 'skin' ? 'amber' : step.id === 'under-eye' ? 'red' : 'blue';

                            return (
                                <div key={step.id} className={cn("flex items-center gap-6 shrink-0 transition-all duration-700", !isAt && !isDone && "opacity-30 grayscale scale-95")}>
                                    <div className={cn(
                                        "w-14 h-14 lg:w-20 lg:h-20 rounded-[1.8rem] lg:rounded-[2.2rem] flex items-center justify-center border transition-all duration-500 relative isolate",
                                        isDone ? `bg-${sColor}-600 border-transparent text-white shadow-2xl` :
                                            isAt ? `border-${sColor}-500 bg-${sColor}-500/10 ${sTheme.text} shadow-2xl` :
                                                "border-white/10 text-muted-foreground bg-white/[0.03]"
                                    )}>
                                        {isDone ? <CheckCircle className="w-8 h-8 lg:w-10 lg:h-10" /> : <step.icon className="w-8 h-8 lg:w-10 lg:h-10 opacity-60" />}
                                        {isAt && <div className={cn("absolute inset-[-6px] rounded-[2.2rem] md:rounded-[2.8rem] animate-pulse -z-10 opacity-40", sTheme.glow)} />}
                                    </div>
                                    <div className="hidden lg:flex flex-col text-left">
                                        <span className={cn("text-[10px] font-black uppercase tracking-[0.4em] mb-1.5", isAt ? sTheme.text : "text-muted-foreground")}>{step.code}</span>
                                        <h3 className={cn("text-lg font-black uppercase tracking-tight leading-none italic", isAt ? "text-foreground" : "text-muted-foreground opacity-60")}>
                                            {step.label}
                                        </h3>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="hidden lg:block w-full">
                    <div className="p-8 rounded-[2.8rem] bg-white/[0.03] border border-white/5 space-y-6">
                        <div className="flex items-center gap-4 text-primary">
                            <Scan className="w-5 h-5 text-primary" />
                            <span className="text-[11px] font-black uppercase tracking-widest leading-none">Matrix Intel</span>
                        </div>
                        <p className="text-[13px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] leading-relaxed italic">
                            Signal 100%. Node active. Neural weights synchronized at panay clinical cluster.
                        </p>
                    </div>
                </div>
            </aside>

            {/* Interaction Portal */}
            <main className="flex-1 relative flex flex-col items-center justify-center overflow-y-auto no-scrollbar py-20 px-6 min-h-[600px]">
                {/* Top Control Bar with Better Alignment */}
                <div className="absolute top-8 right-8 z-[100] flex items-center gap-4">
                    {(['under-eye', 'fingernails', 'cbc-decision', 'cbc-capture'].includes(currentStep)) && (
                        <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-background/50 border border-white/10 text-muted-foreground hover:bg-white/10 backdrop-blur-3xl transition-all shadow-xl" onClick={() => {
                            if (currentStep === 'under-eye') setCurrentStep('skin');
                            if (currentStep === 'fingernails') setCurrentStep('under-eye');
                            if (currentStep === 'cbc-decision') setCurrentStep('fingernails');
                            if (currentStep === 'cbc-capture') setCurrentStep('cbc-decision');
                        }}>
                            <ChevronLeft className="w-8 h-8" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full bg-background/50 border border-white/10 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 backdrop-blur-3xl transition-all shadow-xl group" onClick={onClose}>
                        <X className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
                    </Button>
                </div>

                <AnimatePresence mode="wait">
                    {currentStep === 'intro' && (
                        <motion.div key="intro" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }} className="text-center px-6 flex flex-col items-center space-y-20 max-w-4xl">
                            <div className="relative isolate group">
                                <div className="absolute inset-[-60px] md:inset-[-100px] bg-primary/20 rounded-full blur-[100px] md:blur-[160px] opacity-100 group-hover:scale-110 transition-transform duration-1000 animate-slow-pulse" />
                                <div className="w-64 h-64 md:w-80 md:h-80 rounded-[4rem] md:rounded-[5rem] bg-gradient-to-br from-primary/20 via-background/40 to-background flex items-center justify-center border border-white/10 shadow-[-20px_-20px_60px_rgba(255,255,255,0.02),20px_20px_60px_rgba(0,0,0,0.4)] relative z-10 overflow-hidden ring-1 ring-white/10">
                                    <Fingerprint className="w-32 h-32 md:w-40 md:h-40 text-primary group-hover:scale-110 transition-transform duration-1000" />
                                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:25px_25px]" />
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Lens: Offline</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-10">
                                <h1 className="text-[clamp(3.5rem,14vw,9.5rem)] font-bold text-foreground leading-[0.75] drop-shadow-2xl tracking-tighter">
                                    ANEMO <i className="text-primary italic font-normal animate-pulse">Check</i>
                                </h1>
                                <div className="flex flex-col items-center gap-6">
                                    <p className="text-[12px] md:text-sm font-black uppercase tracking-[0.8em] text-muted-foreground/60 leading-none">Anemia Screening</p>
                                    <div className="h-1 w-48 bg-white/5 rounded-full overflow-hidden relative">
                                        <motion.div initial={{ left: '-100%' }} animate={{ left: '100%' }} transition={{ repeat: Infinity, duration: 4, ease: 'linear' }} className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                                    </div>
                                </div>
                            </div>
                            <Button size="lg" className="h-24 px-24 rounded-full bg-primary text-white text-[20px] font-black tracking-[1.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_40px_100px_-20px_rgba(220,38,38,0.6)] group relative overflow-hidden" onClick={() => setCurrentStep('skin')}>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                START
                            </Button>
                        </motion.div>
                    )}

                    {['skin', 'under-eye', 'fingernails', 'cbc-capture'].includes(currentStep) && (
                        <StepCard
                            key={currentStep}
                            stepId={currentStep === 'cbc-capture' ? 'cbc-capture' : currentStep}
                            title={
                                currentStep === 'skin' ? "Dermal Scan" :
                                    currentStep === 'under-eye' ? "Ocular Bed" :
                                        currentStep === 'fingernails' ? "Ungual Matrix" : "Clinical Sync"
                            }
                            description={
                                currentStep === 'skin' ? "Spectral analysis of palmar creases and dermal indices for pallor." :
                                    currentStep === 'under-eye' ? "High-res mapping of the conjunctival capillary bed distribution." :
                                        currentStep === 'fingernails' ? "Assessment of ungual pallor and matrix capillary refill." : "Optical read of your latest clinical hematology laboratory records."
                            }
                            icon={
                                currentStep === 'skin' ? User :
                                    currentStep === 'under-eye' ? Eye :
                                        currentStep === 'fingernails' ? Hand : Database
                            }
                            onUpload={currentStep === 'cbc-capture' ? handleCbcSelect : (f: File) => handleImageSelect(f, currentStep as BodyPart)}
                            image={currentStep === 'cbc-capture' ? cbcImage : images[currentStep as BodyPart]}
                        />
                    )}

                    {currentStep === 'cbc-decision' && (
                        <motion.div key="cbc" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: 40 }} className="text-center p-8 max-w-2xl space-y-16 flex flex-col items-center relative z-20">
                            <div className="relative isolate group">
                                <div className="absolute inset-[-60px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse group-hover:scale-125 transition-transform duration-1000" />
                                <div className="w-64 h-64 rounded-[4rem] bg-blue-600/10 flex items-center justify-center border border-white/10 shadow-2xl relative z-10 overflow-hidden ring-1 ring-white/10">
                                    <Database className="w-28 h-28 text-blue-500 drop-shadow-xl group-hover:rotate-12 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none drop-shadow-2xl">Clinical <span className="text-blue-500 italic-font">Fibre</span></h3>
                                <p className="text-sm md:text-base font-medium tracking-wide text-muted-foreground/80 max-w-sm mx-auto leading-relaxed">Synchronize high-fidelity laboratory data for diagnostic certainty.</p>
                            </div>
                            <div className="flex flex-col gap-4 w-full px-12">
                                <Button className="h-16 rounded-full bg-blue-600 text-white shadow-lg hover:scale-[1.03] transition-all text-xs font-bold tracking-widest uppercase" onClick={() => setCurrentStep('cbc-capture')}>
                                    IMPORT LAB RECORDS
                                </Button>
                                <Button variant="ghost" className="h-14 text-muted-foreground uppercase text-[10px] font-bold tracking-widest hover:bg-white/5 rounded-full" onClick={() => performFinalAnalysis()}>
                                    BYPASS SYNC (LOW FIDELITY)
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 'analyzing' && (
                        <div className="text-center space-y-16">
                            <div className="relative isolate">
                                <div className="absolute inset-[-60px] bg-primary blur-[60px] opacity-30 animate-pulse" />
                                <HeartLoader size={120} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-6">
                                <h2 className="text-5xl md:text-6xl font-black uppercase tracking-[1.2em] animate-pulse text-foreground drop-shadow-2xl">Neural Sync</h2>
                                <p className="text-[13px] font-black uppercase tracking-[0.6em] text-primary/60 italic">Mapping Complex Diagnostic Weights...</p>
                            </div>
                        </div>
                    )}

                    {currentStep === 'results' && (
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full overflow-y-auto no-scrollbar py-16 px-4 sm:px-8 lg:px-12">
                            <div className="max-w-[1400px] mx-auto space-y-24">
                                {validationResult && (
                                    <div className="p-12 md:p-16 rounded-[3.5rem] bg-primary/[0.03] border border-white/5 relative overflow-hidden text-left isolate shadow-2xl">
                                        <div className="absolute top-0 right-0 p-16 opacity-[0.03] grayscale text-primary"><History className="w-80 h-80" /></div>
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-12 relative z-10 border-b border-white/10 pb-12">
                                            <div className="space-y-4">
                                                <Badge className="bg-primary/10 text-primary border-primary/20 uppercase tracking-widest h-8 px-4 font-bold shadow-md text-[10px]">Diagnostic Clearance</Badge>
                                                <h4 className="text-[clamp(3.5rem,8vw,7.5rem)] font-black tracking-tighter leading-[0.85]">Neural <span className="text-primary italic-font">Verdict</span></h4>
                                            </div>
                                            <div className="text-left md:text-right">
                                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block opacity-80">Reliability Index (Σ)</span>
                                                <span className="text-7xl lg:text-[8rem] leading-none font-black tracking-tighter text-foreground drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">{validationResult.reliabilityScore}<span className="text-primary text-[clamp(2.2rem,5vw,4rem)] ml-2">%</span></span>
                                            </div>
                                        </div>
                                        <div className="mt-12 text-[clamp(1.2rem,3vw,2.5rem)] font-medium italic-font text-foreground border-l-[8px] border-primary pl-10 py-6 leading-[1.4] text-balance opacity-90 block">
                                            "{validationResult.analysis}"
                                        </div>
                                    </div>
                                )}
                                <ImageAnalysisReport analyses={Object.fromEntries(Object.entries(analysisResults).map(([k, v]) => [k, { ...v, imageUrl: images[k as BodyPart], status: 'success' }])) as any} labReport={cbcResult} onReset={() => setCurrentStep('intro')} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div >
    );

    return (
        <div className={cn("w-full transition-all duration-1000", isPage ? "" : "fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8")}>
            {!isPage && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-background/95 backdrop-blur-[120px]" onClick={onClose} />}
            {MainLayout}
        </div>
    );
}
