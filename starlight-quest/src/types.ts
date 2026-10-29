export type PrincessId =
  | 'belle'
  | 'elsa'
  | 'rapunzel'
  | 'cinderella'
  | 'ariel'
  | 'moana'
  | 'jasmine'
  | 'anna'
  | 'tiana'
  | 'aurora'
  | 'zoe';

export type LandId =
  | 'whispering-library'
  | 'frostfall-peaks'
  | 'sunflower-meadows'
  | 'glass-slipper-village'
  | 'seashell-cove'
  | 'wayfinder-isle'
  | 'moonlit-palace-garden'
  | 'sunny-fjord-harbor'
  | 'firefly-bayou'
  | 'rosewood-glen'
  | 'starlight-hub';

export interface PrincessDef {
  name: string;
  landId: string;
  landName: string;
  portrait: string;
  color: string;
  voice: { pitch: number; rate: number };
}

export interface Choice {
  id: string;
  label: string;
}

export interface Round {
  kind?: string;
  prompt: string;
  say?: string;
  show?: string;
  choices?: string[];
  choiceSay?: Record<string, string>;
  noChoiceSay?: boolean;
  answer: string;
  answerSay?: string;
  hint: string;
  hintSay?: string;
  pic?: string;
  clock?: { hour: number; minute: number };
  visual?: any;
  tiles?: string[];
  spell?: any;
  build?: any;
  sort?: any;
  replay?: string;
  sound?: string;
  key?: string;
  tier?: number;
  requeued?: boolean;
  review?: boolean;
}

export interface QuestDef {
  title: string;
  questName: string;
  intro: string[];
  rounds?: Round[];
  complete: string[];
}

export interface SaveData {
  stars: number;
  shards: Record<string, number>;
  done: string[];
  milestones: string[];
  outfit: {
    trail?: string;
    gem?: string;
    skirt?: string;
    buddy?: boolean;
  };
  treasures: {
    day: string;
    got: string[];
    total: Record<string, number>;
    stars: string[];
  };
  seenNewKingdoms: boolean;
  seenKingdoms: string[];
  secrets: string[];
  lang: 'EN' | 'ES';
  muted: boolean;
  started: boolean;
  ladder: Record<string, any>;
  lastPlay: Record<string, string>;
  week: any;
  schoolWords: string[];
}
