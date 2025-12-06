import React from 'react';
import { GameItem } from '../types';

interface DraggableItemProps {
  item: GameItem;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({ item, onDragStart }) => {
  if (item.isMatched) return null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="draggable-item w-32 h-32 md:w-40 md:h-40 bg-white rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 border-4 border-white flex flex-col items-center justify-center p-2 relative group select-none"
    >
        <img 
            src={item.imageUrl} 
            alt={item.word} 
            className="w-full h-full object-contain pointer-events-none"
        />
        {/* Helper text on hover only if needed, but the request implies images only */}
        <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-2 py-1 rounded text-sm">
            {item.word}
        </div>
    </div>
  );
};