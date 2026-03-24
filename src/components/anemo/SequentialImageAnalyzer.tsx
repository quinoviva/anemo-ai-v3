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
  FlaskConical,
  FileText,
  TrendingUp,
  Activity,
  Sparkles,
  ArrowUpRight,
  Info,
  Layers,
  Scan,
  Database,
  History,
  Workflow,
  Terminal
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
      
      addLog(`[INIT] Sequence: ${part.toUpperCase()}`);
      
      try {
        await new Promise(r => setTimeout(r, 1000));
        const result = await runGenerateImageDescription({ photoDataUri: dataUri, bodyPart: part });
        
        if (!result.isValid) {
            setAnalysisStage('failed');
            setQualityError(result.description);
            return;
        }

        setAnalysisStage('anemia-detection');
        addLog(`[SYNC] Spectral Mapping...`);
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
        setQualityError("Neural Sync Timeout.");
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
                     <Button variant="secondary" className="rounded-full h-12 px-8 text-[10px] font-black uppercase tracking-widest bg-background/80 backdrop-blur-xl border border-white/10" onClick={() => setShowGuide(false)}>
                        <X className="w-4 h-4 mr-3" /> Close Protocol
                     </Button>
                </div>
            </div>
        )
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-full w-full max-w-4xl mx-auto px-4 py-8 space-y-12 md:space-y-20 relative z-10">
          <div className="relative group w-full max-w-[min(100%,500px)] aspect-square self-center">
              <div className={cn("absolute inset-[-40px] md:inset-[-80px] blur-[80px] md:blur-[140px] opacity-20 rounded-full transition-all duration-1000", theme.glow)} />
              
              <div className="relative w-full h-full rounded-[2.5rem] md:rounded-[4rem] bg-background/40 glass-panel border border-white/5 overflow-hidden isolate flex items-center justify-center shadow-2xl">
                  <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px]" />
                  
                  <AnimatePresence mode="wait">
                      {image ? (
                           <motion.div key="image" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                               <img src={image} className={cn("w-full h-full object-cover grayscale transition-all duration-1000", (analysisStage !== 'idle' && analysisStage !== 'complete') && "blur-xl saturate-150")} />
                               {(analysisStage !== 'idle' && analysisStage !== 'failed' && analysisStage !== 'complete') && (
                                   <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/20 backdrop-blur-2xl">
                                       <HeartLoader size={80} strokeWidth={2} />
                                       <span className={cn("text-[10px] font-black tracking-[0.4em] uppercase", theme.text)}>Processing</span>
                                   </div>
                               )}
                               {analysisStage === 'failed' && (
                                   <div className="absolute inset-0 bg-red-600/95 backdrop-blur-2xl p-6 flex flex-col items-center justify-center text-center gap-8 z-50">
                                       <ShieldAlert className="w-16 h-16 text-white" />
                                       <p className="text-xs font-bold text-white uppercase tracking-widest">{qualityError}</p>
                                       <Button size="sm" className="rounded-full h-14 px-10 bg-white text-red-600 font-bold tracking-widest" onClick={() => { setImages(prev => ({ ...prev, [stepId]: null })); setAnalysisStage('idle'); }}>RETRY</Button>
                                   </div>
                               )}
                           </motion.div>
                      ) : (
                          <div className="flex flex-col items-center space-y-8">
                              <div className="p-10 md:p-14 rounded-full bg-white/[0.02] border border-white/10 shadow-2xl relative z-10">
                                <Icon className={cn("w-20 h-20 md:w-32 md:h-32 opacity-20", theme.text)} />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-[0.6em] text-muted-foreground/30 italic">Scanner Initialized</p>
                          </div>
                      )}
                  </AnimatePresence>

                  {analysisStage !== 'idle' && (
                      <div className="absolute bottom-6 inset-x-6 z-[60]">
                          <div className="p-4 rounded-2xl bg-black/80 backdrop-blur-3xl border border-white/10 shadow-2xl">
                             {diagnosticLogs.map((log, i) => (
                                 <p key={i} className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest leading-none flex items-center gap-3 mb-1 last:mb-0">
                                    <span className="opacity-40">»</span> {log}
                                 </p>
                             ))}
                          </div>
                      </div>
                  )}
                  
                  <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-6 left-6 w-8 h-8 border-l border-t border-white/20 rounded-tl-2xl" />
                      <div className="absolute bottom-6 right-6 w-8 h-8 border-r border-b border-white/20 rounded-br-2xl" />
                  </div>
              </div>
          </div>

          <div className="space-y-8 w-full text-center relative z-20">
              <div className="space-y-4">
                <h2 className="text-[clamp(1.8rem,8vw,4.5rem)] font-black tracking-tighter text-foreground leading-none uppercase italic drop-shadow-2xl">
                    {title.split(' ')[0]} <span className={cn("italic-font", theme.text)}>{title.split(' ')[1] || ''}</span>
                </h2>
                <p className="text-sm md:text-lg text-muted-foreground font-medium uppercase tracking-widest opacity-60 leading-relaxed max-w-xl mx-auto px-4">{description}</p>
              </div>

              {analysisStage === 'idle' && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 px-4">
                      <Button 
                        size="lg"
                        className="w-full sm:w-64 h-20 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 text-foreground transition-all flex items-center justify-start px-8 gap-6 group/btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                          <Upload className="w-5 h-5 opacity-60" />
                          <span className="text-[11px] font-black uppercase tracking-widest">Upload File</span>
                      </Button>
                      <Button 
                        size="lg"
                        className={cn("w-full sm:w-64 h-20 rounded-3xl text-white flex items-center justify-start px-8 gap-6 group/btn hover:scale-105 transition-all shadow-xl", 
                            theme.primary === 'amber' ? 'bg-amber-600 shadow-amber-500/20' : 
                            theme.primary === 'red' ? 'bg-red-600 shadow-red-500/20' :
                            theme.primary === 'blue' ? 'bg-blue-600 shadow-blue-500/20' : 'bg-primary shadow-primary/20'
                        )}
                        onClick={() => cameraInputRef.current?.click()}
                      >
                          <Camera className="w-5 h-5" />
                          <span className="text-[11px] font-black uppercase tracking-widest">Direct Camera</span>
                      </Button>
                  </div>
              )}

              <button className="flex items-center gap-3 mx-auto text-muted-foreground hover:text-foreground transition-all group px-4 py-2" onClick={() => setShowGuide(true)}>
                  <Info className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                  <span className="text-[10px] font-black tracking-widest uppercase">View Guide</span>
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
        isPage ? "min-h-screen" : "max-w-6xl w-full h-[90vh] md:h-[85vh] rounded-[2rem] md:rounded-[3.5rem] shadow-2xl border border-white/5"
    )}>
        <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:40px_40px] z-0" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay z-0" />
        
        <AnimatePresence mode="wait">
            <motion.div 
                key={currentStep}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ duration: 1 }}
                className={cn("absolute inset-[-20%] blur-[100px] md:blur-[180px] rounded-full pointer-events-none opacity-10", theme.glow)} 
            />
        </AnimatePresence>

        {/* Navigation Sidebar: Now adapts correctly between Mobile & Desktop */}
        <aside className="w-full md:w-20 lg:w-[320px] bg-background/50 backdrop-blur-3xl border-b md:border-b-0 md:border-r border-white/5 p-4 md:p-6 lg:p-10 z-30 flex md:flex-col items-center md:items-start justify-between relative isolate">
            <div className="w-full">
                <div className="hidden md:flex flex-col gap-4 mb-12 lg:mb-20">
                    <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 w-fit">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black tracking-widest text-white uppercase">System Online</span>
                    </div>
                    <h1 className="text-2xl lg:text-4xl font-black italic tracking-tighter uppercase leading-tight">Anemo.<span className="text-primary">V3</span></h1>
                </div>

                <div className="flex md:flex-col gap-4 md:gap-8 overflow-x-auto no-scrollbar md:overflow-visible w-full py-2">
                    {[
                        { id: 'skin', label: 'Dermal', icon: User },
                        { id: 'under-eye', label: 'Ocular', icon: Eye },
                        { id: 'fingernails', label: 'Ungual', icon: Hand },
                        { id: 'cbc-decision', label: 'Clinical', icon: Database }
                    ].map((step) => {
                        const isDone = images[step.id as BodyPart] !== null || (step.id === 'cbc-decision' && (cbcResult !== null || currentStep === 'results'));
                        const isAt = currentStep === step.id || (step.id === 'cbc-decision' && currentStep === 'cbc-capture');
                        const sTheme = getThemeColor(step.id as Step);
                        
                        return (
                            <div key={step.id} className={cn("flex items-center gap-4 shrink-0 transition-opacity", !isAt && !isDone && "opacity-30")}>
                                <div className={cn(
                                    "w-12 h-12 lg:w-16 lg:h-16 rounded-2xl md:rounded-[1.8rem] flex items-center justify-center border transition-all duration-500 relative isolate",
                                    isDone ? `bg-${step.id === 'skin' ? 'amber' : step.id === 'under-eye' ? 'red' : 'blue'}-600 border-transparent text-white shadow-lg` : 
                                    isAt ? `border-${step.id === 'skin' ? 'amber' : step.id === 'under-eye' ? 'red' : 'blue'}-500 bg-${step.id === 'skin' ? 'amber' : step.id === 'under-eye' ? 'red' : 'blue'}-500/10 ${sTheme.text} shadow-lg` : 
                                    "border-white/10 text-muted-foreground bg-white/[0.03]"
                                )}>
                                    {isDone ? <CheckCircle className="w-6 h-6" /> : <step.icon className="w-6 h-6 lg:w-8 lg:h-8" />}
                                    {isAt && (
                                        <div className={cn("absolute inset-[-4px] rounded-[1.2rem] md:rounded-[2.2rem] animate-pulse -z-10", sTheme.glow)} />
                                    )}
                                </div>
                                <div className="hidden lg:flex flex-col text-left">
                                    <h3 className={cn("text-sm font-black uppercase tracking-tight leading-none italic", isAt ? "text-foreground" : "text-muted-foreground")}>
                                        {step.label}
                                    </h3>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            
            <div className="hidden lg:block w-full">
                 <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4">
                    <div className="flex items-center gap-3 text-primary">
                        <Workflow className="w-4 h-4 fill-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Data Link</span>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest leading-relaxed italic">
                        Node active. Signal locked. EfficientNetB0 diagnostic core synchronized.
                    </p>
                 </div>
            </div>
        </aside>

        {/* Interaction Portal */}
        <main className="flex-1 relative flex flex-col items-center justify-center overflow-y-auto no-scrollbar py-12 px-4 min-h-[500px]">
            {/* Top Control Bar */}
            <div className="absolute top-6 right-6 z-[100] flex items-center gap-4">
                {(['under-eye', 'fingernails', 'cbc-decision', 'cbc-capture'].includes(currentStep)) && (
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-background/50 border border-white/5 text-muted-foreground hover:bg-white/5 backdrop-blur-xl" onClick={() => {
                         if (currentStep === 'under-eye') setCurrentStep('skin');
                         if (currentStep === 'fingernails') setCurrentStep('under-eye');
                         if (currentStep === 'cbc-decision') setCurrentStep('fingernails');
                         if (currentStep === 'cbc-capture') setCurrentStep('cbc-decision');
                    }}>
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-background/50 border border-white/5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 backdrop-blur-xl" onClick={onClose}>
                    <X className="w-6 h-6" />
                </Button>
            </div>

            <AnimatePresence mode="wait">
                {currentStep === 'intro' && (
                    <motion.div key="intro" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1 }} className="text-center px-4 flex flex-col items-center space-y-12 max-w-2xl">
                         <div className="relative isolate group">
                            <div className="absolute inset-[-40px] md:inset-[-60px] bg-primary/20 rounded-full blur-[60px] md:blur-[100px] opacity-100 group-hover:scale-110 transition-transform duration-1000 animate-pulse" />
                            <div className="w-48 h-48 md:w-64 md:h-64 rounded-[2.5rem] md:rounded-[4rem] bg-gradient-to-br from-primary/20 via-background/40 to-background flex items-center justify-center border border-white/10 shadow-2xl relative z-10 overflow-hidden">
                                <Fingerprint className="w-24 h-24 md:w-32 md:h-32 text-primary group-hover:scale-110 transition-transform duration-1000" />
                                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
                            </div>
                         </div>
                         <div className="space-y-6">
                            <h1 className="text-[clamp(2.5rem,10vw,6rem)] font-black text-foreground italic leading-[0.85] tracking-tighter uppercase drop-shadow-xl">NEURAL.<span className="text-primary italic-font">SCAN</span></h1>
                            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.6em] text-muted-foreground/60 leading-none">V3.0 // Clinical Multimodal Terminal</p>
                         </div>
                         <Button className="h-16 px-16 rounded-full bg-primary text-white text-xs font-black tracking-[0.8em] hover:scale-105 transition-all shadow-xl group relative overflow-hidden" onClick={() => setCurrentStep('skin')}>
                            START ANALYSIS
                         </Button>
                    </motion.div>
                )}
                
                {['skin', 'under-eye', 'fingernails', 'cbc-capture'].includes(currentStep) && (
                    <StepCard 
                        key={currentStep}
                        stepId={currentStep === 'cbc-capture' ? 'cbc-capture' : currentStep}
                        title={
                            currentStep === 'skin' ? "Dermal Scan" : 
                            currentStep === 'under-eye' ? "Ocular Hub" : 
                            currentStep === 'fingernails' ? "Ungual Check" : "Clinical Sync"
                        } 
                        description={
                            currentStep === 'skin' ? "Spectral analysis of palmar creases and dermal indices." : 
                            currentStep === 'under-eye' ? "Vascular mapping of the conjunctival capillary bed." : 
                            currentStep === 'fingernails' ? "Assessment of ungual pallor and matrix distribution." : "Optical read of clinical hematology records."
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
                    <motion.div key="cbc" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: 30 }} className="text-center p-6 max-w-xl space-y-12 flex flex-col items-center relative z-20">
                        <div className="relative isolate group">
                            <div className="absolute inset-[-40px] bg-blue-600/20 rounded-full blur-[80px] animate-pulse" />
                            <div className="w-48 h-48 rounded-[3rem] bg-blue-600/10 flex items-center justify-center border border-white/10 shadow-2xl relative z-10 overflow-hidden">
                                <Database className="w-20 h-20 text-blue-500 drop-shadow-xl" />
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">Clinical <span className="text-blue-500">Sync</span></h3>
                            <p className="text-sm md:text-base font-medium uppercase tracking-widest text-muted-foreground/60 max-w-xs mx-auto leading-relaxed italic">Synchronize laboratory records for absolute diagnostic confidence.</p>
                        </div>
                        <div className="flex flex-col gap-4 w-full px-6">
                            <Button className="h-16 rounded-3xl bg-blue-600 text-white shadow-xl hover:scale-105 transition-all text-[10px] font-black tracking-[0.4em] uppercase" onClick={() => setCurrentStep('cbc-capture')}>
                                IMPORT LAB RECORDS
                            </Button>
                            <Button variant="ghost" className="h-12 text-muted-foreground uppercase text-[9px] tracking-[0.4em] font-black hover:bg-white/5" onClick={() => performFinalAnalysis()}>
                                BYPASS SYNC
                            </Button>
                        </div>
                    </motion.div>
                )}

                {currentStep === 'analyzing' && (
                    <div className="text-center space-y-12">
                         <div className="relative isolate">
                             <div className="absolute inset-[-40px] bg-primary blur-[40px] opacity-20 animate-pulse" />
                             <HeartLoader size={100} strokeWidth={2} />
                         </div>
                         <div className="space-y-4">
                            <h2 className="text-4xl font-black uppercase tracking-[0.8em] animate-pulse">Neural Fusion</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 italic">Processing Multimodal Diagnostic Weights...</p>
                         </div>
                    </div>
                )}

                {currentStep === 'results' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full overflow-y-auto no-scrollbar py-12 px-2 sm:px-4 lg:px-8">
                        <div className="max-w-7xl mx-auto space-y-20">
                             {validationResult && (
                                 <div className="p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] bg-primary/[0.03] border border-white/5 relative overflow-hidden text-left isolate shadow-2xl">
                                     <div className="absolute top-0 right-0 p-12 opacity-[0.03] grayscale text-primary"><History className="w-64 h-64" /></div>
                                     <div className="flex flex-col sm:flex-row justify-between items-start gap-8 relative z-10 border-b border-white/10 pb-10">
                                         <div>
                                            <Badge className="bg-primary/20 text-primary border-primary/30 uppercase tracking-widest mb-6 h-8 px-4 font-black">Final Verdict</Badge>
                                            <h4 className="text-[clamp(2.5rem,8vw,6rem)] font-black uppercase italic tracking-tighter leading-[0.8]">Neural <br/><span className="italic-font">Lock</span></h4>
                                         </div>
                                         <div className="text-left sm:text-right">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 block italic opacity-60">Confidence Score</span>
                                            <span className="text-7xl lg:text-9xl leading-none font-black tracking-tighter text-foreground">{validationResult.reliabilityScore}<span className="text-primary text-3xl md:text-5xl ml-1">%</span></span>
                                         </div>
                                     </div>
                                     <div className="mt-10 text-[clamp(1.2rem,3vw,2.4rem)] font-light italic text-muted-foreground border-l-4 md:border-l-[8px] border-primary pl-8 md:pl-12 py-4 leading-relaxed text-balance">
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
    </div>
  );

  return (
    <div className={cn("w-full transition-all duration-1000", isPage ? "" : "fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6")}>
        {!isPage && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-background/95 backdrop-blur-2xl" onClick={onClose} />}
        {MainLayout}
    </div>
  );
}
