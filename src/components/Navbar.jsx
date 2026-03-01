import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar navbar-expand-lg glass-nav py-3">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          <i className="bi bi-person-bounding-box text-gradient me-2"></i>
          <span className="text-gradient">Neo</span>Vision
        </Link>
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <i className="bi bi-list fs-2 text-white"></i>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto gap-2">
            <li className="nav-item">
              <Link
                className={`nav-link px-3 rounded-pill transition-all ${location.pathname === '/' ? 'bg-primary text-white' : 'text-white-50 hover-text-white'}`}
                to="/"
              >
                <i className="bi bi-house-door me-1"></i> Home
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link px-3 rounded-pill transition-all ${location.pathname === '/register' ? 'bg-primary text-white' : 'text-white-50 hover-text-white'}`}
                to="/register"
              >
                <i className="bi bi-person-plus me-1"></i> Register
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link px-3 rounded-pill transition-all ${location.pathname === '/recognize' ? 'bg-primary text-white' : 'text-white-50 hover-text-white'}`}
                to="/recognize"
              >
                <i className="bi bi-camera me-1"></i> Scanner
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link px-3 rounded-pill transition-all ${location.pathname === '/attendance' ? 'bg-primary text-white' : 'text-white-50 hover-text-white'}`}
                to="/attendance"
              >
                <i className="bi bi-calendar-check me-1"></i> Logs
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link px-3 rounded-pill transition-all ${location.pathname === '/users' ? 'bg-primary text-white' : 'text-white-50 hover-text-white'}`}
                to="/users"
              >
                <i className="bi bi-people me-1"></i> Users
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;