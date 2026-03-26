import { motion, AnimatePresence } from "motion/react";
import { ReactNode } from "react";
import * as Icons from "./Icons";
import { Building2, Route, Shuffle, Zap, Leaf, Gauge, Sofa, ShieldCheck, Fuel, Droplets, PlugZap, Rocket } from "lucide-react";

const IconMap: Record<string, ReactNode> = {
  sedan: <Icons.SedanIcon />,
  wagon: <Icons.UniversalIcon />,
  suv: <Icons.SUVIcon />,
  hatchback: <Icons.HatchbackIcon />,
  coupe: <Icons.CoupeIcon />,
  convertible: <Icons.CabrioletIcon />,
  pickup: <Icons.PickupIcon />,
  minivan: <Icons.MPVIcon />,
  limousine: <Icons.LimousineIcon />,
  city: <Building2 />,
  long: <Route />,
  mixed: <Shuffle />,
  performance: <Rocket />,
  economy: <Leaf />,
  power: <Gauge />,
  comfort: <Sofa />,
  reliability: <ShieldCheck />,
  petrol: <Fuel />,
  diesel: <Droplets />,
  hybrid: <Zap />,
  electric: <PlugZap />,
};

interface StepScreenProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onNext?: () => void;
  showNext?: boolean;
  nextLabel?: string;
  key?: string | number;
}

export function StepScreen({ 
  children, 
  title, 
  subtitle, 
  onBack, 
  onNext, 
  showNext = false,
  nextLabel = "Tęsti"
}: StepScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-4xl mx-auto px-6"
    >
      <div className="text-center mb-6 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-black mb-4 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-zinc-600 text-lg md:text-xl max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
      </div>

      <div className="w-full">
        {children}
      </div>

      <div className="mt-12 flex gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="px-8 py-4 rounded-full border border-zinc-200 text-zinc-500 hover:text-black hover:border-zinc-400 transition-all font-medium"
          >
            Atgal
          </button>
        )}
        {showNext && onNext && (
          <button
            onClick={onNext}
            className="px-12 py-4 rounded-full bg-black text-white font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/5"
          >
            {nextLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}

interface OptionCardProps {
  label: string;
  description?: string;
  icon?: string;
  selected: boolean;
  onClick: () => void;
  key?: string | number;
}

export function OptionCard({ label, description, icon, selected, onClick }: OptionCardProps) {
  const IconComponent = icon && IconMap[icon] ? IconMap[icon] : icon;

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3 md:p-6 text-left rounded-2xl border-2 transition-all duration-300 group
        ${selected 
          ? "bg-black border-black text-white" 
          : "bg-white border-zinc-200 text-black hover:border-zinc-400 shadow-sm"}
      `}
    >
      <div className="flex items-center gap-2 md:gap-4">
        {IconComponent && (
          <div className={`w-6 h-6 md:w-10 md:h-10 flex-shrink-0 ${selected ? "text-white" : "text-black opacity-60 group-hover:opacity-100"} transition-all`}>
            {IconComponent}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm md:text-xl font-bold leading-tight">{label}</h3>
          {description && (
            <p className={`text-[10px] md:text-sm mt-0.5 line-clamp-2 md:line-clamp-none ${selected ? "text-zinc-400" : "text-zinc-600"}`}>
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const progress = (current / total) * 100;
  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-zinc-200 z-50">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        className="h-full bg-black shadow-[0_0_10px_rgba(0,0,0,0.1)]"
      />
    </div>
  );
}
