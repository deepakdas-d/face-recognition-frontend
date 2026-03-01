import React, { useState, useEffect } from 'react';
// import { getUsers, deleteUser } from '../services/api';
import { getUsers } from '../services/api';
import { Link } from 'react-router-dom';

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Unknown error occurred';
      setError(`Error fetching users: ${errorMsg}`);
      console.error('Fetch users error details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      try {
        await deleteUser(userId);
        setUsers(users.filter(user => user.id !== userId));
      } catch (err) {
        alert('Error deleting user');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
            <h3 className="text-gradient fw-bold mb-0">User Management</h3>
            <p className="text-muted small mb-0 mt-1">Manage enrolled faces and system access</p>
          </div>
          <div className="text-end">
            <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50 px-3 py-2 rounded-pill shadow-sm">
              <i className="bi bi-people-fill me-2"></i>
              Total Users: <strong>{users.length}</strong>
            </span>
          </div>
        </div>

        {error && (
          <div className="alert bg-danger bg-opacity-25 text-white border-danger border-opacity-50 rounded-3 mb-4" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i> {error}
          </div>
        )}

        {users.length === 0 ? (
          <div className="text-center p-5 border border-secondary border-opacity-25 rounded-4 bg-dark bg-opacity-25 mt-4">
            <i className="bi bi-people text-muted fs-1 opacity-50 mb-3 d-block"></i>
            <h5 className="text-muted mb-2">No Users Found</h5>
            <p className="text-muted small mb-0">There are no registered profiles in the system.</p>
          </div>
        ) : (
          <div className="glass-table-container shadow-sm border border-secondary border-opacity-25 mt-4">
            <div className="table-responsive">
              <table className="table table-borderless glass-table mb-0">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '80px' }}>U-ID</th>
                    <th scope="col">Profile Name</th>
                    <th scope="col">Enrollment Date</th>
                    <th scope="col" className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="transition-all">
                      <td className="text-muted font-monospace align-middle">{user.id}</td>
                      <td className="align-middle">
                        <div className="d-flex align-items-center">
                          <div className="bg-gradient-primary rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm border border-secondary border-opacity-50" style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                            <span className="text-white fw-bold fs-6">{user.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <strong className="d-block text-white mb-0">{user.name}</strong>
                        </div>
                      </td>
                      <td className="align-middle text-muted small">
                        <i className="bi bi-calendar-event me-2"></i>
                        {formatDate(user.created_at)}
                      </td>
                      <td className="align-middle text-end pe-3">
                        <div className="btn-group shadow-sm">
                          <Link
                            to={`/users/${user.id}`}
                            className="btn btn-sm btn-outline-glass px-3"
                          >
                            <i className="bi bi-eye"></i><span className="d-none d-sm-inline ms-1">View</span>
                          </Link>
                          {/* <button
                            className="btn btn-sm btn-outline-danger px-3"
                            onClick={() => handleDelete(user.id, user.name)}
                          >
                            <i className="bi bi-trash"></i><span className="d-none d-sm-inline ms-1">Del</span>
                          </button> */}
                        </div>
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

export default UserList;