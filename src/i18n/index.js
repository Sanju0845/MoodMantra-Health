import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Initialize with default 'en' immediately so the app can render
i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

// Asynchronously load the saved language
AsyncStorage.getItem('language').then((savedLanguage) => {
    if (savedLanguage) {
        i18n.changeLanguage(savedLanguage);
    }
});

export default i18n;
