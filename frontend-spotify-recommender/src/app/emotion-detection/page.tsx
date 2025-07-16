'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function EmotionDetectionPage() {
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');

  const emotions = [
    { value: 'happy', label: '😊 Happy', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'sad', label: '😢 Sad', color: 'bg-blue-100 text-blue-800' },
    { value: 'angry', label: '😠 Angry', color: 'bg-red-100 text-red-800' },
    { value: 'excited', label: '🤩 Excited', color: 'bg-orange-100 text-orange-800' },
    { value: 'calm', label: '😌 Calm', color: 'bg-green-100 text-green-800' },
    { value: 'nostalgic', label: '🥺 Nostalgic', color: 'bg-purple-100 text-purple-800' }
  ];

  const handleEmotionSelect = (emotion: string) => {
    setSelectedEmotion(emotion);
    // Here you could redirect to the main page with the selected emotion
    // or trigger music recommendations based on the emotion
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            How are you feeling today?
          </h1>
          <p className="text-gray-600">
            Select your current emotion to get personalized music recommendations
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {emotions.map((emotion) => (
              <button
                key={emotion.value}
                onClick={() => handleEmotionSelect(emotion.value)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  selectedEmotion === emotion.value
                    ? 'border-gray-400 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{emotion.label.split(' ')[0]}</span>
                  <div>
                    <div className="font-medium text-gray-900">
                      {emotion.label.split(' ').slice(1).join(' ')}
                    </div>
                    <div className={`inline-block px-2 py-1 rounded-full text-xs ${emotion.color} mt-1`}>
                      {emotion.value}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedEmotion && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">
                Great choice! You selected: <strong>{selectedEmotion}</strong>
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/?emotion=${selectedEmotion}`}
                  className="inline-flex justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Music Recommendations
                </Link>
                <button
                  onClick={() => setSelectedEmotion('')}
                  className="inline-flex justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Choose Different Emotion
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
