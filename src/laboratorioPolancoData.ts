import type { NorthStarMetric, Objective, Strategy, Experiment } from './types';

// North Star Metric para Laboratorio Polanco
export const POLANCO_NORTH_STAR: NorthStarMetric = {
  name: 'Ingresos Anuales Totales (Revenue)',
  currentValue: 6500000,
  targetValue: 10000000,
  unit: '$',
  type: 'currency'
};

// Growth Levers (Objetivos Estratégicos) de Laboratorio Polanco
export const POLANCO_OBJECTIVES: Objective[] = [
  { 
    id: 'obj-dominio-busqueda', 
    title: 'Dominio de Intención de Búsqueda', 
    status: 'Active', 
    progress: 40,
    description: 'Capture high-intent traffic by aligning clinical content with next-gen search behavior (AEO, LLM search, voice queries).'
  },
  { 
    id: 'obj-hiper-personalizacion', 
    title: 'Hiper-Personalización de Conversión', 
    status: 'Active', 
    progress: 55,
    description: 'Maximize throughput by deploying hyper-personalized experiences for high-LTV segments (persona-based landings, dynamic messaging).'
  },
  { 
    id: 'obj-discovery-commerce', 
    title: 'Discovery Commerce', 
    status: 'Active', 
    progress: 25,
    description: 'Generate incremental demand through short-form educational assets (TikTok Lab, multi-platform discovery loops).'
  },
  { 
    id: 'obj-eficiencia-paid', 
    title: 'Eficiencia en Paid Media', 
    status: 'Active', 
    progress: 70,
    description: 'Reduce acquisition cost while maintaining quality through systematic creative iteration and messaging optimization.'
  }
];

// Strategic Initiatives (Estrategias) vinculadas a cada Growth Lever
export const POLANCO_STRATEGIES: Strategy[] = [
  // Initiatives for "Dominio de Intención de Búsqueda"
  { 
    id: 'strat-seo-llm', 
    title: 'SEO para LLM', 
    parentObjectiveId: 'obj-dominio-busqueda',
    targetMetric: 'Organic Traffic'
  },
  { 
    id: 'strat-bing-expansion', 
    title: 'Bing Search Expansion', 
    parentObjectiveId: 'obj-dominio-busqueda',
    targetMetric: 'Search Impressions'
  },
  
  // Initiatives for "Hiper-Personalización de Conversión"
  { 
    id: 'strat-landings-campana', 
    title: 'Landings por Campaña', 
    parentObjectiveId: 'obj-hiper-personalizacion',
    targetMetric: 'CVR'
  },
  { 
    id: 'strat-landings-persona', 
    title: 'Landings por Buyer Persona', 
    parentObjectiveId: 'obj-hiper-personalizacion',
    targetMetric: 'CVR'
  },
  
  // Initiatives for "Discovery Commerce"
  { 
    id: 'strat-tiktok-lab', 
    title: 'TikTok Education Lab', 
    parentObjectiveId: 'obj-discovery-commerce',
    targetMetric: 'Qualified Leads'
  },
  { 
    id: 'strat-multi-channel', 
    title: 'Multi-Channel Discovery', 
    parentObjectiveId: 'obj-discovery-commerce',
    targetMetric: 'Brand Awareness'
  },
  
  // Initiatives for "Eficiencia en Paid Media"
  { 
    id: 'strat-ab-creativo',
    title: 'A/B Testing Creativo', 
    parentObjectiveId: 'obj-eficiencia-paid',
    targetMetric: 'CPA'
  },
  { 
    id: 'strat-messaging', 
    title: 'Messaging Iteration', 
    parentObjectiveId: 'obj-eficiencia-paid',
    targetMetric: 'CTR'
  }
];

