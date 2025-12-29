import { useState } from 'react';
import '../App.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Call parent's onLogin callback with user and token
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role) => {
    const credentials = {
      nurse: { email: 'nurse@email.com', password: 'nursePassword123' },
      doctor: { email: 'doctor@email.com', password: 'doctorPassword123' },
      admin: { email: 'admin@email.com', password: 'adminPassword123' },
      patient: { email: 'patient@email.com', password: 'patientPassword123' },
    };

    const cred = credentials[role];
    setEmail(cred.email);
    setPassword(cred.password);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>E-Cliniq</h1>
          <p>Medical Practice Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="submit-btn login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="quick-login">
          <p>Quick Login (Demo):</p>
          <div className="quick-login-buttons">
            <button
              type="button"
              onClick={() => quickLogin('nurse')}
              className="quick-btn nurse-btn"
              disabled={loading}
            >
              Nurse
            </button>
            <button
              type="button"
              onClick={() => quickLogin('doctor')}
              className="quick-btn doctor-btn"
              disabled={loading}
            >
              Doctor
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin')}
              className="quick-btn admin-btn"
              disabled={loading}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => quickLogin('patient')}
              className="quick-btn patient-btn"
              disabled={loading}
            >
              Patient
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
