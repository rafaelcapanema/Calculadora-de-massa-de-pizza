
import React, { useState, useMemo, useEffect } from 'react';
import { DoughConfig, Ingredients } from './types';
import { AVPN_DEFAULTS, YEAST_RATIO } from './constants';
import { InputGroup } from './components/InputGroup';
import { IngredientCard } from './components/IngredientCard';
import { GoogleGenAI } from "@google/genai";

interface WeatherInfo {
  city: string;
  temp: number;
  condition: string;
  loading: boolean;
}

const App: React.FC = () => {
  const [config, setConfig] = useState<DoughConfig>(AVPN_DEFAULTS);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);

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
    setWeather(prev => ({ ...(prev || { city: '', temp: 0, condition: '' }), loading: true }));
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `De acordo com as coordenadas lat: ${lat}, lon: ${lon}, qual é a cidade atual e a temperatura externa agora (apenas números em Celsius)? Além disso, descreva o clima em uma única palavra (ex: ensolarado, nublado, chuvoso, limpo). Responda apenas um JSON válido com os campos: "city", "temp" (number) e "condition".`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        },
      });

      const data = JSON.parse(response.text || '{}');
      if (data.city && data.temp) {
        setWeather({
          city: data.city,
          temp: data.temp,
          condition: data.condition || 'desconhecido',
          loading: false
        });
        setConfig(prev => ({ ...prev, roomTemp: Math.round(data.temp) }));
      }
    } catch (error) {
      console.error("Erro ao buscar clima:", error);
      setWeather(null);
    }
  };

  const handleRoomTempChange = (newVal: number) => {
    setConfig(prev => ({ ...prev, roomTemp: newVal }));
    
    if (!hasRequestedLocation && !weather) {
      setHasRequestedLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchLocalWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Localização negada ou erro:", error);
        }
      );
    }
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
                <div className="flex flex-col">
                  <InputGroup 
                    label="Temperatura Ambiente" 
                    value={config.roomTemp} 
                    unit="°C"
                    min={15} max={35} 
                    onChange={handleRoomTempChange}
                  />
                  {weather && !weather.loading && (
                    <div className="flex items-center gap-2 mt-2 px-1 animate-in fade-in slide-in-from-left-2 duration-500">
                      <span className="text-lg leading-none">{getWeatherIcon(weather.condition)}</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 leading-none mb-0.5">{weather.city}</span>
                        <span className="text-[9px] mono opacity-40 leading-none">{weather.temp}°C • {weather.condition}</span>
                      </div>
                    </div>
                  )}
                  {weather?.loading && (
                    <div className="flex items-center gap-2 mt-2 px-1 opacity-40 animate-pulse">
                      <div className="w-4 h-4 rounded-full border-2 border-[#1d263b] border-t-transparent animate-spin"></div>
                      <span className="text-[9px] uppercase tracking-widest font-bold">Buscando clima...</span>
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
                          value={config.fridgeTemp} 
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
            setHasRequestedLocation(false);
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
