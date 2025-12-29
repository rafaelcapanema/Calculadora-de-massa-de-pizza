
export interface DoughConfig {
  pizzas: number;
  weightPerBall: number;
  hydration: number; // percentage
  salt: number; // percentage of flour
  yeastType: 'fresh' | 'dry';
  yeastPercentage: number; // percentage of flour
  roomTemp: number; // celsius
  roomTime: number; // hours
  useFridge: boolean;
  fridgeTemp: number; // celsius
  fridgeTime: number; // hours
  useOil: boolean;
  oil: number; // percentage of flour
}

export interface Ingredients {
  flour: number;
  water: number;
  salt: number;
  yeast: number;
  oil: number;
}

export interface AIAdvice {
  summary: string;
  fermentationTips: string[];
  flourRecommendation: string;
  techniqueAdvice: string;
}
