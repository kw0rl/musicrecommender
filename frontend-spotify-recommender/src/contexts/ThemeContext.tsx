'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define emotion types and corresponding themes
export type Emotion = 'happy' | 'sad' | 'angry' | 'neutral' | null;

export interface ThemeColors {
  // Background colors
  primary: string;
  secondary: string;
  accent: string;
  
  // Border colors
  border: string;
  borderHover: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Button colors
  buttonBg: string;
  buttonHover: string;
  buttonText: string;
  
  // Card colors
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  
  // Player colors
  playerBg: string;
  playerBorder: string;
  
  // Input colors
  inputBg: string;
  inputBorder: string;
  inputFocus: string;
}

// Define theme configurations for each emotion
const emotionThemes: Record<'default' | 'neutral' | 'happy' | 'sad' | 'angry', ThemeColors> = {
  default: {
    // White and grey theme (default/neutral)
    primary: 'bg-white',
    secondary: 'bg-gray-50',
    accent: 'bg-gray-100',
    border: 'border-gray-200',
    borderHover: 'border-gray-300',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textMuted: 'text-gray-600',
    buttonBg: 'bg-gray-800',
    buttonHover: 'hover:bg-gray-700',
    buttonText: 'text-white',
    cardBg: 'bg-white',
    cardBorder: 'border-gray-200',
    cardShadow: 'shadow-sm',
    playerBg: 'bg-white',
    playerBorder: 'border-gray-200',
    inputBg: 'bg-white',
    inputBorder: 'border-gray-300',
    inputFocus: 'focus:border-gray-500'
  },
  neutral: {
    // Same as default
    primary: 'bg-white',
    secondary: 'bg-gray-50',
    accent: 'bg-gray-100',
    border: 'border-gray-200',
    borderHover: 'border-gray-300',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textMuted: 'text-gray-600',
    buttonBg: 'bg-gray-800',
    buttonHover: 'hover:bg-gray-700',
    buttonText: 'text-white',
    cardBg: 'bg-white',
    cardBorder: 'border-gray-200',
    cardShadow: 'shadow-sm',
    playerBg: 'bg-white',
    playerBorder: 'border-gray-200',
    inputBg: 'bg-white',
    inputBorder: 'border-gray-300',
    inputFocus: 'focus:border-gray-500'
  },
  happy: {
    // Pastel blue theme
    primary: 'bg-blue-50',
    secondary: 'bg-blue-25',
    accent: 'bg-blue-100',
    border: 'border-blue-200',
    borderHover: 'border-blue-300',
    textPrimary: 'text-blue-900',
    textSecondary: 'text-blue-800',
    textMuted: 'text-blue-600',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
    buttonText: 'text-white',
    cardBg: 'bg-blue-50',
    cardBorder: 'border-blue-200',
    cardShadow: 'shadow-blue-100',
    playerBg: 'bg-blue-50',
    playerBorder: 'border-blue-200',
    inputBg: 'bg-blue-25',
    inputBorder: 'border-blue-300',
    inputFocus: 'focus:border-blue-500'
  },
  sad: {
    // Pastel beige theme
    primary: 'bg-amber-50',
    secondary: 'bg-amber-25',
    accent: 'bg-amber-100',
    border: 'border-amber-200',
    borderHover: 'border-amber-300',
    textPrimary: 'text-amber-900',
    textSecondary: 'text-amber-800',
    textMuted: 'text-amber-700',
    buttonBg: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-700',
    buttonText: 'text-white',
    cardBg: 'bg-amber-50',
    cardBorder: 'border-amber-200',
    cardShadow: 'shadow-amber-100',
    playerBg: 'bg-amber-50',
    playerBorder: 'border-amber-200',
    inputBg: 'bg-amber-25',
    inputBorder: 'border-amber-300',
    inputFocus: 'focus:border-amber-500'
  },
  angry: {
    // Red theme
    primary: 'bg-red-50',
    secondary: 'bg-red-25',
    accent: 'bg-red-100',
    border: 'border-red-200',
    borderHover: 'border-red-300',
    textPrimary: 'text-red-900',
    textSecondary: 'text-red-800',
    textMuted: 'text-red-700',
    buttonBg: 'bg-red-600',
    buttonHover: 'hover:bg-red-700',
    buttonText: 'text-white',
    cardBg: 'bg-red-50',
    cardBorder: 'border-red-200',
    cardShadow: 'shadow-red-100',
    playerBg: 'bg-red-50',
    playerBorder: 'border-red-200',
    inputBg: 'bg-red-25',
    inputBorder: 'border-red-300',
    inputFocus: 'focus:border-red-500'
  }
};

interface ThemeContextType {
  currentEmotion: Emotion;
  currentTheme: ThemeColors;
  setEmotion: (emotion: Emotion) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeColors>(emotionThemes.default);

  // Update theme when emotion changes
  useEffect(() => {
    const newTheme = emotionThemes[currentEmotion || 'default'];
    setCurrentTheme(newTheme);
  }, [currentEmotion]);

  const setEmotion = (emotion: Emotion) => {
    setCurrentEmotion(emotion);
  };

  const resetTheme = () => {
    setCurrentEmotion(null);
  };

  const value: ThemeContextType = {
    currentEmotion,
    currentTheme,
    setEmotion,
    resetTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
