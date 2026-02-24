'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Leaf, 
  Utensils, 
  Zap, 
  Coffee, 
  Sun, 
  Moon, 
  Check, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import './remedies.css';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const FoodCard = ({ icon: Icon, title, ironContent, tips, color }: any) => (
  <motion.div 
    variants={itemVariants}
    className={`food-card-gradient p-6 rounded-3xl relative overflow-hidden group hover-lift cursor-pointer border-l-4 ${color}`}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-full bg-background/50 backdrop-blur-md`}>
        <Icon className="h-6 w-6" />
      </div>
      <Badge variant="secondary" className="font-mono text-xs">
        {ironContent}
      </Badge>
    </div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">
      {tips}
    </p>
    <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
       <Icon className="h-32 w-32" />
    </div>
  </motion.div>
);

const StepCard = ({ number, title, desc }: any) => (
  <motion.div 
    variants={itemVariants}
    className="flex gap-4 items-start p-4 rounded-2xl hover:bg-muted/50 transition-colors"
  >
    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg animate-bounce-subtle">
      {number}
    </div>
    <div>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-muted-foreground text-sm mt-1">{desc}</p>
    </div>
  </motion.div>
);

export default function RemediesPage() {
  const [activeTab, setActiveTab] = useState('foods');
  const [checklist, setChecklist] = useState<string[]>([]);

  const toggleCheck = (item: string) => {
    if (checklist.includes(item)) {
      setChecklist(checklist.filter(i => i !== item));
    } else {
      setChecklist([...checklist, item]);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="rounded-full">
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Backboard
          </Link>
        </Button>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="space-y-12"
      >
        {/* Hero Section */}
        <div className="remedy-hero-bg rounded-[3rem] p-8 md:p-16 text-center space-y-6 relative overflow-hidden">
           <motion.div variants={itemVariants} className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest mb-4">
                <Leaf className="h-4 w-4" />
                Natural Healing
              </div>
              <h1 className="text-4xl md:text-7xl font-bold tracking-tighter mb-4">
                Combat Anemia Naturally
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your guide to iron-rich foods, lifestyle changes, and immediate actions to boost your hemoglobin levels.
              </p>
           </motion.div>
           
           {/* Decorative Floating Icons */}
           <Leaf className="absolute top-20 left-20 text-green-500/20 h-16 w-16 animate-float-gentle" style={{ animationDelay: '0s' }} />
           <Zap className="absolute bottom-20 right-20 text-yellow-500/20 h-24 w-24 animate-float-gentle" style={{ animationDelay: '1s' }} />
           <Utensils className="absolute top-10 right-1/4 text-orange-500/20 h-12 w-12 animate-float-gentle" style={{ animationDelay: '2s' }} />
        </div>

        {/* --- Emergency / First Steps --- */}
        <motion.div variants={itemVariants} className="space-y-6">
           <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-red-500/10 rounded-full">
               <Zap className="h-6 w-6 text-red-500" />
             </div>
             <h2 className="text-3xl font-bold">First Steps: Feeling Weak?</h2>
           </div>
           
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StepCard 
                number="1"
                title="Rest Immediately"
                desc="Stop strenuous activity. Sit or lie down to reduce oxygen demand on your body."
              />
              <StepCard 
                number="2"
                title="Hydrate"
                desc="Drink a glass of water. Dehydration can worsen fatigue and weakness."
              />
              <StepCard 
                number="3"
                title="Iron-Rich Snack"
                desc="Eat a handful of nuts, dried fruits, or dark chocolate for a quick energy boost."
              />
           </div>
        </motion.div>

        {/* --- Interactive Content Tabs --- */}
        <div className="space-y-8">
           <div className="flex justify-center gap-4">
              <Button 
                variant={activeTab === 'foods' ? 'default' : 'outline'}
                onClick={() => setActiveTab('foods')}
                className="rounded-full px-8"
              >
                Iron Powerhouses
              </Button>
              <Button 
                variant={activeTab === 'habits' ? 'default' : 'outline'}
                onClick={() => setActiveTab('habits')}
                className="rounded-full px-8"
              >
                Lifestyle Habits
              </Button>
           </div>

           <AnimatePresence mode="wait">
             {activeTab === 'foods' && (
               <motion.div 
                 key="foods"
                 initial={{ opacity: 0, x: -20 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 exit={{ opacity: 0, x: 20 }}
                 className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
               >
                  <FoodCard 
                    icon={Leaf}
                    title="Leafy Greens"
                    ironContent="High Iron"
                    tips="Spinach, kale, and collard greens. Best eaten cooked for better absorption."
                    color="border-l-green-500"
                  />
                  <FoodCard 
                    icon={Utensils}
                    title="Red Meat & Organ Meats"
                    ironContent="Heme Iron (Best)"
                    tips="Beef, liver, and lamb. Heme iron is absorbed 2-3x better than plant iron."
                    color="border-l-red-500"
                  />
                  <FoodCard 
                    icon={Coffee}
                    title="Legumes & Beans"
                    ironContent="Moderate Iron"
                    tips="Lentils, chickpeas, and soybeans. Soak them before cooking to reduce phytates."
                    color="border-l-amber-500"
                  />
                  <FoodCard 
                    icon={Sun}
                    title="Vitamin C Boosters"
                    ironContent="Absorption Helper"
                    tips="Citrus fruits, bell peppers, strawberries. ALWAYS pair these with iron foods!"
                    color="border-l-orange-500"
                  />
               </motion.div>
             )}

             {activeTab === 'habits' && (
               <motion.div 
                 key="habits"
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 className="grid md:grid-cols-2 gap-8"
               >
                  {/* Do's */}
                  <div className="glass-panel p-8 rounded-3xl space-y-6">
                     <h3 className="text-2xl font-bold flex items-center gap-2 text-green-500">
                       <Check className="h-6 w-6" /> Do This
                     </h3>
                     <ul className="space-y-4">
                       {[
                         "Cook with cast-iron cookware",
                         "Combine plant iron with Vitamin C",
                         "Soak beans and grains before cooking",
                         "Take supplements if prescribed"
                       ].map((item, i) => (
                         <li key={i} 
                             className="flex items-center gap-3 cursor-pointer group"
                             onClick={() => toggleCheck(`do-${i}`)}
                         >
                            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${checklist.includes(`do-${i}`) ? 'bg-green-500 border-green-500 text-white' : 'border-muted-foreground'}`}>
                               {checklist.includes(`do-${i}`) && <Check className="h-4 w-4 animate-check-pop" />}
                            </div>
                            <span className={`text-lg transition-all ${checklist.includes(`do-${i}`) ? 'line-through text-muted-foreground' : ''}`}>{item}</span>
                         </li>
                       ))}
                     </ul>
                  </div>

                  {/* Don'ts */}
                  <div className="glass-panel p-8 rounded-3xl space-y-6">
                     <h3 className="text-2xl font-bold flex items-center gap-2 text-red-500">
                       <Info className="h-6 w-6" /> Avoid This
                     </h3>
                     <p className="text-muted-foreground mb-4">Avoid consuming these WITH iron-rich meals (wait 1-2 hours).</p>
                     <ul className="space-y-4">
                        {[
                          "Coffee and tea (tannins block absorption)",
                          "Milk and dairy (calcium blocks absorption)",
                          "Whole grain cereals (high phytates)",
                          "Antacids / Calcium supplements"
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-lg text-muted-foreground">
                             <div className="h-2 w-2 rounded-full bg-red-400" />
                             {item}
                          </li>
                        ))}
                     </ul>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* --- Daily Iron Chef Challenge (Fun Section) --- */}
        <motion.div variants={itemVariants} className="mt-12 bg-gradient-to-br from-orange-500/10 to-amber-500/5 rounded-[2rem] p-8 md:p-12 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-12 opacity-10">
              <Utensils className="h-64 w-64 rotate-12" />
           </div>
           
           <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl font-bold mb-4">💡 Pro Tip: The "Iron Pair" Rule</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Iron absorption is a chemistry game. To win, always pair your Non-Heme iron (plants) with Vitamin C. It turns difficult-to-absorb iron into a form your body loves!
              </p>
              
              <div className="flex flex-col md:flex-row gap-4 items-center bg-background/50 backdrop-blur-sm p-4 rounded-xl inline-flex">
                 <div className="flex items-center gap-2">
                    <span className="font-bold text-xl">Spinach Salad</span>
                    <span className="text-muted-foreground">(Iron)</span>
                 </div>
                 <span className="text-2xl font-bold text-primary">+</span>
                 <div className="flex items-center gap-2">
                    <span className="font-bold text-xl">Lemon Dressing</span>
                    <span className="text-muted-foreground">(Vit C)</span>
                 </div>
                 <span className="text-2xl font-bold text-green-500">=</span>
                 <Badge className="bg-green-500 hover:bg-green-600 text-lg py-1 px-4">Super Absorption!</Badge>
              </div>
           </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
