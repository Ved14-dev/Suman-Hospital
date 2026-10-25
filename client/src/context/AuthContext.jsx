import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiLogin, apiRegister, apiMe } from '../api/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => sessionStorage.getItem('suman_token'));
  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('suman_user') || 'null'));
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    apiMe(token).then((result) => setUser(result.user)).catch(() => { sessionStorage.clear(); setToken(null); setUser(null); }).finally(() => setLoading(false));
  }, [token]);

  const saveSession = (result) => { sessionStorage.setItem('suman_token', result.token); sessionStorage.setItem('suman_user', JSON.stringify(result.user)); setToken(result.token); setUser(result.user); };
  const login = async (values) => saveSession(await apiLogin(values));
  const register = async (values) => saveSession(await apiRegister(values));
  const logout = () => { sessionStorage.clear(); setToken(null); setUser(null); };
  return <AuthContext.Provider value={{ token, user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
};
