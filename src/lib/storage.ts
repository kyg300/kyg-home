// localStorage는 사생활 보호 모드 등에서 예외를 던질 수 있어서 항상 감싸서 쓴다.

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 저장이 안 되면 이번 세션에서만 유지된다
  }
}

export const WEATHER_CITY_KEY = 'kyg_home_weather_city'
export const THEME_KEY = 'kyg_home_theme'
