import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, HeatmapLayer } from '@react-google-maps/api';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, Globe, WifiOff, Volume2, VolumeX, Mic, MicOff,
  Search, Bot, TrafficCone, Hospital, Droplets, Siren, Shield,
  Map as MapIcon, PanelLeftClose, Loader2, Navigation,
  X, ChevronRight, Clock, Route, Footprints,
} from 'lucide-react';
import './AIMap.css';

const containerStyle = { width: '100%', height: '100vh' };
const splitMapStyle = { width: '70%', height: '100vh' };
const DEFAULT_CENTER = { lat: 17.6792, lng: 75.33 };
const DEFAULT_ZOOM = 15;
const DEFAULT_REGION = 'Pandharpur, Maharashtra, India';
const DEFAULT_ANCHOR_QUERY = 'SKN Sinhgad College of Engineering, Korti, Pandharpur, Maharashtra, India';
const DEFAULT_ANCHOR_TITLE = 'SKN Sinhgad College of Engineering';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

// --- Multilingual Config ---
type LangCode = 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ur' | 'pa';

const LANGUAGES: { code: LangCode; label: string; nativeLabel: string; sttCode: string; ttsLang: string }[] = [
  { code: 'en', label: 'English',   nativeLabel: 'English',   sttCode: 'en-IN', ttsLang: 'en-IN' },
  { code: 'hi', label: 'Hindi',     nativeLabel: 'हिन्दी',      sttCode: 'hi-IN', ttsLang: 'hi-IN' },
  { code: 'bn', label: 'Bengali',   nativeLabel: 'বাংলা',      sttCode: 'bn-IN', ttsLang: 'bn-IN' },
  { code: 'ta', label: 'Tamil',     nativeLabel: 'தமிழ்',      sttCode: 'ta-IN', ttsLang: 'ta-IN' },
  { code: 'te', label: 'Telugu',    nativeLabel: 'తెలుగు',     sttCode: 'te-IN', ttsLang: 'te-IN' },
  { code: 'mr', label: 'Marathi',   nativeLabel: 'मराठी',      sttCode: 'mr-IN', ttsLang: 'mr-IN' },
  { code: 'gu', label: 'Gujarati',  nativeLabel: 'ગુજરાતી',    sttCode: 'gu-IN', ttsLang: 'gu-IN' },
  { code: 'kn', label: 'Kannada',   nativeLabel: 'ಕನ್ನಡ',      sttCode: 'kn-IN', ttsLang: 'kn-IN' },
  { code: 'ur', label: 'Urdu',      nativeLabel: 'اردو',       sttCode: 'ur-IN', ttsLang: 'ur-IN' },
  { code: 'pa', label: 'Punjabi',   nativeLabel: 'ਪੰਜਾਬੀ',     sttCode: 'pa-IN', ttsLang: 'pa-IN' },
];

