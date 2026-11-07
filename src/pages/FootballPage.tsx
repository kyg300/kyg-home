import { useEffect, useState } from 'react'
import { api, type Article, type FootballLeagueSummary, type FootballLiveMatch } from '../lib/api'

function formatDate(pubDate: string) {
  const date = new Date(pubDate)
  if (Number.isNaN(date.getTime())) return pubDate
  return date.toLocaleString()
}

function MatchRow({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  caption,
}: {
  homeTeam: string
  awayTeam: string
  homeScore: string | null
  awayScore: string | null
  caption: string
}) {
  return (
    <div className="football-match">
      <span className="football-match-caption">{caption}</span>
      <div className="football-match-teams">
        <span>{homeTeam}</span>
        <span className="football-match-score">
          {homeScore !== null && awayScore !== null ? `${homeScore} : ${awayScore}` : 'vs'}
        </span>
        <span>{awayTeam}</span>
      </div>
    </div>
  )
}

export default function FootballPage() {
  const [leagues, setLeagues] = useState<FootballLeagueSummary[]>([])
  const [live, setLive] = useState<FootballLiveMatch[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getFootball()
      .then(({ leagues, live, articles }) => {
        setLeagues(leagues)
        setLive(live)
        setArticles(articles)
      })
      .catch((err) => setError(err instanceof Error ? err.message : '정보를 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="page">
      <div className="page-header">
        <h1>유럽 축구</h1>
      </div>
      {loading && <p className="status-text">불러오는 중...</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && (
        <>
          <h2 className="section-title">리그별 최근·다음 경기</h2>
          <ul className="stock-list">
            {leagues.map((league) => (
              <li key={league.id} className="card stock-card">
                <div className="stock-card-header">
                  <span className="stock-name">{league.name}</span>
                </div>
                {league.recent ? (
                  <MatchRow
                    caption={`최근 경기 (${league.recent.date})`}
                    homeTeam={league.recent.homeTeam}
                    awayTeam={league.recent.awayTeam}
                    homeScore={league.recent.homeScore}
                    awayScore={league.recent.awayScore}
                  />
                ) : (
                  <p className="status-text">최근 경기 정보 없음</p>
                )}
                {league.next ? (
                  <MatchRow
                    caption={`다음 경기 (${league.next.date})`}
                    homeTeam={league.next.homeTeam}
                    awayTeam={league.next.awayTeam}
                    homeScore={null}
                    awayScore={null}
                  />
                ) : (
                  <p className="status-text">다음 경기 정보 없음</p>
                )}
              </li>
            ))}
          </ul>

          <h2 className="section-title">진행중 경기</h2>
          {live.length === 0 && <p className="status-text">현재 진행중인 경기가 없습니다.</p>}
          {live.length > 0 && (
            <ul className="stock-list">
              {live.map((match, i) => (
                <li key={i} className="card stock-card">
                  <div className="stock-card-header">
                    <span className="stock-name">{match.league}</span>
                    <span className="stock-code">
                      {match.status} {match.minute}&apos;
                    </span>
                  </div>
                  <MatchRow
                    caption="실시간"
                    homeTeam={match.homeTeam}
                    awayTeam={match.awayTeam}
                    homeScore={match.homeScore}
                    awayScore={match.awayScore}
                  />
                </li>
              ))}
            </ul>
          )}

          <h2 className="section-title">뉴스</h2>
          {articles.length === 0 && <p className="status-text">가져올 기사가 없습니다.</p>}
          {articles.length > 0 && (
            <ul className="news-list">
              {articles.map((article) => (
                <li key={article.link} className="card news-card">
                  <a href={article.link} target="_blank" rel="noopener noreferrer" className="news-title">
                    {article.title}
                  </a>
                  <div className="news-meta">
                    {article.source} · {formatDate(article.pubDate)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
