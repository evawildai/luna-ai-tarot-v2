import { TAROT_DECK } from '../data/tarotCards';

export interface AstrologyData {
  zodiacSign: string;
  zodiacSymbol: string;
  element: string;
  rulingPlanet: string;
  destinyArcana: {
    number: number;
    name: string;
    description: string;
    keywords: string[];
  };
}

export function calculateAstrologyAndDestiny(birthDateStr: string): AstrologyData | null {
  if (!birthDateStr) return null;
  const date = new Date(birthDateStr);
  if (isNaN(date.getTime())) return null;

  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1; // 1-12
  const year = date.getUTCFullYear();

  // 1. Calculate Zodiac Sign
  let zodiacSign = 'Овен';
  let zodiacSymbol = '♈';
  let element = 'Огонь';
  let rulingPlanet = 'Марс';

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    zodiacSign = 'Овен';
    zodiacSymbol = '♈';
    element = 'Огонь';
    rulingPlanet = 'Марс';
  } else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    zodiacSign = 'Телец';
    zodiacSymbol = '♉';
    element = 'Земля';
    rulingPlanet = 'Венера';
  } else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    zodiacSign = 'Близнецы';
    zodiacSymbol = '♊';
    element = 'Воздух';
    rulingPlanet = 'Меркурий';
  } else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    zodiacSign = 'Рак';
    zodiacSymbol = '♋';
    element = 'Вода';
    rulingPlanet = 'Луна';
  } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    zodiacSign = 'Лев';
    zodiacSymbol = '♌';
    element = 'Огонь';
    rulingPlanet = 'Солнце';
  } else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    zodiacSign = 'Дева';
    zodiacSymbol = '♍';
    element = 'Земля';
    rulingPlanet = 'Меркурий';
  } else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    zodiacSign = 'Весы';
    zodiacSymbol = '♎';
    element = 'Воздух';
    rulingPlanet = 'Венера';
  } else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    zodiacSign = 'Скорпион';
    zodiacSymbol = '♏';
    element = 'Вода';
    rulingPlanet = 'Плутон / Марс';
  } else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    zodiacSign = 'Стрелец';
    zodiacSymbol = '♐';
    element = 'Огонь';
    rulingPlanet = 'Юпитер';
  } else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    zodiacSign = 'Козерог';
    zodiacSymbol = '♑';
    element = 'Земля';
    rulingPlanet = 'Сатурн';
  } else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    zodiacSign = 'Водолей';
    zodiacSymbol = '♒';
    element = 'Воздух';
    rulingPlanet = 'Уран / Сатурн';
  } else {
    zodiacSign = 'Рыбы';
    zodiacSymbol = '♓';
    element = 'Вода';
    rulingPlanet = 'Нептун / Юпитер';
  }

  // 2. Calculate Destiny Arcana (Classic Tarot Numerology: sum of day, month, and year digits reduced to 1-22)
  const sumDigits = (num: number): number => {
    return num
      .toString()
      .split('')
      .reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  };

  const totalSum = sumDigits(day) + sumDigits(month) + sumDigits(year);
  let arcanaNumber = totalSum;
  while (arcanaNumber > 22) {
    arcanaNumber = sumDigits(arcanaNumber);
  }
  if (arcanaNumber === 0) arcanaNumber = 22; // 22 or 0 is The Fool / The World depending on school, mapped to Fool (0) or World (21)

  const mappedMajorCard = TAROT_DECK.find(
    (c) => c.arcana === 'major' && (c.number === arcanaNumber || (arcanaNumber === 22 && c.number === 0))
  );

  const arcanaName = mappedMajorCard ? mappedMajorCard.nameRu : `Аркан ${arcanaNumber}`;
  const description = mappedMajorCard
    ? `${mappedMajorCard.meaningUpright} Архетип: ${mappedMajorCard.psychologicalArchetype}.`
    : 'Аркан высшей духовной трансформации и раскрытия потенциала.';
  const keywords = mappedMajorCard ? mappedMajorCard.keywords : ['Мудрость', 'Предназначение'];

  return {
    zodiacSign,
    zodiacSymbol,
    element,
    rulingPlanet,
    destinyArcana: {
      number: arcanaNumber,
      name: arcanaName,
      description,
      keywords
    }
  };
}