const UI_STRINGS: Record<LangCode, Record<string, string>> = {
  en: {
    backBtn: 'Dashboard',
    offlineMode: 'Offline Mode',
    speaking: 'Speaking...',
    listening: 'Listening...',
    loadingOffline: 'Loading Offline Map...',
    loadingOnline: 'Loading Kumbh Mela Map...',
    cached: '(Cached)',
    searchPlaceholder: 'Search locations...',
    searchOfflinePlaceholder: 'Search cached locations...',
    aiHeader: 'AI Guide Suggestion',
    traffic: 'traffic',
    stop: 'Stop',
    readAloud: 'Read Aloud',
    trafficOn: 'Traffic ON',
    trafficOff: 'Traffic OFF',
    hideHospitals: 'Hide Hospitals',
    nearbyHospitals: 'Nearby Hospitals',
    fullMap: 'Full Map',
    splitView: 'Split View',
    stopVoice: 'Stop Voice',
    voiceGuide: 'Voice Guide',
    listeningFeedback: 'Listening for your search query',
    searchingFor: 'Searching for',
    hospitalOffline: 'Hospital search requires internet',
    mapNotLoaded: 'Map not loaded',
    foundHospitals: 'Found {n} nearby hospitals',
    noHospitals: 'No hospitals found nearby',
    voiceEnabled: 'Voice features enabled.',
    noSuggestion: 'No suggestion available.',
    fetchError: 'Unable to fetch AI suggestion. Please check your internet connection.',
    aiGuideSpeakPrefix: 'AI Guide Suggestion.',
    language: 'Language',
  },
  hi: {
    backBtn: 'डैशबोर्ड',
    offlineMode: 'ऑफ़लाइन मोड',
    speaking: 'बोल रहा है...',
    listening: 'सुन रहा है...',
    loadingOffline: 'ऑफ़लाइन मैप लोड हो रहा है...',
    loadingOnline: 'कुंभ मेला मैप लोड हो रहा है...',
    cached: '(कैश्ड)',
    searchPlaceholder: 'स्थान खोजें...',
    searchOfflinePlaceholder: 'कैश किए गए स्थान खोजें...',
    aiHeader: 'AI गाइड सुझाव',
    traffic: 'ट्रैफ़िक',
    stop: 'रुकें',
    readAloud: 'ज़ोर से पढ़ें',
    trafficOn: 'ट्रैफ़िक चालू',
    trafficOff: 'ट्रैफ़िक बंद',
    hideHospitals: 'अस्पताल छुपाएं',
    nearbyHospitals: 'नज़दीकी अस्पताल',
    fullMap: 'पूरा मैप',
    splitView: 'विभाजित दृश्य',
    stopVoice: 'आवाज़ बंद',
    voiceGuide: 'आवाज़ गाइड',
    listeningFeedback: 'आपकी खोज सुन रहा है',
    searchingFor: 'खोज रहा है',
    hospitalOffline: 'अस्पताल खोज के लिए इंटरनेट आवश्यक है',
    mapNotLoaded: 'मैप लोड नहीं हुआ',
    foundHospitals: '{n} नज़दीकी अस्पताल मिले',
    noHospitals: 'पास में कोई अस्पताल नहीं मिला',
    voiceEnabled: 'आवाज़ सुविधा सक्रिय।',
    noSuggestion: 'कोई सुझाव उपलब्ध नहीं।',
    fetchError: 'AI सुझाव प्राप्त करने में असमर्थ। कृपया इंटरनेट जांचें।',
    aiGuideSpeakPrefix: 'AI गाइड सुझाव।',
    language: 'भाषा',
  },
  bn: {
    backBtn: 'ড্যাশবোর্ড',
    offlineMode: 'অফলাইন মোড',
    speaking: 'বলছে...',
    listening: 'শুনছে...',
    loadingOffline: 'অফলাইন ম্যাপ লোড হচ্ছে...',
    loadingOnline: 'কুম্ভ মেলা ম্যাপ লোড হচ্ছে...',
    cached: '(ক্যাশড)',
    searchPlaceholder: 'স্থান খুঁজুন...',
    searchOfflinePlaceholder: 'ক্যাশ করা স্থান খুঁজুন...',
    aiHeader: 'AI গাইড পরামর্শ',
    traffic: 'ট্রাফিক',
    stop: 'থামুন',
    readAloud: 'জোরে পড়ুন',
    trafficOn: 'ট্রাফিক চালু',
    trafficOff: 'ট্রাফিক বন্ধ',
    hideHospitals: 'হাসপাতাল লুকান',
    nearbyHospitals: 'কাছের হাসপাতাল',
    fullMap: 'সম্পূর্ণ ম্যাপ',
    splitView: 'বিভক্ত ভিউ',
    stopVoice: 'ভয়েস বন্ধ',
    voiceGuide: 'ভয়েস গাইড',
    listeningFeedback: 'আপনার অনুসন্ধান শুনছে',
    searchingFor: 'খুঁজছে',
    hospitalOffline: 'হাসপাতাল খোঁজার জন্য ইন্টারনেট প্রয়োজন',
    mapNotLoaded: 'ম্যাপ লোড হয়নি',
    foundHospitals: '{n}টি কাছের হাসপাতাল পাওয়া গেছে',
    noHospitals: 'কাছে কোনো হাসপাতাল পাওয়া যায়নি',
    voiceEnabled: 'ভয়েস বৈশিষ্ট্য সক্রিয়।',
    noSuggestion: 'কোনো পরামর্শ পাওয়া যায়নি।',
    fetchError: 'AI পরামর্শ পেতে অক্ষম। ইন্টারনেট সংযোগ পরীক্ষা করুন।',
    aiGuideSpeakPrefix: 'AI গাইড পরামর্শ।',
    language: 'ভাষা',
  },
  ta: {
    backBtn: 'டாஷ்போர்ட்',
    offlineMode: 'ஆஃப்லைன் பயன்முறை',
    speaking: 'பேசுகிறது...',
    listening: 'கேட்கிறது...',
    loadingOffline: 'ஆஃப்லைன் வரைபடம் ஏற்றுகிறது...',
    loadingOnline: 'கும்பமேளா வரைபடம் ஏற்றுகிறது...',
    cached: '(தற்காலிகம்)',
    searchPlaceholder: 'இடங்களைத் தேடுங்கள்...',
    searchOfflinePlaceholder: 'தற்காலிக இடங்களைத் தேடுங்கள்...',
    aiHeader: 'AI வழிகாட்டி பரிந்துரை',
    traffic: 'போக்குவரத்து',
    stop: 'நிறுத்து',
    readAloud: 'சத்தமாகப் படி',
    trafficOn: 'போக்குவரத்து இயக்கம்',
    trafficOff: 'போக்குவரத்து நிறுத்தம்',
    hideHospitals: 'மருத்துவமனை மறை',
    nearbyHospitals: 'அருகிலுள்ள மருத்துவமனைகள்',
    fullMap: 'முழு வரைபடம்',
    splitView: 'பிரிப்பு காட்சி',
    stopVoice: 'குரல் நிறுத்து',
    voiceGuide: 'குரல் வழிகாட்டி',
    listeningFeedback: 'உங்கள் தேடலைக் கேட்கிறது',
    searchingFor: 'தேடுகிறது',
    hospitalOffline: 'மருத்துவமனை தேடலுக்கு இணையம் தேவை',
    mapNotLoaded: 'வரைபடம் ஏற்றப்படவில்லை',
    foundHospitals: '{n} அருகிலுள்ள மருத்துவமனைகள் கிடைத்தன',
    noHospitals: 'அருகில் மருத்துவமனை இல்லை',
    voiceEnabled: 'குரல் அம்சங்கள் இயக்கப்பட்டன.',
    noSuggestion: 'பரிந்துரை கிடைக்கவில்லை.',
    fetchError: 'AI பரிந்துரை பெற இயலவில்லை. இணைய இணைப்பை சரிபாருங்கள்.',
    aiGuideSpeakPrefix: 'AI வழிகாட்டி பரிந்துரை.',
    language: 'மொழி',
  },
  te: {
    backBtn: 'డాష్‌బోర్డ్',
    offlineMode: 'ఆఫ్‌లైన్ మోడ్',
    speaking: 'మాట్లాడుతోంది...',
    listening: 'వింటోంది...',
    loadingOffline: 'ఆఫ్‌లైన్ మ్యాప్ లోడ్ అవుతోంది...',
    loadingOnline: 'కుంభమేళా మ్యాప్ లోడ్ అవుతోంది...',
    cached: '(క్యాష్‌డ్)',
    searchPlaceholder: 'కుంభమేళా ప్రదేశాలు వెతకండి...',
    searchOfflinePlaceholder: 'క్యాష్ చేసిన ప్రదేశాలు వెతకండి...',
    aiHeader: 'AI గైడ్ సూచన',
    traffic: 'ట్రాఫిక్',
    stop: 'ఆపు',
    readAloud: 'బిగ్గరగా చదవు',
    trafficOn: 'ట్రాఫిక్ ఆన్',
    trafficOff: 'ట్రాఫిక్ ఆఫ్',
    hideHospitals: 'ఆసుపత్రులు దాచు',
    nearbyHospitals: 'సమీపంలోని ఆసుపత్రులు',
    fullMap: 'పూర్తి మ్యాప్',
    splitView: 'విభజన వీక్షణ',
    stopVoice: 'వాయిస్ ఆపు',
    voiceGuide: 'వాయిస్ గైడ్',
    listeningFeedback: 'మీ శోధన వింటోంది',
    searchingFor: 'శోధిస్తోంది',
    hospitalOffline: 'ఆసుపత్రి శోధనకు ఇంటర్నెట్ అవసరం',
    mapNotLoaded: 'మ్యాప్ లోడ్ కాలేదు',
    foundHospitals: '{n} సమీపంలోని ఆసుపత్రులు దొరికాయి',
    noHospitals: 'సమీపంలో ఆసుపత్రులు లేవు',
    voiceEnabled: 'వాయిస్ ఫీచర్లు ఎనేబుల్ అయ్యాయి.',
    noSuggestion: 'సూచన అందుబాటులో లేదు.',
    fetchError: 'AI సూచన పొందలేకపోయింది. ఇంటర్నెట్ సంబంధం తనిఖీ చేయండి.',
    aiGuideSpeakPrefix: 'AI గైడ్ సూచన.',
    language: 'భాష',
  },
  mr: {
    backBtn: 'डॅशबोर्ड',
    offlineMode: 'ऑफलाइन मोड',
    speaking: 'बोलत आहे...',
    listening: 'ऐकत आहे...',
    loadingOffline: 'ऑफलाइन नकाशा लोड होत आहे...',
    loadingOnline: 'कुंभमेळा नकाशा लोड होत आहे...',
    cached: '(कॅश केलेला)',
    searchPlaceholder: 'ठिकाणे शोधा...',
    searchOfflinePlaceholder: 'कॅश केलेली ठिकाणे शोधा...',
    aiHeader: 'AI मार्गदर्शक सूचना',
    traffic: 'ट्रॅफिक',
    stop: 'थांबा',
    readAloud: 'मोठ्याने वाचा',
    trafficOn: 'ट्रॅफिक चालू',
    trafficOff: 'ट्रॅफिक बंद',
    hideHospitals: 'रुग्णालये लपवा',
    nearbyHospitals: 'जवळची रुग्णालये',
    fullMap: 'पूर्ण नकाशा',
    splitView: 'विभाजित दृश्य',
    stopVoice: 'आवाज बंद',
    voiceGuide: 'आवाज मार्गदर्शक',
    listeningFeedback: 'तुमचा शोध ऐकत आहे',
    searchingFor: 'शोधत आहे',
    hospitalOffline: 'रुग्णालय शोधासाठी इंटरनेट आवश्यक',
    mapNotLoaded: 'नकाशा लोड झाला नाही',
    foundHospitals: '{n} जवळची रुग्णालये सापडली',
    noHospitals: 'जवळ रुग्णालये सापडली नाहीत',
    voiceEnabled: 'आवाज वैशिष्ट्ये सक्रिय.',
    noSuggestion: 'सूचना उपलब्ध नाही.',
    fetchError: 'AI सूचना मिळवता आली नाही. इंटरनेट तपासा.',
    aiGuideSpeakPrefix: 'AI मार्गदर्शक सूचना.',
    language: 'भाषा',
  },
  gu: {
    backBtn: 'ડેશબોર્ડ',
    offlineMode: 'ઑફલાઇન મોડ',
    speaking: 'બોલી રહ્યું છે...',
    listening: 'સાંભળી રહ્યું છે...',
    loadingOffline: 'ઑફલાઇન નકશો લોડ થઈ રહ્યો છે...',
    loadingOnline: 'કુંભમેળા નકશો લોડ થઈ રહ્યો છે...',
    cached: '(કેશ્ડ)',
    searchPlaceholder: 'સ્થાન શોધો...',
    searchOfflinePlaceholder: 'કેશ કરેલા સ્થાનો શોધો...',
    aiHeader: 'AI માર્ગદર્શક સૂચન',
    traffic: 'ટ્રાફિક',
    stop: 'રોકો',
    readAloud: 'મોટેથી વાંચો',
    trafficOn: 'ટ્રાફિક ચાલુ',
    trafficOff: 'ટ્રાફિક બંધ',
    hideHospitals: 'હોસ્પિટલો છુપાવો',
    nearbyHospitals: 'નજીકની હોસ્પિટલો',
    fullMap: 'પૂર્ણ નકશો',
    splitView: 'વિભાજિત દૃશ્ય',
    stopVoice: 'અવાજ બંધ',
    voiceGuide: 'અવાજ માર્ગદર્શક',
    listeningFeedback: 'તમારી શોધ સાંભળી રહ્યું છે',
    searchingFor: 'શોધી રહ્યું છે',
    hospitalOffline: 'હોસ્પિટલ શોધ માટે ઇન્ટરનેટ જરૂરી',
    mapNotLoaded: 'નકશો લોડ થયો નથી',
    foundHospitals: '{n} નજીકની હોસ્પિટલો મળી',
    noHospitals: 'નજીકમાં કોઈ હોસ્પિટલ મળી નહીં',
    voiceEnabled: 'અવાજ સુવિધાઓ સક્રિય.',
    noSuggestion: 'કોઈ સૂચન ઉપલબ્ધ નથી.',
    fetchError: 'AI સૂચન મેળવી શકાયું નહીં. ઇન્ટરનેટ તપાસો.',
    aiGuideSpeakPrefix: 'AI માર્ગદર્શક સૂચન.',
    language: 'ભાષા',
  },
  kn: {
    backBtn: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    offlineMode: 'ಆಫ್‌ಲೈನ್ ಮೋಡ್',
    speaking: 'ಮಾತನಾಡುತ್ತಿದೆ...',
    listening: 'ಕೇಳುತ್ತಿದೆ...',
    loadingOffline: 'ಆಫ್‌ಲೈನ್ ನಕ್ಷೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    loadingOnline: 'ಕುಂಭಮೇಳ ನಕ್ಷೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    cached: '(ಕ್ಯಾಶ್‌ಡ್)',
    searchPlaceholder: 'ಕುಂಭಮೇಳ ಸ್ಥಳಗಳನ್ನು ಹುಡುಕಿ...',
    searchOfflinePlaceholder: 'ಕ್ಯಾಶ್ ಮಾಡಿದ ಸ್ಥಳಗಳನ್ನು ಹುಡುಕಿ...',
    aiHeader: 'AI ಮಾರ್ಗದರ್ಶಿ ಸಲಹೆ',
    traffic: 'ಸಂಚಾರ',
    stop: 'ನಿಲ್ಲಿಸಿ',
    readAloud: 'ಜೋರಾಗಿ ಓದಿ',
    trafficOn: 'ಸಂಚಾರ ಆನ್',
    trafficOff: 'ಸಂಚಾರ ಆಫ್',
    hideHospitals: 'ಆಸ್ಪತ್ರೆಗಳು ಮರೆಮಾಡಿ',
    nearbyHospitals: 'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳು',
    fullMap: 'ಪೂರ್ಣ ನಕ್ಷೆ',
    splitView: 'ವಿಭಜಿತ ವೀಕ್ಷಣೆ',
    stopVoice: 'ಧ್ವನಿ ನಿಲ್ಲಿಸಿ',
    voiceGuide: 'ಧ್ವನಿ ಮಾರ್ಗದರ್ಶಿ',
    listeningFeedback: 'ನಿಮ್ಮ ಹುಡುಕಾಟವನ್ನು ಕೇಳುತ್ತಿದೆ',
    searchingFor: 'ಹುಡುಕುತ್ತಿದೆ',
    hospitalOffline: 'ಆಸ್ಪತ್ರೆ ಹುಡುಕಾಟಕ್ಕೆ ಇಂಟರ್ನೆಟ್ ಬೇಕು',
    mapNotLoaded: 'ನಕ್ಷೆ ಲೋಡ್ ಆಗಿಲ್ಲ',
    foundHospitals: '{n} ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳು ಸಿಕ್ಕಿವೆ',
    noHospitals: 'ಹತ್ತಿರ ಆಸ್ಪತ್ರೆಗಳು ಸಿಗಲಿಲ್ಲ',
    voiceEnabled: 'ಧ್ವನಿ ವೈಶಿಷ್ಟ್ಯಗಳು ಸಕ್ರಿಯ.',
    noSuggestion: 'ಸಲಹೆ ಲಭ್ಯವಿಲ್ಲ.',
    fetchError: 'AI ಸಲಹೆ ಪಡೆಯಲಾಗಲಿಲ್ಲ. ಇಂಟರ್ನೆಟ್ ಪರಿಶೀಲಿಸಿ.',
    aiGuideSpeakPrefix: 'AI ಮಾರ್ಗದರ್ಶಿ ಸಲಹೆ.',
    language: 'ಭಾಷೆ',
  },
  ur: {
    backBtn: 'ڈیش بورڈ',
    offlineMode: 'آف لائن موڈ',
    speaking: 'بول رہا ہے...',
    listening: 'سن رہا ہے...',
    loadingOffline: 'آف لائن نقشہ لوڈ ہو رہا ہے...',
    loadingOnline: 'کمبھ میلہ نقشہ لوڈ ہو رہا ہے...',
    cached: '(کیشڈ)',
    searchPlaceholder: 'کمبھ میلہ مقامات تلاش کریں...',
    searchOfflinePlaceholder: 'کیش کردہ مقامات تلاش کریں...',
    aiHeader: 'AI رہنما تجویز',
    traffic: 'ٹریفک',
    stop: 'رکیں',
    readAloud: 'اونچا پڑھیں',
    trafficOn: 'ٹریفک آن',
    trafficOff: 'ٹریفک آف',
    hideHospitals: 'ہسپتال چھپائیں',
    nearbyHospitals: 'قریبی ہسپتال',
    fullMap: 'مکمل نقشہ',
    splitView: 'تقسیم منظر',
    stopVoice: 'آواز بند',
    voiceGuide: 'آواز رہنما',
    listeningFeedback: 'آپ کی تلاش سن رہا ہے',
    searchingFor: 'تلاش کر رہا ہے',
    hospitalOffline: 'ہسپتال تلاش کے لیے انٹرنیٹ ضروری ہے',
    mapNotLoaded: 'نقشہ لوڈ نہیں ہوا',
    foundHospitals: '{n} قریبی ہسپتال ملے',
    noHospitals: 'قریب کوئی ہسپتال نہیں ملا',
    voiceEnabled: 'آواز کی سہولت فعال۔',
    noSuggestion: 'کوئی تجویز دستیاب نہیں۔',
    fetchError: 'AI تجویز حاصل کرنے سے قاصر۔ انٹرنیٹ چیک کریں۔',
    aiGuideSpeakPrefix: 'AI رہنما تجویز۔',
    language: 'زبان',
  },
  pa: {
    backBtn: 'ਡੈਸ਼ਬੋਰਡ',
    offlineMode: 'ਆਫ਼ਲਾਈਨ ਮੋਡ',
    speaking: 'ਬੋਲ ਰਿਹਾ ਹੈ...',
    listening: 'ਸੁਣ ਰਿਹਾ ਹੈ...',
    loadingOffline: 'ਆਫ਼ਲਾਈਨ ਨਕਸ਼ਾ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...',
    loadingOnline: 'ਕੁੰਭ ਮੇਲਾ ਨਕਸ਼ਾ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...',
    cached: '(ਕੈਸ਼ਡ)',
    searchPlaceholder: 'ਕੁੰਭ ਮੇਲਾ ਸਥਾਨ ਖੋਜੋ...',
    searchOfflinePlaceholder: 'ਕੈਸ਼ ਕੀਤੇ ਸਥਾਨ ਖੋਜੋ...',
    aiHeader: 'AI ਗਾਈਡ ਸੁਝਾਅ',
    traffic: 'ਟ੍ਰੈਫ਼ਿਕ',
    stop: 'ਰੁਕੋ',
    readAloud: 'ਉੱਚੀ ਪੜ੍ਹੋ',
    trafficOn: 'ਟ੍ਰੈਫ਼ਿਕ ਚਾਲੂ',
    trafficOff: 'ਟ੍ਰੈਫ਼ਿਕ ਬੰਦ',
    hideHospitals: 'ਹਸਪਤਾਲ ਲੁਕਾਓ',
    nearbyHospitals: 'ਨੇੜਲੇ ਹਸਪਤਾਲ',
    fullMap: 'ਪੂਰਾ ਨਕਸ਼ਾ',
    splitView: 'ਵੰਡਿਆ ਦ੍ਰਿਸ਼',
    stopVoice: 'ਅਵਾਜ਼ ਬੰਦ',
    voiceGuide: 'ਅਵਾਜ਼ ਗਾਈਡ',
    listeningFeedback: 'ਤੁਹਾਡੀ ਖੋਜ ਸੁਣ ਰਿਹਾ ਹੈ',
    searchingFor: 'ਖੋਜ ਰਿਹਾ ਹੈ',
    hospitalOffline: 'ਹਸਪਤਾਲ ਖੋਜ ਲਈ ਇੰਟਰਨੈੱਟ ਲੋੜੀਂਦਾ ਹੈ',
    mapNotLoaded: 'ਨਕਸ਼ਾ ਲੋਡ ਨਹੀਂ ਹੋਇਆ',
    foundHospitals: '{n} ਨੇੜਲੇ ਹਸਪਤਾਲ ਮਿਲੇ',
    noHospitals: 'ਨੇੜੇ ਕੋਈ ਹਸਪਤਾਲ ਨਹੀਂ ਮਿਲਿਆ',
    voiceEnabled: 'ਅਵਾਜ਼ ਸੁਵਿਧਾ ਸਰਗਰਮ।',
    noSuggestion: 'ਕੋਈ ਸੁਝਾਅ ਉਪਲਬਧ ਨਹੀਂ।',
    fetchError: 'AI ਸੁਝਾਅ ਪ੍ਰਾਪਤ ਕਰਨ ਵਿੱਚ ਅਸਮਰੱਥ। ਇੰਟਰਨੈੱਟ ਜਾਂਚੋ।',
    aiGuideSpeakPrefix: 'AI ਗਾਈਡ ਸੁਝਾਅ।',
    language: 'ਭਾਸ਼ਾ',
  },
};

