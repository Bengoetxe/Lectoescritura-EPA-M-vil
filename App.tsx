import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameItem, Syllable, GameState, SyllableFamily } from './types';
import { initializeGame } from './services/geminiService';
import { DraggableItem } from './components/DraggableItem';
import { DropZone } from './components/DropZone';
import { Loader2, Play, RefreshCcw, Sparkles, Menu, X as CloseIcon } from 'lucide-react';

// Define the available syllable families
const FAMILIES: SyllableFamily[] = [
  { id: 'b', label: 'B', syllables: ['ba', 'be', 'bi', 'bo', 'bu'] },
  { id: 'c', label: 'C', syllables: ['ca', 'ce', 'ci', 'co', 'cu'] },
  { id: 'd', label: 'D', syllables: ['da', 'de', 'di', 'do', 'du'] },
  { id: 'f', label: 'F', syllables: ['fa', 'fe', 'fi', 'fo', 'fu'] },
  { id: 'g', label: 'G', syllables: ['ga', 'ge', 'gi', 'go', 'gu'] },
  { id: 'j', label: 'J', syllables: ['ja', 'je', 'ji', 'jo', 'ju'] },
  { id: 'l', label: 'L', syllables: ['la', 'le', 'li', 'lo', 'lu'] },
  { id: 'm', label: 'M', syllables: ['ma', 'me', 'mi', 'mo', 'mu'] },
  { id: 'n', label: 'N', syllables: ['na', 'ne', 'ni', 'no', 'nu'] },
  { id: 'p', label: 'P', syllables: ['pa', 'pe', 'pi', 'po', 'pu'] },
  { id: 'r', label: 'R', syllables: ['ra', 're', 'ri', 'ro', 'ru'] },
  { id: 's', label: 'S', syllables: ['sa', 'se', 'si', 'so', 'su'] },
  { id: 't', label: 'T', syllables: ['ta', 'te', 'ti', 'to', 'tu'] },
  { id: 'v', label: 'V', syllables: ['va', 've', 'vi', 'vo', 'vu'] },
  { id: 'z', label: 'Z', syllables: ['za', 'ze', 'zi', 'zo', 'zu'] },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [items, setItems] = useState<GameItem[]>([]);
  
  // State for the selected syllable family
  const [currentFamily, setCurrentFamily] = useState<SyllableFamily>(FAMILIES[0]);
  
  // State to track used words to avoid repetition across rounds
  const [usedWords, setUsedWords] = useState<string[]>([]);
  
  const [syllableFeedback, setSyllableFeedback] = useState<Record<string, 'idle' | 'correct' | 'incorrect'>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Split families for desktop layout
  const splitIndex = Math.ceil(FAMILIES.length / 2);
  const leftFamilies = FAMILIES.slice(0, splitIndex);
  const rightFamilies = FAMILIES.slice(splitIndex);

  const startGame = useCallback(async () => {
    // Initialize AudioContext on user interaction
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    } else if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    setGameState(GameState.LOADING);
    try {
      // Pass the used words list to exclude them
      const newItems = await initializeGame(currentFamily.syllables, usedWords);
      
      setItems(newItems);
      
      // Add new words to the used words list
      const newWords = newItems.map(i => i.word);
      setUsedWords(prev => [...prev, ...newWords]);

      setGameState(GameState.PLAYING);
      
      // Reset feedback map dynamically based on current syllables
      const initialFeedback: Record<string, 'idle' | 'correct' | 'incorrect'> = {};
      currentFamily.syllables.forEach(s => initialFeedback[s] = 'idle');
      setSyllableFeedback(initialFeedback);

    } catch (error) {
      console.error("Failed to start game", error);
      setGameState(GameState.START); 
    }
  }, [currentFamily, usedWords]);

  // Handle changing family
  const handleFamilySelect = (family: SyllableFamily) => {
    setCurrentFamily(family);
    setIsSidebarOpen(false);
    setUsedWords([]); 
    setGameState(GameState.START); 
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("itemId", id);
  };

  // Function to decode and play PCM data
  const playAudio = async (base64String: string) => {
    try {
        if (!audioContextRef.current) {
             audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        }
        const ctx = audioContextRef.current;
        
        // Base64 decode
        const binaryString = atob(base64String);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Convert PCM data to AudioBuffer
        // The API returns 16-bit PCM, 24kHz
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        
        for (let i = 0; i < dataInt16.length; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();

    } catch (e) {
        console.error("Error playing audio", e);
    }
  };

  const handleDrop = (e: React.DragEvent, targetSyllable: Syllable) => {
    const itemId = e.dataTransfer.getData("itemId");
    const item = items.find(i => i.id === itemId);

    if (!item) return;

    // Check logic
    if (item.syllable === targetSyllable) {
      // Correct!
      setSyllableFeedback(prev => ({ ...prev, [targetSyllable]: 'correct' }));
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, isMatched: true } : i));

      // Play Audio if available
      if (item.audioData) {
          playAudio(item.audioData);
      }

    } else {
      // Incorrect!
      setSyllableFeedback(prev => ({ ...prev, [targetSyllable]: 'incorrect' }));
      
      // Reset feedback after a delay
      setTimeout(() => {
        setSyllableFeedback(prev => ({ ...prev, [targetSyllable]: 'idle' }));
      }, 1000);
    }
  };

  // Check victory
  useEffect(() => {
    if (gameState === GameState.PLAYING && items.length > 0 && items.every(i => i.isMatched)) {
      setTimeout(() => setGameState(GameState.VICTORY), 500);
    }
  }, [items, gameState]);

  // Helper to render family buttons
  const renderFamilyButtons = (families: SyllableFamily[]) => (
    <div className="flex flex-col gap-3 w-full px-2">
        {families.map(family => (
            <button
                key={family.id}
                onClick={() => handleFamilySelect(family)}
                className={`w-full aspect-square rounded-xl flex items-center justify-center text-xl md:text-2xl font-bold transition-all ${
                    currentFamily.id === family.id 
                    ? 'bg-blue-600 text-white shadow-lg scale-110' 
                    : 'bg-blue-50 text-blue-400 hover:bg-blue-100'
                }`}
            >
                {family.label}
            </button>
        ))}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-cyan-100 to-blue-200 overflow-hidden relative">
      
      {/* --- DESKTOP LEFT SIDEBAR --- */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-24 bg-white/50 backdrop-blur-sm flex-col items-center py-4 overflow-y-auto border-r border-white/50">
         <div className="mb-4 text-blue-600 font-bold text-sm text-center uppercase tracking-wider">
            A - M
         </div>
         {renderFamilyButtons(leftFamilies)}
      </aside>

      {/* --- DESKTOP RIGHT SIDEBAR --- */}
      <aside className="hidden md:flex fixed inset-y-0 right-0 z-40 w-24 bg-white/50 backdrop-blur-sm flex-col items-center py-4 overflow-y-auto border-l border-white/50">
         <div className="mb-4 text-blue-600 font-bold text-sm text-center uppercase tracking-wider">
            N - Z
         </div>
         {renderFamilyButtons(rightFamilies)}
      </aside>

      {/* --- MOBILE DRAWER (ALL FAMILIES) --- */}
      <div className={`md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-24 bg-white shadow-2xl transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col items-center py-4 overflow-y-auto`}>
         <button onClick={() => setIsSidebarOpen(false)} className="mb-4 text-gray-400 hover:text-gray-600">
            <CloseIcon />
         </button>
         {renderFamilyButtons(FAMILIES)}
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 md:mx-24 relative flex flex-col items-center justify-center p-4 min-w-0">
        
        {/* Mobile Toggle Button */}
        <button 
            className="md:hidden absolute top-4 left-4 z-40 bg-white p-2 rounded-full shadow-lg text-blue-600"
            onClick={() => setIsSidebarOpen(true)}
        >
            <Menu />
        </button>

        {/* Header */}
        <header className="absolute top-0 right-0 w-full p-4 flex justify-end md:justify-center items-center z-30 pl-16 md:pl-0 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-4">
                <h1 className="hidden md:flex text-2xl md:text-3xl font-bold text-blue-600 items-center gap-2 bg-white/30 px-4 py-2 rounded-full backdrop-blur-sm">
                    <Sparkles className="text-yellow-500" />
                    Sílabas: {currentFamily.syllables.join(', ')}
                </h1>
                {gameState !== GameState.START && gameState !== GameState.LOADING && (
                    <button 
                        onClick={startGame}
                        className="bg-white hover:bg-blue-50 text-blue-600 p-2 rounded-full transition-colors flex items-center gap-2 font-semibold px-4 shadow-sm"
                        title="Nuevas Palabras"
                    >
                        <RefreshCcw size={20} />
                        <span className="hidden sm:inline">Nuevas Palabras</span>
                    </button>
                )}
            </div>
        </header>

        {/* START SCREEN */}
        {gameState === GameState.START && (
            <div className="text-center max-w-md bg-white p-8 rounded-3xl shadow-2xl animate-fade-in mx-4 z-10">
            <div className="mb-6 flex justify-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-5xl font-bold text-blue-500">{currentFamily.label}</span>
                </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">¡Hola Amigo!</h2>
            <p className="text-gray-600 mb-8 text-lg">
                Vamos a jugar con las sílabas: <br/>
                <strong className="text-blue-600">{currentFamily.syllables.join(', ')}</strong>
            </p>
            <button
                onClick={startGame}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
                <Play fill="currentColor" />
                Jugar
            </button>
            </div>
        )}

        {/* LOADING SCREEN */}
        {gameState === GameState.LOADING && (
            <div className="flex flex-col items-center justify-center text-blue-600">
            <Loader2 className="w-16 h-16 animate-spin mb-4" />
            <p className="text-xl font-semibold animate-pulse">Buscando palabras nuevas...</p>
            </div>
        )}

        {/* GAME SCREEN */}
        {(gameState === GameState.PLAYING || gameState === GameState.VICTORY) && (
            <div className="w-full max-w-5xl h-[85vh] flex flex-col gap-4 mt-12">
                
                {/* Top Area: Images (Source) */}
                <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-3xl border-4 border-white shadow-xl p-4 md:p-8 overflow-visible z-10 relative">
                    <div className="flex flex-wrap justify-center gap-4 md:gap-8 h-full items-center content-center">
                        {items.filter(i => !i.isMatched).length === 0 && gameState === GameState.VICTORY ? (
                            <div className="text-center animate-bounce">
                                <h2 className="text-4xl md:text-6xl font-bold text-green-600 mb-2">¡Fantástico!</h2>
                                <p className="text-xl text-green-700">¡Lo has hecho muy bien!</p>
                                <button onClick={startGame} className="mt-6 bg-green-500 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-green-600 transition">
                                    Siguientes Palabras
                                </button>
                            </div>
                        ) : (
                            items.map(item => (
                                <DraggableItem 
                                    key={item.id} 
                                    item={item} 
                                    onDragStart={handleDragStart} 
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Bottom Area: Drop Zones (Targets) */}
                <div className="h-auto pb-4">
                    <div className="grid grid-cols-5 gap-2 md:gap-4">
                        {currentFamily.syllables.map(syllable => (
                            <DropZone
                                key={syllable}
                                syllable={syllable}
                                matchedItem={items.find(i => i.isMatched && i.syllable === syllable)}
                                onDrop={handleDrop}
                                feedbackState={syllableFeedback[syllable]}
                            />
                        ))}
                    </div>
                </div>
                
            </div>
        )}
      </main>
    </div>
  );
}