import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabaseClient';

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

    // Subscribe to auth changes to reload data
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadData(); // Reload data when auth state changes
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const today = new Date().toDateString();
      const userId = await AsyncStorage.getItem("userId");

      // Load Water from Supabase
      let finalWaterHistory = [];
      const waterData = await AsyncStorage.getItem('waterData');
      const localWater = waterData ? JSON.parse(waterData) : [];

      if (userId) {
        try {
          const { data: dbWater, error: waterError } = await supabase
            .from('water_logs')
            .select('*')
            .eq('user_id', userId)
            .order('logged_at', { ascending: false });

          if (!waterError && dbWater) {
            // Group water logs by date and sum them
            const waterByDate = {};
            dbWater.forEach(log => {
              const logDate = new Date(log.logged_at).toDateString();
              if (!waterByDate[logDate]) {
                waterByDate[logDate] = 0;
              }
              waterByDate[logDate] += log.amount_ml;
            });

            finalWaterHistory = Object.entries(waterByDate).map(([date, ml]) => ({
              date,
              ml
            }));

            // Save to local storage
            await AsyncStorage.setItem('waterData', JSON.stringify(finalWaterHistory));
          } else {
            finalWaterHistory = localWater;
          }
        } catch (err) {
          console.error("Supabase water sync error:", err);
          finalWaterHistory = localWater;
        }
      } else {
        finalWaterHistory = localWater;
      }

      const todayWater = finalWaterHistory.find(d => d.date === today)?.ml || 0;
      setWater({ today: todayWater, history: finalWaterHistory });

      // Load Sleep
      let finalSleepHistory = [];
      const sleepData = await AsyncStorage.getItem('sleepData');
      const localSleep = sleepData ? JSON.parse(sleepData) : [];

      if (userId) {
        try {
          const { data: dbSleep, error: sleepError } = await supabase
            .from('sleep_logs')
            .select('*')
            .eq('user_id', userId)
            .order('start_time', { ascending: false });

          if (!sleepError && dbSleep) {
            finalSleepHistory = dbSleep.map(entry => {
              const startTime = new Date(entry.start_time);
              const endTime = new Date(entry.end_time);
              const hours = (endTime - startTime) / (1000 * 60 * 60);

              return {
                date: startTime.toDateString(),
                hours: parseFloat(hours.toFixed(1)),
                quality: entry.quality_rating || 3
              };
            });

            // Save to local storage
            await AsyncStorage.setItem('sleepData', JSON.stringify(finalSleepHistory));
          } else {
            finalSleepHistory = localSleep;
          }
        } catch (err) {
          console.error("Supabase sleep sync error:", err);
          finalSleepHistory = localSleep;
        }
      } else {
        finalSleepHistory = localSleep;
      }

      const todaySleep = finalSleepHistory.find(d => d.date === today)?.hours || 0;
      setSleep({ today: todaySleep, history: finalSleepHistory });
      await AsyncStorage.setItem('sleepData', JSON.stringify(finalSleepHistory));

      // Load Breathing from Supabase
      let finalBreathingHistory = [];
      const breathingData = await AsyncStorage.getItem('breathingData');
      const localBreathing = breathingData ? JSON.parse(breathingData) : [];

      if (userId) {
        try {
          const { data: dbBreathing, error: breathingError } = await supabase
            .from('breathing_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('completed_at', { ascending: false });

          if (!breathingError && dbBreathing) {
            // Group breathing sessions by date and count them
            const sessionsByDate = {};
            dbBreathing.forEach(session => {
              const sessionDate = new Date(session.completed_at).toDateString();
              if (!sessionsByDate[sessionDate]) {
                sessionsByDate[sessionDate] = 0;
              }
              sessionsByDate[sessionDate]++;
            });

            finalBreathingHistory = Object.entries(sessionsByDate).map(([date, sessions]) => ({
              date,
              sessions
            }));

            // Save to local storage
            await AsyncStorage.setItem('breathingData', JSON.stringify(finalBreathingHistory));
          } else {
            finalBreathingHistory = localBreathing;
          }
        } catch (err) {
          console.error("Supabase breathing sync error:", err);
          finalBreathingHistory = localBreathing;
        }
      } else {
        finalBreathingHistory = localBreathing;
      }

      const todayBreathing = finalBreathingHistory.find(d => d.date === today)?.sessions || 0;
      setBreathing({ today: todayBreathing, history: finalBreathingHistory });

      // Load Habits
      let finalHabits = [];
      let finalLogs = [];

      // Try local first
      const storedHabits = await AsyncStorage.getItem('userHabits');
      const storedLogs = await AsyncStorage.getItem('habitLogs');
      const localHabits = storedHabits ? JSON.parse(storedHabits) : [];
      const localLogs = storedLogs ? JSON.parse(storedLogs) : [];

      if (userId) {
        try {
          // Fetch from Supabase
          const { data: dbHabits, error: habitsError } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', userId);

          const { data: dbLogs, error: logsError } = await supabase
            .from('habit_completions')
            .select('*')
            .eq('user_id', userId);

          if (!habitsError && dbHabits) {
            // Map DB habits to app format
            finalHabits = dbHabits.map(h => ({
              id: h.id,
              title: h.title,
              icon: h.icon,
              color: h.color
            }));
          } else {
            finalHabits = localHabits;
          }

          if (!logsError && dbLogs) {
            // Map DB logs to app format
            finalLogs = dbLogs.map(l => ({
              date: l.date,
              completedIds: l.completed_ids || []
            }));
          } else {
            finalLogs = localLogs;
          }

          // Sync Supabase data back to local storage for offline use or next load
          await AsyncStorage.setItem('userHabits', JSON.stringify(finalHabits));
          await AsyncStorage.setItem('habitLogs', JSON.stringify(finalLogs));

        } catch (err) {
          console.error("Supabase sync error:", err);
          // Fallback to local
          finalHabits = localHabits;
          finalLogs = localLogs;
        }
      } else {
        finalHabits = localHabits;
        finalLogs = localLogs;
      }

      setHabits({
        list: finalHabits,
        logs: finalLogs,
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

  const updateSleep = async (hours, quality = 3, customDate = null) => {
    const targetDate = customDate || new Date().toDateString();
    console.log('updateSleep called:', { hours, quality, customDate, targetDate });

    const newHistory = [...sleep.history];
    const targetIndex = newHistory.findIndex(d => d.date === targetDate);

    console.log('Current sleep history:', newHistory);
    console.log('Target index:', targetIndex);

    if (targetIndex >= 0) {
      newHistory[targetIndex] = { ...newHistory[targetIndex], hours, quality };
      console.log('Updated existing entry at index', targetIndex);
    } else {
      newHistory.unshift({ date: targetDate, hours, quality });
      console.log('Added new entry for', targetDate);
    }

    // Update today value only if we're updating today
    const todayValue = targetDate === new Date().toDateString() ? hours : sleep.today;
    console.log('Setting sleep state:', { today: todayValue, historyLength: newHistory.length });

    setSleep({ today: todayValue, history: newHistory });
    await AsyncStorage.setItem('sleepData', JSON.stringify(newHistory));
    console.log('Saved to AsyncStorage');

    // Sync to Supabase if user is logged in
    const userId = await AsyncStorage.getItem("userId");
    console.log('User ID for Supabase sync:', userId);

    if (userId) {
      try {
        // Parse the date string properly
        const dateObj = new Date(targetDate);
        const startTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 22, 0, 0); // 10 PM
        const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

        console.log('Supabase sync - checking for existing entry');

        // Delete any existing entry for this user and date, then insert new one
        const { data: existing } = await supabase
          .from('sleep_logs')
          .select('id')
          .eq('user_id', userId)
          .gte('start_time', new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).toISOString())
          .lt('start_time', new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1).toISOString())
          .single();

        if (existing) {
          console.log('Updating existing Supabase entry:', existing.id);
          // Update existing
          await supabase
            .from('sleep_logs')
            .update({
              end_time: endTime.toISOString(),
              quality_rating: quality,
            })
            .eq('id', existing.id);
        } else {
          console.log('Inserting new Supabase entry');
          // Insert new
          await supabase.from('sleep_logs').insert({
            user_id: userId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            quality_rating: quality,
          });
        }
        console.log('Supabase sync complete');
      } catch (error) {
        console.error("Error syncing sleep data:", error);
      }
    }
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
    const userId = await AsyncStorage.getItem("userId");

    if (newList) {
      setHabits(prev => ({ ...prev, list: newList }));
      await AsyncStorage.setItem('userHabits', JSON.stringify(newList));

      if (userId) {
        // Sync habits to Supabase
        // 1. Upsert current list
        const upsertData = newList.map(h => ({
          id: h.id,
          user_id: userId,
          title: h.title,
          icon: h.icon,
          color: h.color,
        }));

        // Use Promise.all to handle upserts efficiently or just fire and forget if acceptable
        // Ignoring errors to prevent UI blocking, but logging them
        supabase.from('habits').upsert(upsertData).then(({ error }) => {
          if (error) console.error("Error syncing habits:", error);
        });

        // 2. Handle deletions
        // We need to fetch existing IDs to know what to delete
        supabase.from('habits').select('id').eq('user_id', userId).then(({ data: dbHabits }) => {
          if (dbHabits) {
            const currentIds = newList.map(h => h.id);
            const toDelete = dbHabits.filter(h => !currentIds.includes(h.id)).map(h => h.id);
            if (toDelete.length > 0) {
              supabase.from('habits').delete().in('id', toDelete).then();
            }
          }
        });
      }
    }

    if (newLogs) {
      setHabits(prev => ({ ...prev, logs: newLogs }));
      await AsyncStorage.setItem('habitLogs', JSON.stringify(newLogs));

      if (userId) {
        // Sync logs to Supabase
        // We map all logs to Supabase structure
        const upsertLogs = newLogs.map(l => ({
          user_id: userId,
          date: l.date,
          completed_ids: l.completedIds,
        }));

        supabase.from('habit_completions')
          .upsert(upsertLogs, { onConflict: 'user_id, date' })
          .then(({ error }) => {
            if (error) console.error("Error syncing logs:", error);
          });
      }
    }
  };

  return (
    <WellnessContext.Provider
      value={{
        water,
        hydration: water, // Alias for consistency
        sleep,
        breathing,
        habits,
        updateWater,
        updateHydration: updateWater, // Alias for consistency
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
