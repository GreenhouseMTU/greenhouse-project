import '../styles/AppHome.css';
import Login from './Login';
import Dashboard from './Dashboard';
import Home from './Home'; // Importe la nouvelle page Home
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className='app'>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} /> {/* Ajoute la route pour Home */}
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;