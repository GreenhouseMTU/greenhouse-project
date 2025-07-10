import React, { useState, useEffect } from 'react';
import '../styles/Login.css';
import { useNavigate, useLocation } from 'react-router-dom';

function Login() {
  const location = useLocation();
  const [subtitle, setSubtitle] = useState(
    location.state && location.state.mode === 'login'
      ? 'LOGIN'
      : 'CREATE YOUR ACCOUNT'
  );
  const [button1, setButton1] = useState('SIGN UP');
  const [button2, setButton2] = useState('LOGIN');
  const [isFadedIn, setIsFadedIn] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSignUpMode, setIsSignUpMode] = useState(
    !(location.state && location.state.mode === 'login')
  );
  const resetFields = () => {
  setUsername('');
  setPassword('');
  setConfirmPassword('');
  };


  const navigate = useNavigate();

  useEffect(() => {
    if (location.state && location.state.mode === 'login') {
      setIsSignUpMode(false);
      setSubtitle('LOGIN');
      setButton1('SIGN IN');
      setButton2('CREATE YOUR ACCOUNT');
    } else {
      setIsSignUpMode(true);
      setSubtitle('CREATE YOUR ACCOUNT');
      setButton1('SIGN UP');
      setButton2('LOGIN');
    }
    setIsFadedIn(true);
  }, [location.state]);

  const handleClick = () => {
    setIsFadedIn(false);
    const newMode = !isSignUpMode;
    if (newMode) resetFields();
    setIsSignUpMode(newMode);
    setSubtitle(newMode ? 'CREATE YOUR ACCOUNT' : 'LOGIN');
    setButton1(newMode ? 'SIGN UP' : 'SIGN IN');
    setButton2(newMode ? 'LOGIN' : 'CREATE YOUR ACCOUNT');

    setTimeout(() => {
      setIsFadedIn(true);
    }, 10);
  };

  const handleUsernameChange = (event) => setUsername(event.target.value);
  const handlePasswordChange = (event) => setPassword(event.target.value);
  const handleConfirmPasswordChange = (event) => setConfirmPassword(event.target.value);

  const processLogin = async (event) => {
    event.preventDefault();

    if (isSignUpMode) {
      if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      try {
        const response = await fetch('http://localhost:8080/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        if (response.status === 201) {
          alert("Account created successfully! You can now log in.");
          handleClick();
        } else if (response.status === 409) {
          alert("Username already exists.");
        } else {
          const data = await response.json();
          alert("Error: " + data.message);
        }
      } catch (error) {
        console.error("Signup error:", error);
        alert("Error connecting to server");
      }

    } else {
      try {
        const response = await fetch('http://localhost:8080/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();

        if (data.access_token) {
          localStorage.setItem("username", username);
          localStorage.setItem("access_token", data.access_token); // <-- corrige ici
          navigate('/home');
        } else {
          alert("Login failed: " + data.message);
        }
      } catch (error) {
        console.error("Login error:", error);
        alert("Error connecting to server");
      }
    }
  };

  return (
    <div className={`login-container ${isFadedIn ? 'fade-in' : ''}`}>
      <div className="greenRectangle">
        <h1 className="titleGreenhouse">GREENHOUSE MTU</h1>
        <div className="greenLine"></div>
        <h2 className="titleCreateAccount">{subtitle}</h2>
        <form onSubmit={processLogin}>
          <input
            className="input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={handleUsernameChange}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={handlePasswordChange}
            required
          />
          {isSignUpMode && (
            <input
              className="input"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
            />
          )}
          <button className="button" type="submit">
            {button1}
          </button>
        </form>
        <div className="space"></div>
        <p className="login" onClick={handleClick}>
          {button2}
        </p>
      </div>
    </div>
  );
}

export default Login;
