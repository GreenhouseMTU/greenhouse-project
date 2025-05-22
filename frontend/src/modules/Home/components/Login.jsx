import React, {useState, useEffect} from 'react';
import '../styles/Login.css'

// This function give all the UI of the Login/Register page
function Login() {
    const [subtitle, setSubtitle] = useState('CREATE YOUR ACCOUNT');
    const [button1, setButton1] = useState('SIGN UP');
    const [button2, setButton2] = useState('LOGIN');
    const [isFadedIn, setIsFadedIn] = useState(false);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleClick = () => {
        setIsFadedIn(false);
        setSubtitle((prevState) => prevState === 'CREATE YOUR ACCOUNT' ? 'LOGIN' : 'CREATE YOUR ACCOUNT');
        setButton1((prevState) => prevState === 'SIGN IN' ? 'SIGN UP' : 'SIGN IN');
        setButton2((prevState) => prevState === 'LOGIN' ? 'CREATE YOUR ACCOUNT' : 'LOGIN');
        
        setTimeout(() => {
            setIsFadedIn(true);
          }, 10);
      };

    const handleUsernameChange = (event) => {
        setUsername(event.target.value);
    };
    
    const handlePasswordChange = (event) => {
        setPassword(event.target.value);
    };      

    const processLogin = () => {
      console.log("Function defined");
      console.log("Login clicked");
    };


  return (
    <div className={`login ${isFadedIn ? 'fade-in' : ''}`}>
      <div className='greenRectangle'>
           <h1 className='titleGreenhouse'>GREENHOUSE MTU</h1> 
           <div className='greenLine'></div>
           <h2 className='titleCreateAccount'>{subtitle}</h2>
           <form>
                <input className='input' type='text' placeholder='Username' value={username} onChange={handleUsernameChange} />
                <input className='input' type='password' placeholder='Password' value={password} onChange={handlePasswordChange} />
           </form>
           <button className='button' onClick={processLogin}>{button1}</button>
           <div className='space'></div>
           <p className='login' onClick={handleClick}>{button2}</p>
      </div>
    </div>
  )
}

export default Login