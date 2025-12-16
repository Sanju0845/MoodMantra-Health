import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import en from './locales/en';
import hi from './locales/hi';
import kn from './locales/kn';
import ml from './locales/ml';

const resources = {
    en: { translation: en },
    hi: { translation: hi },
    kn: { translation: kn },
    ml: { translation: ml },
};

// Get device locale
const deviceLocales = getLocales();
const deviceLanguageCode = deviceLocales?.[0]?.languageCode;
const supportedLanguages = ['en', 'hi', 'kn', 'ml'];

// Determine default language: device language if supported, otherwise 'en'
const defaultLanguage = supportedLanguages.includes(deviceLanguageCode)
    ? deviceLanguageCode
    : 'en';

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: defaultLanguage, // Use device language initially
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

// Asynchronously load the saved language (overrides device default if user manually selected one)
AsyncStorage.getItem('language').then((savedLanguage) => {
    if (savedLanguage) {
        i18n.changeLanguage(savedLanguage);
    }
});

export default i18n;