// Experimentos de Laboratorio Polanco
export const POLANCO_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-001',
    title: 'Answer Engine Optimization (AEO)',
    status: 'Prioritized',
    owner: { 
      name: 'Andrés García', 
      avatar: 'https://i.pravatar.cc/150?u=andres' 
    },
    hypothesis: 'Si optimizamos el contenido para responder preguntas específicas de usuarios en motores de búsqueda conversacionales (ChatGPT, Perplexity, Bing Copilot), entonces incrementaremos el tráfico orgánico en 25% porque capturaremos intención de búsqueda en formatos emergentes.',
    impact: 8,
    confidence: 6,
    ease: 7,
    iceScore: 336,
    funnelStage: 'Acquisition',
    northStarMetric: 'Tráfico Orgánico Calificado',
    linkedStrategyId: 'strat-seo-llm'
  },
  {
    id: 'exp-002',
    title: 'Landing Page "Atleta de Alto Rendimiento"',
    status: 'Building',
    owner: { 
      name: 'Alice Smith', 
      avatar: 'https://i.pravatar.cc/150?u=alice' 
    },
    hypothesis: 'Si creamos una landing page específica para el buyer persona "Atleta de Alto Rendimiento" con mensajes y CTAs personalizados, entonces la tasa de conversión aumentará en 30% porque reducimos la fricción cognitiva en la decisión de compra.',
    impact: 9,
    confidence: 7,
    ease: 6,
    iceScore: 378,
    funnelStage: 'Activation',
    northStarMetric: 'Tasa de Conversión',
    linkedStrategyId: 'strat-landings-persona',
    startDate: '2024-03-15',
    endDate: '2024-04-05'
  },
  {
    id: 'exp-003',
    title: 'TikTok Lab: "Mitos del Ayuno"',
    status: 'Idea',
    owner: { 
      name: 'María López', 
      avatar: 'https://i.pravatar.cc/150?u=maria' 
    },
    hypothesis: 'Si creamos una serie educativa en TikTok desmitificando conceptos erróneos sobre el ayuno intermitente, entonces generaremos 500+ leads calificados en 60 días porque capturaremos usuarios en la fase de discovery que aún no conocen la marca.',
    impact: 7,
    confidence: 5,
    ease: 8,
    iceScore: 280,
    funnelStage: 'Acquisition',
    northStarMetric: 'Nuevos Leads Calificados',
    linkedStrategyId: 'strat-tiktok-lab'
  },
  {
    id: 'exp-004',
    title: 'A/B Test Creativo (Meta Ads)',
    status: 'Live Testing',
    owner: { 
      name: 'Carlos Ruiz', 
      avatar: 'https://i.pravatar.cc/150?u=carlos' 
    },
    hypothesis: 'Si probamos creativos centrados en beneficios emocionales ("Siente tu mejor versión") vs. beneficios racionales ("Resultados en 48 horas"), entonces el CPA se reducirá en 20% porque alinearemos mejor el mensaje con las motivaciones del público objetivo.',
    impact: 8,
    confidence: 8,
    ease: 9,
    iceScore: 576,
    funnelStage: 'Acquisition',
    northStarMetric: 'Costo por Adquisición (CPA)',
    linkedStrategyId: 'strat-ab-creativo',
    startDate: '2024-03-01',
    endDate: '2024-03-21',
    testUrl: 'https://lmpolanco.com/promo-genetica'
  },
  {
    id: 'exp-005',
    title: 'Retargeting de Recurrencia Anual',
    status: 'Analysis',
    owner: { 
      name: 'Sofía Mendoza', 
      avatar: 'https://i.pravatar.cc/150?u=sofia' 
    },
    hypothesis: 'Si implementamos campañas de retargeting dirigidas a clientes que compraron hace 11-12 meses con un mensaje de "Es momento de tu chequeo anual", entonces la tasa de recompra aumentará en 40% porque capitalizaremos el ciclo natural de renovación de estudios clínicos.',
    impact: 9,
    confidence: 7,
    ease: 7,
    iceScore: 441,
    funnelStage: 'Retention',
    northStarMetric: 'Tasa de Recompra Anual',
    linkedStrategyId: 'strat-messaging',
    startDate: '2024-02-10',
    endDate: '2024-03-10'
  }
];
