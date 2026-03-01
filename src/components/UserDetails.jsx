import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserById } from '../services/api';

function UserDetails() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const data = await getUserById(id);
      setUser(data);
      setError(null);
    } catch (err) {
      setError('Error fetching user details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading profile data...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mt-5 mb-5 animate-fade-in-up">
        <div className="glass-panel p-5 text-center max-w-lg mx-auto">
          <i className="bi bi-person-x text-danger opacity-75 d-block mb-3" style={{ fontSize: '4rem' }}></i>
          <h4 className="text-white mb-3">Profile Not Found</h4>
          <p className="text-muted mb-4">{error || 'The requested user profile could not be located or has been removed.'}</p>
          <Link to="/users" className="btn-outline-glass px-4">
            <i className="bi bi-arrow-left me-2"></i> Return to Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4 mb-5 animate-fade-in-up">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="mb-4 d-flex align-items-center">
            <Link to="/users" className="btn-outline-glass btn-sm me-3 border-0 px-2 py-1">
              <i className="bi bi-arrow-left fs-5"></i>
            </Link>
            <h4 className="mb-0 text-white">Profile Overview</h4>
          </div>

          <div className="row g-4">
            {/* User Profile Card */}
            <div className="col-md-5 col-lg-4">
              <div className="glass-panel p-4 text-center h-100">
                <div className="bg-gradient-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4 shadow-lg border border-secondary border-opacity-50" style={{ width: '100px', height: '100px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                  <span className="text-white fw-bold display-4">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <h4 className="text-white mb-1 fw-bold">{user.name}</h4>
                <p className="font-monospace text-muted small mb-4">ID: {user.id}</p>

                <div className="pt-3 border-top border-secondary border-opacity-25 text-start">
                  <div className="mb-3">
                    <span className="text-muted small d-block mb-1 text-uppercase tracking-wide">Enrollment Date</span>
                    <span className="text-light fw-medium"><i className="bi bi-calendar-event me-2 text-primary"></i>{formatDate(user.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-muted small d-block mb-1 text-uppercase tracking-wide">Biometric Data</span>
                    <span className="text-light fw-medium"><i className="bi bi-fingerprint me-2 text-success"></i>{user.embeddings_count} Face Mappings</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance History */}
            <div className="col-md-7 col-lg-8">
              <div className="glass-panel p-4 p-md-5 h-100">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="text-white fw-semibold mb-0">Recent Attendance Logs</h5>
                  <i className="bi bi-clock-history fs-4 text-muted opacity-50"></i>
                </div>

                {user.recent_attendance && user.recent_attendance.length > 0 ? (
                  <div className="glass-table-container border border-secondary border-opacity-25 shadow-sm">
                    <div className="table-responsive">
                      <table className="table table-borderless glass-table mb-0">
                        <thead>
                          <tr>
                            <th scope="col" style={{ width: '60px' }}>#</th>
                            <th scope="col">Date Logged</th>
                            <th scope="col">Timestamp</th>
                            <th scope="col" className="text-end pe-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {user.recent_attendance.map((att, index) => (
                            <tr key={index} className="transition-all">
                              <td className="text-muted fw-medium align-middle">{index + 1}</td>
                              <td className="text-white fw-medium align-middle">
                                <i className="bi bi-calendar-check text-muted me-2"></i>
                                {att.date}
                              </td>
                              <td className="text-light align-middle">
                                {att.timestamp ? new Date(att.timestamp).toLocaleTimeString() : 'N/A'}
                              </td>
                              <td className="text-end pe-3 align-middle">
                                <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-3 py-2 rounded-pill shadow-sm">
                                  Present
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-5 border border-secondary border-opacity-25 rounded-4 bg-dark bg-opacity-25 mt-3">
                    <i className="bi bi-journal-x text-muted fs-1 opacity-50 mb-3 d-block"></i>
                    <p className="text-muted mb-0">No attendance records found for this user.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDetails;