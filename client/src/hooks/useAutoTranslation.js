import { useState, useEffect } from 'react';

// Simple in-memory cache to avoid repeated requests in the same session
const translationCache = new Map();

/**
 * Hook to translate text automatically using a free API (MyMemory).
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (default 'es')
 * @returns {string} - Translated text
 */
export function useAutoTranslation(text, targetLang = 'es') {
  const cacheKey = `${text}_${targetLang}`;
  const cached = translationCache.get(cacheKey);

  // Initialize with cached value or null (if waiting for translation)
  // If text is empty, we can just return empty string immediately
  const [translatedText, setTranslatedText] = useState(text ? (cached || null) : "");

  useEffect(() => {
    if (!text) {
      setTranslatedText("");
      return;
    }

    if (cached) {
      setTranslatedText(cached);
      return;
    }

    let isMounted = true;

    const translate = async () => {
      try {
        // Using MyMemory API (Free, allows CORS, 5000 chars/day limit)
        // Fallback or alternative: Lingva (https://lingva.ml) could be used if MyMemory fails
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
        
        const res = await fetch(url);
        const data = await res.json();

        if (data && data.responseData && data.responseData.translatedText) {
          const result = data.responseData.translatedText;
          
          // Basic cleanup for racing terms if the API messes up common ones
          // This is a "safety net" since we can't define all words, but we can fix obvious bad ones
          // e.g. "Lap" sometimes translates to "Regazo" (anatomy) instead of "Vuelta"
          let finalResult = result;
          if (targetLang === 'es') {
             finalResult = finalResult
                .replace(/\bRegazo\b/gi, "Vuelta")
                .replace(/\bBrecha\b/gi, "Diferencia");
          }

          if (isMounted) {
            translationCache.set(cacheKey, finalResult);
            setTranslatedText(finalResult);
          }
        }
      } catch (err) {
        console.warn("Translation API failed, falling back to original text", err);
        // On error, keep original text
        if (isMounted) setTranslatedText(text);
      }
    };

    // Debounce slightly to avoid rapid-fire if text changes fast (unlikely for announcements)
    const timeout = setTimeout(translate, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [text, targetLang]);

  return translatedText;
}
