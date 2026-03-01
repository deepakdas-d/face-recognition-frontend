import React, { useState, useEffect } from 'react';
import { getTodayAttendance } from '../services/api';

function AttendanceList() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const data = await getTodayAttendance();
      setAttendance(data);
      setError(null);
    } catch (err) {
      setError('Error fetching attendance records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4 mb-5 animate-fade-in-up">
      <div className="glass-panel p-4 p-md-5">
        <div className="d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25 pb-3 mb-4">
          <div>
            <h3 className="text-gradient fw-bold mb-0">Today's Attendance</h3>
            <p className="text-muted small mb-0 mt-1">Real-time log of recorded presence</p>
          </div>
          <div className="text-end">
            <span className="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-50 px-3 py-2 rounded-pill shadow-sm">
              <i className="bi bi-people-fill me-2"></i>
              Total Present: <strong>{attendance.length}</strong>
            </span>
          </div>
        </div>

        {error && (
          <div className="alert bg-danger bg-opacity-25 text-white border-danger border-opacity-50 rounded-3 mb-4" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i> {error}
          </div>
        )}

        {attendance.length === 0 ? (
          <div className="text-center p-5 border border-secondary border-opacity-25 rounded-4 bg-dark bg-opacity-25 mt-4">
            <i className="bi bi-inbox text-muted fs-1 opacity-50 mb-3 d-block"></i>
            <h5 className="text-muted mb-2">No Records Yet</h5>
            <p className="text-muted small mb-0">No attendance has been logged for today.</p>
          </div>
        ) : (
          <div className="glass-table-container shadow-sm border border-secondary border-opacity-25 mt-4">
            <div className="table-responsive">
              <table className="table table-borderless glass-table mb-0">
                <thead>
                  <tr>
                    <th scope="col" className="text-center" style={{ width: '60px' }}>#</th>
                    <th scope="col">Employee / Student</th>
                    <th scope="col">Time Recorded</th>
                    <th scope="col" className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record, index) => (
                    <tr key={record.attendance_id} className="transition-all">
                      <td className="text-center text-muted fw-medium">{index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-opacity-25 text-primary rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm border border-primary border-opacity-25" style={{ width: '40px', height: '40px' }}>
                            <i className="bi bi-person fw-bold fs-5"></i>
                          </div>
                          <div>
                            <strong className="d-block text-white mb-1">{record.name}</strong>
                            <span className="badge bg-dark border border-secondary border-opacity-50 text-muted font-monospace small">ID: {record.user_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="fw-medium text-light">
                        <i className="bi bi-clock me-2 text-muted"></i>
                        {formatTime(record.timestamp)}
                      </td>
                      <td className="text-center">
                        <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-3 py-2 rounded-pill shadow-sm">
                          <i className="bi bi-check-circle me-1"></i> Present
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceList;