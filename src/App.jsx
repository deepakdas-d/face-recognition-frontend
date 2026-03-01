import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// Import components
import Navbar from './components/Navbar';
import Register from './components/Register';
import Recognize from './components/Recognize';
import AttendanceList from './components/AttendanceList';
import UserList from './components/UserList';
import UserDetails from './components/UserDetails';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="main-container animate-fade-in-up">
          <Routes>
            <Route path="/" element={
              <div className="hero-section">
                <h1 className="hero-title text-gradient">AI Attendance System</h1>
                <p className="hero-subtitle">
                  Seamlessly track and manage attendance using advanced facial recognition technology.
                </p>

                <div className="row g-4 mt-4 justify-content-center">
                  <div className="col-12 col-md-6 col-lg-3">
                    <div className="glass-panel feature-card" onClick={() => window.location.href = '/register'}>
                      <i className="bi bi-person-plus feature-icon"></i>
                      <h5 className="feature-title">Register</h5>
                      <p className="feature-desc">Enroll new users with precision facial mapping</p>
                      <button className="btn-premium w-100">Get Started</button>
                    </div>
                  </div>

                  <div className="col-12 col-md-6 col-lg-3">
                    <div className="glass-panel feature-card" onClick={() => window.location.href = '/recognize'}>
                      <i className="bi bi-camera-video feature-icon"></i>
                      <h5 className="feature-title">Recognize</h5>
                      <p className="feature-desc">Live attendance marking via secure recognition</p>
                      <button className="btn-premium btn-premium-success w-100">Launch Scanner</button>
                    </div>
                  </div>

                  <div className="col-12 col-md-6 col-lg-3">
                    <div className="glass-panel feature-card" onClick={() => window.location.href = '/attendance'}>
                      <i className="bi bi-calendar-check feature-icon"></i>
                      <h5 className="feature-title">Attendance</h5>
                      <p className="feature-desc">Real-time logs and attendance statistics</p>
                      <button className="btn-premium btn-premium-info w-100">View Logs</button>
                    </div>
                  </div>

                  <div className="col-12 col-md-6 col-lg-3">
                    <div className="glass-panel feature-card" onClick={() => window.location.href = '/users'}>
                      <i className="bi bi-people feature-icon"></i>
                      <h5 className="feature-title">Users</h5>
                      <p className="feature-desc">Manage enrolled profiles and system access</p>
                      <button className="btn-premium btn-premium-warning w-100">Manage Hub</button>
                    </div>
                  </div>
                </div>
              </div>
            } />
            <Route path="/register" element={<Register />} />
            <Route path="/recognize" element={<Recognize />} />
            <Route path="/attendance" element={<AttendanceList />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/users/:id" element={<UserDetails />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;