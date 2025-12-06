import React from 'react';
import { Syllable, GameItem } from '../types';
import { Check, X } from 'lucide-react';

interface DropZoneProps {
  syllable: Syllable;
  matchedItem?: GameItem;
  onDrop: (e: React.DragEvent, syllable: Syllable) => void;
  feedbackState: 'idle' | 'correct' | 'incorrect';
}

export const DropZone: React.FC<DropZoneProps> = ({ syllable, matchedItem, onDrop, feedbackState }) => {
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  let borderColor = "border-blue-300";
  let bgColor = "bg-white";
  let icon = null;

  if (feedbackState === 'correct' || matchedItem) {
    borderColor = "border-green-500";
    bgColor = "bg-green-50";
    icon = <Check className="text-green-600 w-12 h-12 absolute z-20 animate-bounce" />;
  } else if (feedbackState === 'incorrect') {
    borderColor = "border-red-500";
    bgColor = "bg-red-50";
    icon = <X className="text-red-600 w-12 h-12 absolute z-20 animate-pulse" />;
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={(e) => onDrop(e, syllable)}
      className={`relative w-full h-32 md:h-48 rounded-2xl border-4 border-dashed ${borderColor} ${bgColor} flex flex-col items-center justify-center transition-colors duration-300`}
    >
      {/* Background Syllable Text */}
      <span className={`text-4xl md:text-6xl font-bold uppercase transition-colors duration-300 ${matchedItem ? 'text-green-800/10 scale-150' : 'text-gray-300'}`}>
        {syllable}
      </span>

      {/* Feedback Icon (Solo se muestra brevemente durante la animación o si no hay match fijo aún) */}
      {!matchedItem && icon}

      {/* Matched Image Content */}
      {matchedItem && (
        <div className="absolute inset-0 p-1 z-10 flex flex-col items-center justify-center">
             <img 
                src={matchedItem.imageUrl} 
                alt={matchedItem.word} 
                className="w-auto h-2/3 object-contain drop-shadow-md"
            />
            {/* Texto de la palabra: Aumentado de tamaño significativamente */}
            <span className="animate-pop-in mt-2 px-3 py-1 bg-white/90 rounded-xl text-gray-900 font-extrabold text-2xl md:text-3xl shadow-sm border-2 border-green-200 capitalize tracking-wide">
                {matchedItem.word}
            </span>
        </div>
      )}
    </div>
  );
};