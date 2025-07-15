import '../styles/Dashboard.css';
import Login from './Login';
import Dashboard from './Dashboard';
import Home from './Home'; 
import Highlight from './Highlight';
import ErrorBoundary from './ErrorBoundary';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className='app'>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} /> 
          <Route path="/highlight" element={<ErrorBoundary><Highlight /></ErrorBoundary>}/>
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;