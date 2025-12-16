import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GameCard as GameCardType } from '~/utils/gameLogic';
import { cn } from '~/utils/cn';

interface GameCardProps {
  card: GameCardType;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function GameCard({ card, disabled = false, onClick, className }: GameCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isNumber = card.type === 'number';
  const cardColor = isNumber
    ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
    : 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative w-20 h-24 md:w-24 md:h-28 rounded-lg shadow-lg cursor-grab active:cursor-grabbing',
        'transition-all duration-200 transform hover:scale-105 hover:shadow-xl',
        'flex items-center justify-center font-bold text-2xl md:text-3xl',
        cardColor,
        disabled && 'opacity-50 cursor-not-allowed',
        isDragging && 'shadow-2xl scale-110',
        className
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {/* 卡片内容 */}
      <div className="text-center select-none">
        <div className="font-mono font-bold">
          {card.value}
        </div>
      </div>

      {/* 装饰性元素 */}
      <div className="absolute top-1 right-1 w-3 h-3 bg-white/20 rounded-full" />
      <div className="absolute bottom-1 left-1 w-3 h-3 bg-white/20 rounded-full" />

      {/* 拖拽指示器 */}
      {!disabled && (
        <div className="absolute inset-0 rounded-lg border-2 border-white/20 pointer-events-none" />
      )}
    </div>
  );
}

interface DraggableCardProps {
  card: GameCardType;
  disabled?: boolean;
  className?: string;
}

export function DraggableCard({ card, disabled = false, className }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isNumber = card.type === 'number';
  const cardColor = isNumber
    ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
    : 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative w-16 h-20 md:w-20 md:h-24 rounded-lg shadow-md cursor-grab active:cursor-grabbing',
        'transition-all duration-200 transform hover:scale-105 hover:shadow-lg',
        'flex items-center justify-center font-bold text-xl md:text-2xl',
        cardColor,
        disabled && 'opacity-50 cursor-not-allowed',
        isDragging && 'shadow-2xl scale-110 z-50',
        className
      )}
      {...attributes}
      {...listeners}
    >
      <div className="text-center select-none">
        <div className="font-mono font-bold">
          {card.value}
        </div>
      </div>

      <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-white/30 rounded-full" />
      <div className="absolute bottom-0.5 left-0.5 w-2 h-2 bg-white/30 rounded-full" />
    </div>
  );
}