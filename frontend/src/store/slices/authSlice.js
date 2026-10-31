import { createSlice } from '@reduxjs/toolkit';

const initialAccessToken = localStorage.getItem('erms_access_token') || null;
const initialRefreshToken = localStorage.getItem('erms_refresh_token') || null;
const initialUser = localStorage.getItem('erms_user') 
  ? JSON.parse(localStorage.getItem('erms_user')) 
  : null;

const initialState = {
  user: initialUser,
  accessToken: initialAccessToken,
  refreshToken: initialRefreshToken,
  isAuthenticated: Boolean(initialAccessToken),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, access, refresh } = action.payload;
      state.user = user || state.user;
      if (access) {
        state.accessToken = access;
        localStorage.setItem('erms_access_token', access);
      }
      if (refresh) {
        state.refreshToken = refresh;
        localStorage.setItem('erms_refresh_token', refresh);
      }
      if (user) {
        localStorage.setItem('erms_user', JSON.stringify(user));
      }
      state.isAuthenticated = true;
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem('erms_user', JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('erms_access_token');
      localStorage.removeItem('erms_refresh_token');
      localStorage.removeItem('erms_user');
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setCredentials, setUser, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
