import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, fetchMe as apiFetchMe, logout as apiLogout, setAuthToken, getAuthToken } from '../services/api';

export const AuthContext = createContext({
  user: null,
  token: null,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getAuthToken());

  useEffect(() => {
    const existing = getAuthToken();
    if (existing && !user) {
      setAuthToken(existing);
      apiFetchMe().then((u) => {
        const normalized = u ? { ...u, role: (u.role || '').toLowerCase() } : null;
        setUser(normalized);
      }).catch(() => {
        setUser(null);
        setAuthToken(null);
      });
    }
  }, []);

  const login = useCallback(async ({ identifier, password, selectedRole }) => {
    // Normalize selectedRole to backend’s title-case if provided
    const role = selectedRole ? (selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)) : undefined;
    const { token: tkn, user: usrRaw } = await apiLogin({ identifier, password, role });
    // Normalize user role to lowercase on client for consistent checks
    const usr = { ...usrRaw, role: (usrRaw?.role || '').toLowerCase() };
    setAuthToken(tkn);
    setToken(tkn);
    setUser(usr);
    return usr;
  }, []);

  const logout = useCallback(async () => {
    try { await apiLogout(); } catch {}
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, token, login, logout }), [user, token, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
