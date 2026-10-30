import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, X, MessageCircle, Minimize2, Maximize2 } from 'lucide-react';
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

  const speak = async (text: string) => {
    try {
      setIsSpeaking(true);
      const cleanText = stripMarkdown(text);
      const ttsResponse = await fetch(
        `${GOOGLE_TTS_URL}?key=${GOOGLE_CLOUD_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: cleanText },
            voice: {
              languageCode: VOICE_LANG_CODES[language],
              name: VOICE_NAMES[language],
            },
            audioConfig: { audioEncoding: "MP3" },
          }),
        },
      );
      const ttsData = await ttsResponse.json();
      if (ttsData?.audioContent) {
        const audio = new Audio("data:audio/mp3;base64," + ttsData.audioContent);
        setCurrentAudio(audio);
        
        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
        };
        
        await audio.play();
      }
    } catch (err) {
      console.error("TTS Error:", err);
      setIsSpeaking(false);
      setCurrentAudio(null);
    }
  };

  const stopSpeaking = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
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
    try {
      const reply = await getGeminiReply(input);
      const botMessage: ChatMessage = { sender: "bot", text: reply };
      setChat((prev) => [...prev, botMessage]);
      await speak(reply);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) handleSend();
  };

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        onClick={toggleChatbot}
        style={{ 
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: '#7c3aed',
          color: 'white',
          padding: '16px',
          borderRadius: '50%',
          border: '2px solid #6d28d9',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MessageCircle size={24} />
      </motion.button>

      {/* Chatbot Popup */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsOpen(false);
                setIsMinimized(false);
              }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.2)',
                zIndex: 10000,
              }}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                height: isMinimized ? 50 : 440
              }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                position: 'fixed',
                bottom: '96px',
                right: '24px',
                zIndex: 10001,
                width: '340px',
                background: '#fff',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                border: '1px solid rgba(124,58,237,0.3)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{
                background: 'linear-gradient(to right, #7c3aed, #6d28d9)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px', height: '24px', background: '#fff', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: '12px' }}>T</span>
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>Luminex Safety</div>
                    {weatherData && (
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>
                        {weatherData.temperature}°C {weatherData.city}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={toggleMinimize}
                    style={{
                      padding: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    }}
                  >
                    {isMinimized ? <Maximize2 size={12} color="#fff" /> : <Minimize2 size={12} color="#fff" />}
                  </button>
                  <button
                    onClick={toggleChatbot}
                    style={{
                      padding: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    }}
                  >
                    <X size={12} color="#fff" />
                  </button>
                </div>
              </div>

              {/* Chat Content */}
              {!isMinimized && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  {/* Language Selector */}
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #eee', background: '#f9fafb' }}>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as keyof typeof STT_LANG_CODES)}
                      style={{
                        width: '100%', fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '4px',
                        padding: '4px 8px', outline: 'none', background: '#fff',
                      }}
                    >
                      <option value="english">🇺🇸 English</option>
                      <option value="spanish">🇪🇸 Spanish</option>
                      <option value="french">🇫🇷 French</option>
                      <option value="german">🇩🇪 German</option>
                      <option value="hindi">🇮🇳 Hindi</option>
                      <option value="marathi">🇮🇳 Marathi</option>
                      <option value="gujarati">🇮🇳 Gujarati</option>
                      <option value="bengali">🇮🇳 Bengali</option>
                      <option value="tamil">🇮🇳 Tamil</option>
                      <option value="japanese">🇯🇵 Japanese</option>
                    </select>
                  </div>

                  {/* Chat Messages */}
                  <div style={{
                    flex: 1, overflowY: 'auto', padding: '10px', display: 'flex',
                    flexDirection: 'column', gap: '8px', minHeight: 0,
                  }}>
                    {chat.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <Volume2 size={24} style={{ margin: '0 auto 8px', color: '#7c3aed' }} />
                        <div style={{ fontWeight: 600, color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
                          Luminex Safety Assistant
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          Ask about safety tips, security, or weather.
                        </div>
                      </div>
                    )}

                    {chat.map((msg, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                        }}
                      >
                        <div style={{
                          maxWidth: '85%', padding: '8px 10px', borderRadius: '10px',
                          background: msg.sender === "user" ? '#7c3aed' : '#f3f4f6',
                          color: msg.sender === "user" ? '#fff' : '#1f2937',
                        }}>
                          <div style={{
                            fontSize: '10px', fontWeight: 600, marginBottom: '2px',
                            opacity: 0.7,
                          }}>
                            {msg.sender === "user" ? "You" : "Luminex"}
                          </div>
                          <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
                            {msg.sender === "user" ? (
                              msg.text
                            ) : (
                              <ReactMarkdown>{msg.text}</ReactMarkdown>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {loading && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                          background: '#f3f4f6', padding: '8px 12px', borderRadius: '10px',
                          fontSize: '12px', color: '#6b7280',
                        }}>
                          Analyzing...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Area */}
                  <div style={{
                    padding: '10px', borderTop: '1px solid #eee', background: '#f9fafb', flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        style={{
                          flex: 1, fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '6px',
                          padding: '6px 10px', outline: 'none', background: '#fff', color: '#1f2937',
                        }}
                        placeholder="Ask about safety, security..."
                        disabled={loading || isListening}
                      />
                      <button 
                        onClick={handleSend} 
                        disabled={loading || !input.trim()} 
                        style={{
                          padding: '6px 12px', background: '#7c3aed', color: '#fff',
                          borderRadius: '6px', border: 'none', cursor: 'pointer',
                          fontSize: '12px', opacity: loading || !input.trim() ? 0.5 : 1,
                        }}
                      >
                        {loading ? "..." : "Send"}
                      </button>
                    </div>
                    
                    {/* Voice Button */}
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={toggleVoice}
                        disabled={loading}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '8px 16px', borderRadius: '8px', border: 'none',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          color: '#fff', fontSize: '13px', fontWeight: 500,
                          background: isListening ? '#ef4444' : isSpeaking ? '#3b82f6' : 'linear-gradient(to right, #7c3aed, #6d28d9)',
                          backgroundColor: isListening ? '#ef4444' : isSpeaking ? '#3b82f6' : '#7c3aed',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                      >
                        {isListening ? (
                          <><MicOff size={16} /> Stop Listening</>
                        ) : isSpeaking ? (
                          <><Volume2 size={16} /> Stop Speaking</>
                        ) : (
                          <><Mic size={16} /> Voice Chat</>
                        )}
                      </button>
                    </div>
                    
                    {isListening && (
                      <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', textAlign: 'center' }}>
                        🎤 Listening... Speak now!
                      </p>
                    )}
                    {isSpeaking && (
                      <p style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', textAlign: 'center' }}>
                        🔊 Speaking...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Minimized State */}
              {isMinimized && (
                <div style={{
                  height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#f5f3ff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#6d28d9', fontSize: '12px', fontWeight: 500 }}>Ready</span>
                    <div style={{
                      width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%',
                    }} />
                  </div>
                </div>
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
