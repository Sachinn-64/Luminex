import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type VoiceCommand = {
  keywords: string[];
  action: () => void;
};

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
  const navigate = useNavigate();
  const { logout } = useAuth();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [lastHeard, setLastHeard] = useState<string>('');
  const [speechLang] = useState<string>(() => getSpeechLangFromTranslateCode());
  const [statusText, setStatusText] = useState<string>('Voice navigation is ready.');

  const commandMap = useMemo<VoiceCommand[]>(
    () => [
      {
        keywords: [
          'ai guided map', 'guided map', 'guided maps', 'guide map', 'map guide',
          'open map', 'ai map', 'smart map', 'navigation map', 'guided',
          'मार्गदर्शित नक्शा', 'एआई मैप', 'मानचित्र', 'গাইডেড ম্যাপ', 'মানচিত্র',
          'గైడెడ్ మ్యాప్', 'మ్యాప్', 'मार्गदर्शित नकाशा', 'नकाशा', 'வழிகாட்டி வரைபடம்',
          'வரைபடம்', 'ગાઇડેડ મેપ', 'નકશો', 'ಮಾರ್ಗದರ್ಶಿತ ನಕ್ಷೆ', 'ನಕ್ಷೆ',
          'ഗൈഡഡ് മാപ്പ്', 'മാപ്പ്', 'ਗਾਈਡਡ ਮੈਪ', 'ਨਕਸ਼ਾ', 'ଗାଇଡେଡ୍ ମ୍ୟାପ୍', 'ମାନଚିତ୍ର',
        ],
        action: () => navigate('/ai-map'),
      },
      { keywords: ['dashboard', 'home', 'होम', 'डैशबोर्ड', 'হোম', 'హోమ్'], action: () => navigate('/dashboard') },
      { keywords: ['login', 'log in', 'sign in', 'लॉगिन', 'প্রবেশ', 'లాగిన్'], action: () => navigate('/login') },
      { keywords: ['register', 'sign up', 'पंजीकरण', 'রেজিস্টার', 'నమోదు'], action: () => navigate('/register') },
      { keywords: ['doctor signup', 'doctor sign up', 'ডাক্তার সাইন আপ', 'डॉक्टर साइनअप'], action: () => navigate('/doctor-signup') },
      { keywords: ['lost and found', 'खोया पाया', 'হারানো পাওয়া', 'కోల్పోయినవి'], action: () => navigate('/lost-and-found') },
      { keywords: ['report missing', 'missing report', 'मिसिंग रिपोर्ट', 'নিখোঁজ রিপোর্ট'], action: () => navigate('/report-missing') },
      { keywords: ['weapon detection', 'हथियार पहचान', 'অস্ত্র শনাক্তকরণ'], action: () => navigate('/weapon-detection') },
      { keywords: ['crowd detection', 'भीड़ पहचान', 'ভিড় শনাক্তকরণ'], action: () => navigate('/crowd-detection') },
      { keywords: ['image recognition', 'छवि पहचान', 'ইমেজ শনাক্তকরণ'], action: () => navigate('/image-recognition') },
      { keywords: ['analytics', 'एनालिटिक्स', 'বিশ্লেষণ'], action: () => navigate('/analytics') },
      { keywords: ['disaster management', 'आपदा प्रबंधन', 'দুর্যোগ ব্যবস্থাপনা'], action: () => navigate('/disaster-management') },
      { keywords: ['disaster prediction', 'आपदा पूर्वानुमान', 'দুর্যোগ পূর্বাভাস'], action: () => navigate('/disaster-prediction') },
      { keywords: ['weather', 'मौसम', 'আবহাওয়া', 'వాతావరణం'], action: () => navigate('/disaster-management/weather') },
      { keywords: ['earthquake', 'earthquakes', 'भूकंप', 'ভূমিকম্প', 'భూకంపం'], action: () => navigate('/disaster-management/earthquakes') },
      { keywords: ['traffic', 'यातायात', 'ট্রাফিক', 'ట్రాఫిక్'], action: () => navigate('/disaster-management/traffic') },
      { keywords: ['alerts', 'अलर्ट', 'সতর্কতা', 'హెచ్చరికలు'], action: () => navigate('/disaster-management/alerts') },
      { keywords: ['emergency', 'आपातकाल', 'জরুরি', 'అత్యవసర'], action: () => navigate('/disaster-management/emergency') },
      { keywords: ['satellite', 'सैटेलाइट', 'স্যাটেলাইট', 'ఉపగ్రహం'], action: () => navigate('/disaster-management/satellite') },
      { keywords: ['pilgrim tracker', 'तीर्थयात्री ट्रैकर', 'যাত্রী ট্র্যাকার'], action: () => navigate('/pilgrim-tracker') },
      { keywords: ['doctor panel', 'doctor dashboard', 'डॉक्टर पैनल', 'ডাক্তার প্যানেল'], action: () => navigate('/doctor-panel') },
      { keywords: ['medical admin', 'medical panel', 'मेडिकल एडमिन', 'মেডিক্যাল অ্যাডমিন'], action: () => navigate('/medical-admin') },
      { keywords: ['doctor registration', 'doctor register', 'डॉक्टर पंजीकरण', 'ডাক্তার রেজিস্ট্রেশন'], action: () => navigate('/doctor-registration') },
      { keywords: ['emergency call', 'आपातकालीन कॉल', 'জরুরি কল'], action: () => navigate('/emergency-call') },
    ],
    [navigate],
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

  const runCommand = async (rawTranscript: string) => {
    const transcript = normalizeTranscript(rawTranscript);
    if (!transcript) {
      return;
    }

    setLastHeard(transcript);

    if (includesAny(transcript, ['go back', 'back', 'वापस', 'পিছনে', 'వెనక్కి'])) {
      navigate(-1);
      setStatusText('Going back.');
      speak('Going back');
      return;
    }

    if (includesAny(transcript, ['go forward', 'forward', 'आगे', 'সামনে', 'ముందుకు'])) {
      navigate(1);
      setStatusText('Going forward.');
      speak('Going forward');
      return;
    }

    if (includesAny(transcript, ['logout', 'log out', 'sign out', 'लॉग आउट', 'সাইন আউট', 'లాగౌట్'])) {
      await logout();
      navigate('/login');
      setStatusText('You have been logged out.');
      speak('Logging out');
      return;
    }

    const matchedCommand = pickBestMatchedCommand(transcript, commandMap);

    if (matchedCommand) {
      matchedCommand.action();
      setStatusText(`Navigated for command: ${transcript}`);
      speak('Done');
      return;
    }

    setStatusText('No matching route found. Try saying a page name.');
    speak('Sorry, no matching page found');
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
        void runCommand(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      setStatusText(`Voice error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatusText((prev) => (prev.startsWith('Voice error') ? prev : 'Voice navigation paused.'));
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
    setStatusText(`Listening in ${speechLang}. Try: "ai guided map" or "dashboard"`);
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
        left: '1rem',
        bottom: '1rem',
        zIndex: 80,
        width: 'min(88vw, 320px)',
        borderRadius: '0.75rem',
        border: '1px solid hsl(var(--border))',
        background: 'hsl(var(--card))',
        color: 'hsl(var(--card-foreground))',
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
            border: '1px solid hsl(var(--border))',
            padding: '0.3rem 0.7rem',
            cursor: 'pointer',
            background: isListening ? '#ef4444' : 'hsl(var(--secondary))',
            color: isListening ? '#ffffff' : 'hsl(var(--secondary-foreground))',
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
