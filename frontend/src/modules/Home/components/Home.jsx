import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/Home.css";

function Home() {
  const [isHoveredDashboard, setIsHoveredDashboard] = useState(false);
  const [isHoveredHighlight, setIsHoveredHighlight] = useState(false);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleSelectProject = (path) => {
    navigate(path);
  };

  return (
    <div className="home-container">
      <h2 className="welcome-message">Welcome {username} !</h2>

      <div className="projects-container">
        {/* Dashboard Project Circle */}
        <div
          className={`project-circle ${isHoveredDashboard ? 'hovered' : ''}`}
          onMouseEnter={() => setIsHoveredDashboard(true)}
          onMouseLeave={() => setIsHoveredDashboard(false)}
          onClick={() => handleSelectProject('/dashboard')}
        >
          <h1>DASHBOARD</h1>
          <p>View sensor data from your greenhouse</p>
          {isHoveredDashboard && (
            <div className="project-info">
              <div className="project-info-bg" />
              <button className="select-project-btn">
                Select this project
              </button>
            </div>
          )}
        </div>

        {/* Highlight Project Circle */}
        <div
          className={`project-circle ${isHoveredHighlight ? 'hovered' : ''}`}
          onMouseEnter={() => setIsHoveredHighlight(true)}
          onMouseLeave={() => setIsHoveredHighlight(false)}
          onClick={() => handleSelectProject('/highlight')}
        >
          <h1>HIGHLIGHT</h1>
          <p>View highlights from your greenhouse</p>
          {isHoveredHighlight && (
            <div className="project-info">
              <div className="project-info-bg highlight-bg" />
              <button className="select-project-btn">
                Select this project
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="arrow">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
}

export default Home;