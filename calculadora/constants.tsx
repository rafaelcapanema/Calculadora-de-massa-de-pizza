
import { DoughConfig } from './types';

export const AVPN_DEFAULTS: DoughConfig = {
  pizzas: 4,
  weightPerBall: 250,
  hydration: 60,
  salt: 3,
  yeastType: 'fresh',
  yeastPercentage: 0.15,
  roomTemp: 23,
  roomTime: 8,
  useFridge: false,
  fridgeTemp: 4,
  fridgeTime: 24,
  useOil: false,
  oil: 3
};

export const YEAST_RATIO = {
  fresh: 1,
  dry: 0.33 // Mapping 'seco' to instant dry yeast (standard in Brazil)
};
