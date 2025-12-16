import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import type { GameCard as GameCardType } from '~/utils/gameLogic';
import { DraggableCard } from './GameCard';
import { cn } from '~/utils/cn';

interface ParenthesesPairProps {
  card: GameCardType;
  disabled?: boolean;
  className?: string;
}

export function ParenthesesPair({ card, disabled = false, className }: ParenthesesPairProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useDraggable({ id: card.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `${card.id}-inner`,
    disabled,
  });

  const isEmpty = !card.content || card.content.length === 0;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setDroppableRef(node);
      }}
      style={style}
      className={cn(
        'relative w-24 h-28 md:w-32 md:h-36 rounded-lg shadow-lg cursor-grab active:cursor-grabbing',
        'transition-all duration-200 transform hover:scale-105 hover:shadow-xl',
        'bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white',
        'border-2 border-dashed border-gray-400 flex flex-col items-center justify-center',
        disabled && 'opacity-50 cursor-not-allowed',
        isDragging && 'shadow-2xl scale-110 z-50',
        className
      )}
      {...attributes}
      {...listeners}
    >
      {/* 括号显示 */}
      <div className="absolute top-2 left-2 text-2xl font-bold text-gray-200">(</div>
      <div className="absolute bottom-2 right-2 text-2xl font-bold text-gray-200">)</div>

      {/* 内容区域 */}
      <div className="flex-1 flex items-center justify-center w-full min-h-[40px]">
        {isEmpty ? (
          <div className="text-gray-300 text-sm text-center px-2">
            拖拽内容到这里
          </div>
        ) : (
          <div className="flex gap-1 flex-wrap justify-center items-center">
            {card.content?.map((contentCard, index) => (
              <DraggableCard
                key={`${card.id}-content-${index}`}
                card={contentCard}
                disabled={disabled}
                className="scale-75"
              />
            ))}
          </div>
        )}
      </div>

      {/* 拖拽指示器 */}
      {!disabled && (
        <div className="absolute inset-0 rounded-lg border-2 border-white/20 pointer-events-none" />
      )}
    </div>
  );
}