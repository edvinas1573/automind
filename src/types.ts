import { Type } from "@google/genai";

export interface UserProfile {
  budget: number;
  carType: string[];
  usage: string;
  priority: string[];
  fuelType: string;
  brandPreference?: string;
  minYear: number;
  maxYear: number;
}

export interface CarRecommendation {
  name: string;
  price: string;
  year: string;
  mileage: string;
  explanation: string;
  imageUrl: string;
  images: string[];
  isBestMatch: boolean;
  specs: string[];
}

export interface AIResponse {
  recommendations: CarRecommendation[];
  message?: string;
}

export const CAR_TYPES = [
  { id: 'sedan', label: 'Sedanas', description: 'Klasikinis 4 durų automobilis su atskira bagažine', icon: 'sedan' },
  { id: 'wagon', label: 'Universalas', description: 'Ilgesnis kėbulas su papildoma erdve kroviniams gale', icon: 'wagon' },
  { id: 'suv', label: 'Visureigis (SUV)', description: 'Aukštas automobilis su didele prošvaisa', icon: 'suv' },
  { id: 'hatchback', label: 'Hečbekas', description: 'Kompaktiškas automobilis su į viršų atsidarančiomis galinėmis durimis', icon: 'hatchback' },
  { id: 'coupe', label: 'Kupė', description: 'Sportiškas 2 durų automobilis su nuolaidžia stogo linija', icon: 'coupe' },
  { id: 'convertible', label: 'Kabrioletas', description: 'Automobilis su atidengiamu arba nuimamu stogu', icon: 'convertible' },
  { id: 'pickup', label: 'Pikapas', description: 'Sunkvežimis su atvira krovinių platforma gale', icon: 'pickup' },
  { id: 'minivan', label: 'Vienatūris (MPV)', description: 'Didelis šeimos automobilis su 7+ sėdimomis vietomis', icon: 'minivan' },
  { id: 'limousine', label: 'Limuzinas', description: 'Ypač ilgas prabangus automobilis', icon: 'limousine' },
];

export const USAGE_OPTIONS = [
  { id: 'city', label: 'Miesto važiavimas', description: 'Trumpos kelionės, lengvas parkavimas', icon: 'city' },
  { id: 'long', label: 'Ilgos kelionės', description: 'Komfortas greitkelyje, kuro ekonomija', icon: 'long' },
  { id: 'performance', label: 'Pramoga / Greitis', description: 'Galia ir valdymas', icon: 'performance' },
  { id: 'mixed', label: 'Mišrus', description: 'Visko po truputį', icon: 'mixed' },
];

export const PRIORITY_OPTIONS = [
  { id: 'economy', label: 'Kuro ekonomija', description: 'Sutaupykite degalinėje', icon: 'economy' },
  { id: 'power', label: 'Galia', description: 'Dinamiškas važiavimas ir trauka', icon: 'power' },
  { id: 'comfort', label: 'Komfortas', description: 'Prabangus salonas ir minkšta važiuoklė', icon: 'comfort' },
  { id: 'reliability', label: 'Patikimumas', description: 'Mažos priežiūros išlaidos', icon: 'reliability' },
];

export const FUEL_TYPES = [
  { id: 'petrol', label: 'Benzinas', icon: 'petrol' },
  { id: 'diesel', label: 'Dyzelinas', icon: 'diesel' },
  { id: 'hybrid', label: 'Hibridas', icon: 'hybrid' },
  { id: 'electric', label: 'Elektra', icon: 'electric' },
];

export const AI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    message: { 
      type: Type.STRING, 
      description: "If the user's criteria are unrealistic or no perfect matches are found (e.g., budget too low for the requested year/type), provide a polite message in Lithuanian explaining this (e.g., 'Deja, pagal jūsų kriterijus tikslių atitikmenų rasti nepavyko, tačiau štai geriausios alternatyvos:'). Leave empty if matches are good." 
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          price: { type: Type.STRING },
          year: { type: Type.STRING },
          mileage: { type: Type.STRING },
          explanation: { type: Type.STRING },
          isBestMatch: { type: Type.BOOLEAN },
          specs: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of 5-7 key technical specifications (e.g., Engine, Horsepower, Fuel Economy, Cargo Space, Safety Rating)."
          },
        },
        required: ['name', 'price', 'year', 'mileage', 'explanation', 'isBestMatch', 'specs'],
      },
    },
  },
  required: ['recommendations'],
};
