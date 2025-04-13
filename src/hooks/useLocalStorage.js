import { useState, useEffect } from 'react';

const useLocalStorage = (key, initialValue, options = {}) => {
  // Tambahkan validasi key
  if (!key) throw new Error('Key is required for useLocalStorage');
  
  const { 
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    expiry = null // dalam milidetik
  } = options;

  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = deserialize(item);
        
        // Cek expiry
        if (expiry && parsed.timestamp) {
          const isExpired = Date.now() - parsed.timestamp > expiry;
          if (isExpired) {
            window.localStorage.removeItem(key);
            return initialValue;
          }
        }
        
        return parsed.value;
      }
      return initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      const itemToStore = {
        value: valueToStore,
        timestamp: Date.now()
      };
      
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, serialize(itemToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue];
};

export default useLocalStorage;