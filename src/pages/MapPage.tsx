import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void
        LatLng: new (lat: number, lng: number) => unknown
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => unknown
        Marker: new (options: { position: unknown; map: unknown }) => unknown
      }
    }
  }
}

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 } // 서울시청

let kakaoScriptPromise: Promise<void> | null = null

function loadKakaoMapScript(): Promise<void> {
  if (window.kakao?.maps) return Promise.resolve()
  if (kakaoScriptPromise) return kakaoScriptPromise

  kakaoScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`
    script.async = true
    script.onload = () => window.kakao.maps.load(() => resolve())
    script.onerror = () => reject(new Error('카카오맵 스크립트를 불러오지 못했습니다'))
    document.head.appendChild(script)
  })
  return kakaoScriptPromise
}

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!KAKAO_MAP_KEY) {
      setError('카카오맵 API 키가 설정되지 않았습니다. .env의 VITE_KAKAO_MAP_KEY를 확인해주세요.')
      return
    }

    let cancelled = false

    loadKakaoMapScript()
      .then(() => {
        if (cancelled || !mapContainerRef.current) return
        const center = new window.kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng)
        const map = new window.kakao.maps.Map(mapContainerRef.current, { center, level: 4 })
        new window.kakao.maps.Marker({ position: center, map })
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="page">
      <div className="page-header">
        <h1>지도</h1>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div ref={mapContainerRef} className="map-container" />
    </section>
  )
}
