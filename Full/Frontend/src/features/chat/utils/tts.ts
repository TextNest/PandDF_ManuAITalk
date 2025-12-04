// src/features/chat/utils/tts.ts

/**
 * 주어진 텍스트를 음성으로 변환하여 재생합니다.
 * @param text 재생할 텍스트
 * @returns {Promise<HTMLAudioElement>} 재생이 완료되면 resolve되는 Promise와 Audio 객체
 */
export const playTextToSpeech = (text: string): Promise<HTMLAudioElement> => {
  return new Promise(async (resolve, reject) => {
    if (!text.trim()) {
      return reject(new Error("Text cannot be empty."));
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${backendUrl}/voice/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('TTS API request failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      try {
        await audio.play();
      } catch (err) {
        URL.revokeObjectURL(url);
        return reject(err); // 오류를 즉시 reject
      }

      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve(audio);
      };

      audio.onerror = (e) => {
        URL.revokeObjectURL(url);
        console.error("Audio playback error:", e);
        reject(new Error("Audio playback error"));
      };

    } catch (error) {
      console.error("Error fetching TTS audio:", error);
      reject(error);
    }
  });
};
