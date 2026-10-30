import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Minimize2, Maximize2, Send, Square, HeartPulse, Users, CloudSun, ArrowUpRight, ChevronDown } from 'lucide-react';
import LogoMark from '@/components/LogoMark';
import ChatOrb from '@/components/ChatOrb';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

type ChatMessage = {
  sender: "user" | "bot";
  text: string;
};

type WeatherData = {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  city: string;
  country: string;
  feelsLike: number;
  visibility: number;
};

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string;
const OPENWEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather";
const GOOGLE_CLOUD_API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY as string;
const GOOGLE_STT_URL = "https://speech.googleapis.com/v1/speech:recognize";
const GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

const VOICE_LANG_CODES = {
  english: "en-US",
  spanish: "es-ES",
  french: "fr-FR",
  german: "de-DE",
  hindi: "hi-IN",
  marathi: "mr-IN",
  gujarati: "gu-IN",
  bengali: "bn-IN",
  tamil: "ta-IN",
  japanese: "ja-JP"
} as const;

const VOICE_NAMES = {
  english: "en-US-Wavenet-D",
  spanish: "es-ES-Wavenet-A",
  french: "fr-FR-Wavenet-A",
  german: "de-DE-Wavenet-A",
  hindi: "hi-IN-Wavenet-A",
  marathi: "mr-IN-Wavenet-A",
  gujarati: "gu-IN-Wavenet-A",
  bengali: "bn-IN-Wavenet-A",
  tamil: "ta-IN-Wavenet-A",
  japanese: "ja-JP-Wavenet-A"
} as const;

/** Gemini TTS models to try, in order (official API, same key as the chat model). */
const GEMINI_TTS_MODELS = ["gemini-3.8-flash-lite-tts", "gemini-2.5-flash-preview-tts"];
const GEMINI_TTS_VOICE = "Kore";

/** Wrap raw 16-bit PCM (what Gemini TTS returns) in a WAV header so <audio> can play it. */
function pcmToWavUrl(base64: string, sampleRate: number): string {
  const bin = atob(base64);
  const pcm = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const str = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + pcm.length, true); str(8, "WAVE");
  str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, pcm.length, true);
  return URL.createObjectURL(new Blob([header, pcm], { type: "audio/wav" }));
}

const STT_LANG_CODES = {
  english: "en-US",
  spanish: "es-ES",
  french: "fr-FR",
  german: "de-DE",
  hindi: "hi-IN",
  marathi: "mr-IN",
  gujarati: "gu-IN",
  bengali: "bn-IN",
  tamil: "ta-IN",
  japanese: "ja-JP"
} as const;

export interface ChatbotPopupRef {
  toggleChatbot: () => void;
}

