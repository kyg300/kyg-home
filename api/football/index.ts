import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth.js'
import { fetchFeed } from '../_lib/rss.js'

const SPORTSDB_KEY = '123'

const LEAGUES = [
  { id: '4328', name: 'EPL' },
  { id: '4335', name: '라리가' },
  { id: '4331', name: '분데스리가' },
  { id: '4332', name: '세리에 A' },
  { id: '4334', name: '리그앙' },
]

const NEWS_FEEDS = [
  { source: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' },
  { source: 'Sky Sports', url: 'https://www.skysports.com/rss/11095' },
]

interface SportsDbEvent {
  dateEvent: string
  strTime: string
  strHomeTeam: string
  strAwayTeam: string
  intHomeScore: string | null
  intAwayScore: string | null
}

interface LiveScoreEvent {
  idLeague: string
  strHomeTeam: string
  strAwayTeam: string
  intHomeScore: string
  intAwayScore: string
  strStatus: string
  strProgress: string
}

function toMatch(e: SportsDbEvent) {
  return {
    date: e.dateEvent,
    time: e.strTime,
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    homeScore: e.intHomeScore,
    awayScore: e.intAwayScore,
  }
}

async function fetchLeagueSummary(league: { id: string; name: string }) {
  const [pastRes, nextRes] = await Promise.allSettled([
    fetch(`https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/eventspastleague.php?id=${league.id}`),
    fetch(`https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/eventsnextleague.php?id=${league.id}`),
  ])

  let recent = null
  if (pastRes.status === 'fulfilled' && pastRes.value.ok) {
    const { events } = (await pastRes.value.json()) as { events: SportsDbEvent[] | null }
    recent = events?.[0] ? toMatch(events[0]) : null
  }

  let next = null
  if (nextRes.status === 'fulfilled' && nextRes.value.ok) {
    const { events } = (await nextRes.value.json()) as { events: SportsDbEvent[] | null }
    next = events?.[0] ? toMatch(events[0]) : null
  }

  return { id: league.id, name: league.name, recent, next }
}

async function fetchLive() {
  const upstream = await fetch(`https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/livescore.php?s=Soccer`)
  if (!upstream.ok) throw new Error('진행중 경기 조회 실패')
  const data = (await upstream.json()) as { livescore: LiveScoreEvent[] | null }
  const leagueIds = new Set(LEAGUES.map((l) => l.id))
  return (data.livescore ?? [])
    .filter((m) => leagueIds.has(m.idLeague))
    .map((m) => ({
      league: LEAGUES.find((l) => l.id === m.idLeague)?.name ?? m.idLeague,
      homeTeam: m.strHomeTeam,
      awayTeam: m.strAwayTeam,
      homeScore: m.intHomeScore,
      awayScore: m.intAwayScore,
      status: m.strStatus,
      minute: m.strProgress,
    }))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!requireAuth(req)) {
    return res.status(401).json({ error: '로그인이 필요합니다' })
  }

  const [leaguesResult, liveResult, newsResult] = await Promise.allSettled([
    Promise.all(LEAGUES.map(fetchLeagueSummary)),
    fetchLive(),
    Promise.allSettled(NEWS_FEEDS.map(({ source, url }) => fetchFeed(source, url))),
  ])

  const leagues = leaguesResult.status === 'fulfilled' ? leaguesResult.value : []
  const live = liveResult.status === 'fulfilled' ? liveResult.value : []
  const articles =
    newsResult.status === 'fulfilled'
      ? newsResult.value.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      : []
  articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  return res.status(200).json({ leagues, live, articles: articles.slice(0, 30) })
}
