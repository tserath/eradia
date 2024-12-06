// src/hooks/useErrorHandler.js
import { useCallback } from 'react';

export const useErrorHandler = () => {
  return useCallback((error, context = '') => {
    console.error(`Error ${context}:`, error);
    return { error: error.message };
  }, []);
};