import React from "react";
import { motion } from "motion/react";
import { CarRecommendation } from "../types";
import { Info } from "lucide-react";
import { CarGame } from "./CarGame";

export function ResultCard({ car }: { car: CarRecommendation; key?: string | number }) {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const images = car.images && car.images.length > 0 ? car.images : [car.imageUrl];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        relative overflow-hidden rounded-3xl border
        ${car.isBestMatch 
          ? "bg-black text-white border-black shadow-2xl shadow-black/10" 
          : "bg-white border-zinc-200 text-black shadow-sm"}
      `}
    >
      <div 
        className="group aspect-video w-full overflow-hidden relative bg-zinc-100 perspective-1000"
      >
        <motion.img 
          key={currentImageIndex}
          src={images[currentImageIndex]} 
          alt={`${car.name} - image ${currentImageIndex + 1}`} 
          className="w-full h-full object-cover select-none pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://loremflickr.com/800/450/car,${car.name.replace(/\s+/g, ',')}`;
          }}
        />

        {/* Image Navigation Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  i === currentImageIndex 
                    ? "bg-white w-4" 
                    : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
        
        {/* Specs Overlay on Hover */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center p-4 md:p-8 z-10">
          <h4 className="text-white text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 md:mb-4 opacity-50">Techninės specifikacijos</h4>
          <ul className="grid grid-cols-1 gap-1 md:gap-2">
            {car.specs?.map((spec, i) => (
              <motion.li 
                key={i}
                initial={{ x: -10, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="text-white text-[11px] md:text-sm flex items-center gap-2"
              >
                <div className="w-1 h-1 rounded-full bg-white/50" />
                {spec}
              </motion.li>
            ))}
          </ul>
        </div>

        {car.isBestMatch && (
          <div className="absolute top-4 right-4 bg-black text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest z-10 group-hover:opacity-0 transition-opacity">
            Geriausias atitikmuo
          </div>
        )}
      </div>

      <div className="p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-4xl font-black tracking-tighter mb-2">{car.name}</h2>
            <div className="flex gap-4 text-sm font-medium opacity-70">
              <span>{car.year}</span>
              <span>•</span>
              <span>{car.mileage}</span>
            </div>
          </div>
          <div className="text-3xl font-bold whitespace-nowrap">{car.price}</div>
        </div>

        <div className={`p-6 rounded-2xl ${car.isBestMatch ? "bg-zinc-800" : "bg-zinc-100"}`}>
          <div className="flex gap-3">
            <Info className={`w-5 h-5 mt-1 shrink-0 ${car.isBestMatch ? "text-zinc-400" : "text-zinc-500"}`} />
            <p className="text-sm leading-relaxed italic">
              {car.explanation}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LoadingScreen() {
  const messages = [
    "Suprantame jūsų poreikius...",
    "Analizuojame rinkos tendencijas...",
    "Ieškome geriausių pasiūlymų Lietuvoje...",
    "Ruošiame rekomendacijas...",
    "Beveik baigta!"
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center py-12">
      <div className="relative w-20 h-20 mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-full h-full border-4 border-zinc-200 border-t-black rounded-full"
        />
      </div>

      <div className="h-8 overflow-hidden mb-12">
        <motion.div
          animate={{ y: [0, -32, -64, -96, -128] }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            times: [0, 0.2, 0.4, 0.6, 0.8],
            ease: "easeInOut" 
          }}
        >
          {messages.map((msg, i) => (
            <div key={i} className="h-8 text-xl font-medium text-zinc-500">
              {msg}
            </div>
          ))}
        </motion.div>
      </div>

      <div className="w-full max-w-md p-6 bg-white rounded-3xl border border-zinc-100 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Kol laukiate – pajudėkite!</div>
        <CarGame />
      </div>
    </div>
  );
}
