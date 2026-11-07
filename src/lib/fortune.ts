export interface Zodiac {
  key: string
  name: string
  emoji: string
}

export const ZODIACS: Zodiac[] = [
  { key: 'rat', name: '쥐띠', emoji: '🐀' },
  { key: 'ox', name: '소띠', emoji: '🐂' },
  { key: 'tiger', name: '호랑이띠', emoji: '🐯' },
  { key: 'rabbit', name: '토끼띠', emoji: '🐰' },
  { key: 'dragon', name: '용띠', emoji: '🐉' },
  { key: 'snake', name: '뱀띠', emoji: '🐍' },
  { key: 'horse', name: '말띠', emoji: '🐴' },
  { key: 'goat', name: '양띠', emoji: '🐐' },
  { key: 'monkey', name: '원숭이띠', emoji: '🐵' },
  { key: 'rooster', name: '닭띠', emoji: '🐓' },
  { key: 'dog', name: '개띠', emoji: '🐶' },
  { key: 'pig', name: '돼지띠', emoji: '🐷' },
]

const OVERALL = [
  '평소보다 운이 잘 따르는 하루입니다. 적극적으로 움직여보세요.',
  '작은 행운이 연달아 찾아올 수 있어요. 주변을 잘 살펴보세요.',
  '무리하지 않고 차분하게 흘러가면 무난한 하루가 될 거예요.',
  '예상치 못한 변수가 생길 수 있으니 유연하게 대응하세요.',
  '그동안 준비한 일이 빛을 보기 시작하는 시점입니다.',
  '사소한 오해가 생기기 쉬우니 말 한마디를 조심하세요.',
  '새로운 시작에 좋은 기운이 감돕니다. 미루던 일을 꺼내보세요.',
  '컨디션 난조를 느낄 수 있어요, 무리한 일정은 피하세요.',
  '주변 사람의 조언이 큰 도움이 되는 하루입니다.',
  '혼자보다 함께할 때 더 좋은 결과가 나올 수 있어요.',
]

const MONEY = [
  '예상치 못한 지출이 생길 수 있으니 큰 결제는 미루는 게 좋아요.',
  '작은 수입이나 보너스 같은 소식이 들려올 수 있어요.',
  '투자보다는 저축에 집중하면 마음이 편한 하루입니다.',
  '금전 거래에서는 서류나 약속을 꼼꼼히 확인하세요.',
  '지갑 단속을 잘 하면 흐름이 나쁘지 않은 하루예요.',
  '누군가에게 돈을 빌려주거나 보증서는 일은 피하는 게 좋겠어요.',
  '재물운이 상승세라 계획했던 소비를 해도 괜찮은 날입니다.',
]

const LOVE = [
  '솔직한 마음을 표현하면 관계가 한 단계 가까워질 수 있어요.',
  '다툼의 소지가 있으니 사소한 일로 예민해지지 않도록 주의하세요.',
  '새로운 인연이 가까운 곳에서 찾아올 수 있는 날입니다.',
  '연인/배우자와의 대화에서 경청하는 태도가 중요해요.',
  '혼자만의 시간을 충분히 가지면 마음이 편안해지는 하루예요.',
  '오래된 인연에게서 반가운 연락이 올 수 있어요.',
  '관계에 있어 서두르지 않는 편이 좋은 결과를 가져옵니다.',
]

const HEALTH = [
  '수면 부족이 컨디션에 영향을 줄 수 있으니 일찍 쉬어주세요.',
  '가벼운 스트레칭이나 산책이 몸과 마음에 큰 도움이 됩니다.',
  '소화기관이 약해질 수 있으니 과식은 피하는 게 좋아요.',
  '전반적으로 컨디션이 좋은 편이라 활동하기 좋은 날입니다.',
  '눈과 목의 피로가 쌓이기 쉬우니 중간중간 휴식을 취하세요.',
  '스트레스 관리가 필요한 시점이에요, 좋아하는 일을 해보세요.',
  '몸이 보내는 작은 신호를 무시하지 말고 챙기는 하루가 되세요.',
]

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash
}

function pick<T>(pool: T[], seed: string): T {
  const hash = hashSeed(seed)
  return pool[hash % pool.length]
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export interface DailyFortune {
  score: number
  overall: string
  money: string
  love: string
  health: string
}

export function getDailyFortune(zodiacKey: string, date = new Date()): DailyFortune {
  const day = todayKey(date)
  const base = `${day}-${zodiacKey}`
  const score = 50 + (hashSeed(`${base}-score`) % 51)
  return {
    score,
    overall: pick(OVERALL, `${base}-overall`),
    money: pick(MONEY, `${base}-money`),
    love: pick(LOVE, `${base}-love`),
    health: pick(HEALTH, `${base}-health`),
  }
}
