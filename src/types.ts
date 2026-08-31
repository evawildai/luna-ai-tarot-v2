export type DeckType = 'tarot' | 'mac';

export interface TarotCard {
  id: string;
  nameRu: string;
  nameEn: string;
  arcana: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';
  number: number;
  keywords: string[];
  meaningUpright: string;
  meaningReversed: string;
  psychologicalArchetype: string;
  element: 'Огонь' | 'Вода' | 'Воздух' | 'Земля' | 'Эфир';
  astrology: string;
  symbolism: string;
  coachingQuestion: string;
  visualTheme: {
    bgGradient: string;
    accentColor: string;
    iconName: string;
    description: string;
  };
}

export interface MacCard {
  id: string;
  title: string;
  category: 'Ресурс' | 'Тень' | 'Отношения' | 'Выбор' | 'Внутренний ребенок' | 'Трансформация' | 'Препятствие';
  metaphor: string;
  description: string;
  guidingQuestions: string[];
  psychologicalFocus: string;
  affirmation: string;
  visualTheme: {
    bgGradient: string;
    accentColor: string;
    iconName: string;
    artworkPrompt: string;
  };
}

export interface SpreadPosition {
  id: number;
  title: string;
  description: string;
  hint: string;
}

export interface SpreadDefinition {
  id: string;
  title: string;
  description: string;
  category: 'tarot' | 'mac' | 'universal';
  cardCount: number;
  positions: SpreadPosition[];
  recommendedFor: string;
  iconName: string;
}

export interface DrawnCard {
  card: TarotCard | MacCard;
  deckType: DeckType;
  isReversed?: boolean;
  positionIndex: number;
  positionTitle: string;
}

export interface UserProfile {
  name: string;
  birthDate: string; // YYYY-MM-DD
  tone?: string; // голос: мягко | честно | провокативно | достигатор
  zodiacSign?: string;
  destinyArcana?: {
    number: number;
    name: string;
    description: string;
  };
}

export interface ReadingResult {
  id: string;
  createdAt: string;
  deckType: DeckType;
  spreadId: string;
  spreadTitle: string;
  question: string;
  userProfile?: UserProfile;
  drawnCards: DrawnCard[];
  interpretation: {
    summary: string;
    cardAnalyses: {
      cardName: string;
      positionTitle: string;
      meaning: string;
      psychologicalInsight: string;
    }[];
    deepPsychoanalysis: string;
    practicalAdvice: string[];
    coachingActionStep: string;
    affirmation: string;
  };
  userReflection?: string;
  isFavorite?: boolean;
}

export interface MacSessionMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  cards?: MacCard[];
  options?: string[];
}

export interface TelegramBotMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  cards?: (TarotCard | MacCard)[];
  keyboard?: {
    text: string;
    action: string;
  }[][];
}
