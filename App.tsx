
import React, { useState, useMemo, useEffect } from 'react';
import { DoughConfig, Ingredients } from './types';
import { AVPN_DEFAULTS, YEAST_RATIO } from './constants';
import { InputGroup } from './components/InputGroup';
import { IngredientCard } from './components/IngredientCard';
import { GoogleGenAI } from "@google/genai";

interface WeatherSource {
  uri: string;
  title: string;
}

interface WeatherInfo {
  city: string;
  temp: number;
  condition: string;
  loading: boolean;
  sources?: WeatherSource[];
  error?: string;
}

const App: React.FC = () => {
  const [config, setConfig] = useState<DoughConfig>(AVPN_DEFAULTS);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const calculatedYeastPercentage = useMemo(() => {
    const effectiveHours = config.roomTime + (config.useFridge ? (config.fridgeTime * 0.12) : 0);
    let percentage = 0.15 * (8 / effectiveHours) * (23 / config.roomTemp);

    if (config.yeastType === 'dry') {
      percentage *= YEAST_RATIO.dry;
    } else {
      percentage *= YEAST_RATIO.fresh;
    }

    return Math.max(0.005, Math.min(1.5, percentage));
  }, [config.roomTime, config.roomTemp, config.useFridge, config.fridgeTime, config.yeastType]);

  const ingredients = useMemo<Ingredients>(() => {
    const totalWeight = config.pizzas * config.weightPerBall;
    const oilPercentage = config.useOil ? config.oil : 0;
    const totalPercentage = 100 + config.hydration + config.salt + calculatedYeastPercentage + oilPercentage;
    const flour = (totalWeight / totalPercentage) * 100;
    
    return {
      flour: flour,
      water: (flour * config.hydration) / 100,
      salt: (flour * config.salt) / 100,
      yeast: (flour * calculatedYeastPercentage) / 100,
      oil: (flour * oilPercentage) / 100
    };
  }, [config, calculatedYeastPercentage]);

  const fetchLocalWeather = async (lat: number, lon: number) => {
    setIsDetecting(true);
    setWeather({ city: '', temp: 0, condition: '', loading: true });
    
    try {
      if (!process.env.API_KEY) {
        throw new Error("API Key não configurada");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Consulte o clima atual para as coordenadas lat: ${lat}, lon: ${lon} usando o Google Search. Informe o nome da cidade, a temperatura atual em Celsius e uma descrição curta do clima (ex: Nublado). Responda exatamente neste formato: CIDADE: [nome] | TEMP: [número] | CLIMA: [descrição].`;
      
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        },
      });

      const text = result.text || "";
      const cityMatch = text.match(/CIDADE:\s*([^|]+)/i);
      const tempMatch = text.match(/TEMP:\s*([\d.]+)/i);
      const condMatch = text.match(/CLIMA:\s*([^|.\n]+)/i);

      const rawChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: WeatherSource[] = rawChunks
        .filter(chunk => chunk.web)
        .map(chunk => ({
          uri: chunk.web?.uri || "",
          title: chunk.web?.title || "Fonte de Clima"
        }))
        .filter(s => s.uri !== "");

      if (cityMatch && tempMatch) {
        const city = cityMatch[1].trim();
        const temp = parseFloat(tempMatch[1]);
        const condition = condMatch ? condMatch[1].trim() : 'Desconhecido';

        setWeather({
          city,
          temp,
          condition,
          loading: false,
          sources: sources.slice(0, 2)
        });
        setConfig(prev => ({ ...prev, roomTemp: Math.round(temp) }));
      } else {
        throw new Error("Não foi possível processar a resposta do clima.");
      }
    } catch (error: any) {
      console.error("Erro na detecção de clima:", error);
      setWeather({ 
        city: '', temp: 0, condition: '', loading: false, 
        error: "Falha ao obter clima. Tente novamente." 
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setWeather({ city: '', temp: 0, condition: '', loading: false, error: "Geolocalização não suportada." });
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchLocalWeather(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error("Erro de geolocalização:", error);
        let msg = "Permissão negada ou erro de GPS.";
        if (error.code === error.TIMEOUT) msg = "Tempo esgotado ao buscar localização.";
        setWeather({ city: '', temp: 0, condition: '', loading: false, error: msg });
        setIsDetecting(false);
      },
      { timeout: 15000, enableHighAccuracy: false }
    );
  };

  const getWeatherIcon = (condition: string) => {
    const cond = condition.toLowerCase();
    if (cond.includes('sol') || cond.includes('limpo') || cond.includes('clear')) return '☀️';
    if (cond.includes('nublado') || cond.includes('cloud')) return '☁️';
    if (cond.includes('chuva') || cond.includes('rain')) return '🌧️';
    if (cond.includes('neve') || cond.includes('snow')) return '❄️';
    if (cond.includes('neblina') || cond.includes('mist') || cond.includes('fog')) return '🌫️';
    return '⛅';
  };

  const toggleFridge = () => setConfig(prev => ({ ...prev, useFridge: !prev.useFridge }));
  const toggleOil = () => setConfig(prev => ({ ...prev, useOil: !prev.useOil }));

  return (
    <div className="max-w-xl mx-auto min-h-screen flex flex-col px-6 py-12 md:py-20">
      
      <header className="mb-20 text-center flex flex-col items-center">
        <div className="flex items-end gap-1 mb-2">
            <h1 className="text-5xl font-serif font-black tracking-tight leading-none text-[#1d263b]">Capa Pizza</h1>
            <div className="dot mb-1"></div>
        </div>
        <p className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-40">Calculadora de Massa</p>
      </header>

      <section className="grid grid-cols-2 gap-4 mb-16">
        <IngredientCard name="Farinha" amount={ingredients.flour} unit="g" />
        <IngredientCard name="Água" amount={ingredients.water} unit="g" />
        <IngredientCard name="Sal" amount={ingredients.salt} unit="g" />
        <IngredientCard name="Fermento" amount={ingredients.yeast} unit="g" />
        {config.useOil && (
          <div className="col-span-2 animate-in fade-in zoom-in-95 duration-300">
            <IngredientCard name="Azeite" amount={ingredients.oil} unit="g" />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
            <div className="h-[1px] flex-1 bg-[#1d263b] opacity-10"></div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">Configurações</h2>
            <div className="h-[1px] flex-1 bg-[#1d263b] opacity-10"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InputGroup 
              label="Pizzas" 
              value={config.pizzas} 
              min={1} max={50} 
              onChange={(v) => setConfig({...config, pizzas: v})}
            />
            <InputGroup 
              label="Peso Bolinha" 
              value={config.weightPerBall} 
              unit="g"
              min={150} max={350} 
              onChange={(v) => setConfig({...config, weightPerBall: v})}
            />
            <InputGroup 
              label="Hidratação" 
              value={config.hydration} 
              unit="%"
              min={50} max={100} step={1}
              onChange={(v) => setConfig({...config, hydration: v})}
            />
            <InputGroup 
              label="Sal" 
              value={config.salt} 
              unit="%"
              min={1} max={4} step={0.1}
              onChange={(v) => setConfig({...config, salt: v})}
            />
        </div>

        <div className="py-4">
          <div className="bg-white/40 border border-[#1d263b] p-6 rounded-sm shadow-sm">
            <button 
              onClick={toggleOil}
              className="flex items-center justify-between w-full group"
            >
                <span className="text-xs font-bold uppercase tracking-widest text-[#1d263b]">Incluir Azeite</span>
                <div className={`w-11 h-6 rounded-full border border-[#1d263b] flex items-center px-1 transition-all duration-300 ${config.useOil ? 'bg-[#1d263b]' : 'bg-white/50'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full transition-transform duration-300 ${config.useOil ? 'translate-x-5 bg-[#edece3]' : 'bg-[#1d263b]'}`}></div>
                </div>
            </button>

            {config.useOil && (
                <div className="mt-6 pt-6 border-t border-[#1d263b] border-opacity-10 animate-in fade-in slide-in-from-top-2">
                    <InputGroup 
                      label="Porcentagem de Azeite" 
                      value={config.oil} 
                      unit="%"
                      min={1} max={10} step={0.5}
                      onChange={(v) => setConfig({...config, oil: v})}
                    />
                </div>
            )}
          </div>
        </div>

        <div className="py-6 mt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-8 text-center">Fermentação</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div className="flex flex-col relative">
                  <div className="flex justify-between items-center pr-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Temp. Ambiente</span>
                    <button 
                      onClick={requestLocation}
                      disabled={isDetecting}
                      className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border border-[#1d263b] transition-all ${isDetecting ? 'opacity-30 cursor-wait' : 'hover:bg-[#1d263b] hover:text-[#edece3]'}`}
                    >
                      {isDetecting ? '...' : 'Auto'}
                    </button>
                  </div>
                  <InputGroup 
                    label="" 
                    value={config.roomTemp} 
                    unit="°C"
                    min={15} max={35} 
                    onChange={(v) => setConfig({...config, roomTemp: v})}
                  />
                  
                  {weather?.error && (
                    <span className="text-[8px] text-red-600 font-bold uppercase tracking-tighter mt-1 px-1 animate-in fade-in">
                      {weather.error}
                    </span>
                  )}

                  {weather && !weather.loading && !weather.error && (
                    <div className="flex flex-col gap-2 mt-2 px-1 animate-in fade-in slide-in-from-left-2 duration-500">
                      <div className="flex items-center gap-2">
                        <span className="text-lg leading-none">{getWeatherIcon(weather.condition)}</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 leading-none mb-0.5">{weather.city}</span>
                          <span className="text-[9px] mono opacity-40 leading-none">{weather.temp}°C • {weather.condition}</span>
                        </div>
                      </div>
                      
                      {weather.sources && weather.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {weather.sources.map((source, idx) => (
                            <a 
                              key={idx} 
                              href={source.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[8px] uppercase tracking-tighter opacity-30 hover:opacity-100 transition-opacity underline decoration-dotted"
                            >
                              {source.title.slice(0, 15)}...
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {weather?.loading && (
                    <div className="flex items-center gap-2 mt-2 px-1 opacity-40 animate-pulse">
                      <div className="w-3 h-3 rounded-full border-2 border-[#1d263b] border-t-transparent animate-spin"></div>
                      <span className="text-[9px] uppercase tracking-widest font-bold">Consultando IA...</span>
                    </div>
                  )}
                </div>
                <InputGroup 
                  label="Tempo Ambiente" 
                  value={config.roomTime} 
                  unit="h"
                  min={1} max={48} 
                  onChange={(v) => setConfig({...config, roomTime: v})}
                />
            </div>

            <div className="mt-8 bg-white/40 border border-[#1d263b] p-6 rounded-sm shadow-sm">
                <button 
                  onClick={toggleFridge}
                  className="flex items-center justify-between w-full group"
                >
                    <span className="text-xs font-bold uppercase tracking-widest text-[#1d263b]">Maturação a Frio</span>
                    <div className={`w-11 h-6 rounded-full border border-[#1d263b] flex items-center px-1 transition-all duration-300 ${config.useFridge ? 'bg-[#1d263b]' : 'bg-white/50'}`}>
                        <div className={`w-3.5 h-3.5 rounded-full transition-transform duration-300 ${config.useFridge ? 'translate-x-5 bg-[#edece3]' : 'bg-[#1d263b]'}`}></div>
                    </div>
                </button>

                {config.useFridge && (
                    <div className="mt-6 space-y-4 pt-6 border-t border-[#1d263b] border-opacity-10 animate-in fade-in slide-in-from-top-2">
                        <InputGroup 
                          label="Temperatura Geladeira" 
                          value={config.fridgeTemp || 4} 
                          unit="°C"
                          min={2} max={8} 
                          onChange={(v) => setConfig({...config, fridgeTemp: v})}
                        />
                        <InputGroup 
                          label="Tempo Geladeira" 
                          value={config.fridgeTime} 
                          unit="h"
                          min={1} max={120} 
                          onChange={(v) => setConfig({...config, fridgeTime: v})}
                        />
                    </div>
                )}
            </div>
        </div>

        <div className="pt-8 space-y-6">
           <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Tipo de Fermento</span>
              <div className="flex border border-[#1d263b] rounded-sm overflow-hidden bg-white/30">
                {(['fresh', 'dry'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setConfig({...config, yeastType: type})}
                    className={`flex-1 py-4 text-[9px] font-bold uppercase tracking-widest transition-all ${config.yeastType === type ? 'bg-[#1d263b] text-[#edece3]' : 'text-[#1d263b] opacity-40 hover:opacity-100'}`}
                  >
                    {type === 'fresh' ? 'Fresco' : 'Seco'}
                  </button>
                ))}
              </div>
           </div>
           
           <div className="flex justify-between items-center py-4 border-t border-[#1d263b] border-opacity-10">
             <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Taxa de Fermento (Auto)</span>
             <span className="text-xs mono font-bold text-[#1d263b]">{calculatedYeastPercentage.toFixed(4)}%</span>
           </div>
        </div>
      </section>

      <footer className="mt-24 pt-12 border-t border-[#1d263b] border-opacity-10 text-center">
        <button 
          onClick={() => {
            setConfig(AVPN_DEFAULTS);
            setWeather(null);
          }}
          className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity mb-8 text-[#1d263b]"
        >
          Resetar para Padrão AVPN
        </button>
      </footer>
    </div>
  );
};

export default App;
