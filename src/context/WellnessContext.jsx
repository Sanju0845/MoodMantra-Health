import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WellnessContext = createContext();

export const useWellness = () => useContext(WellnessContext);

export const WellnessProvider = ({ children }) => {
  const [water, setWater] = useState({ today: 0, history: [] });
  const [sleep, setSleep] = useState({ today: 0, history: [] });
  const [breathing, setBreathing] = useState({ today: 0, history: [] });
  const [habits, setHabits] = useState({ list: [], logs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const today = new Date().toDateString();

      // Load Water
      const waterData = await AsyncStorage.getItem('waterData');
      const parsedWater = waterData ? JSON.parse(waterData) : [];
      const todayWater = parsedWater.find(d => d.date === today)?.ml || 0;
      setWater({ today: todayWater, history: parsedWater });

      // Load Sleep
      const sleepData = await AsyncStorage.getItem('sleepData');
      const parsedSleep = sleepData ? JSON.parse(sleepData) : [];
      const todaySleep = parsedSleep.find(d => d.date === today)?.hours || 0;
      setSleep({ today: todaySleep, history: parsedSleep });

      // Load Breathing
      const breathingData = await AsyncStorage.getItem('breathingData');
      const parsedBreathing = breathingData ? JSON.parse(breathingData) : [];
      const todayBreathing = parsedBreathing.find(d => d.date === today)?.sessions || 0;
      setBreathing({ today: todayBreathing, history: parsedBreathing });

      // Load Habits
      const storedHabits = await AsyncStorage.getItem('userHabits');
      const storedLogs = await AsyncStorage.getItem('habitLogs');
      setHabits({
        list: storedHabits ? JSON.parse(storedHabits) : [],
        logs: storedLogs ? JSON.parse(storedLogs) : [],
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading wellness data:', error);
      setLoading(false);
    }
  };

  const updateWater = async (amount) => {
    const today = new Date().toDateString();
    const newHistory = [...water.history];
    const todayIndex = newHistory.findIndex(d => d.date === today);

    if (todayIndex >= 0) {
      newHistory[todayIndex].ml = amount;
    } else {
      newHistory.unshift({ date: today, ml: amount });
    }

    setWater({ today: amount, history: newHistory });
    await AsyncStorage.setItem('waterData', JSON.stringify(newHistory));
  };

  const updateSleep = async (hours, quality = 3) => {
    const today = new Date().toDateString();
    const newHistory = [...sleep.history];
    const todayIndex = newHistory.findIndex(d => d.date === today);

    if (todayIndex >= 0) {
      newHistory[todayIndex] = { ...newHistory[todayIndex], hours, quality };
    } else {
      newHistory.unshift({ date: today, hours, quality });
    }

    setSleep({ today: hours, history: newHistory });
    await AsyncStorage.setItem('sleepData', JSON.stringify(newHistory));
  };

  const updateBreathing = async (sessions) => {
    const today = new Date().toDateString();
    const newHistory = [...breathing.history];
    const todayIndex = newHistory.findIndex(d => d.date === today);

    if (todayIndex >= 0) {
      newHistory[todayIndex].sessions = sessions;
    } else {
      newHistory.unshift({ date: today, sessions });
    }

    setBreathing({ today: sessions, history: newHistory });
    await AsyncStorage.setItem('breathingData', JSON.stringify(newHistory));
  };

  const updateHabits = async (newList, newLogs) => {
    if (newList) {
      setHabits(prev => ({ ...prev, list: newList }));
      await AsyncStorage.setItem('userHabits', JSON.stringify(newList));
    }
    if (newLogs) {
      setHabits(prev => ({ ...prev, logs: newLogs }));
      await AsyncStorage.setItem('habitLogs', JSON.stringify(newLogs));
    }
  };

  return (
    <WellnessContext.Provider
      value={{
        water,
        sleep,
        breathing,
        habits,
        updateWater,
        updateSleep,
        updateBreathing,
        updateHabits,
        refreshData: loadData
      }}
    >
      {children}
    </WellnessContext.Provider>
  );
};
