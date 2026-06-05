import { createContext, useContext } from 'react';

// Global, low-churn settings shared with the components that compute durations.
export const SettingsContext = createContext({ countWeekends: true });
export const useSettings = () => useContext(SettingsContext);
