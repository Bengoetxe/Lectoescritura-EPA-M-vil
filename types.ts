export type Syllable = string;

export interface GameItem {
  id: string;
  word: string;
  syllable: Syllable;
  imageUrl: string;
  isMatched: boolean;
  audioData?: string | null; // Base64 raw PCM audio data
}

export interface WordGenerationResponse {
  items: {
    word: string;
    syllable: string;
  }[];
}

export interface SyllableFamily {
  id: string; // e.g., 'b'
  label: string; // e.g., 'Letra B'
  syllables: Syllable[]; // ['ba', 'be', 'bi', 'bo', 'bu']
}

export enum GameState {
  START = 'START',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  VICTORY = 'VICTORY'
}