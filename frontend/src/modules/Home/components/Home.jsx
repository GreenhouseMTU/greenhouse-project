import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/Home.css";

function Home() {
  const [isHovered, setIsHovered] = useState(false);
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleSelectProject = () => {
    navigate('/dashboard');
  };

  return (
    <div className="home-container">

      <h2 className="welcome-message">Welcome {username} !</h2>

      <div
        className={`project-circle ${isHovered ? 'hovered' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleSelectProject}
      >
        <h1>GREENHOUSE</h1>
        <p>View sensor data from your greenhouse</p>
        {isHovered && (
          <div className="project-info">
            <div className="project-info-bg" />
            <button className="select-project-btn">
              Select this project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
