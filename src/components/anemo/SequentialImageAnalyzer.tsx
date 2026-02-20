'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Scan, 
  Activity, 
  FileText,
  FlaskConical,
  Eye,
  Hand,
  User,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  Layers,
  ShieldCheck,
  Zap,
  MousePointer2,
  TrendingUp
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

// Types
type BodyPart = 'skin' | 'under-eye' | 'fingernails';
type Step = 'intro' | 'skin' | 'under-eye' | 'fingernails' | 'cbc-decision' | 'cbc-capture' | 'analyzing' | 'results';

interface SequentialImageAnalyzerProps {
  onClose: () => void;
  isOpen: boolean;
}

// Animation Variants (Matching Dashboard)
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50, damping: 20 } },
};

export function SequentialImageAnalyzer({ onClose, isOpen }: SequentialImageAnalyzerProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  
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
  
  const [cbcImage, setCbcImage] = useState<string | null>(null);
  const [cbcResult, setCbcResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setCurrentStep('intro');
        setShowGuide(false);
        setImages({ skin: null, 'under-eye': null, fingernails: null });
        setAnalysisResults({ skin: null, 'under-eye': null, fingernails: null });
        setCbcImage(null);
        setCbcResult(null);
        setValidationResult(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleImageSelect = async (file: File, part: BodyPart) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUri = e.target?.result as string;
      setImages(prev => ({ ...prev, [part]: dataUri }));
      setIsAnalyzing(true);
      
      try {
        const result = await runGenerateImageDescription({ photoDataUri: dataUri, bodyPart: part });
        if (result.isValid) {
          setAnalysisResults(prev => ({ ...prev, [part]: result }));
          saveImageForTraining(dataUri, part, result.analysisResult, user?.displayName || 'Anonymous');
          setTimeout(() => {
            setIsAnalyzing(false);
            if (part === 'skin') setCurrentStep('under-eye');
            else if (part === 'under-eye') setCurrentStep('fingernails');
            else if (part === 'fingernails') setCurrentStep('cbc-decision');
            setShowGuide(false);
          }, 1500); // Longer delay to enjoy the heart animation
        } else {
          setIsAnalyzing(false);
          toast({ title: "Quality Check Failed", description: result.description, variant: "destructive" });
          setImages(prev => ({ ...prev, [part]: null })); 
        }
      } catch (error) {
        setIsAnalyzing(false);
        setImages(prev => ({ ...prev, [part]: null }));
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
        if (cbcData) {
            const validation = await validateMultimodalResults({
                medicalInfo: {}, 
                imageAnalysisReport: {
                    conjunctiva: analysisResults['under-eye']?.analysisResult || '',
                    skin: analysisResults['skin']?.analysisResult || '',
                    fingernails: analysisResults['fingernails']?.analysisResult || '',
                },
                cbcAnalysis: {
                    hemoglobin: cbcData.parameters.find((p: any) => p.parameter.toLowerCase().includes('hemoglobin'))?.value || 'N/A',
                    rbc: cbcData.parameters.find((p: any) => p.parameter.toLowerCase().includes('rbc'))?.value || 'N/A',
                }
            });
            setValidationResult(validation);
        }
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl">
                <AnalysisGuide bodyPart={stepId} onComplete={() => setShowGuide(false)} />
            </motion.div>
        )
    }

    return (
      <div className="flex flex-col items-center text-center space-y-12 max-w-2xl mx-auto">
          <div className="relative group cursor-pointer" onClick={() => setShowGuide(true)}>
              {/* Premium Glow matching Dashboard */}
              <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full group-hover:bg-primary/40 transition-colors duration-700" />
              
              <div className="relative w-48 h-48 rounded-[3rem] bg-background/40 backdrop-blur-2xl border border-primary/20 flex items-center justify-center shadow-2xl transition-all duration-700 group-hover:scale-105 group-hover:rotate-3">
                  <Icon className="w-20 h-20 text-primary" />
              </div>
              
              <AnimatePresence>
                {image && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 rounded-[3rem] overflow-hidden border-4 border-primary bg-background z-10 shadow-[0_0_50px_rgba(var(--primary),0.5)]"
                    >
                        <img src={image} alt="Preview" className="w-full h-full object-cover opacity-70" />
                        {isAnalyzing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-md">
                                <HeartLoader size={64} strokeWidth={3} />
                            </div>
                        )}
                    </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute -top-4 -right-4 w-14 h-14 rounded-2xl glass-panel flex items-center justify-center border-primary/20 animate-pulse">
                <Scan className="w-6 h-6 text-primary" />
              </div>
          </div>
          
          <div className="space-y-6">
              <h2 className="text-6xl md:text-7xl font-light tracking-tighter text-foreground leading-[0.9]">
                {title.split(' ')[0]} <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400">{title.split(' ')[1] || ''}</span>
              </h2>
              <p className="text-xl text-muted-foreground font-light max-w-md mx-auto uppercase tracking-widest">{description}</p>
              
              <Button 
                variant="ghost" 
                className="text-primary font-bold tracking-[0.3em] uppercase text-xs hover:bg-primary/10 rounded-full px-8 py-6 h-auto" 
                onClick={() => setShowGuide(true)}
              >
                  <MousePointer2 className="w-4 h-4 mr-3" />
                  View Guide
              </Button>
          </div>

          <div className="grid grid-cols-2 gap-8 w-full">
              <button 
                className="glass-panel glass-panel-hover h-44 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 group transition-all duration-500"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
              >
                  <div className="p-5 rounded-3xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground group-hover:text-primary">Library</span>
              </button>

              <button 
                className="glass-panel glass-panel-hover h-44 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 group transition-all duration-500"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isAnalyzing}
              >
                  <div className="p-5 rounded-3xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground group-hover:text-primary">Camera</span>
              </button>

              <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
              <Input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
          </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                {/* Backdrop Blur matching Dashboard */}
                <motion.div 
                    initial={{ backdropFilter: "blur(0px)" }} 
                    animate={{ backdropFilter: "blur(20px)" }} 
                    className="absolute inset-0 bg-background/80" 
                    onClick={onClose} 
                />

                <motion.div 
                    ref={containerRef}
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-7xl h-[95vh] md:h-[90vh] glass-panel rounded-3xl md:rounded-[3rem] overflow-hidden flex flex-col md:flex-row border-primary/20 shadow-[0_0_100px_rgba(0,0,0,0.5)]"
                    onClick={(e) => e.stopPropagation()} 
                >
                    {/* Noise Texture Overlay */}
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
                    
                    {/* Floating Orbs matching Dashboard */}
                    <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
                    <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

                    {/* Left Sidebar: Diagnostic Path - Stacks on Mobile */}
                    <div className="w-full md:w-[320px] bg-background/20 backdrop-blur-3xl p-6 md:p-12 border-b md:border-b-0 md:border-r border-primary/10 flex flex-col justify-between relative z-10 shrink-0">
                        <div>
                            <div className="flex items-center justify-between md:justify-start gap-4 mb-8 md:mb-16">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                                        <ShieldCheck className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">Anemo</span>
                                        <span className="text-xl font-black text-foreground tracking-tighter">DIAGNOSTIC</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex md:flex-col gap-4 md:gap-10 relative overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 no-scrollbar">
                                <div className="hidden md:block absolute left-[23px] top-6 bottom-6 w-px bg-gradient-to-b from-primary/50 via-primary/5 to-transparent" />
                                
                                {[
                                    { id: 'skin', label: 'Dermal Pallor', icon: User },
                                    { id: 'under-eye', label: 'Conjunctival', icon: Eye },
                                    { id: 'fingernails', label: 'Nail Matrix', icon: Hand },
                                    { id: 'cbc-decision', label: 'Clinical Sync', icon: FlaskConical }
                                ].map((step, idx) => {
                                    const isCompleted = images[step.id as BodyPart] !== null || (step.id === 'cbc-decision' && cbcResult !== null);
                                    const isActive = currentStep === step.id || (step.id === 'cbc-decision' && currentStep === 'cbc-capture');
                                    
                                    return (
                                        <div key={step.id} className={cn("flex items-center gap-4 md:gap-6 transition-all duration-700 shrink-0", isActive ? "opacity-100 translate-x-0 md:translate-x-2" : isCompleted ? "opacity-100" : "opacity-20")}>
                                            <div className={cn(
                                                "w-10 h-10 md:w-12 md:h-12 rounded-[1.2rem] flex items-center justify-center border-2 transition-all duration-700 z-10 shrink-0", 
                                                isCompleted ? "bg-primary border-primary text-white" : isActive ? "border-primary bg-primary/10 text-primary" : "border-muted/30 text-muted-foreground bg-background/40"
                                            )}>
                                                {isCompleted ? <CheckCircle className="w-5 h-5 md:w-6 md:h-6" /> : <step.icon className="w-5 h-5 md:w-6 md:h-6" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary/60 mb-0.5 md:mb-1">Vector 0{idx + 1}</span>
                                                <span className={cn("text-[10px] md:text-xs font-black uppercase tracking-widest leading-none whitespace-nowrap", isActive ? "text-primary" : "text-foreground")}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        
                        <div className="hidden md:block mt-auto">
                             <div className="p-6 rounded-3xl glass-panel border-primary/10">
                                <div className="flex items-center gap-3 mb-3">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Protocol</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed font-bold uppercase tracking-tight">
                                    Ensure direct photon exposure. Avoid chromatic interference for neural fidelity.
                                </p>
                             </div>
                        </div>
                    </div>

                    {/* Main Content Area - Fluid Padding */}
                    <div className="flex-1 p-6 sm:p-12 md:p-24 relative flex items-center justify-center overflow-y-auto custom-scrollbar">
                        <Button variant="ghost" size="icon" className="absolute top-4 right-4 md:top-12 md:right-12 text-muted-foreground hover:text-foreground hover:bg-background/40 rounded-2xl h-12 w-12 md:h-14 md:w-14 transition-all z-20" onClick={onClose}>
                            <X className="w-6 h-6 md:w-8 md:h-8" />
                        </Button>

                        {['under-eye', 'fingernails', 'cbc-decision', 'cbc-capture'].includes(currentStep) && (
                            <Button 
                                variant="ghost" 
                                className="absolute top-4 left-4 md:top-12 md:left-12 text-muted-foreground hover:text-foreground flex items-center gap-2 md:gap-3 text-[10px] md:text-xs font-black tracking-[0.4em] uppercase z-20 h-12 px-4"
                                onClick={() => {
                                    if (currentStep === 'under-eye') setCurrentStep('skin');
                                    if (currentStep === 'fingernails') setCurrentStep('under-eye');
                                    if (currentStep === 'cbc-decision') setCurrentStep('fingernails');
                                    if (currentStep === 'cbc-capture') setCurrentStep('cbc-decision');
                                }}
                            >
                                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                                Back
                            </Button>
                        )}

                        <AnimatePresence mode="wait">
                            {currentStep === 'intro' && (
                                <motion.div key="intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="text-center space-y-16 max-w-2xl">
                                    <div className="relative inline-flex items-center justify-center">
                                        <div className="absolute inset-[-40px] rounded-full border border-primary/20 animate-[ping_4s_linear_infinite]" />
                                        <div className="w-48 h-48 rounded-[3.5rem] glass-panel flex items-center justify-center border-primary/20 shadow-[0_0_80px_rgba(var(--primary),0.2)]">
                                            <Activity className="w-24 h-24 text-primary" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-8">
                                        <h1 className="text-7xl md:text-9xl font-light tracking-tighter text-foreground leading-[0.85]">
                                            Full <br/> <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-rose-400">Scan</span>
                                        </h1>
                                        <p className="text-muted-foreground leading-relaxed text-2xl font-light uppercase tracking-tight max-w-md mx-auto">
                                            Initiating high-fidelity neural diagnostic sequence.
                                        </p>
                                    </div>
                                    
                                    <Button 
                                        className="h-20 px-16 rounded-full text-sm font-black tracking-[0.5em] bg-primary text-white hover:bg-red-600 transition-all hover:scale-110 shadow-[0_25px_60px_-10px_rgba(var(--primary),0.5)] group" 
                                        onClick={() => setCurrentStep('skin')}
                                    >
                                        BEGIN SEQUENCE
                                        <ArrowRight className="ml-6 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                                    </Button>
                                </motion.div>
                            )}

                            {currentStep === 'skin' && (
                                <StepCard key="skin" stepId="skin" title="Dermal Pallor" description="Align palmar surface for pigmentation analysis." icon={User} onUpload={(f: File) => handleImageSelect(f, 'skin')} image={images.skin} />
                            )}

                            {currentStep === 'under-eye' && (
                                <StepCard key="under-eye" stepId="under-eye" title="Conjunctival Tissue" description="Expose lower eyelid bed for hemoglobin markers." icon={Eye} onUpload={(f: File) => handleImageSelect(f, 'under-eye')} image={images['under-eye']} />
                            )}

                            {currentStep === 'fingernails' && (
                                <StepCard key="fingernails" stepId="fingernails" title="Nail Matrix" description="Focus on bare nail beds for capillary refill." icon={Hand} onUpload={(f: File) => handleImageSelect(f, 'fingernails')} image={images.fingernails} />
                            )}

                            {currentStep === 'cbc-decision' && (
                                <motion.div key="cbc-decision" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-16 max-xl">
                                    <div className="w-40 h-40 mx-auto rounded-[3rem] glass-panel flex items-center justify-center border-primary/20 shadow-2xl">
                                        <FlaskConical className="w-20 h-20 text-primary" />
                                    </div>
                                    <div className="space-y-8">
                                        <h3 className="text-6xl font-light tracking-tighter text-foreground leading-none">Clinical <span className="font-black text-primary italic">Sync</span></h3>
                                        <p className="text-xl text-muted-foreground font-light uppercase tracking-tight">Integrate CBC laboratory data for clinical-grade assessment.</p>
                                    </div>
                                    <div className="flex flex-col gap-6">
                                        <Button className="h-20 bg-primary text-white rounded-3xl text-xs font-black tracking-[0.4em] uppercase hover:bg-red-600 transition-all shadow-2xl" onClick={() => setCurrentStep('cbc-capture')}>
                                            <Upload className="w-6 h-6 mr-4" />
                                            Sync Lab Report
                                        </Button>
                                        <Button variant="ghost" className="h-16 text-muted-foreground hover:text-foreground text-xs font-black tracking-[0.4em] uppercase" onClick={() => performFinalAnalysis()}>
                                            Continue Without Report
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 'cbc-capture' && (
                                <StepCard key="cbc-capture" title="Clinical Sync" description="Scan your CBC report. Focus on Hemoglobin & RBC values." icon={FileText} onUpload={handleCbcSelect} image={cbcImage} />
                            )}

                            {currentStep === 'analyzing' && (
                                <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-16">
                                    <div className="relative w-72 h-72 mx-auto flex items-center justify-center">
                                        <div className="absolute inset-0 border-[6px] border-primary/10 rounded-full" />
                                        <motion.div className="absolute inset-0 border-t-[6px] border-primary rounded-full" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} />
                                        <HeartLoader size={120} strokeWidth={2} />
                                    </div>
                                    <div className="space-y-6">
                                        <h3 className="text-5xl font-black text-foreground uppercase tracking-[0.3em]">Processing</h3>
                                        <p className="text-muted-foreground text-sm font-black uppercase tracking-[0.5em] animate-pulse">Synchronizing Neural Biomarkers...</p>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 'results' && (
                                <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full h-full flex flex-col">
                                   <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-12">
                                        {validationResult && (
                                            <div className="p-12 rounded-[3.5rem] glass-panel border-primary/20 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48" />
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 relative z-10">
                                                    <div className="flex items-center gap-8">
                                                        <div className="p-5 bg-primary/10 rounded-3xl border border-primary/20">
                                                            <Activity className="w-12 h-12 text-primary" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black text-primary uppercase tracking-[0.5em]">System Sync</span>
                                                            <h4 className="font-black text-foreground text-5xl tracking-tighter uppercase">Correlation</h4>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] block mb-2">Reliability Index</span>
                                                        <span className={cn("text-8xl font-black tracking-tighter", validationResult.reliabilityScore > 80 ? "text-emerald-500" : "text-amber-500")}>
                                                            {validationResult.reliabilityScore}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mt-10 p-10 rounded-[2.5rem] bg-background/40 border border-primary/10 italic text-xl text-muted-foreground">
                                                    "{validationResult.analysis}"
                                                </div>
                                            </div>
                                        )}

                                        <ImageAnalysisReport 
                                                analyses={{
                                                    skin: { ...analysisResults.skin, imageUrl: images.skin, status: 'success' } as any,
                                                    'under-eye': { ...analysisResults['under-eye'], imageUrl: images['under-eye'], status: 'success' } as any,
                                                    fingernails: { ...analysisResults.fingernails, imageUrl: images.fingernails, status: 'success' } as any,
                                                }}
                                                labReport={cbcResult}
                                                onReset={() => { 
                                                    setCurrentStep('intro'); 
                                                    setImages({ skin: null, 'under-eye': null, fingernails: null }); 
                                                    setAnalysisResults({ skin: null, 'under-eye': null, fingernails: null });
                                                    setCbcResult(null);
                                                    setCbcImage(null);
                                                    setValidationResult(null);
                                                }}
                                        />
                                   </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
  );
}
