'use client';

import { useEffect, useMemo, useState } from 'react';

type GoogleTranslateWindow = Window & {
  google?: {
    translate?: {
      TranslateElement: new (
        options: Record<string, unknown>,
        elementId: string,
      ) => void;
    };
  };
  googleTranslateElementInit?: () => void;
};

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'or', label: 'Odia' },
] as const;

const GOOGLE_TRANSLATE_COOKIE = 'googtrans';
const GOOGLE_TRANSLATE_SCRIPT_ID = 'google-translate-script';
const GOOGLE_TRANSLATE_ELEMENT_ID = 'google_translate_element';

function getCookie(name: string): string | null {
  const entry = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return entry ? decodeURIComponent(entry.split('=').slice(1).join('=')) : null;
}

function setTranslateCookie(value: string): void {
  const cookieValue = encodeURIComponent(value);
  const yearInSeconds = 60 * 60 * 24 * 365;

  document.cookie = `${GOOGLE_TRANSLATE_COOKIE}=${cookieValue};path=/;max-age=${yearInSeconds}`;
  document.cookie = `${GOOGLE_TRANSLATE_COOKIE}=${cookieValue};path=/;max-age=${yearInSeconds};domain=${window.location.hostname}`;
}

function getActiveLanguage(): string {
  const cookie = getCookie(GOOGLE_TRANSLATE_COOKIE);
  if (!cookie) {
    return 'en';
  }

  const parts = cookie.split('/').filter(Boolean);
  const maybeLanguage = parts[1];

  if (!maybeLanguage) {
    return 'en';
  }

  return LANGUAGE_OPTIONS.some((option) => option.code === maybeLanguage)
    ? maybeLanguage
    : 'en';
}

function loadGoogleTranslateScript(): Promise<void> {
  const scopedWindow = window as GoogleTranslateWindow;

  if (scopedWindow.google?.translate?.TranslateElement) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    scopedWindow.googleTranslateElementInit = () => {
      const TranslateElement = scopedWindow.google?.translate?.TranslateElement;
      if (TranslateElement) {
        new TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: LANGUAGE_OPTIONS.map((option) => option.code)
              .filter((code) => code !== 'en')
              .join(','),
            autoDisplay: false,
            layout: 0,
          },
          GOOGLE_TRANSLATE_ELEMENT_ID,
        );
      }

      resolve();
    };

    const existingScript = document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load Google Translate script'));

    document.body.appendChild(script);
  });
}

export default function LanguageSwitcher() {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    if (typeof document === 'undefined') {
      return 'en';
    }

    return getActiveLanguage();
  });
  const includedLanguageCodes = useMemo(
    () => LANGUAGE_OPTIONS.map((option) => option.code),
    [],
  );

  useEffect(() => {
    void loadGoogleTranslateScript();
  }, []);

  const handleLanguageChange = (nextLanguage: string) => {
    if (!includedLanguageCodes.includes(nextLanguage)) {
      return;
    }

    setSelectedLanguage(nextLanguage);
    setTranslateCookie(`/en/${nextLanguage}`);
    window.location.reload();
  };

  return (
    <>
      <div
        id={GOOGLE_TRANSLATE_ELEMENT_ID}
        aria-hidden
        style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
      />
      <label
        htmlFor="site-language"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '0.5rem',
          padding: '0.3rem 0.4rem',
          background: 'rgba(5, 5, 5, 0.7)',
          color: '#ffffff',
        }}
      >
        <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>Lang</span>
        <select
          id="site-language"
          value={selectedLanguage}
          onChange={(event) => handleLanguageChange(event.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            colorScheme: 'dark',
            fontSize: '0.75rem',
            outline: 'none',
            minWidth: '5.75rem',
          }}
          aria-label="Select website language"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code} style={{ color: '#111111', background: '#ffffff' }}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
