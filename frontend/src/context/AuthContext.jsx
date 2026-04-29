import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || null);
  const [user, setUser] = useState(null);

  const login = useCallback(async (email, password, stayConnected = false) => {
    const data = await api.post('/login', { email, password });
    if (stayConnected) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('email', email);
    } else {
      sessionStorage.setItem('authToken', data.token);
      sessionStorage.setItem('email', email);
    }
    setToken(data.token);
    const userData = await api.get(`/user?email=${encodeURIComponent(email)}`, data.token);
    if (stayConnected) {
      localStorage.setItem('userName', userData.nom);
      localStorage.setItem('email', userData.email);
    } else {
      sessionStorage.setItem('userName', userData.nom);
      sessionStorage.setItem('email', userData.email);
    }
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('email');
    localStorage.removeItem('userName');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('userName');
    setToken(null);
    setUser(null);
  }, []);

  const getEmail = useCallback(() => {
    return sessionStorage.getItem('email') || localStorage.getItem('email') || null;
  }, []);

  const isAuthenticated = useCallback(async () => {
    const t = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    if (!t) return false;
    try {
      await api.get('/protected', t);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const t = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    const email = sessionStorage.getItem('email') || localStorage.getItem('email');
    if (t && email) {
      api.get(`/user?email=${encodeURIComponent(email)}`, t)
        .then(setUser)
        .catch(() => {});
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, getEmail, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
