import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <section className="page">
      <h1>kyg-home에 오신 걸 환영합니다</h1>
      <p>회원가입하고 게시판에 글을 남겨보세요.</p>
      <Link to="/board" className="btn btn-primary">
        게시판 가기
      </Link>
    </section>
  )
}