type FacilityCategoryKey = 'hospital' | 'sanitation' | 'emergency' | 'police';
type MarkerSymbol = 'medical' | 'sanitation' | 'emergency' | 'police' | 'campus';

const MAP_CONTEXT_COPY: Record<
  LangCode,
  {
    loadingOnline: string;
    searchPlaceholder: string;
    searchOfflinePlaceholder: string;
    nearbyTemplate: string;
    hideTemplate: string;
    foundTemplate: string;
    noPlacesTemplate: string;
    placesOfflineTemplate: string;
    defaultStartPoint: string;
    cachedStatus: string;
    offlineStatus: string;
  }
> = {
  en: {
    loadingOnline: 'Loading Pandharpur Safety Map...',
    searchPlaceholder: 'Search places in Pandharpur...',
    searchOfflinePlaceholder: 'Search cached places in Pandharpur...',
    nearbyTemplate: 'Nearby {places}',
    hideTemplate: 'Hide {places}',
    foundTemplate: 'Found {n} nearby {places}',
    noPlacesTemplate: 'No {places} found nearby',
    placesOfflineTemplate: '{places} search requires internet',
    defaultStartPoint: 'Default start point',
    cachedStatus: 'Cached',
    offlineStatus: 'Offline',
  },
  hi: {
    loadingOnline: 'पंढरपुर सुरक्षा मानचित्र लोड हो रहा है...',
    searchPlaceholder: 'पंढरपुर में स्थान खोजें...',
    searchOfflinePlaceholder: 'पंढरपुर में कैश्ड स्थान खोजें...',
    nearbyTemplate: 'नज़दीकी {places}',
    hideTemplate: '{places} छुपाएँ',
    foundTemplate: '{n} नज़दीकी {places} मिले',
    noPlacesTemplate: 'आसपास कोई {places} नहीं मिले',
    placesOfflineTemplate: '{places} खोज के लिए इंटरनेट आवश्यक है',
    defaultStartPoint: 'डिफ़ॉल्ट प्रारंभ बिंदु',
    cachedStatus: 'कैश्ड',
    offlineStatus: 'ऑफ़लाइन',
  },
  bn: {
    loadingOnline: 'পাঁঢরপুর নিরাপত্তা মানচিত্র লোড হচ্ছে...',
    searchPlaceholder: 'পাঁঢরপুরে স্থান খুঁজুন...',
    searchOfflinePlaceholder: 'পাঁঢরপুরে ক্যাশড স্থান খুঁজুন...',
    nearbyTemplate: 'কাছাকাছি {places}',
    hideTemplate: '{places} লুকান',
    foundTemplate: '{n}টি কাছাকাছি {places} পাওয়া গেছে',
    noPlacesTemplate: 'কাছাকাছি কোনো {places} পাওয়া যায়নি',
    placesOfflineTemplate: '{places} খুঁজতে ইন্টারনেট প্রয়োজন',
    defaultStartPoint: 'ডিফল্ট শুরু বিন্দু',
    cachedStatus: 'ক্যাশড',
    offlineStatus: 'অফলাইন',
  },
  ta: {
    loadingOnline: 'பண்டர்பூர் பாதுகாப்பு வரைபடம் ஏற்றப்படுகிறது...',
    searchPlaceholder: 'பண்டர்பூரில் இடங்களைத் தேடுங்கள்...',
    searchOfflinePlaceholder: 'பண்டர்பூரில் சேமிக்கப்பட்ட இடங்களைத் தேடுங்கள்...',
    nearbyTemplate: 'அருகிலுள்ள {places}',
    hideTemplate: '{places} மறை',
    foundTemplate: '{n} அருகிலுள்ள {places} கிடைத்தன',
    noPlacesTemplate: 'அருகில் {places} எதுவும் கிடைக்கவில்லை',
    placesOfflineTemplate: '{places} தேட இணையம் தேவை',
    defaultStartPoint: 'இயல்புநிலை தொடக்கப் புள்ளி',
    cachedStatus: 'கேஷ் செய்யப்பட்டது',
    offlineStatus: 'ஆஃப்லைன்',
  },
  te: {
    loadingOnline: 'పండర్‌పూర్ భద్రతా మ్యాప్ లోడ్ అవుతోంది...',
    searchPlaceholder: 'పండర్‌పూర్‌లో ప్రదేశాలను వెతకండి...',
    searchOfflinePlaceholder: 'పండర్‌పూర్‌లో క్యాష్ చేసిన ప్రదేశాలను వెతకండి...',
    nearbyTemplate: 'సమీపంలోని {places}',
    hideTemplate: '{places} దాచండి',
    foundTemplate: '{n} సమీపంలోని {places} దొరికాయి',
    noPlacesTemplate: 'సమీపంలో {places} ఏవీ లేవు',
    placesOfflineTemplate: '{places} శోధనకు ఇంటర్నెట్ అవసరం',
    defaultStartPoint: 'డిఫాల్ట్ ప్రారంభ స్థానం',
    cachedStatus: 'క్యాష్ చేయబడింది',
    offlineStatus: 'ఆఫ్‌లైన్',
  },
  mr: {
    loadingOnline: 'पंढरपूर सुरक्षा नकाशा लोड होत आहे...',
    searchPlaceholder: 'पंढरपूरमधील ठिकाणे शोधा...',
    searchOfflinePlaceholder: 'पंढरपूरमधील कॅश केलेली ठिकाणे शोधा...',
    nearbyTemplate: 'जवळची {places}',
    hideTemplate: '{places} लपवा',
    foundTemplate: '{n} जवळची {places} सापडली',
    noPlacesTemplate: 'जवळ {places} सापडली नाहीत',
    placesOfflineTemplate: '{places} शोधासाठी इंटरनेट आवश्यक आहे',
    defaultStartPoint: 'डीफॉल्ट प्रारंभ बिंदू',
    cachedStatus: 'कॅश केलेले',
    offlineStatus: 'ऑफलाइन',
  },
  gu: {
    loadingOnline: 'પંઢરપુર સુરક્ષા નકશો લોડ થઈ રહ્યો છે...',
    searchPlaceholder: 'પંઢરપુરમાં સ્થળો શોધો...',
    searchOfflinePlaceholder: 'પંઢરપુરમાં કેશ્ડ સ્થળો શોધો...',
    nearbyTemplate: 'નજીકના {places}',
    hideTemplate: '{places} છુપાવો',
    foundTemplate: '{n} નજીકના {places} મળ્યા',
    noPlacesTemplate: 'નજીક કોઈ {places} મળ્યા નથી',
    placesOfflineTemplate: '{places} શોધ માટે ઇન્ટરનેટ જરૂરી છે',
    defaultStartPoint: 'ડિફોલ્ટ શરૂઆત બિંદુ',
    cachedStatus: 'કેશ્ડ',
    offlineStatus: 'ઑફલાઇન',
  },
  kn: {
    loadingOnline: 'ಪಂಢರ್ಪುರ ಸುರಕ್ಷತಾ ನಕ್ಷೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    searchPlaceholder: 'ಪಂಢರ್ಪುರದ ಸ್ಥಳಗಳನ್ನು ಹುಡುಕಿ...',
    searchOfflinePlaceholder: 'ಪಂಢರ್ಪುರದ ಕ್ಯಾಶ್ ಮಾಡಿದ ಸ್ಥಳಗಳನ್ನು ಹುಡುಕಿ...',
    nearbyTemplate: 'ಹತ್ತಿರದ {places}',
    hideTemplate: '{places} ಮರೆಮಾಡಿ',
    foundTemplate: '{n} ಹತ್ತಿರದ {places} ಸಿಕ್ಕಿವೆ',
    noPlacesTemplate: 'ಹತ್ತಿರ {places} ಸಿಗಲಿಲ್ಲ',
    placesOfflineTemplate: '{places} ಹುಡುಕಾಟಕ್ಕೆ ಇಂಟರ್ನೆಟ್ ಬೇಕು',
    defaultStartPoint: 'ಡೀಫಾಲ್ಟ್ ಪ್ರಾರಂಭ ಬಿಂದು',
    cachedStatus: 'ಕ್ಯಾಶ್ ಮಾಡಲಾಗಿದೆ',
    offlineStatus: 'ಆಫ್‌ಲೈನ್',
  },
  ur: {
    loadingOnline: 'پنڈھرپور حفاظتی نقشہ لوڈ ہو رہا ہے...',
    searchPlaceholder: 'پنڈھرپور میں مقامات تلاش کریں...',
    searchOfflinePlaceholder: 'پنڈھرپور میں کیش شدہ مقامات تلاش کریں...',
    nearbyTemplate: 'قریبی {places}',
    hideTemplate: '{places} چھپائیں',
    foundTemplate: '{n} قریبی {places} ملے',
    noPlacesTemplate: 'قریب کوئی {places} نہیں ملے',
    placesOfflineTemplate: '{places} تلاش کے لیے انٹرنیٹ ضروری ہے',
    defaultStartPoint: 'ڈیفالٹ آغاز مقام',
    cachedStatus: 'کیشڈ',
    offlineStatus: 'آف لائن',
  },
  pa: {
    loadingOnline: 'ਪੰਧਰਪੁਰ ਸੁਰੱਖਿਆ ਨਕਸ਼ਾ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...',
    searchPlaceholder: 'ਪੰਧਰਪੁਰ ਵਿੱਚ ਥਾਵਾਂ ਖੋਜੋ...',
    searchOfflinePlaceholder: 'ਪੰਧਰਪੁਰ ਵਿੱਚ ਕੈਸ਼ ਕੀਤੀਆਂ ਥਾਵਾਂ ਖੋਜੋ...',
    nearbyTemplate: 'ਨੇੜਲੇ {places}',
    hideTemplate: '{places} ਲੁਕਾਓ',
    foundTemplate: '{n} ਨੇੜਲੇ {places} ਮਿਲੇ',
    noPlacesTemplate: 'ਨੇੜੇ ਕੋਈ {places} ਨਹੀਂ ਮਿਲੇ',
    placesOfflineTemplate: '{places} ਖੋਜ ਲਈ ਇੰਟਰਨੈੱਟ ਲੋੜੀਂਦਾ ਹੈ',
    defaultStartPoint: 'ਡਿਫਾਲਟ ਸ਼ੁਰੂਆਤੀ ਬਿੰਦੂ',
    cachedStatus: 'ਕੈਸ਼ਡ',
    offlineStatus: 'ਆਫ਼ਲਾਈਨ',
  },
};

