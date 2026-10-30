'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type RecognitionAlternative = {
  transcript: string;
};

type RecognitionResult = {
  isFinal: boolean;
  0: RecognitionAlternative;
};

type RecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type RecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type VoiceCommand = {
  keywords: string[];
  action: () => void;
};

const SPEECH_LANG_BY_TRANSLATE_CODE: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  or: 'or-IN',
};

const TRANSLATE_COOKIE = 'googtrans';

function getCookie(name: string): string | null {
  const entry = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return entry ? decodeURIComponent(entry.split('=').slice(1).join('=')) : null;
}

function getTranslateCodeFromCookie(): string {
  if (typeof document === 'undefined') {
    return 'en';
  }

  const cookie = getCookie(TRANSLATE_COOKIE);
  if (!cookie) {
    return 'en';
  }

  const parts = cookie.split('/').filter(Boolean);
  return parts[1] || 'en';
}

function getSpeechLangFromTranslateCode(): string {
  const code = getTranslateCodeFromCookie();
  return SPEECH_LANG_BY_TRANSLATE_CODE[code] || 'en-IN';
}

function normalizeTranscript(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(transcript: string, options: string[]): boolean {
  return options.some((option) => transcript.includes(option));
}

function pickBestMatchedCommand(transcript: string, commands: VoiceCommand[]): VoiceCommand | null {
  let bestCommand: VoiceCommand | null = null;
  let bestScore = -1;

  for (const command of commands) {
    const matchedKeywords = command.keywords.filter((keyword) => transcript.includes(keyword));
    if (!matchedKeywords.length) {
      continue;
    }

    const score = Math.max(...matchedKeywords.map((keyword) => keyword.length));
    if (score > bestScore) {
      bestScore = score;
      bestCommand = command;
    }
  }

  return bestCommand;
}

export default function VoiceNavigator() {
  const router = useRouter();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [lastHeard, setLastHeard] = useState<string>('');
  const [speechLang] = useState<string>(() => getSpeechLangFromTranslateCode());
  const [statusText, setStatusText] = useState<string>('Voice navigation is ready.');

  const commandMap = useMemo<VoiceCommand[]>(
    () => [
      {
        keywords: ['home', 'landing', 'होम', 'হোম', 'హోమ్'],
        action: () => router.push('/'),
      },
      {
        keywords: ['vision', 'विजन', 'ভিশন', 'విజన్'],
        action: () => {
          document.getElementById('vision')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      },
      {
        keywords: ['technology', 'टेक्नोलॉजी', 'প্রযুক্তি', 'టెక్నాలజీ'],
        action: () => {
          document.getElementById('technology')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      },
      {
        keywords: ['about', 'about us', 'हमारे बारे में', 'আমাদের সম্পর্কে', 'మా గురించి'],
        action: () => {
          document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      },
      {
        keywords: ['sign in', 'login', 'dashboard', 'लॉगिन', 'প্রবেশ', 'లాగిన్'],
        action: () => {
          window.location.href = 'http://localhost:5173/#/login';
        },
      },
      {
        keywords: ['open app', 'open trinetra app', 'ऐप खोलो', 'অ্যাপ খুলুন', 'యాప్ ఓపెన్'],
        action: () => {
          window.location.href = 'http://localhost:5173/#/dashboard';
        },
      },
      {
        keywords: [
          'ai guided map', 'guided map', 'guided maps', 'guide map', 'map guide',
          'open ai map', 'ai map', 'smart map', 'guided',
          'मार्गदर्शित नक्शा', 'एआई मैप', 'मानचित्र', 'গাইডেড ম্যাপ', 'মানচিত্র',
          'గైడెడ్ మ్యాప్', 'మ్యాప్', 'मार्गदर्शित नकाशा', 'नकाशा', 'வழிகாட்டி வரைபடம்',
          'வரைபடம்', 'ગાઇડેડ મેપ', 'નકશો', 'ಮಾರ್ಗದರ್ಶಿತ ನಕ್ಷೆ', 'ನಕ್ಷೆ',
          'ഗൈഡഡ് മാപ്പ്', 'മാപ്പ്', 'ਗਾਈਡਡ ਮੈਪ', 'ਨਕਸ਼ਾ', 'ଗାଇଡେଡ୍ ମ୍ୟାପ୍', 'ମାନଚିତ୍ର',
        ],
        action: () => {
          window.location.href = 'http://localhost:5173/#/ai-map';
        },
      },
    ],
    [router],
  );

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const runCommand = (rawTranscript: string) => {
    const transcript = normalizeTranscript(rawTranscript);
    if (!transcript) {
      return;
    }

    setLastHeard(transcript);

    if (includesAny(transcript, ['go back', 'back', 'वापस', 'পিছনে', 'వెనక్కి'])) {
      window.history.back();
      setStatusText('Going back.');
      speak('Going back');
      return;
    }

    if (includesAny(transcript, ['go forward', 'forward', 'आगे', 'সামনে', 'ముందుకు'])) {
      window.history.forward();
      setStatusText('Going forward.');
      speak('Going forward');
      return;
    }

    const matchedCommand = pickBestMatchedCommand(transcript, commandMap);

    if (matchedCommand) {
      matchedCommand.action();
      setStatusText(`Executed command: ${transcript}`);
      speak('Done');
      return;
    }

    setStatusText('No matching route found. Try saying Home, Vision, or Sign In.');
    speak('No matching page found');
  };

  useEffect(() => {
    const scopedWindow = window as RecognitionWindow;
    const RecognitionCtor = scopedWindow.SpeechRecognition || scopedWindow.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setIsSupported(false);
      setStatusText('Voice navigation is not supported in this browser.');
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = speechLang;

    recognition.onresult = (event: RecognitionEventLike) => {
      let finalTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal && result[0]?.transcript) {
          finalTranscript += ` ${result[0].transcript}`;
        }
      }

      if (finalTranscript.trim()) {
        runCommand(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      setStatusText(`Voice error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatusText((prev: string) => (prev.startsWith('Voice error') ? prev : 'Voice navigation paused.'));
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [commandMap, speechLang]);

  const startListening = () => {
    if (!recognitionRef.current) {
      return;
    }

    recognitionRef.current.start();
    setIsListening(true);
    setStatusText(`Listening in ${speechLang}. Try: "guided map" or "vision"`);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setStatusText('Voice navigation paused.');
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        zIndex: 80,
        width: 'min(88vw, 320px)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(5, 5, 5, 0.88)',
        color: '#ffffff',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
        padding: '0.7rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
        <strong style={{ fontSize: '0.85rem' }}>Voice Navigation</strong>
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          style={{
            borderRadius: '999px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            padding: '0.3rem 0.7rem',
            cursor: 'pointer',
            background: isListening ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
          aria-label={isListening ? 'Stop voice navigation' : 'Start voice navigation'}
        >
          {isListening ? 'Stop Mic' : 'Start Mic'}
        </button>
      </div>
      <p style={{ marginTop: '0.45rem', marginBottom: 0, fontSize: '0.74rem', opacity: 0.9 }}>{statusText}</p>
      {lastHeard && (
        <p style={{ marginTop: '0.3rem', marginBottom: 0, fontSize: '0.72rem', opacity: 0.8 }}>
          Heard: "{lastHeard}"
        </p>
      )}
    </div>
  );
}
