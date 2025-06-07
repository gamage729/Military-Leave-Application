import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import "../styles/NewsStyles.css";
import { Calendar, Clock } from "lucide-react";

const News = ({ activeMenu, setActiveMenu }) => {
  const [newsData, setNewsData] = useState([]);
  const [loading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get("http://localhost:5001/api/military-news");
        setNewsData(response.data);
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchNews();
  }, []);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };

  const getCurrentDate = () => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString(undefined, options);
  };

  // If we have news, split into featured and regular
  const featuredNews = newsData.length > 0 ? newsData[0] : null;
  const secondaryNews = newsData.length > 1 ? newsData[1] : null;
  const remainingNews = newsData.length > 2 ? newsData.slice(2) : [];

  return (
    <div className="dashboard-container-news">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      <div className="news-main-content">
        <div className="news-header-bar">
          <div className="current-date">{getCurrentDate()}</div>
          <h1 className="news-masthead">Military News</h1>
          
        </div>

        {loading ? (
          <div className="news-loading">
            <div className="loading-spinner"></div>
            <p>Loading latest military news...</p>
          </div>
        ) : newsData.length > 0 ? (
          <div className="news-content-area">
            <div className="news-main-column">
              {/* Featured news - large top story */}
              {featuredNews && (
                <div className="featured-news">
                  <div className="featured-news-image-container">
                    {featuredNews.image ? (
                      <img 
                        src={featuredNews.image} 
                        alt={featuredNews.title} 
                        className="featured-news-image"
                      />
                    ) : (
                      <div className="featured-news-image placeholder-image">
                        <span>Military News</span>
                      </div>
                    )}
                    <div className="news-source-overlay">
                      {featuredNews.source?.name || "Military News"}
                    </div>
                  </div>
                  
                  <div className="featured-news-content">
                    <div className="featured-news-meta">
                      <span className="news-date">
                        <Calendar size={14} />
                        {formatDate(featuredNews.publishedAt)}
                      </span>
                    </div>
                    
                    <h2 className="featured-news-title">{featuredNews.title}</h2>
                    
                    <p className="featured-news-description">{featuredNews.description}</p>
                    
                    <a href={featuredNews.url} target="_blank" rel="noopener noreferrer" className="continue-reading">
                      Continue Reading
                    </a>
                  </div>
                </div>
              )}

              {/* News Analysis Section */}
              <div className="news-analysis-section">
                <div className="section-header">
                  <h3>NEWS ANALYSIS</h3>
                </div>
                
                <div className="news-grid-two-column">
                  {secondaryNews && (
                    <div className="secondary-news-item">
                      {secondaryNews.image ? (
                        <img 
                          src={secondaryNews.image} 
                          alt={secondaryNews.title}
                          className="secondary-news-image" 
                        />
                      ) : (
                        <div className="secondary-news-image placeholder-image">
                          <span>Military News</span>
                        </div>
                      )}
                      
                      <div className="news-date-small">
                        {formatDate(secondaryNews.publishedAt)}
                      </div>
                      
                      <h3 className="secondary-news-title">{secondaryNews.title}</h3>
                      
                      <p className="secondary-news-description">{secondaryNews.description.substring(0, 100)}...</p>
                      
                      <a href={secondaryNews.url} target="_blank" rel="noopener noreferrer" className="read-more-link">
                        Read Full Story
                      </a>
                    </div>
                  )}
                  
                  {remainingNews.length > 0 && (
                    <div className="secondary-news-item">
                      {remainingNews[0].image ? (
                        <img 
                          src={remainingNews[0].image} 
                          alt={remainingNews[0].title}
                          className="secondary-news-image" 
                        />
                      ) : (
                        <div className="secondary-news-image placeholder-image">
                          <span>Military News</span>
                        </div>
                      )}
                      
                      <div className="news-date-small">
                        {formatDate(remainingNews[0].publishedAt)}
                      </div>
                      
                      <h3 className="secondary-news-title">{remainingNews[0].title}</h3>
                      
                      <p className="secondary-news-description">{remainingNews[0].description.substring(0, 100)}...</p>
                      
                      <a href={remainingNews[0].url} target="_blank" rel="noopener noreferrer" className="read-more-link">
                        Read Full Story
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Latest News Section */}
              {remainingNews.length > 1 && (
                <div className="latest-news-section">
                  <div className="section-header">
                    <h3>LATEST UPDATES</h3>
                  </div>
                  
                  <div className="latest-news-grid">
                    {remainingNews.slice(1).map((news, index) => (
                      <div className="latest-news-item" key={index}>
                        <div className="latest-news-content">
                          <div className="latest-news-meta">
                            <span className="news-time">
                              <Clock size={12} />
                              {formatTime(news.publishedAt)}
                            </span>
                          </div>
                          
                          <h4 className="latest-news-title">{news.title}</h4>
                          
                          <p className="latest-news-description">{news.description.substring(0, 60)}...</p>
                          
                          <a href={news.url} target="_blank" rel="noopener noreferrer" className="read-more-small">
                            Read More
                          </a>
                        </div>
                        
                        {news.image && (
                          <div className="latest-news-image-container">
                            <img 
                              src={news.image} 
                              alt={news.title}
                              className="latest-news-image" 
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right sidebar for more news */}
            <div className="news-sidebar">
              <div className="sidebar-section">
                <h3 className="sidebar-header">FEATURED STORIES</h3>
                
                {remainingNews.slice(0, 4).map((news, index) => (
                  <div className="sidebar-news-item" key={index}>
                    <div className="sidebar-news-image-container">
                      {news.image ? (
                        <img 
                          src={news.image} 
                          alt={news.title}
                          className="sidebar-news-image" 
                        />
                      ) : (
                        <div className="sidebar-news-image-placeholder"></div>
                      )}
                    </div>
                    
                    <div className="sidebar-news-content">
                      <h4 className="sidebar-news-title">{news.title}</h4>
                      
                      <div className="sidebar-news-source">
                        {news.source?.name || "Military News"} • {formatDate(news.publishedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="no-news-found">
            <h3>No Military News Available</h3>
            <p>Please check back later for updates on military news and developments.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default News;