import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getMe, login as loginApi, logout as logoutApi } from '@/api/auth.api';
import {
  clearSession,
  getStoredToken,
  getStoredUser,
  isSessionIdle,
  persistSession,
  touchActivity
} from '@/utils/session';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getStoredToken());
  const user = ref(getStoredUser());
  const initialized = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value));
  const displayName = computed(() => user.value?.fullName || user.value?.username || '');
  const role = computed(() => user.value?.role || '');
  const vendorLabel = computed(() => {
    const abbr = user.value?.vendorAbbr;
    const code = user.value?.vendorCode;
    if (abbr) return abbr;
    return code || '';
  });

  const setSession = (nextToken, nextUser) => {
    token.value = nextToken;
    user.value = nextUser;
    persistSession(nextToken, nextUser);
    touchActivity();
  };

  const resetSession = () => {
    token.value = null;
    user.value = null;
    clearSession();
  };

  const login = async (username, password) => {
    const response = await loginApi({ username, password });
    const payload = response.data?.data || {};
    setSession(payload.token, payload.user);
    initialized.value = true;
    return payload.user;
  };

  const restoreSession = async () => {
    if (initialized.value) {
      if (isAuthenticated.value && isSessionIdle()) {
        resetSession();
        return false;
      }
      return isAuthenticated.value;
    }

    if (!token.value || isSessionIdle()) {
      resetSession();
      initialized.value = true;
      return false;
    }

    initialized.value = true;
    if (user.value) {
      getMe()
        .then((response) => {
          const nextUser = response.data?.data?.user;
          if (nextUser && token.value) {
            setSession(token.value, nextUser);
          }
        })
        .catch((error) => {
          if (error.response?.status === 401) resetSession();
        });
      return true;
    }

    try {
      const response = await getMe();
      const nextUser = response.data?.data?.user || null;
      if (!nextUser) {
        resetSession();
        return false;
      }
      setSession(token.value, nextUser);
      return true;
    } catch {
      resetSession();
      return false;
    }
  };

  const logout = async ({ localOnly = false } = {}) => {
    const currentToken = token.value;
    resetSession();
    initialized.value = true;
    if (localOnly || !currentToken) return;
    try {
      await logoutApi();
    } catch {
      // ignore
    }
  };

  return {
    token,
    user,
    initialized,
    isAuthenticated,
    displayName,
    role,
    vendorLabel,
    setSession,
    login,
    logout,
    restoreSession,
    resetSession
  };
});
