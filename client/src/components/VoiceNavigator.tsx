import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, AudioLines, CornerUpLeft, LayoutDashboard, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const [expanded, setExpanded] = useState<boolean>(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setExpanded(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

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

  const isError = statusText.startsWith('Voice error');
  const examples: { label: string; icon: typeof Mic }[] = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'AI guided map', icon: Map },
    { label: 'Go back', icon: CornerUpLeft },
  ];

  return (
    <div ref={rootRef} className="relative">
      {/* navbar icon button (always visible, toggles the card) */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? 'Close voice navigation' : 'Open voice navigation'}
        aria-expanded={expanded}
        title="Voice navigation"
        className={cn(
          'relative flex size-8 items-center justify-center rounded-none border transition-colors',
          isListening
            ? 'border-red-400/60 bg-red-500/15 text-red-400'
            : expanded
              ? 'border-foreground bg-foreground text-background'
              : 'border-border bg-background text-foreground/80 hover:border-foreground/40 hover:text-foreground',
        )}
      >
        {isListening && <span aria-hidden className="absolute inset-0 animate-ping rounded-none bg-red-500/25" />}
        {isListening ? <AudioLines className="relative size-4" /> : <Mic className="relative size-4" />}
      </button>

      <AnimatePresence>
        {expanded && (
          /* ---------- expanded card ---------- */
          <motion.div
            key="card"
            role="dialog"
            aria-label="Voice navigation"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="dark absolute right-0 top-[calc(100%+12px)] z-[90] w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border border-white/10 p-5 text-white shadow-[0_40px_120px_-30px_rgba(0,60,200,0.65)]"
            style={{ background: 'linear-gradient(180deg, #0c1326 0%, #080b14 55%, #06070c 100%)' }}
          >
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-500/30 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/80 to-transparent" />

            {/* header */}
            <div className="relative flex items-start justify-between">
              <div>
                <p className="font-heading text-[16px] font-bold leading-none">Voice navigation</p>
                <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                  <span className={cn('size-1.5 rounded-full', isListening ? 'bg-red-400' : isError ? 'bg-amber-400' : 'bg-emerald-400')} />
                  {isListening ? 'Listening' : isError ? 'Error' : 'Ready'} · {speechLang}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Collapse voice navigation"
                className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* mic */}
            <div className="relative mt-5 flex flex-col items-center">
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                aria-label={isListening ? 'Stop voice navigation' : 'Start voice navigation'}
                className="group relative flex size-[76px] items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-0 rounded-full blur-xl transition-opacity',
                    isListening ? 'bg-red-500/50 opacity-100' : 'bg-brand-500/50 opacity-70 group-hover:opacity-100',
                  )}
                />
                {isListening && (
                  <>
                    <span aria-hidden className="absolute inset-0 animate-ping rounded-full border border-red-400/50 [animation-duration:1.6s]" />
                    <span aria-hidden className="absolute -inset-2 animate-ping rounded-full border border-red-400/25 [animation-duration:2.2s]" />
                  </>
                )}
                <span
                  className={cn(
                    'relative flex size-full items-center justify-center rounded-full border transition-all',
                    isListening
                      ? 'border-red-300/40 bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_16px_40px_-12px_rgba(239,68,68,0.9)]'
                      : 'border-white/20 bg-gradient-to-br from-brand-500 to-brand-cyan shadow-[0_16px_40px_-12px_rgba(0,120,255,0.9)] group-hover:scale-105',
                  )}
                >
                  {isListening ? (
                    <span className="flex h-6 items-end gap-[3px]">
                      {[0, 1, 2, 3, 4].map((b) => (
                        <span
                          key={b}
                          className="w-[3px] rounded-full bg-white"
                          style={{ animation: `voice-bar 0.9s ease-in-out ${b * 0.12}s infinite`, height: '40%' }}
                        />
                      ))}
                    </span>
                  ) : (
                    <Mic className="size-7 text-white" strokeWidth={2} />
                  )}
                </span>
              </button>
              <p className="mt-3 text-[13px] font-medium">{isListening ? 'Listening… say a page name' : 'Tap to start listening'}</p>
              <p className={cn('mt-1 max-w-[260px] text-center text-[12px] leading-relaxed', isError ? 'text-amber-300' : 'text-white/50')}>
                {statusText}
              </p>
            </div>

            {/* heard */}
            <AnimatePresence>
              {lastHeard && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="relative mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2"
                >
                  <AudioLines className="size-3.5 shrink-0 text-brand-cyan" />
                  <span className="truncate text-[12.5px] text-white/85">&ldquo;{lastHeard}&rdquo;</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* examples */}
            <div className="relative mt-4 border-t border-white/[0.06] pt-3">
              <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/35">Try saying</p>
              <div className="flex flex-wrap gap-1.5">
                {examples.map((ex) => (
                  <span
                    key={ex.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-white/70"
                  >
                    <ex.icon className="size-3 text-brand-cyan" />
                    {ex.label}
                  </span>
                ))}
              </div>
            </div>

            {isListening && (
              <button
                type="button"
                onClick={stopListening}
                className="relative mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-[12.5px] font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                <MicOff className="size-3.5" /> Stop listening
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
