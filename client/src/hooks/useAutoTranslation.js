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
  const [translatedText, setTranslatedText] = useState(text);

  useEffect(() => {
    if (!text) {
      setTranslatedText("");
      return;
    }

    // If text is already in target language or empty, skip
    // (Simple heuristic: if we want ES and text seems to be English)
    
    const cacheKey = `${text}_${targetLang}`;
    if (translationCache.has(cacheKey)) {
      setTranslatedText(translationCache.get(cacheKey));
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
