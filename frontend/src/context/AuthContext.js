import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('scfeat_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('scfeat_token') || null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // On mount, verify the server-side session is still active
  useEffect(() => {
    if (token) {
      axios.get('http://localhost:5000/api/auth/session')
        .then(res => {
          if (!res.data.active) clearAuth();
        })
        .catch(() => clearAuth())
        .finally(() => setSessionChecked(true));
    } else {
      setSessionChecked(true);
    }
  }, []);

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('scfeat_user');
    localStorage.removeItem('scfeat_token');
  };

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('scfeat_user', JSON.stringify(userData));
    localStorage.setItem('scfeat_token', authToken);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('scfeat_user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout');
    } catch (_) {}
    clearAuth();
  };

  if (!sessionChecked) return null;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