const ChatbotPopup = forwardRef<ChatbotPopupRef, object>((_props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [language, setLanguage] = useState<keyof typeof STT_LANG_CODES>("english");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechTokenRef = useRef(0); // bumped on stop/new speech so chunked playback aborts
  const ttsBlockedRef = useRef(false);
  const geminiTtsBlockedRef = useRef(false); // set once Google TTS rejects the key; browser voice is used from then on
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useImperativeHandle(ref, () => ({
    toggleChatbot: () => {
      setIsOpen(!isOpen);
    }
  }));
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Chrome populates speechSynthesis voices asynchronously; prime them so the first reply picks the right voice.
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const prime = () => synth.getVoices();
    prime();
    synth.addEventListener("voiceschanged", prime);
    return () => {
      synth.removeEventListener("voiceschanged", prime);
      synth.cancel();
    };
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.log("Location access denied or unavailable:", error);
          setUserLocation({ lat: 19.0760, lon: 72.8777 });
        }
      );
    } else {
      setUserLocation({ lat: 19.0760, lon: 72.8777 });
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setIsMinimized(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (userLocation) {
      fetchWeatherData(userLocation.lat, userLocation.lon);
    }
  }, [userLocation]);

  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `${OPENWEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      const data = await response.json();
      
      if (response.ok) {
        setWeatherData({
          temperature: Math.round(data.main.temp),
          description: data.weather[0].description,
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
          city: data.name,
          country: data.sys.country,
          feelsLike: Math.round(data.main.feels_like),
          visibility: data.visibility / 1000
        });
      }
    } catch (error) {
      console.error("Weather fetch error:", error);
    }
  };

  const fetchWeatherByCity = async (cityName: string) => {
    try {
      const response = await fetch(
        `${OPENWEATHER_API_URL}?q=${encodeURIComponent(cityName)}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      const data = await response.json();
      
      if (response.ok) {
        return {
          temperature: Math.round(data.main.temp),
          description: data.weather[0].description,
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
          city: data.name,
          country: data.sys.country,
          feelsLike: Math.round(data.main.feels_like),
          visibility: data.visibility / 1000
        };
      }
      return null;
    } catch (error) {
      console.error("Weather fetch error:", error);
      return null;
    }
  };

  const isWeatherQuery = (text: string) => {
    const weatherKeywords = [
      'weather', 'temperature', 'rain', 'storm', 'wind', 'humidity', 'climate',
      'मौसम', 'बारिश', 'तापमान', 'हवा',
      'हवामान', 'पाऊस', 'वारा', 'तापमान',
      'હવામાન', 'વરસાદ', 'તાપમાન', 'પવન'
    ];
    return weatherKeywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  const extractCityFromQuery = (text: string) => {
    const cityPatterns = [
      /weather in ([a-zA-Z\s]+)/i,
      /([a-zA-Z\s]+) weather/i,
      /temperature in ([a-zA-Z\s]+)/i,
      /climate of ([a-zA-Z\s]+)/i
    ];
    
    for (const pattern of cityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  };

  const formatWeatherInfo = (weather: WeatherData, requestedCity?: string) => {
    const weatherTranslations = {
      english: {
        current: "Current Weather",
        in: "in",
        temperature: "Temperature",
        feels_like: "Feels like",
        condition: "Condition",
        humidity: "Humidity",
        wind_speed: "Wind Speed",
        visibility: "Visibility",
      },
      spanish: {
        current: "Clima Actual",
        in: "en",
        temperature: "Temperatura",
        feels_like: "Se siente como",
        condition: "Condición",
        humidity: "Humedad",
        wind_speed: "Velocidad del Viento",
        visibility: "Visibilidad",
      },
      french: {
        current: "Météo Actuelle",
        in: "à",
        temperature: "Température",
        feels_like: "Ressenti",
        condition: "Condition",
        humidity: "Humidité",
        wind_speed: "Vitesse du Vent",
        visibility: "Visibilité",
      },
      german: {
        current: "Aktuelles Wetter",
        in: "in",
        temperature: "Temperatur",
        feels_like: "Gefühlt",
        condition: "Zustand",
        humidity: "Luftfeuchtigkeit",
        wind_speed: "Windgeschwindigkeit",
        visibility: "Sichtweite",
      },
      hindi: {
        current: "वर्तमान मौसम",
        in: "में",
        temperature: "तापमान",
        feels_like: "महसूस होता है",
        condition: "स्थिति",
        humidity: "नमी",
        wind_speed: "हवा की गति",
        visibility: "दृश्यता",
      },
      marathi: {
        current: "सध्याचे हवामान",
        in: "मध्ये",
        temperature: "तापमान",
        feels_like: "वाटते",
        condition: "स्थिती",
        humidity: "आर्द्रता",
        wind_speed: "वाऱ्याची गती",
        visibility: "दृश्यता",
      },
      gujarati: {
        current: "વર્તમાન હવામાન",
        in: "માં",
        temperature: "તાપમાન",
        feels_like: "લાગે છે",
        condition: "સ્થિતિ",
        humidity: "ભેજ",
        wind_speed: "પવનની ઝડપ",
        visibility: "દૃશ્યતા",
      },
      bengali: {
        current: "বর্তমান আবহাওয়া",
        in: "এ",
        temperature: "তাপমাত্রা",
        feels_like: "মনে হয়",
        condition: "অবস্থা",
        humidity: "আর্দ্রতা",
        wind_speed: "বাতাসের গতি",
        visibility: "দৃশ্যমানতা",
      },
      tamil: {
        current: "தற்போதைய வானிலை",
        in: "இல்",
        temperature: "வெப்பநிலை",
        feels_like: "என உணரப்படுகிறது",
        condition: "நிலை",
        humidity: "ஈரப்பதம்",
        wind_speed: "காற்றின் வேகம்",
        visibility: "காட்சி",
      },
      japanese: {
        current: "現在の天気",
        in: "の",
        temperature: "気温",
        feels_like: "体感温度",
        condition: "状態",
        humidity: "湿度",
        wind_speed: "風速",
        visibility: "視界",
      }
    };

    const t = weatherTranslations[language];
    const cityName = requestedCity || weather.city;

    return `## ${t.current} ${t.in} ${cityName}, ${weather.country}

**${t.temperature}:** ${weather.temperature}°C (${t.feels_like} ${weather.feelsLike}°C)
**${t.condition}:** ${weather.description}
**${t.humidity}:** ${weather.humidity}%
**${t.wind_speed}:** ${weather.windSpeed} m/s
**${t.visibility}:** ${weather.visibility} km`;
  };

  const getGeminiReply = async (text: string) => {
    const languageInstructions = {
      english: "Respond ENTIRELY in English language. Do not use any other language.",
      spanish: "Respond ENTIRELY in Spanish language. Do not use any other language.",
      french: "Respond ENTIRELY in French language. Do not use any other language.",
      german: "Respond ENTIRELY in German language. Do not use any other language.",
      hindi: "Respond ENTIRELY in Hindi language. Do not use any other language. Use Devanagari script.",
      marathi: "Respond ENTIRELY in Marathi language. Do not use any other language. Use Devanagari script.",
      gujarati: "Respond ENTIRELY in Gujarati language. Do not use any other language. Use Gujarati script.",
      bengali: "Respond ENTIRELY in Bengali language. Do not use any other language. Use Bengali script.",
      tamil: "Respond ENTIRELY in Tamil language. Do not use any other language. Use Tamil script.",
      japanese: "Respond ENTIRELY in Japanese language. Do not use any other language. Use Japanese script."
    };

    let weatherInfo = "";

    if (isWeatherQuery(text)) {
      const cityName = extractCityFromQuery(text);
      if (cityName) {
        const cityWeather = await fetchWeatherByCity(cityName);
        if (cityWeather) {
          weatherInfo = formatWeatherInfo(cityWeather, cityName);
        }
      } else if (weatherData) {
        weatherInfo = formatWeatherInfo(weatherData);
      }
    }

    let contextualInfo = "";
    if (weatherData) {
      contextualInfo = `Current weather context: Temperature ${weatherData.temperature}°C, ${weatherData.description}, Humidity ${weatherData.humidity}%, Wind ${weatherData.windSpeed} m/s in ${weatherData.city}.`;
    }

    const prompt = `You are a knowledgeable safety, security, and surveillance assistant for Luminex.give a short and to the point response to the user's query

IMPORTANT LANGUAGE REQUIREMENT: ${languageInstructions[language as keyof typeof languageInstructions]}

${contextualInfo}

User query: ${text}

${weatherInfo ? `Weather Information:\n${weatherInfo}\n\n` : ''}

Provide clear guidance, emergency tips, and safety instructions. If the query is weather-related, include relevant weather safety advice based on current conditions (like heat safety, rain precautions, wind warnings, etc.).

Please respond using markdown formatting with:
- **Bold text** for important points
- Bullet points for lists
- Clear headings for different sections
- Proper spacing for readability

CRITICAL: Your ENTIRE response must be in ${language} language only. Do not mix languages or use English words.`;
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return `Error: ${data?.error?.message || 'API request failed. Check your API key.'}`;
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (reply) return reply;

    console.error("Unexpected Gemini response:", data);
    const fallbackMessages: Record<string, string> = {
      english: "Sorry, I couldn't process that.",
      hindi: "माफ़ करें, मैं इसे प्रोसेस नहीं कर सका।",
      marathi: "माफ करा, मी याला प्रक्रिया करू शकलो नाही.",
      gujarati: "માફ કરો, હું આને પ્રક્રિયા કરી શક્યો નથી."
    };
    return fallbackMessages[language] || fallbackMessages.english;
  };

  const stripMarkdown = (md: string): string => {
    return md
      .replace(/#{1,6}\s*/g, '')        // headings
      .replace(/\*\*(.*?)\*\*/g, '$1')  // bold
      .replace(/\*(.*?)\*/g, '$1')      // italic
      .replace(/~~(.*?)~~/g, '$1')      // strikethrough
      .replace(/`{1,3}[^`]*`{1,3}/g, '')// inline code / code blocks
      .replace(/^\s*[-*+]\s+/gm, '')    // bullet points
      .replace(/^\s*\d+\.\s+/gm, '')    // numbered lists
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // images
      .replace(/>\s*/g, '')             // blockquotes
      .replace(/\|/g, '')              // table pipes
      .replace(/---+/g, '')            // horizontal rules
      .replace(/\n{2,}/g, '. ')        // collapse multiple newlines
      .replace(/\n/g, ' ')            // single newlines to spaces
      .replace(/\s{2,}/g, ' ')        // collapse whitespace
      .trim();
  };

  const findBrowserVoice = (lang: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    const voices = synth.getVoices();
    const norm = (v: string) => v.replace("_", "-").toLowerCase();
    const base = lang.split("-")[0].toLowerCase();
    return (
      voices.find((v) => norm(v.lang) === lang.toLowerCase() && /google|natural|premium|enhanced/i.test(v.name)) ||
      voices.find((v) => norm(v.lang) === lang.toLowerCase()) ||
      voices.find((v) => norm(v.lang).startsWith(base)) ||
      null
    );
  };

  /** Browser-native voice (Web Speech API). `voice` null = let the browser pick a default. */
  const speakWithBrowser = (text: string, voice: SpeechSynthesisVoice | null) =>
    new Promise<void>((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) {
        console.warn("[Luminex] This browser has no speech synthesis; reply not spoken.");
        setIsSpeaking(false);
        return resolve();
      }
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = VOICE_LANG_CODES[language];
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.pitch = 1;
      const done = () => {
        if (utteranceRef.current === utterance) utteranceRef.current = null;
        setIsSpeaking(false);
        resolve();
      };
      utterance.onend = done;
      utterance.onerror = done;
      utteranceRef.current = utterance;
      synth.speak(utterance);
    });

  /** Play one audio URL/data URI; resolves when finished, stopped, or failed. Returns false on failure. */
  const playAudio = (src: string, token: number) =>
    new Promise<boolean>((resolve) => {
      if (speechTokenRef.current !== token) return resolve(false);
      const audio = new Audio(src);
      setCurrentAudio(audio);
      let ok = true;
      const done = () => {
        setCurrentAudio((cur) => (cur === audio ? null : cur));
        resolve(ok);
      };
      audio.onended = done;
      audio.onerror = () => {
        ok = false;
        done();
      };
      audio.play().catch((err) => {
        console.warn("[Luminex] Audio playback blocked:", err);
        ok = false;
        done();
      });
    });

  /**
   * Gemini text-to-speech (official API, uses the same key as the chat model).
   * Detects the language from the text itself, so Marathi/Hindi/Bengali/Tamil/Japanese just work.
   */
  const speakWithGemini = async (text: string, token: number): Promise<boolean> => {
    if (!GEMINI_API_KEY || geminiTtsBlockedRef.current) return false;
    for (const model of GEMINI_TTS_MODELS) {
      if (speechTokenRef.current !== token) return true;
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } } },
              },
            }),
          },
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          // 429 = quota; try the next model, don't give up on Gemini TTS for the session.
          if (res.status !== 429 && res.status !== 404 && res.status !== 503) geminiTtsBlockedRef.current = true;
          console.warn(`[Luminex] Gemini TTS (${model}) failed:`, data?.error?.message || `HTTP ${res.status}`);
          continue;
        }
        const part = data?.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData);
        if (!part?.inlineData?.data) continue;
        const mime: string = part.inlineData.mimeType || "";
        const rate = Number(/rate=(\d+)/.exec(mime)?.[1] || 24000);
        const src = /L16|pcm/i.test(mime) ? pcmToWavUrl(part.inlineData.data, rate) : `data:${mime};base64,${part.inlineData.data}`;
        const ok = await playAudio(src, token);
        if (src.startsWith("blob:")) URL.revokeObjectURL(src);
        return ok;
      } catch (err) {
        console.warn(`[Luminex] Gemini TTS (${model}) error:`, err);
      }
    }
    return false;
  };

  /** Google Cloud TTS. Returns false when the key is missing/blocked so the caller can fall back. */
  const speakWithGoogle = async (text: string, token: number): Promise<boolean> => {
    if (!GOOGLE_CLOUD_API_KEY || ttsBlockedRef.current) return false;
    const ttsResponse = await fetch(`${GOOGLE_TTS_URL}?key=${GOOGLE_CLOUD_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: VOICE_LANG_CODES[language], name: VOICE_NAMES[language] },
        audioConfig: { audioEncoding: "MP3" },
      }),
    });
    const ttsData = await ttsResponse.json().catch(() => null);
    if (!ttsResponse.ok || !ttsData?.audioContent) {
      ttsBlockedRef.current = true;
      console.warn(
        "[Luminex] Google Cloud Text-to-Speech unavailable, falling back:",
        ttsData?.error?.message || `HTTP ${ttsResponse.status}`,
      );
      return false;
    }
    return playAudio("data:audio/mp3;base64," + ttsData.audioContent, token);
  };

  /**
   * Speak a reply in the selected language. Order of preference:
   * 1. Google Cloud TTS (needs an enabled key)
   * 2. Gemini TTS (official, same key as chat; covers Indian languages most devices lack)
   * 3. A system voice that matches the language
   * 4. Whatever default voice the browser has
   */
  const speak = async (text: string) => {
    const cleanText = stripMarkdown(text);
    if (!cleanText) return;
    const token = ++speechTokenRef.current;
    setIsSpeaking(true);
    try {
      if (await speakWithGoogle(cleanText, token)) return;
      if (speechTokenRef.current !== token) return;
      if (await speakWithGemini(cleanText, token)) return;
      if (speechTokenRef.current !== token) return;
      const voice = findBrowserVoice(VOICE_LANG_CODES[language]);
      if (!voice) console.warn(`[Luminex] No ${language} system voice installed; using the browser default voice.`);
      await speakWithBrowser(cleanText, voice);
    } catch (err) {
      console.error("TTS Error:", err);
      setCurrentAudio(null);
    } finally {
      if (speechTokenRef.current === token) setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    speechTokenRef.current += 1;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    if (window.speechSynthesis) {
      utteranceRef.current = null;
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const response = await fetch(`${GOOGLE_STT_URL}?key=${GOOGLE_CLOUD_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            encoding: "WEBM_OPUS",
            sampleRateHertz: 48000,
            languageCode: STT_LANG_CODES[language],
          },
          audio: { content: base64Audio },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("Google STT error:", data);
        return null;
      }
      return data?.results?.[0]?.alternatives?.[0]?.transcript || null;
    } catch (err) {
      console.error("Google STT Error:", err);
      return null;
    }
  };

  const startListening = async () => {
    if (isListening) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        const transcript = await transcribeAudio(audioBlob);
        if (transcript) setInput(transcript);
        setIsListening(false);
      };

      recorder.start();
      setIsListening(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleVoice = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage: ChatMessage = { sender: "user", text: input };
    setChat((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    let reply: string | null = null;
    try {
      reply = await getGeminiReply(input);
      setChat((prev) => [...prev, { sender: "bot", text: reply as string }]);
    } catch (err) {
      console.error(err);
    }
    // Unlock the composer before speaking so the stop button (and typing) work while audio plays.
    setLoading(false);
    if (reply) void speak(reply);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) handleSend();
  };

  const languageOptions: { value: keyof typeof STT_LANG_CODES; label: string }[] = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'marathi', label: 'Marathi' },
    { value: 'gujarati', label: 'Gujarati' },
    { value: 'bengali', label: 'Bengali' },
    { value: 'tamil', label: 'Tamil' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' },
    { value: 'japanese', label: 'Japanese' },
  ];

  return (
    <>
      {/* 3D floating launcher */}
      <ChatOrb open={isOpen} onClick={toggleChatbot} />

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsOpen(false);
                setIsMinimized(false);
              }}
              className="fixed inset-0 z-[10000] bg-black/40"
            />

            <motion.div
              role="dialog"
              aria-label="Luminex assistant"
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, height: isMinimized ? 72 : 'min(640px, calc(100vh - 9rem))' }}
              exit={{ opacity: 0, y: 28, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="dark fixed bottom-28 right-6 z-[10001] flex w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-[28px] border border-white/10 text-white shadow-[0_40px_120px_-30px_rgba(0,60,200,0.65),0_0_0_1px_rgba(255,255,255,0.03)_inset]"
              style={{ background: 'linear-gradient(180deg, #0c1326 0%, #080b14 45%, #06070c 100%)' }}
            >
              {/* ambient glows */}
              <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-brand-500/30 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -left-24 top-40 size-64 rounded-full bg-brand-cyan/15 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/80 to-transparent" />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 0%, transparent 70%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 0%, transparent 70%)',
                }}
              />

              {/* Header */}
              <div className="relative flex shrink-0 items-center justify-between px-5 pb-4 pt-5">
                <div className="flex items-center gap-3.5">
                  <span className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-[#2A7BFF] to-brand-cyan shadow-[0_12px_30px_-10px_rgba(0,120,255,0.9)]">
                    <span aria-hidden className="absolute inset-0 rounded-2xl bg-white/20 [mask-image:linear-gradient(180deg,white,transparent)]" />
                    <LogoMark size={26} className="relative drop-shadow-[0_0_6px_rgba(255,255,255,0.6)] [&_path]:stroke-white" />
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#0c1326] bg-emerald-400" />
                  </span>
                  <div>
                    <p className="font-heading text-[17px] font-bold leading-none">Luminex</p>
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">AI safety assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {weatherData && !isMinimized && (
                    <span className="mr-1 hidden max-w-[150px] items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/70 sm:inline-flex">
                      <CloudSun className="size-3 shrink-0 text-brand-cyan" />
                      <span className="truncate">{weatherData.temperature}°C · {weatherData.city}</span>
                    </span>
                  )}
                  <button
                    onClick={toggleMinimize}
                    aria-label={isMinimized ? 'Expand' : 'Minimize'}
                    className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {isMinimized ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
                  </button>
                  <button
                    onClick={toggleChatbot}
                    aria-label="Close"
                    className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <div className="relative flex min-h-0 flex-1 flex-col">
                  {/* Language row */}
                  <div className="relative flex shrink-0 items-center gap-3 px-5 pb-3">
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">Reply in</span>
                    <div className="relative min-w-0 flex-1">
                      <div className="flex gap-1.5 overflow-x-auto pr-6 [scrollbar-width:none] [mask-image:linear-gradient(90deg,black_85%,transparent)] [&::-webkit-scrollbar]:hidden">
                        {languageOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setLanguage(opt.value)}
                            className={cn(
                              'shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-all',
                              language === opt.value
                                ? 'border-brand-400/60 bg-brand-500/25 text-white shadow-[0_0_0_3px_rgba(0,80,255,0.12)]'
                                : 'border-white/10 text-white/50 hover:border-white/25 hover:text-white',
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto border-t border-white/[0.06] px-5 py-5 [scrollbar-width:thin]">
                    {chat.length === 0 && (
                      <div className="my-auto">
                        <div className="relative mx-auto mb-5 flex size-20 items-center justify-center">
                          <span aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-500/40 to-brand-cyan/30 blur-xl" />
                          <span aria-hidden className="absolute inset-1 animate-ping rounded-full border border-brand-cyan/30 [animation-duration:2.8s]" />
                          <span className="relative flex size-16 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] backdrop-blur-md">
                            <LogoMark size={36} />
                          </span>
                        </div>
                        <p className="text-center font-heading text-[22px] font-bold leading-tight">
                          Hi, I&apos;m <span className="bg-gradient-to-r from-brand-400 to-brand-cyan bg-clip-text text-transparent">Luminex</span>
                        </p>
                        <p className="mx-auto mt-2 max-w-[260px] text-center text-[13px] leading-relaxed text-white/55">
                          Your on-site safety assistant. Ask me anything, or start with one of these.
                        </p>
                        <div className="mt-5 grid gap-2 pb-2">
                          {[
                            { icon: HeartPulse, text: 'Find the nearest medical help', hue: 'text-pink-400 bg-pink-500/15 border-pink-400/20' },
                            { icon: Users, text: 'What is the crowd status right now?', hue: 'text-blue-400 bg-blue-500/15 border-blue-400/20' },
                            { icon: CloudSun, text: "Today's weather on site", hue: 'text-amber-400 bg-amber-500/15 border-amber-400/20' },
                          ].map((q) => (
                            <button
                              key={q.text}
                              onClick={() => setInput(q.text)}
                              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left transition-all hover:-translate-y-px hover:border-brand-400/50 hover:bg-white/[0.07]"
                            >
                              <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl border', q.hue)}>
                                <q.icon className="size-4" strokeWidth={2} />
                              </span>
                              <span className="flex-1 text-[13px] text-white/85">{q.text}</span>
                              <ArrowUpRight className="size-4 text-white/30 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-cyan" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {chat.map((msg, i) => {
                      const mine = msg.sender === 'user';
                      return (
                        <div key={i} className={cn('flex items-end gap-2.5', mine ? 'justify-end' : 'justify-start')}>
                          {!mine && (
                            <span className="mb-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-cyan shadow-[0_6px_16px_-6px_rgba(0,120,255,0.9)]">
                              <LogoMark size={15} className="[&_path]:stroke-white" />
                            </span>
                          )}
                          <div
                            className={cn(
                              'max-w-[80%] px-4 py-2.5 text-[13.5px] leading-relaxed',
                              mine
                                ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-brand-500 to-[#1C6BFF] text-white shadow-[0_12px_28px_-12px_rgba(0,80,255,0.9)]'
                                : 'rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] text-white/90 backdrop-blur-sm',
                            )}
                          >
                            {mine ? (
                              msg.text
                            ) : (
                              <div className="prose-chat">
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {loading && (
                      <div className="flex items-end gap-2.5">
                        <span className="mb-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-cyan">
                          <LogoMark size={15} className="[&_path]:stroke-white" />
                        </span>
                        <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3.5">
                          {[0, 1, 2].map((d) => (
                            <span
                              key={d}
                              className="size-1.5 animate-bounce rounded-full bg-brand-cyan"
                              style={{ animationDelay: `${d * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Composer */}
                  <div className="relative shrink-0 px-4 pb-4 pt-3">
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-[#06070c] to-transparent" />
                    <div
                      className={cn(
                        'flex items-center gap-1.5 rounded-2xl border bg-white/[0.05] p-1.5 pl-4 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] transition-all',
                        isListening ? 'border-red-400/50 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]' : 'border-white/10 focus-within:border-brand-400/60 focus-within:shadow-[0_0_0_4px_rgba(0,80,255,0.14)]',
                      )}
                    >
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={isListening ? 'Listening… speak now' : 'Message Luminex'}
                        disabled={loading || isListening}
                        className="min-w-0 flex-1 bg-transparent text-[13.5px] text-white outline-none placeholder:text-white/35 disabled:opacity-60"
                      />
                      <button
                        onClick={toggleVoice}
                        disabled={loading && !isSpeaking}
                        aria-label={isListening ? 'Stop listening' : isSpeaking ? 'Stop speaking' : 'Voice chat'}
                        className={cn(
                          'relative flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                          isListening
                            ? 'bg-red-500 text-white'
                            : isSpeaking
                              ? 'bg-brand-cyan text-black'
                              : 'text-white/60 hover:bg-white/10 hover:text-white',
                        )}
                      >
                        {isListening && <span aria-hidden className="absolute inset-0 animate-ping rounded-xl bg-red-500/50" />}
                        {isListening ? <MicOff className="relative size-4" /> : isSpeaking ? <Square className="relative size-3.5" /> : <Mic className="relative size-4" />}
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        aria-label="Send"
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-cyan text-white shadow-[0_10px_24px_-8px_rgba(0,80,255,0.95)] transition-all hover:brightness-110 disabled:opacity-35 disabled:shadow-none"
                      >
                        <Send className="size-4" />
                      </button>
                    </div>
                    <p className="mt-2.5 text-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/30">
                      {isListening ? (
                        <span className="text-red-400">● Listening</span>
                      ) : isSpeaking ? (
                        <span className="text-brand-cyan">● Speaking</span>
                      ) : (
                        'Powered by Gemini · Voice in 10 languages'
                      )}
                    </p>
                  </div>
                </div>
              )}

              {isMinimized && (
                <button
                  onClick={toggleMinimize}
                  className="relative -mt-2 flex h-6 w-full items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45 transition-colors hover:text-white"
                >
                  Tap to expand
                  <ChevronDown className="size-3 rotate-180" />
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

ChatbotPopup.displayName = 'ChatbotPopup';

export default ChatbotPopup;
