import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import "../styles/NewsStyles.css";



const News = ({ activeMenu, setActiveMenu }) => {
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get("http://localhost:5001/api/military-news");
        setNewsData(response.data);
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="dashboard-container">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      <div className="main-content">
        <div className="header">
          <h1>Military News</h1>
        </div>

        <div className="news-container">
          {loading ? (
            <p>Loading News...</p>
          ) : newsData.length > 0 ? (
            newsData.map((news, index) => (
              <div className="news-card" key={index}>
                
                {news.image && (
                  <img
                    src={news.image}
                    alt="news"
                    className="news-image"
                  />
                )}

                <h3>{news.title}</h3>

                <p className="news-date">
                  {new Date(news.publishedAt).toLocaleDateString()}
                </p>

                <p>{news.description}</p>

                <a
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="read-more"
                >
                  Read More →
                </a>
              </div>
            ))
          ) : (
            <p>No News Found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default News;
