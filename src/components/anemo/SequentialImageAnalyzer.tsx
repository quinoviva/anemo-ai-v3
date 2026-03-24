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
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUri = e.target?.result as string;
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
            } catch (error) {
                setAnalysisStage('failed');
                setQualityError("Neural Sync Timeout. Check connection.");
            }
        };
        reader.readAsDataURL(file);
    };

    const handleCbcSelect = async (file: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUri = e.target?.result as string;
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
        reader.readAsDataURL(file);
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
        const cameraInputRef = useRef<HTMLInputElement>(null);

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
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/40 backdrop-blur-2xl">
                                            <HeartLoader size={80} strokeWidth={2.5} />
                                            <span className={cn("text-[11px] font-bold tracking-[0.4em] uppercase text-foreground leading-none")}>Analyzing Samples</span>
                                        </div>
                                    )}
                                    {analysisStage === 'failed' && (
                                        <div className="absolute inset-0 bg-red-600/95 backdrop-blur-2xl p-6 flex flex-col items-center justify-center text-center gap-8 z-50">
                                            <ShieldAlert className="w-16 h-16 text-white" />
                                            <p className="text-sm font-bold text-white uppercase tracking-widest px-4">{qualityError}</p>
                                            <Button size="sm" className="rounded-full h-14 px-10 bg-white text-red-600 font-black tracking-widest" onClick={() => { setImages(prev => ({ ...prev, [stepId]: null })); setAnalysisStage('idle'); }}>RETRY FEED</Button>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="flex flex-col items-center space-y-8">
                                    <div className="p-10 md:p-14 rounded-full bg-white/[0.03] border border-white/10 shadow-2xl relative z-10 transition-transform group-hover:scale-110 duration-700">
                                        <Icon className={cn("w-20 h-20 md:w-32 md:h-32 opacity-30", theme.text)} />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-muted-foreground/40 italic">Waiting for Signal...</p>
                                </div>
                            )}
                        </AnimatePresence>

                        {analysisStage !== 'idle' && (
                            <div className="absolute bottom-6 inset-x-6 z-[60]">
                                <div className="p-4 rounded-2xl bg-black/80 backdrop-blur-3xl border border-white/10 shadow-2xl space-y-2">
                                    {diagnosticLogs.map((log, i) => (
                                        <p key={i} className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest leading-none flex items-center gap-3">
                                            <span className="opacity-40 animate-pulse">»</span>
                                            <span>{log}</span>
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

                <div className="space-y-8 w-full text-center relative z-20">
                    <div className="space-y-4">
                        <h2 className="text-[clamp(2.5rem,10vw,5.5rem)] font-black tracking-tighter text-foreground leading-[0.9] uppercase italic drop-shadow-xl">
                            {title.split(' ')[0]} <span className={cn("italic-font", theme.text)}>{title.split(' ')[1] || ''}</span>
                        </h2>
                        <div className="flex items-center justify-center gap-6">
                            <div className="h-px w-12 bg-white/10" />
                            <p className="text-sm md:text-lg text-muted-foreground font-black uppercase tracking-widest leading-relaxed max-w-xl px-4">{description}</p>
                            <div className="h-px w-12 bg-white/10" />
                        </div>
                    </div>

                    {analysisStage === 'idle' && (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 px-6">
                            <Button
                                size="lg"
                                className="w-full sm:w-72 h-20 rounded-[1.8rem] bg-white/[0.05] border border-white/10 hover:bg-white/10 text-foreground transition-all flex items-center justify-start px-10 gap-8 group/btn relative overflow-hidden"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="p-3 bg-white/10 rounded-xl group-hover/btn:bg-white group-hover/btn:text-black transition-all"><Upload className="w-6 h-6" /></div>
                                <span className="text-[12px] font-black uppercase tracking-widest text-left">Upload Specimen</span>
                            </Button>
                            <Button
                                size="lg"
                                className={cn("w-full sm:w-72 h-20 rounded-[1.8rem] text-white flex items-center justify-start px-10 gap-8 group/btn hover:scale-105 transition-all shadow-xl relative overflow-hidden",
                                    theme.primary === 'amber' ? 'bg-amber-600 shadow-amber-600/30' :
                                        theme.primary === 'red' ? 'bg-red-600 shadow-red-600/30' :
                                            theme.primary === 'blue' ? 'bg-blue-600 shadow-blue-600/30' : 'bg-primary shadow-primary/30'
                                )}
                                onClick={() => cameraInputRef.current?.click()}
                            >
                                <div className="p-3 bg-white/20 rounded-xl"><Camera className="w-6 h-6" /></div>
                                <span className="text-[12px] font-black uppercase tracking-widest text-left">Activate Camera</span>
                            </Button>
                        </div>
                    )}

                    <button className="flex items-center gap-3 mx-auto text-muted-foreground hover:text-foreground transition-all group px-6 py-3 rounded-full hover:bg-white/5" onClick={() => setShowGuide(true)}>
                        <Search className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                        <span className="text-[11px] font-black tracking-widest uppercase italic">Clinical Protocol</span>
                    </button>

                    <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                    <Input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                </div>
            </div>
        );
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
                                <h1 className="text-[clamp(3.5rem,14vw,9.5rem)] font-black text-foreground leading-[0.75] uppercase drop-shadow-2xl">ANEMO</h1>
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
                        <motion.div key="cbc" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: 40 }} className="text-center p-8 max-w-2xl space-y-20 flex flex-col items-center relative z-20">
                            <div className="relative isolate group">
                                <div className="absolute inset-[-60px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse group-hover:scale-125 transition-transform duration-1000" />
                                <div className="w-64 h-64 rounded-[4rem] bg-blue-600/10 flex items-center justify-center border border-white/10 shadow-2xl relative z-10 overflow-hidden ring-1 ring-white/10">
                                    <Database className="w-28 h-28 text-blue-500 drop-shadow-xl group-hover:rotate-12 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                                </div>
                            </div>
                            <div className="space-y-8">
                                <h3 className="text-6xl font-black uppercase italic tracking-tighter leading-none drop-shadow-2xl">Clinical <span className="text-blue-500 italic-font">Fibre</span></h3>
                                <p className="text-lg md:text-xl font-black uppercase tracking-[0.4em] text-muted-foreground/60 max-w-sm mx-auto leading-relaxed italic">Synchronize high-fidelity laboratory data for diagnostic certainty.</p>
                            </div>
                            <div className="flex flex-col gap-6 w-full px-12">
                                <Button className="h-20 rounded-[2.2rem] bg-blue-600 text-white shadow-[0_30px_80px_-15px_rgba(37,99,235,0.6)] hover:scale-[1.03] transition-all text-[12px] font-black tracking-[0.6em] uppercase" onClick={() => setCurrentStep('cbc-capture')}>
                                    IMPORT LAB RECORDS
                                </Button>
                                <Button variant="ghost" className="h-16 text-muted-foreground uppercase text-[11px] font-black tracking-[0.5em] hover:bg-white/5 rounded-full" onClick={() => performFinalAnalysis()}>
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
                                    <div className="p-12 md:p-20 rounded-[4rem] bg-primary/[0.03] border border-white/5 relative overflow-hidden text-left isolate shadow-2xl">
                                        <div className="absolute top-0 right-0 p-16 opacity-[0.03] grayscale text-primary"><History className="w-80 h-80" /></div>
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-12 relative z-10 border-b border-white/10 pb-12">
                                            <div className="space-y-6">
                                                <Badge className="bg-primary/20 text-primary border-primary/30 uppercase tracking-[0.6em] h-10 px-6 font-black shadow-xl">Diagnostic Clearance</Badge>
                                                <h4 className="text-[clamp(3.5rem,10vw,8.5rem)] font-black uppercase italic tracking-tighter leading-[0.75]">Neural <br /><span className="text-primary italic-font">Verdict</span></h4>
                                            </div>
                                            <div className="text-left md:text-right">
                                                <span className="text-[12px] font-black text-muted-foreground uppercase tracking-[0.6em] mb-6 block italic opacity-60">Reliability Index (Σ)</span>
                                                <span className="text-8xl lg:text-[10rem] leading-none font-black tracking-tighter text-foreground drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">{validationResult.reliabilityScore}<span className="text-primary text-[clamp(2.5rem,6vw,5rem)] ml-2">%</span></span>
                                            </div>
                                        </div>
                                        <div className="mt-14 text-[clamp(1.5rem,4vw,3.8rem)] font-light italic text-muted-foreground border-l-[12px] border-primary pl-16 py-8 leading-[1.3] text-balance drop-shadow-md">
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