const FACILITY_NAMES: Record<LangCode, Record<FacilityCategoryKey, string>> = {
  en: {
    hospital: 'Hospitals',
    sanitation: 'Sanitisation Spots',
    emergency: 'Emergency Gathering Spots',
    police: 'Police Stations',
  },
  hi: {
    hospital: 'अस्पताल',
    sanitation: 'स्वच्छता स्थल',
    emergency: 'आपातकालीन एकत्रीकरण स्थल',
    police: 'पुलिस स्टेशन',
  },
  bn: {
    hospital: 'হাসপাতাল',
    sanitation: 'স্যানিটাইজেশন স্পট',
    emergency: 'জরুরি সমাবেশ স্থান',
    police: 'পুলিশ স্টেশন',
  },
  ta: {
    hospital: 'மருத்துவமனைகள்',
    sanitation: 'சுகாதார இடங்கள்',
    emergency: 'அவசரக் கூடும் இடங்கள்',
    police: 'காவல் நிலையங்கள்',
  },
  te: {
    hospital: 'ఆసుపత్రులు',
    sanitation: 'పరిశుభ్రత కేంద్రాలు',
    emergency: 'అత్యవసర సమీకరణ ప్రదేశాలు',
    police: 'పోలీస్ స్టేషన్లు',
  },
  mr: {
    hospital: 'रुग्णालये',
    sanitation: 'स्वच्छता केंद्रे',
    emergency: 'आपत्कालीन जमाव बिंदू',
    police: 'पोलीस ठाणी',
  },
  gu: {
    hospital: 'હોસ્પિટલો',
    sanitation: 'સ્વચ્છતા સ્થળો',
    emergency: 'આપાતકાલીન ભેગા થવાના સ્થળો',
    police: 'પોલીસ સ્ટેશનો',
  },
  kn: {
    hospital: 'ಆಸ್ಪತ್ರೆಗಳು',
    sanitation: 'ಸ್ವಚ್ಛತಾ ಸ್ಥಳಗಳು',
    emergency: 'ತುರ್ತು ಸೇರುವ ಸ್ಥಳಗಳು',
    police: 'ಪೊಲೀಸ್ ಠಾಣೆಗಳು',
  },
  ur: {
    hospital: 'ہسپتال',
    sanitation: 'صفائی مقامات',
    emergency: 'ہنگامی اجتماع کے مقامات',
    police: 'پولیس اسٹیشن',
  },
  pa: {
    hospital: 'ਹਸਪਤਾਲ',
    sanitation: 'ਸਫ਼ਾਈ ਸਥਾਨ',
    emergency: 'ਐਮਰਜੈਂਸੀ ਇਕੱਠ ਸਥਾਨ',
    police: 'ਪੁਲਿਸ ਥਾਣੇ',
  },
};

const FACILITY_CATEGORY_KEYS: FacilityCategoryKey[] = ['hospital', 'sanitation', 'emergency', 'police'];
const LEGACY_MAP_CACHE_KEYS = ['kumbh-mela-map-cache'];
const OFFLINE_DB_NAME = 'PandharpurAIGuideOfflineDB';
const OFFLINE_CENTER_KEY = 'pandharpur-ai-guide-center';

const FACILITY_ICONS: Record<FacilityCategoryKey, React.ComponentType<{ className?: string; size?: number }>> = {
  hospital: Hospital,
  sanitation: Droplets,
  emergency: Siren,
  police: Shield,
};

const FACILITY_CONFIG: Record<
  FacilityCategoryKey,
  {
    queries: string[];
    radius: number;
    color: string;
    symbol: MarkerSymbol;
  }
> = {
  hospital: {
    queries: [`hospital near ${DEFAULT_ANCHOR_QUERY}`],
    radius: 12000,
    color: '#dc2626',
    symbol: 'medical',
  },
  sanitation: {
    queries: [
      `public toilet near ${DEFAULT_ANCHOR_QUERY}`,
      `sanitisation spot near ${DEFAULT_ANCHOR_QUERY}`,
      `washroom near ${DEFAULT_ANCHOR_QUERY}`,
    ],
    radius: 10000,
    color: '#0f766e',
    symbol: 'sanitation',
  },
  emergency: {
    queries: [
      `emergency shelter near ${DEFAULT_ANCHOR_QUERY}`,
      `assembly point near ${DEFAULT_ANCHOR_QUERY}`,
      `community hall near ${DEFAULT_ANCHOR_QUERY}`,
    ],
    radius: 12000,
    color: '#d97706',
    symbol: 'emergency',
  },
  police: {
    queries: [`police station near ${DEFAULT_ANCHOR_QUERY}`],
    radius: 12000,
    color: '#2563eb',
    symbol: 'police',
  },
};

const formatTemplate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template,
  );

const GEMINI_LANG_NAMES: Record<LangCode, string> = {
  en: 'English', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
  mr: 'Marathi', gu: 'Gujarati', kn: 'Kannada', ur: 'Urdu', pa: 'Punjabi',
};

