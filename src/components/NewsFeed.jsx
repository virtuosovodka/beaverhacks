import { useState, useEffect } from 'react'

function NewsFeed({ candidateName }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(``)
    //link:https://newsapi.org/v2/everything?q=${candidateName}&sortBy=publishedAt&pageSize=5&apiKey=YOUR_API_KEY_HERE
      .then(res => res.json())
      .then(data => {
        setArticles(data.articles || [])
        setLoading(false)
      })
  }, [candidateName])

  if (loading) return <p>Loading news...</p>

  return (
    <div>
      <h3>Recent News</h3>
      {articles.map((article, i) => (
        <div key={i} style={{ borderBottom: "1px solid #ccc", marginBottom: "12px" }}>
          <a href={article.url} target="_blank" rel="noreferrer">
            <strong>{article.title}</strong>
          </a>
          <p>{article.source.name}</p>
          <p>{article.description}</p>
        </div>
      ))}
    </div>
  )
}

export default NewsFeed