import type { Objective, Strategy } from './types';

export const MOCK_OBJECTIVES: Objective[] = [
  { id: 'obj1', title: 'Increase Revenue by 20%', status: 'Active', progress: 45 }, 
  { id: 'obj2', title: 'Improve User Retention', status: 'Active', progress: 60 }, 
  { id: 'obj3', title: 'Boost Viral Growth', status: 'Active', progress: 30 }, 
  { id: 'obj4', title: 'Optimize Acquisition Funnel', status: 'Active', progress: 55 }
];

export const MOCK_STRATEGIES: Strategy[] = [
  { id: 'strat1', title: 'Optimize Checkout Flow', parentObjectiveId: 'obj1' }, 
  { id: 'strat2', title: 'Dynamic Pricing Strategy', parentObjectiveId: 'obj1' }, 
  { id: 'strat3', title: 'Personalization Engine', parentObjectiveId: 'obj2' }, 
  { id: 'strat4', title: 'Referral Program Improvements', parentObjectiveId: 'obj3' }, 
  { id: 'strat5', title: 'Landing Page Speed Optimization', parentObjectiveId: 'obj4' }, 
  { id: 'strat6', title: 'Email Capture Strategy', parentObjectiveId: 'obj4' }
];