const MAP_CACHE_CONFIG = {
  preloadTiles: true,
  cacheKey: 'pandharpur-ai-guide-map-cache',
  cacheExpiry: 24 * 60 * 60 * 1000,
  preloadZoomLevels: [12, 13, 14, 15, 16, 17],
  preloadRadius: 5000,
};

const GMAPS_LIBRARIES: ('places' | 'visualization')[] = ['places', 'visualization'];

type TrafficData = {
  walkingTime: number;
  bikeTime: number;
  trafficLevel: string;
  walkingSpeed: string;
  bikeSpeed: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type FacilityInfo = {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating?: number;
  open?: boolean;
};

const createFacilityToggleState = (value = false): Record<FacilityCategoryKey, boolean> => ({
  hospital: value,
  sanitation: value,
  emergency: value,
  police: value,
});

const createFacilityMarkerState = (): Record<FacilityCategoryKey, google.maps.Marker[]> => ({
  hospital: [],
  sanitation: [],
  emergency: [],
  police: [],
});

export default function AIMap({ crowdPoints = [] }: { crowdPoints?: { lat: number; lng: number }[] }) {
  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);
  const anchorMarkerRef = useRef<google.maps.Marker | null>(null);
  const anchorResolvedRef = useRef(false);
  const defaultFacilitiesLoadedRef = useRef(false);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const userLocationAccuracyRef = useRef<google.maps.Circle | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapCached, setMapCached] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchMarker, setSearchMarker] = useState<google.maps.Marker | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [directionSteps, setDirectionSteps] = useState<{ instruction: string; distance: string; duration: string }[]>([]);
  const [routeSummary, setRouteSummary] = useState<{ distance: string; duration: string } | null>(null);
  const [showDirectionsPanel, setShowDirectionsPanel] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiSuggestionLang, setAiSuggestionLang] = useState<LangCode>(() => (localStorage.getItem('aimap-lang') as LangCode) || 'en');
  const [isLoading, setIsLoading] = useState(false);
  const [showTraffic, setShowTraffic] = useState(true);
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'split'>('full');
  const [mapLoadingProgress, setMapLoadingProgress] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [mapsLoadError, setMapsLoadError] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeFacilities, setActiveFacilities] = useState<Record<FacilityCategoryKey, boolean>>(createFacilityToggleState);
  const [, setFacilityMarkers] = useState<Record<FacilityCategoryKey, google.maps.Marker[]>>(createFacilityMarkerState);
  const [language, setLanguage] = useState<LangCode>(() => (localStorage.getItem('aimap-lang') as LangCode) || 'en');
  const [showLangMenu, setShowLangMenu] = useState(false);

  const t = UI_STRINGS[language];
  const mapCopy = MAP_CONTEXT_COPY[language];
  const facilityNames = FACILITY_NAMES[language];

  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const speechRecRef = useRef<BrowserSpeechRecognition | null>(null);

  const resolveTtsVoice = (ttsLang: string) => {
    const synth = speechSynthRef.current;
    if (!synth) return { lang: ttsLang, voice: null as SpeechSynthesisVoice | null };

    const voices = synth.getVoices();
    if (!voices.length) return { lang: ttsLang, voice: null as SpeechSynthesisVoice | null };

    const wanted = ttsLang.toLowerCase();
    const base = wanted.split('-')[0];

    const exact = voices.find(v => v.lang.toLowerCase() === wanted) || null;
    if (exact) return { lang: exact.lang, voice: exact };

    const baseMatch = voices.find(v => v.lang.toLowerCase().startsWith(`${base}-`)) || null;
    if (baseMatch) return { lang: baseMatch.lang, voice: baseMatch };

    return { lang: ttsLang, voice: null as SpeechSynthesisVoice | null };
  };

  // --- Offline & Cache Init ---
  useEffect(() => {
    initializeOfflineSupport();
    initializeMapCache();

    const update = () => {
      setIsOffline(!navigator.onLine);
      if (!navigator.onLine) loadOfflineData();
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();

    // Voice
    if ('speechSynthesis' in window) speechSynthRef.current = window.speechSynthesis;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const speechWindow = window as Window & {
        SpeechRecognition?: BrowserSpeechRecognitionConstructor;
        webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
      };
      const SR = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = LANGUAGES.find(l => l.code === language)?.sttCode || 'en-IN';
        rec.maxAlternatives = 1;
        rec.onstart = () => { stopSpeaking(); setIsListening(true); };
        rec.onresult = e => {
          const transcript = e.results[0][0].transcript;
          setSearchInput(transcript);
          setIsListening(false);
        };
        rec.onerror = () => setIsListening(false);
        rec.onend = () => setIsListening(false);
        speechRecRef.current = rec;
      }
    }

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // --- IndexedDB ---
  const initializeOfflineSupport = async () => {
    try {
      await initializeIndexedDB();
      await preloadOfflineData();
    } catch { /* offline support optional */ }
  };

  const initializeIndexedDB = (): Promise<void> =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open(OFFLINE_DB_NAME, 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { dbRef.current = req.result; resolve(); };
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('mapTiles'))
          db.createObjectStore('mapTiles', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('mapData'))
          db.createObjectStore('mapData', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('aiSuggestions'))
          db.createObjectStore('aiSuggestions', { keyPath: 'query' });
      };
    });

  const preloadOfflineData = async () => {
    if (!dbRef.current) return;
    const tiles = [
      { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng, zoom: DEFAULT_ZOOM },
      { lat: DEFAULT_CENTER.lat + 0.01, lng: DEFAULT_CENTER.lng + 0.01, zoom: DEFAULT_ZOOM },
      { lat: DEFAULT_CENTER.lat - 0.01, lng: DEFAULT_CENTER.lng - 0.01, zoom: DEFAULT_ZOOM },
    ];
    for (const tile of tiles) {
      const tx = dbRef.current.transaction(['mapTiles'], 'readwrite');
      tx.objectStore('mapTiles').put({ id: `${tile.lat}_${tile.lng}_${tile.zoom}`, ...tile, timestamp: Date.now() });
    }
    const tx2 = dbRef.current.transaction(['mapData'], 'readwrite');
    tx2.objectStore('mapData').put({ id: OFFLINE_CENTER_KEY, type: 'center', data: DEFAULT_CENTER, timestamp: Date.now() });
  };

  const loadOfflineData = () => {
    if (!dbRef.current) return;
    const tx = dbRef.current.transaction(['mapData'], 'readonly');
    tx.objectStore('mapData').get(OFFLINE_CENTER_KEY);
  };

  // --- Map Cache ---
  const initializeMapCache = () => {
    try {
      LEGACY_MAP_CACHE_KEYS.forEach(key => localStorage.removeItem(key));
      const cached = localStorage.getItem(MAP_CACHE_CONFIG.cacheKey);
      if (cached) {
        const d = JSON.parse(cached);
        if (Date.now() - d.timestamp < MAP_CACHE_CONFIG.cacheExpiry) {
          setMapCached(true);
        } else localStorage.removeItem(MAP_CACHE_CONFIG.cacheKey);
      }
    } catch { /* ignore */ }
  };

  const preloadMapTiles = async () => {
    if (!MAP_CACHE_CONFIG.preloadTiles || !window.google || isOffline) return;
    try {
      const bounds = new google.maps.LatLngBounds();
      const latOffset = MAP_CACHE_CONFIG.preloadRadius / 111320;
      const lngOffset = MAP_CACHE_CONFIG.preloadRadius / (111320 * Math.cos(DEFAULT_CENTER.lat * Math.PI / 180));
      bounds.extend(new google.maps.LatLng(DEFAULT_CENTER.lat - latOffset, DEFAULT_CENTER.lng - lngOffset));
      bounds.extend(new google.maps.LatLng(DEFAULT_CENTER.lat + latOffset, DEFAULT_CENTER.lng + lngOffset));
      for (const zoom of MAP_CACHE_CONFIG.preloadZoomLevels) {
        const m = new google.maps.Map(document.createElement('div'), { center: DEFAULT_CENTER, zoom, disableDefaultUI: true });
        m.fitBounds(bounds);
        setMapLoadingProgress(Math.round(((MAP_CACHE_CONFIG.preloadZoomLevels.indexOf(zoom) + 1) / MAP_CACHE_CONFIG.preloadZoomLevels.length) * 100));
        await new Promise(r => setTimeout(r, 500));
      }
      const cd = {
        timestamp: Date.now(), center: DEFAULT_CENTER,
        bounds: { north: bounds.getNorthEast().lat(), south: bounds.getSouthWest().lat(), east: bounds.getNorthEast().lng(), west: bounds.getSouthWest().lng() },
        zoomLevels: MAP_CACHE_CONFIG.preloadZoomLevels,
      };
      localStorage.setItem(MAP_CACHE_CONFIG.cacheKey, JSON.stringify(cd));
      setMapCached(true);
    } catch { /* ignore */ }
  };

  // --- Map Load ---
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (!isOffline) {
      trafficLayerRef.current = new google.maps.TrafficLayer();
      if (showTraffic) trafficLayerRef.current.setMap(map);
    }
    map.setOptions({ gestureHandling: 'cooperative', zoomControl: true, mapTypeControl: false, scaleControl: true, streetViewControl: false, rotateControl: false, fullscreenControl: false });
    map.addListener('idle', () => {
      try {
        const bounds = map.getBounds();
        if (bounds) {
          localStorage.setItem(MAP_CACHE_CONFIG.cacheKey, JSON.stringify({
            timestamp: Date.now(), center: { lat: map.getCenter()!.lat(), lng: map.getCenter()!.lng() }, zoom: map.getZoom(),
            bounds: { north: bounds.getNorthEast().lat(), south: bounds.getSouthWest().lat(), east: bounds.getNorthEast().lng(), west: bounds.getSouthWest().lng() },
          }));
        }
      } catch { /* ignore */ }
    });
    setMapLoaded(true);
    setMapLoadingProgress(100);
    if (!isOffline) preloadMapTiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTraffic, isOffline]);

  // --- Places Autocomplete ---
  useEffect(() => {
    if (!mapLoaded || !searchInputRef.current || isOffline || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
      bounds: new google.maps.LatLngBounds(
        new google.maps.LatLng(DEFAULT_CENTER.lat - 0.1, DEFAULT_CENTER.lng - 0.1),
        new google.maps.LatLng(DEFAULT_CENTER.lat + 0.1, DEFAULT_CENTER.lng + 0.1),
      ),
      fields: ['geometry', 'name', 'formatted_address'],
      componentRestrictions: { country: 'in' },
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location || !mapRef.current) return;

      const loc = place.geometry.location;
      setSearchInput(place.name || place.formatted_address || '');

      searchMarker?.setMap(null);
      clearDirections();

      const m = new google.maps.Marker({
        position: loc,
        map: mapRef.current,
        title: place.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            `<svg width="42" height="48" viewBox="0 0 42 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 46c-.8 0-1.6-.3-2.2-1C11.8 37.5 8 32.7 8 24.8 8 15.2 14 8 21 8s13 7.2 13 16.8c0 7.9-3.8 12.7-10.8 20.2-.6.7-1.4 1-2.2 1Z" fill="#7c3aed" stroke="#fff" stroke-width="2"/>
              <circle cx="21" cy="22" r="7" fill="#fff"/>
              <circle cx="21" cy="22" r="3.5" fill="#7c3aed"/>
            </svg>`,
          ),
          scaledSize: new google.maps.Size(42, 48),
          anchor: new google.maps.Point(21, 46),
        },
      });
      setSearchMarker(m);
      mapRef.current.panTo(loc);
      mapRef.current.setZoom(16);
      showDirections(loc);

      const query = place.name || searchInput;
      if (query) getGeminiReply(query).then(s => {
        setAiSuggestion(s);
        setAiSuggestionLang(language);
        setTimeout(() => speakAIResponse(s), 500);
      });
    });

    autocompleteRef.current = autocomplete;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, isOffline]);

  // --- User Location ---
  const createUserLocationMarker = useCallback((pos: { lat: number; lng: number }) => {
    if (!mapRef.current) return;

    const position = new google.maps.LatLng(pos.lat, pos.lng);
    const BLUE = '#4285F4';

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setPosition(position);
      userLocationAccuracyRef.current?.setCenter(position);
    } else {
      userLocationMarkerRef.current = new google.maps.Marker({
        position,
        map: mapRef.current,
        title: 'Your Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="rgba(66,133,244,0.15)" stroke="rgba(66,133,244,0.4)" stroke-width="1.5">
                <animate attributeName="r" values="14;18;14" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx="20" cy="20" r="8" fill="${BLUE}" stroke="#fff" stroke-width="3"/>
            </svg>`,
          ),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
        },
        zIndex: 999,
      });

      userLocationAccuracyRef.current = new google.maps.Circle({
        map: mapRef.current,
        center: position,
        radius: 80,
        fillColor: BLUE,
        fillOpacity: 0.08,
        strokeColor: BLUE,
        strokeOpacity: 0.25,
        strokeWeight: 1,
        clickable: false,
      });
    }
  }, []);

  useEffect(() => {
    if (!mapLoaded || !navigator.geolocation) {
      console.warn('[AIMap] Geolocation not available or map not loaded');
      return;
    }

    const handlePosition = (pos: GeolocationPosition) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      userLocationRef.current = loc;
      setUserLocation(loc);
      createUserLocationMarker(loc);
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn('[AIMap] Geolocation error:', err.code, err.message);
    };

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [mapLoaded, createUserLocationMarker]);

  const panToUserLocation = () => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.panTo(userLocation);
    mapRef.current.setZoom(17);
  };

  // --- Directions ---
  const clearDirections = () => {
    directionsRendererRef.current?.setMap(null);
    directionsRendererRef.current = null;
    setDirectionSteps([]);
    setRouteSummary(null);
    setShowDirectionsPanel(false);
  };

  const showDirections = (destination: google.maps.LatLng) => {
    const loc = userLocationRef.current;
    if (!mapRef.current || !loc) {
      console.warn('[AIMap] Cannot show directions — no user location or map');
      return;
    }

    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }

    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#7c3aed',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
    });

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: new google.maps.LatLng(loc.lat, loc.lng),
        destination,
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRendererRef.current!.setDirections(result);
          const bounds = result.routes[0]?.bounds;
          if (bounds) mapRef.current!.fitBounds(bounds);

          const leg = result.routes[0]?.legs[0];
          if (leg) {
            setRouteSummary({
              distance: leg.distance?.text || '',
              duration: leg.duration?.text || '',
            });
            setDirectionSteps(
              leg.steps.map(step => ({
                instruction: step.instructions,
                distance: step.distance?.text || '',
                duration: step.duration?.text || '',
              })),
            );
            setShowDirectionsPanel(true);
          }
        } else {
          console.warn('[AIMap] Directions request failed:', status);
        }
      },
    );
  };

  // --- Traffic ---
  const toggleTraffic = () => {
    if (isOffline) return;
    const next = !showTraffic;
    setShowTraffic(next);
    trafficLayerRef.current?.setMap(next ? mapRef.current : null);
  };

  const analyzeTrafficAndTimes = async (): Promise<TrafficData> => {
    const cond = { current: Math.random() > 0.5 ? 'moderate' : 'heavy', walkingSpeed: Math.random() > 0.7 ? 'normal' : 'slow', bikeSpeed: Math.random() > 0.6 ? 'normal' : 'reduced' };
    let w = 15, b = 8;
    if (cond.current === 'heavy') { w = Math.round(15 * 1.3); b = Math.round(8 * 1.5); }
    else if (cond.walkingSpeed === 'slow') w = Math.round(15 * 1.2);
    else if (cond.bikeSpeed === 'reduced') b = Math.round(8 * 1.3);
    return { walkingTime: w, bikeTime: b, trafficLevel: cond.current, walkingSpeed: cond.walkingSpeed, bikeSpeed: cond.bikeSpeed };
  };

  // --- AI ---
  const getGeminiReply = async (text: string) => {
    setIsLoading(true);
    try {
      if (isOffline && dbRef.current) {
        const cached = await getCachedAIResponse(text);
        if (cached) { setTrafficData(cached.trafficData); setIsLoading(false); return cached.suggestion; }
      }
      const ta = await analyzeTrafficAndTimes();
      setTrafficData(ta);
      const langName = GEMINI_LANG_NAMES[language];
      const langInstruction = language === 'en' ? '' : `\n\nIMPORTANT: Respond ENTIRELY in ${langName}. All text, headings, and content must be in ${langName}.`;
      const prompt = `You are an AI safety and navigation guide for pilgrims, students, and residents around ${DEFAULT_ANCHOR_QUERY}.\nA user wants advice for: "${text}".\n\nCurrent traffic: ${ta.trafficLevel}, Walking: ${ta.walkingSpeed}, Bike: ${ta.bikeSpeed}\n\nFocus on ${DEFAULT_REGION}. Mention hospitals, sanitisation spots, emergency gathering spots, and police stations whenever they help the user.\n\nProvide guidance in markdown:\n## Route Information\n**Walking Time:** ${ta.walkingTime} min\n**Bike Time:** ${ta.bikeTime} min\n## Best Route\n## Crowd Levels\n## Safety Tips\n## Nearby Facilities\n\nKeep each section concise (2-3 sentences). Use **bold** for important points.${langInstruction}`;
      if (!GEMINI_API_KEY) {
        console.warn('[AIMap] VITE_GEMINI_API_KEY is not set; AI suggestions are disabled.');
        return t.noSuggestion;
      }
      const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      const data = await res.json();
      if (!res.ok) console.error('[AIMap] Gemini API error:', data?.error?.message || res.status);
      const suggestion = data?.candidates?.[0]?.content?.parts?.[0]?.text || t.noSuggestion;
      if (dbRef.current) cacheAIResponse(text, suggestion, ta);
      return suggestion;
    } catch {
      return t.fetchError;
    } finally { setIsLoading(false); }
  };

  const translateSuggestionToLanguage = async (
    suggestion: string,
    fromLanguage: LangCode,
    toLanguage: LangCode,
  ) => {
    if (!suggestion.trim() || fromLanguage === toLanguage || isOffline || !GEMINI_API_KEY) {
      return suggestion;
    }

    try {
      const fromLanguageName = GEMINI_LANG_NAMES[fromLanguage];
      const toLanguageName = GEMINI_LANG_NAMES[toLanguage];
      const prompt = [
        `Translate the following markdown from ${fromLanguageName} to ${toLanguageName}.`,
        'Preserve markdown structure exactly: headings, bullets, bold text, and line breaks.',
        'Do not add commentary, explanation, or extra sections.',
        'Return only translated markdown.',
        '',
        suggestion,
      ].join('\n');

      const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return translated || suggestion;
    } catch {
      return suggestion;
    }
  };

  useEffect(() => {
    if (!aiSuggestion.trim() || aiSuggestionLang === language) {
      return;
    }

    let isCancelled = false;

    const translateCurrentSuggestion = async () => {
      setIsLoading(true);
      const translated = await translateSuggestionToLanguage(aiSuggestion, aiSuggestionLang, language);
      if (!isCancelled) {
        setAiSuggestion(translated);
        setAiSuggestionLang(language);
        setIsLoading(false);
      }
    };

    void translateCurrentSuggestion();

    return () => {
      isCancelled = true;
    };
  }, [aiSuggestion, aiSuggestionLang, language]);

  const getCachedAIResponse = (query: string): Promise<{ suggestion: string; trafficData: TrafficData } | null> =>
    new Promise(resolve => {
      if (!dbRef.current) { resolve(null); return; }
      const tx = dbRef.current.transaction(['aiSuggestions'], 'readonly');
      const req = tx.objectStore('aiSuggestions').get(query);
      req.onsuccess = () => {
        if (req.result && Date.now() - req.result.timestamp < 86400000) resolve(req.result);
        else resolve(null);
      };
    });

  const cacheAIResponse = (query: string, suggestion: string, td: TrafficData) => {
    if (!dbRef.current) return;
    const tx = dbRef.current.transaction(['aiSuggestions'], 'readwrite');
    tx.objectStore('aiSuggestions').put({ query, suggestion, trafficData: td, timestamp: Date.now() });
  };

  const getMarkerSymbolMarkup = (symbol: MarkerSymbol, color: string) => {
    switch (symbol) {
      case 'medical':
        return `
          <rect x="19.2" y="11.8" width="3.6" height="13.2" rx="1.1" fill="${color}" />
          <rect x="14.4" y="16.6" width="13.2" height="3.6" rx="1.1" fill="${color}" />
        `;
      case 'sanitation':
        return `
          <path d="M21 11.8C17.7 16.2 16 18.8 16 21.2a5 5 0 1 0 10 0c0-2.4-1.7-5-5-9.4Z" fill="${color}" />
          <path d="M26.8 12.2l.7 1.5 1.6.2-1.2 1.1.3 1.5-1.4-.8-1.4.8.3-1.5-1.2-1.1 1.6-.2.7-1.5Z" fill="${color}" />
        `;
      case 'emergency':
        return `
          <path d="M21 11.6l7 12.4H14L21 11.6Z" fill="${color}" />
          <rect x="20.1" y="15.5" width="1.8" height="5.7" rx="0.9" fill="#fff" />
          <circle cx="21" cy="23.4" r="1.15" fill="#fff" />
        `;
      case 'police':
        return `
          <path d="M21 11l6.2 2.5v4.9c0 4.3-2.6 8.1-6.2 10-3.6-1.9-6.2-5.7-6.2-10v-4.9L21 11Z" fill="${color}" />
          <path d="M21 15.1l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3 1-2Z" fill="#fff" />
        `;
      case 'campus':
        return `
          <path d="M21 11.2l8 4H13l8-4Z" fill="${color}" />
          <rect x="14.8" y="15.8" width="12.4" height="10.8" rx="1.4" fill="${color}" />
          <rect x="19.5" y="19.2" width="3" height="7.4" rx="0.8" fill="#fff" />
          <rect x="16.6" y="17.3" width="2.2" height="2.2" rx="0.4" fill="#fff" />
          <rect x="23.2" y="17.3" width="2.2" height="2.2" rx="0.4" fill="#fff" />
        `;
    }
  };

  const createMarkerIcon = (color: string, symbol: MarkerSymbol) => ({
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
      `<svg width="42" height="48" viewBox="0 0 42 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 46c-.8 0-1.6-.3-2.2-1C11.8 37.5 8 32.7 8 24.8 8 15.2 14 8 21 8s13 7.2 13 16.8c0 7.9-3.8 12.7-10.8 20.2-.6.7-1.4 1-2.2 1Z" fill="${color}" stroke="#fff" stroke-width="2"/>
        <circle cx="21" cy="20" r="9.5" fill="#fff" />
        ${getMarkerSymbolMarkup(symbol, color)}
      </svg>`,
    ),
    scaledSize: new google.maps.Size(42, 48),
    anchor: new google.maps.Point(21, 46),
  });

  const getReferenceLocation = () =>
    mapRef.current?.getCenter() ?? new google.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);

  const runTextSearch = (query: string, radius: number): Promise<google.maps.places.PlaceResult[]> =>
    new Promise(resolve => {
      if (!mapRef.current) {
        resolve([]);
        return;
      }
      const service = new google.maps.places.PlacesService(mapRef.current);
      service.textSearch({ query, location: getReferenceLocation(), radius }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) resolve(results);
        else resolve([]);
      });
    });

  const toFacilityInfo = (place: google.maps.places.PlaceResult): FacilityInfo | null => {
    const location = place.geometry?.location;
    if (!place.place_id || !place.name || !location) return null;
    return {
      id: place.place_id,
      name: place.name,
      address: place.formatted_address || place.vicinity || DEFAULT_REGION,
      location: { lat: location.lat(), lng: location.lng() },
      rating: place.rating,
      open: place.opening_hours?.isOpen?.(),
    };
  };

  const placeAnchorMarker = (location: { lat: number; lng: number }, title: string, address?: string) => {
    if (!mapRef.current) return;
    anchorMarkerRef.current?.setMap(null);
    const marker = new google.maps.Marker({
      position: location,
      map: mapRef.current,
      title,
      icon: createMarkerIcon('#a16207', 'campus'),
    });
    const infoWindow = new google.maps.InfoWindow({
      content: `<div style="padding:8px;max-width:220px"><p style="margin:0 0 6px;color:#92400e;font-size:12px;font-weight:700">${mapCopy.defaultStartPoint}</p><h3 style="margin:0 0 6px;color:#1f2937;font-size:14px">${title}</h3>${address ? `<p style="margin:0;font-size:12px;color:#4b5563">${address}</p>` : ''}</div>`,
    });
    marker.addListener('click', () => infoWindow.open({ anchor: marker, map: mapRef.current! }));
    anchorMarkerRef.current = marker;
  };

  const displayFacilityMarkers = (category: FacilityCategoryKey, facilities: FacilityInfo[]) => {
    if (!mapRef.current) return;
    const config = FACILITY_CONFIG[category];
    setFacilityMarkers(prev => {
      prev[category].forEach(marker => marker.setMap(null));
      const markers = facilities.map(place => {
        const marker = new google.maps.Marker({
          position: place.location,
          map: mapRef.current!,
          title: place.name,
          icon: createMarkerIcon(config.color, config.symbol),
        });
        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="padding:8px;max-width:220px"><h3 style="margin:0 0 8px;color:${config.color};font-size:14px">${place.name}</h3><p style="margin:4px 0;font-size:12px;color:#4b5563">${place.address}</p>${place.rating ? `<p style="margin:4px 0;font-size:12px;color:#a78bfa">★ ${place.rating}/5</p>` : ''}</div>`,
        });
        marker.addListener('click', () => infoWindow.open({ anchor: marker, map: mapRef.current! }));
        return marker;
      });
      return { ...prev, [category]: markers };
    });
  };

  const clearFacilityMarkers = (category: FacilityCategoryKey) => {
    setFacilityMarkers(prev => {
      prev[category].forEach(marker => marker.setMap(null));
      return { ...prev, [category]: [] };
    });
    setActiveFacilities(prev => ({ ...prev, [category]: false }));
  };

  const searchFacilities = async (category: FacilityCategoryKey) => {
    const config = FACILITY_CONFIG[category];
    const seen = new Map<string, FacilityInfo>();

    for (const query of config.queries) {
      const results = await runTextSearch(query, config.radius);
      results.forEach(result => {
        const facility = toFacilityInfo(result);
        if (facility && !seen.has(facility.id)) seen.set(facility.id, facility);
      });
      if (seen.size >= 8) break;
    }

    return Array.from(seen.values()).slice(0, 8);
  };

  const findNearbyFacilities = async (category: FacilityCategoryKey, { speak = true }: { speak?: boolean } = {}) => {
    if (!mapRef.current || isOffline) {
      if (speak) {
        speakFeedback(
          isOffline
            ? formatTemplate(mapCopy.placesOfflineTemplate, { places: facilityNames[category] })
            : t.mapNotLoaded,
        );
      }
      return;
    }

    const facilities = await searchFacilities(category);
    if (facilities.length) {
      displayFacilityMarkers(category, facilities);
      setActiveFacilities(prev => ({ ...prev, [category]: true }));
      if (speak) speakFeedback(formatTemplate(mapCopy.foundTemplate, { n: facilities.length, places: facilityNames[category] }));
      return;
    }

    clearFacilityMarkers(category);
    if (speak) speakFeedback(formatTemplate(mapCopy.noPlacesTemplate, { places: facilityNames[category] }));
  };

  const initializeDefaultAnchor = useCallback(async () => {
    if (!mapRef.current || isOffline || anchorResolvedRef.current) return;
    const results = await runTextSearch(DEFAULT_ANCHOR_QUERY, 12000);
    const anchor = results
      .map(toFacilityInfo)
      .find((facility): facility is FacilityInfo => facility !== null);

    if (anchor) {
      mapRef.current.panTo(anchor.location);
      mapRef.current.setZoom(DEFAULT_ZOOM);
      placeAnchorMarker(anchor.location, anchor.name, anchor.address);
    } else {
      mapRef.current.panTo(DEFAULT_CENTER);
      mapRef.current.setZoom(DEFAULT_ZOOM);
      placeAnchorMarker(DEFAULT_CENTER, DEFAULT_ANCHOR_TITLE, DEFAULT_REGION);
    }

    anchorResolvedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline, language]);

  const preloadDefaultFacilitiesForRegion = useCallback(async () => {
    if (!mapRef.current || isOffline || defaultFacilitiesLoadedRef.current) return;
    defaultFacilitiesLoadedRef.current = true;
    for (const category of FACILITY_CATEGORY_KEYS) {
      await findNearbyFacilities(category, { speak: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline, language]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    if (isOffline) {
      placeAnchorMarker(DEFAULT_CENTER, DEFAULT_ANCHOR_TITLE, DEFAULT_REGION);
      return;
    }

    void initializeDefaultAnchor();
    void preloadDefaultFacilitiesForRegion();
  }, [initializeDefaultAnchor, isOffline, mapLoaded, preloadDefaultFacilitiesForRegion]);

  // --- Search ---
  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    clearDirections();

    const suggestion = await getGeminiReply(searchInput);
    setAiSuggestion(suggestion);
    setAiSuggestionLang(language);
    setTimeout(() => speakAIResponse(suggestion), 500);
    if (!isOffline && mapRef.current) {
      const service = new google.maps.places.PlacesService(mapRef.current);
      const query = searchInput.trim();
      service.textSearch({ query, location: getReferenceLocation() }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
          const loc = results[0].geometry?.location;
          if (!loc) return;
          searchMarker?.setMap(null);
          const m = new google.maps.Marker({
            position: loc,
            map: mapRef.current!,
            title: results[0].name,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                `<svg width="42" height="48" viewBox="0 0 42 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 46c-.8 0-1.6-.3-2.2-1C11.8 37.5 8 32.7 8 24.8 8 15.2 14 8 21 8s13 7.2 13 16.8c0 7.9-3.8 12.7-10.8 20.2-.6.7-1.4 1-2.2 1Z" fill="#7c3aed" stroke="#fff" stroke-width="2"/>
                  <circle cx="21" cy="22" r="7" fill="#fff"/>
                  <circle cx="21" cy="22" r="3.5" fill="#7c3aed"/>
                </svg>`,
              ),
              scaledSize: new google.maps.Size(42, 48),
              anchor: new google.maps.Point(21, 46),
            },
          });
          setSearchMarker(m);
          mapRef.current!.panTo(loc);
          mapRef.current!.setZoom(14);
          showDirections(loc);
        }
      });
    }
  };

  // --- Voice helpers ---
  const speakText = (text: string) => {
    if (!speechSynthRef.current) return;
    speechSynthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const desiredLang = LANGUAGES.find(l => l.code === language)?.ttsLang || 'en-IN';
    const { lang: resolvedLang, voice } = resolveTtsVoice(desiredLang);
    u.lang = resolvedLang;
    if (voice) u.voice = voice;
    u.rate = 0.9; u.volume = 0.8;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    speechSynthRef.current.speak(u);
  };
  const stopSpeaking = () => { speechSynthRef.current?.cancel(); setIsSpeaking(false); };
  const speakFeedback = (msg: string) => {
    if (!speechSynthRef.current) return;
    speechSynthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(msg);
    const desiredLang = LANGUAGES.find(l => l.code === language)?.ttsLang || 'en-IN';
    const { lang: resolvedLang, voice } = resolveTtsVoice(desiredLang);
    u.lang = resolvedLang;
    if (voice) u.voice = voice;
    u.rate = 1.0; u.volume = 0.6;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    speechSynthRef.current.speak(u);
  };
  const speakAIResponse = (s: string) => {
    const plain = s.replace(/#{1,6}\s*/g, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/\[.*?\]/g, '').replace(/\n/g, '. ');
    speakText(`${t.aiGuideSpeakPrefix} ${plain}`);
  };

  const startVoiceInput = () => {
    stopSpeaking();
    setTimeout(() => { try { speechRecRef.current?.start(); } catch { /* ignore */ } }, 200);
  };
  const stopVoiceInput = () => { speechRecRef.current?.stop(); };

  const toggleFacilityCategory = (category: FacilityCategoryKey) => {
    if (activeFacilities[category]) {
      clearFacilityMarkers(category);
      return;
    }
    void findNearbyFacilities(category);
  };

  // --- Render ---
  return (
    <div className={`aimap-root ${viewMode === 'split' ? 'split-view' : ''}`}>
      {/* Back */}
      <button className="aimap-back-btn" onClick={() => navigate('/dashboard')}><ArrowLeft size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />{t.backBtn}</button>

      {/* Language Selector */}
      <div className="aimap-lang-selector">
        <button className="aimap-lang-btn" onClick={() => setShowLangMenu(v => !v)}>
          <Globe size={16} /><span>{LANGUAGES.find(l => l.code === language)?.nativeLabel}</span>
        </button>
        {showLangMenu && (
          <div className="aimap-lang-menu">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                className={`aimap-lang-option ${language === l.code ? 'active' : ''}`}
                onClick={() => { setLanguage(l.code); localStorage.setItem('aimap-lang', l.code); setShowLangMenu(false); }}
              >
                <span className="aimap-lang-native">{l.nativeLabel}</span>
                <span className="aimap-lang-english">{l.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status indicators */}
      {!GOOGLE_MAPS_API_KEY && (
        <div className="aimap-offline-indicator" role="alert">
          <WifiOff size={16} /><span>Google Maps key missing: set VITE_GOOGLE_MAPS_API_KEY in client/.env and restart the dev server.</span>
        </div>
      )}
      {mapsLoadError && (
        <div className="aimap-offline-indicator" role="alert">
          <WifiOff size={16} /><span>Google Maps failed to load. Check the API key, billing, and that the Maps JavaScript, Places and Directions APIs are enabled.</span>
        </div>
      )}
      {isOffline && <div className="aimap-offline-indicator"><WifiOff size={16} /><span>{t.offlineMode}</span></div>}
      {isSpeaking && <div className="aimap-voice-indicator"><Volume2 size={16} /><span>{t.speaking}</span></div>}
      {isListening && <div className="aimap-voice-input-indicator"><Mic size={16} /><span>{t.listening}</span></div>}

      {/* Loading */}
      {!mapLoaded && (
        <div className="aimap-loading-overlay">
          <div className="aimap-loading-content">
            <div className="aimap-loading-spinner" />
            <div className="aimap-loading-text">
              {isOffline ? t.loadingOffline : mapCopy.loadingOnline}
              {mapCached && <span className="aimap-cache-indicator"> {t.cached}</span>}
            </div>
            <div className="aimap-loading-progress">
              <div className="aimap-loading-progress-bar" style={{ width: `${mapLoadingProgress}%` }} />
            </div>
            <div className="aimap-loading-percentage">{mapLoadingProgress}%</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="aimap-search-container">
        <input
          ref={searchInputRef}
          className="aimap-search-input"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder={isOffline ? mapCopy.searchOfflinePlaceholder : mapCopy.searchPlaceholder}
        />
        <button className="aimap-voice-input-button" onClick={isListening ? stopVoiceInput : startVoiceInput} disabled={!speechRecRef.current}>
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button className="aimap-search-button" onClick={handleSearch} disabled={isLoading}>
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </button>
      </div>

      {/* AI panel - split view */}
      {aiSuggestion && viewMode === 'split' && (
        <div className="aimap-ai-panel">
          <div className="aimap-ai-header">
            <Bot size={20} /><span>{t.aiHeader}</span>
            {trafficData && (
              <div className="aimap-traffic-indicator">
                <span className={`aimap-traffic-dot ${trafficData.trafficLevel}`} />
                <span className="aimap-traffic-text">{trafficData.trafficLevel} {t.traffic}</span>
              </div>
            )}
          </div>
          <div className="aimap-ai-content"><ReactMarkdown>{aiSuggestion}</ReactMarkdown></div>
          <div className="aimap-ai-actions">
            <button className="aimap-voice-action-button" onClick={() => speakAIResponse(aiSuggestion)} disabled={isSpeaking}>
              {isSpeaking ? <><VolumeX size={16} /> {t.stop}</> : <><Volume2 size={16} /> {t.readAloud}</>}
            </button>
          </div>
        </div>
      )}

      {/* AI floating - full view */}
      {aiSuggestion && viewMode === 'full' && (
        <div className="aimap-ai-suggestion">
          <div className="aimap-ai-header">
            <Bot size={20} /><span>{t.aiHeader}</span>
            {trafficData && (
              <div className="aimap-traffic-indicator">
                <span className={`aimap-traffic-dot ${trafficData.trafficLevel}`} />
                <span className="aimap-traffic-text">{trafficData.trafficLevel} {t.traffic}</span>
              </div>
            )}
          </div>
          <div className="aimap-ai-content"><ReactMarkdown>{aiSuggestion}</ReactMarkdown></div>
          <div className="aimap-ai-actions">
            <button className="aimap-voice-action-button" onClick={() => speakAIResponse(aiSuggestion)} disabled={isSpeaking}>
              {isSpeaking ? <><VolumeX size={16} /> {t.stop}</> : <><Volume2 size={16} /> {t.readAloud}</>}
            </button>
          </div>
        </div>
      )}

      {/* Google Map */}
      <LoadScript
        googleMapsApiKey={GOOGLE_MAPS_API_KEY || ''}
        libraries={GMAPS_LIBRARIES}
        onError={(e) => { console.error('[AIMap] Google Maps script failed to load', e); setMapsLoadError(true); }}
      >
        <GoogleMap
          mapContainerStyle={viewMode === 'split' ? splitMapStyle : containerStyle}
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          onLoad={handleMapLoad}
          options={{
            styles: [
              { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            ],
            maxZoom: 18, minZoom: 10,
            gestureHandling: 'cooperative', zoomControl: true, mapTypeControl: false,
            scaleControl: true, streetViewControl: false, rotateControl: false, fullscreenControl: false,
          }}
        >
          {crowdPoints.length > 0 && (
            <HeatmapLayer
              data={crowdPoints.map(p => new google.maps.LatLng(p.lat, p.lng))}
              options={{
                radius: 20, opacity: 0.6,
                gradient: [
                  'rgba(0,255,255,0)', 'rgba(0,255,255,1)', 'rgba(0,191,255,1)', 'rgba(0,127,255,1)',
                  'rgba(0,63,255,1)', 'rgba(0,0,255,1)', 'rgba(0,0,223,1)', 'rgba(0,0,191,1)',
                  'rgba(0,0,159,1)', 'rgba(0,0,127,1)', 'rgba(63,0,91,1)', 'rgba(127,0,63,1)',
                  'rgba(191,0,31,1)', 'rgba(255,0,0,1)',
                ],
              }}
            />
          )}
        </GoogleMap>
      </LoadScript>

      {/* Compact bottom toolbar */}
      <div className="aimap-bottom-bar">
        <button className={`aimap-bar-btn ${showTraffic ? 'active' : ''}`} onClick={toggleTraffic} disabled={isOffline} title={showTraffic ? t.trafficOn : t.trafficOff}>
          <TrafficCone size={18} />
        </button>
        {FACILITY_CATEGORY_KEYS.map(category => {
          const FacIcon = FACILITY_ICONS[category];
          return (
            <button
              key={category}
              className={`aimap-bar-btn ${activeFacilities[category] ? 'active' : ''}`}
              onClick={() => toggleFacilityCategory(category)}
              title={formatTemplate(activeFacilities[category] ? mapCopy.hideTemplate : mapCopy.nearbyTemplate, { places: facilityNames[category] })}
            >
              <FacIcon size={18} />
            </button>
          );
        })}
        <button className={`aimap-bar-btn ${userLocation ? 'active' : ''}`} onClick={panToUserLocation} disabled={!userLocation} title="My Location">
          <Navigation size={18} />
        </button>
        <button className={`aimap-bar-btn ${viewMode === 'split' ? 'active' : ''}`} onClick={() => setViewMode(v => v === 'full' ? 'split' : 'full')} title={viewMode === 'split' ? t.fullMap : t.splitView}>
          {viewMode === 'split' ? <MapIcon size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <button className={`aimap-bar-btn ${isSpeaking ? 'active' : ''}`} onClick={isSpeaking ? stopSpeaking : () => speakText(t.voiceEnabled)} title={isSpeaking ? t.stopVoice : t.voiceGuide}>
          {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Turn-by-turn directions panel */}
      {showDirectionsPanel && directionSteps.length > 0 && (
        <div className="aimap-directions-panel">
          <div className="aimap-directions-header">
            <div className="aimap-directions-title">
              <Route size={18} />
              <span>Directions</span>
            </div>
            {routeSummary && (
              <div className="aimap-directions-summary">
                <span className="aimap-directions-chip"><Footprints size={13} /> {routeSummary.distance}</span>
                <span className="aimap-directions-chip"><Clock size={13} /> {routeSummary.duration}</span>
              </div>
            )}
            <button className="aimap-directions-close" onClick={clearDirections}><X size={16} /></button>
          </div>
          <div className="aimap-directions-steps">
            {directionSteps.map((step, i) => (
              <div key={i} className="aimap-directions-step">
                <div className="aimap-step-number">{i + 1}</div>
                <div className="aimap-step-body">
                  <div className="aimap-step-instruction" dangerouslySetInnerHTML={{ __html: step.instruction }} />
                  <div className="aimap-step-meta">
                    <span>{step.distance}</span>
                    {step.duration && <><ChevronRight size={12} /><span>{step.duration}</span></>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
