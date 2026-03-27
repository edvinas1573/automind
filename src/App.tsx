/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Range, getTrackBackground, Direction } from 'react-range';
import { StepScreen, OptionCard, ProgressBar } from './components/Wizard';
import { ResultCard, LoadingScreen } from './components/Results';
import { CAR_TYPES, USAGE_OPTIONS, PRIORITY_OPTIONS, FUEL_TYPES, UserProfile, AIResponse } from './types';
import { analyzeCars } from './services/geminiService';
import { Sparkles, Car, ChevronRight, ArrowDown, Key } from 'lucide-react';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [step, setStep] = useState(0); // 0 is landing
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AIResponse | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile>({
    budget: 25000,
    carType: [],
    usage: '',
    priority: [],
    fuelType: '',
    minYear: 2015,
    maxYear: 2026,
  });

  useState(() => {
    if (typeof window !== 'undefined' && window.aistudio) {
      window.aistudio.hasSelectedApiKey().then(setHasApiKey);
    }
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleFinish = async () => {
    setLoading(true);
    setStep(7); // Loading step
    try {
      const data = await analyzeCars(profile);
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = (key: keyof UserProfile, value: any) => {
    setProfile(prev => {
      if (key === 'priority' || key === 'carType') {
        const current = prev[key] as string[];
        if (current.includes(value)) {
          return { ...prev, [key]: current.filter(v => v !== value) };
        }
        return { ...prev, [key]: [...current, value] };
      }
      if (key !== 'budget' && prev[key] === value) {
        return { ...prev, [key]: '' };
      }
      return { ...prev, [key]: value };
    });
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-black selection:bg-black selection:text-white font-sans">
      {step > 0 && step < 7 && <ProgressBar current={step} total={6} />}

      <main className="container mx-auto px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[80vh] text-center"
            >
              <div className="mb-8 p-4 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                <Car className="w-12 h-12 text-black" />
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6">
                AutoMind
              </h1>
              <p className="text-zinc-600 text-xl md:text-2xl max-w-2xl mb-12 leading-relaxed">
                DI agentas, kuris padeda nuspręsti <span className="text-black">kokį automobilį pirkti</span>. 
                Sistemingas, protingas ir nešališkas.
              </p>

              {!hasApiKey && (
                <div className="mb-8 p-6 bg-orange-50 border border-orange-100 rounded-3xl max-w-md text-center">
                  <Key className="w-8 h-8 text-orange-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-orange-900 mb-2">Reikalingas Google Cloud ryšys</h3>
                  <p className="text-sm text-orange-800 mb-6">
                    Norint gauti tikras nuotraukas iš Google Images, turite prijungti savo API raktą.
                  </p>
                  <button
                    onClick={async () => {
                      await window.aistudio.openSelectKey();
                      setHasApiKey(true);
                    }}
                    className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all"
                  >
                    Prijungti raktą
                  </button>
                  <p className="mt-4 text-[10px] text-orange-700">
                    Daugiau informacijos apie <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">atsiskaitymą</a>.
                  </p>
                </div>
              )}

              <button
                onClick={nextStep}
                className="group flex items-center gap-3 px-12 py-6 bg-black text-white text-xl font-bold rounded-full hover:bg-zinc-800 transition-all shadow-2xl shadow-black/10 cursor-pointer"
              >
                Pradėti paiešką
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <StepScreen
              key="step1"
              title="Koks jūsų biudžetas?"
              subtitle="Rasime geriausią vertę už jūsų pinigus."
              onNext={nextStep}
              showNext={true}
            >
              <div className="space-y-12">
                <div className="text-center">
                  <span className="text-7xl font-black tracking-tighter">
                    {profile.budget.toLocaleString()}€
                  </span>
                </div>
                <div className="relative pt-10">
                  <motion.div 
                    initial={{ y: 0, opacity: 0 }}
                    animate={{ y: [0, -8, 0], opacity: 1 }}
                    transition={{ 
                      y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                      opacity: { duration: 0.5 }
                    }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">Norint keisti biudžetą vilkite</span>
                    <ArrowDown className="w-4 h-4 text-black" />
                  </motion.div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.sqrt((Math.max(1000, Number(profile.budget)) - 1000) / (150000 - 1000)) * 100}
                    onChange={(e) => {
                      const percent = parseInt(e.target.value) / 100;
                      const val = 1000 + (150000 - 1000) * Math.pow(percent, 2);
                      const step = val <= 10000 ? 500 : 1000;
                      updateProfile('budget', Math.round(val / step) * step);
                    }}
                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>
              </div>
            </StepScreen>
          )}

          {step === 2 && (
            <StepScreen
              key="step2"
              title="Kokie kėbulo tipai jus domina?"
              onBack={prevStep}
              onNext={nextStep}
              showNext={profile.carType.length > 0}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CAR_TYPES.map(type => (
                  <OptionCard
                    key={type.id}
                    label={type.label}
                    description={type.description}
                    selected={profile.carType.includes(type.id)}
                    onClick={() => updateProfile('carType', type.id)}
                  />
                ))}
              </div>
            </StepScreen>
          )}

          {step === 3 && (
            <StepScreen
              key="step3"
              title="Kaip naudosite automobilį?"
              subtitle="Jūsų kasdienybė padeda parinkti tinkamiausią variklį ir technologijas."
              onBack={prevStep}
              onNext={nextStep}
              showNext={!!profile.usage}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {USAGE_OPTIONS.map(opt => (
                  <OptionCard
                    key={opt.id}
                    label={opt.label}
                    description={opt.description}
                    icon={opt.icon}
                    selected={profile.usage === opt.id}
                    onClick={() => updateProfile('usage', opt.id)}
                  />
                ))}
              </div>
            </StepScreen>
          )}

          {step === 4 && (
            <StepScreen
              key="step4"
              title="Kas jums svarbiausia?"
              subtitle="Pasirinkite svarbiausius dalykus. Mes subalansuosime šiuos prioritetus."
              onBack={prevStep}
              onNext={nextStep}
              showNext={profile.priority.length > 0}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRIORITY_OPTIONS.map(opt => (
                  <OptionCard
                    key={opt.id}
                    label={opt.label}
                    description={opt.description}
                    icon={opt.icon}
                    selected={profile.priority.includes(opt.id)}
                    onClick={() => updateProfile('priority', opt.id)}
                  />
                ))}
              </div>
            </StepScreen>
          )}

          {step === 5 && (
            <StepScreen
              key="step5"
              title="Pageidaujamas kuro tipas?"
              subtitle="Nebūtina, bet padeda susiaurinti paiešką."
              onBack={prevStep}
              onNext={nextStep}
              showNext={true}
              nextLabel={profile.fuelType ? "Tęsti" : "Praleisti"}
            >
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                {FUEL_TYPES.map(type => (
                  <OptionCard
                    key={type.id}
                    label={type.label}
                    icon={type.icon}
                    selected={profile.fuelType === type.id}
                    onClick={() => updateProfile('fuelType', type.id)}
                  />
                ))}
              </div>
            </StepScreen>
          )}

          {step === 6 && (
            <StepScreen
              key="step6"
              title="Baigiamieji nustatymai"
              subtitle="Patikslinkite paiešką pagal prekės ženklą ir amžių."
              onBack={prevStep}
              onNext={handleFinish}
              showNext={true}
              nextLabel="Analizuoti"
            >
              <div className="space-y-12 max-w-md mx-auto">
                <div>
                  <label className="block text-sm font-bold text-zinc-500 uppercase tracking-widest mb-8">
                    Metų rėžis: <span className="text-black">{profile.minYear} – {profile.maxYear}</span>
                  </label>
                  <div className="px-2">
                    <Range
                      step={1}
                      min={2000}
                      max={2026}
                      values={[profile.minYear, profile.maxYear]}
                      direction={Direction.Right}
                      allowOverlap={false}
                      draggableTrack={false}
                      disabled={false}
                      rtl={false}
                      label=""
                      labelledBy=""
                      onChange={(values) => {
                        setProfile(prev => ({ ...prev, minYear: values[0], maxYear: values[1] }));
                      }}
                      renderTrack={({ props, children }) => (
                        <div
                          onMouseDown={props.onMouseDown}
                          onTouchStart={props.onTouchStart}
                          style={{
                            ...props.style,
                            height: '36px',
                            display: 'flex',
                            width: '100%'
                          }}
                        >
                          <div
                            ref={props.ref}
                            style={{
                              height: '4px',
                              width: '100%',
                              borderRadius: '4px',
                              background: getTrackBackground({
                                values: [profile.minYear, profile.maxYear],
                                colors: ['#e4e4e7', '#000000', '#e4e4e7'],
                                min: 2000,
                                max: 2026
                              }),
                              alignSelf: 'center'
                            }}
                          >
                            {children}
                          </div>
                        </div>
                      )}
                      renderThumb={({ props, isDragged }) => {
                        const { key, ...restProps } = props;
                        return (
                          <div
                            key={key}
                            {...restProps}
                            style={{
                              ...restProps.style,
                              height: '24px',
                              width: '24px',
                              borderRadius: '50%',
                              backgroundColor: '#000',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              boxShadow: '0px 2px 6px rgba(0,0,0,0.2)'
                            }}
                          >
                            <div
                              style={{
                                height: '8px',
                                width: '2px',
                                backgroundColor: isDragged ? '#FFF' : '#EEE'
                              }}
                            />
                          </div>
                        );
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-zinc-600 font-bold">
                    <span>2000</span>
                    <span>2026</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Markė</label>
                  <input
                    type="text"
                    placeholder="pvz. BMW, Toyota, Tesla (nebūtina)"
                    className="w-full bg-white border border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-black transition-all text-black"
                    value={profile.brandPreference || ''}
                    onChange={(e) => updateProfile('brandPreference', e.target.value)}
                  />
                </div>
              </div>
            </StepScreen>
          )}

          {step === 7 && loading && (
            <LoadingScreen key="loading" />
          )}

          {step === 7 && !loading && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-4xl mx-auto space-y-12"
            >
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/5 rounded-full text-zinc-600 text-sm font-bold mb-6">
                  <Sparkles className="w-4 h-4 text-black" />
                  DI analizė baigta
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">
                  Geriausi atitikmenys
                </h1>
                {results.message ? (
                  <div className="max-w-2xl mx-auto p-6 bg-orange-50 border border-orange-100 rounded-3xl text-orange-900 text-lg font-medium mb-8">
                    {results.message}
                  </div>
                ) : (
                  <p className="text-zinc-600 text-lg">
                    Remdamiesi jūsų profiliu, parinkome geriausiai jūsų gyvenimo būdui tinkančius automobilius.
                  </p>
                )}
              </div>

              <div className="space-y-8">
                {results.recommendations.filter(r => r.isBestMatch).map((car, i) => (
                  <ResultCard key={i} car={car} />
                ))}

                <div className="pt-12 border-t border-zinc-200">
                  <h3 className="text-2xl font-bold mb-8">Puikios alternatyvos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {results.recommendations.filter(r => !r.isBestMatch).map((car, i) => (
                      <ResultCard key={i} car={car} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-12">
                <button
                  onClick={() => {
                    setStep(0);
                    setResults(null);
                    setProfile({
                      budget: 25000,
                      carType: [],
                      usage: '',
                      priority: [],
                      fuelType: '',
                      minYear: 2015,
                      maxYear: 2026,
                    });
                  }}
                  className="px-12 py-4 rounded-full border border-zinc-200 text-zinc-600 hover:text-black hover:border-zinc-400 transition-all font-bold cursor-pointer"
                >
                  Pradėti iš naujo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="container mx-auto px-4 py-8 border-t border-zinc-100 flex justify-between items-center opacity-50 hover:opacity-100 transition-opacity">
        <p className="text-xs font-medium text-zinc-500">© 2026 AutoMind AI</p>
      </footer>
    </div>
  );
}
