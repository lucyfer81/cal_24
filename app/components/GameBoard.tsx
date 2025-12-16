import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { DraggableCard } from './GameCard';
import { ParenthesesPair } from './ParenthesesPair';
import type { GameCard as GameCardType } from '~/utils/gameLogic';
import { calculateExpression, getOperators } from '~/utils/gameLogic';
import { cn } from '~/utils/cn';

interface GameBoardProps {
  numbers: number[];
  onResult: (result: { expression: string; result: number; isCorrect: boolean }) => void;
  className?: string;
}

// 表达式槽位类型
interface ExpressionSlot {
  id: string;
  type: 'number' | 'operator';
  position: number;
  card: GameCardType | null;
  isHighlighted?: boolean;
}

export function GameBoard({ numbers, onResult, className }: GameBoardProps) {
  const [expressionSlots, setExpressionSlots] = useState<ExpressionSlot[]>([
    // 4个数字槽位 + 3个运算符槽位 = 7个槽位
    { id: 'slot-0', type: 'number', position: 0, card: null },
    { id: 'slot-1', type: 'operator', position: 1, card: null },
    { id: 'slot-2', type: 'number', position: 2, card: null },
    { id: 'slot-3', type: 'operator', position: 3, card: null },
    { id: 'slot-4', type: 'number', position: 4, card: null },
    { id: 'slot-5', type: 'operator', position: 5, card: null },
    { id: 'slot-6', type: 'number', position: 6, card: null },
  ]);

  const [availableNumbers, setAvailableNumbers] = useState<GameCardType[]>([]);
  const [availableOperators, setAvailableOperators] = useState<GameCardType[]>([]);
  const [activeCard, setActiveCard] = useState<GameCardType | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // 初始化可用卡片
  useEffect(() => {
    const numberCards: GameCardType[] = numbers.map((num, index) => ({
      id: `number-${num}-${index}`,
      value: num,
      type: 'number' as const,
      originalIndex: index,
    }));

    // 提供多个运算符实例
    const multipleOperatorCards: GameCardType[] = [];
    getOperators().forEach((op, opIndex) => {
      for (let i = 0; i < 3; i++) {
        multipleOperatorCards.push({
          id: `operator-${op}-${opIndex}-${i}`,
          value: op,
          type: 'operator' as const,
        });
      }
    });

    // 添加多个括号对
    const parenthesesPairCards: GameCardType[] = [];
    for (let i = 0; i < 3; i++) {
      parenthesesPairCards.push({
        id: `parenthesis-pair-${i}`,
        value: '()',
        type: 'parenthesis-pair' as const,
        content: [],
      });
    }

    setAvailableNumbers(numberCards);
    setAvailableOperators([...multipleOperatorCards, ...parenthesesPairCards]);
  }, [numbers]);

  // 计算表达式结果
  useEffect(() => {
    const expressionCards = expressionSlots
      .filter(slot => slot.card !== null)
      .map(slot => slot.card!);

    if (expressionCards.length >= 3) { // 至少需要2个数字和1个运算符
      const result = calculateExpression(expressionCards);
      onResult(result);
    }
  }, [expressionSlots, onResult]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeCard = [...expressionSlots.map(s => s.card).filter(Boolean), ...availableNumbers, ...availableOperators]
      .find(card => card?.id === active.id);

    setActiveCard(activeCard || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setDragOverSlot(null);

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    console.log('拖拽结束:', { activeId, overId });

    // 获取拖拽的卡片
    let draggedCard: GameCardType | undefined;
    let sourceType: 'expression' | 'numbers' | 'operators' = 'numbers';

    // 从表达式中找到卡片
    const expressionSlot = expressionSlots.find(slot => slot.card?.id === activeId);
    if (expressionSlot) {
      draggedCard = expressionSlot.card!;
      sourceType = 'expression';
    }

    // 从可用数字中找到卡片
    if (!draggedCard) {
      const numIndex = availableNumbers.findIndex(card => card.id === activeId);
      if (numIndex !== -1) {
        draggedCard = availableNumbers[numIndex];
        sourceType = 'numbers';
      }
    }

    // 从可用运算符中找到卡片
    if (!draggedCard) {
      const opIndex = availableOperators.findIndex(card => card.id === activeId);
      if (opIndex !== -1) {
        draggedCard = availableOperators[opIndex];
        sourceType = 'operators';
      }
    }

    if (!draggedCard) {
      console.log('未找到拖拽的卡片');
      return;
    }

    console.log('拖拽的卡片:', draggedCard, '来源:', sourceType);

    // 检查是否拖拽到表达式槽位
    if (overId.startsWith('slot-')) {
      const targetSlot = expressionSlots.find(slot => slot.id === overId);
      if (!targetSlot) return;

      // 类型匹配检查
      if (draggedCard.type === 'parenthesis-pair') {
        // 括号可以拖到任何位置，但需要特殊处理
        handleParenthesesDrop(draggedCard, targetSlot.position, sourceType);
      } else if (draggedCard.type === targetSlot.type) {
        // 数字到数字槽位，运算符到运算符槽位
        handleCardDrop(draggedCard, targetSlot.position, sourceType);
      } else {
        console.log('类型不匹配:', draggedCard.type, '不能放到', targetSlot.type);
      }
    }
  };

  const handleCardDrop = (card: GameCardType, targetPosition: number, sourceType: 'expression' | 'numbers' | 'operators') => {
    setExpressionSlots(prev => {
      const newSlots = [...prev];

      // 如果来源是表达式，清空原位置
      if (sourceType === 'expression') {
        const sourceSlot = newSlots.find(slot => slot.card?.id === card.id);
        if (sourceSlot) {
          sourceSlot.card = null;
        }
      } else {
        // 从可用区域移除卡片
        if (sourceType === 'numbers') {
          setAvailableNumbers(prev => prev.filter(c => c.id !== card.id));
        } else if (sourceType === 'operators') {
          setAvailableOperators(prev => prev.filter(c => c.id !== card.id));
        }
      }

      // 将卡片放到目标位置
      newSlots[targetPosition].card = card;

      return newSlots;
    });
  };

  const handleParenthesesDrop = (parenthesesCard: GameCardType, targetPosition: number, sourceType: 'expression' | 'numbers' | 'operators') => {
    // 括号逻辑：找到适合的 [数字-运算符-数字] 组合并包装
    console.log('处理括号拖拽，目标位置:', targetPosition);

    // 简化处理：如果目标位置是运算符，包装两边的数字
    if (expressionSlots[targetPosition].type === 'operator') {
      const leftPos = targetPosition - 1;
      const rightPos = targetPosition + 1;

      if (leftPos >= 0 && rightPos < expressionSlots.length) {
        const leftSlot = expressionSlots[leftPos];
        const rightSlot = expressionSlots[rightPos];

        if (leftSlot.card?.type === 'number' && rightSlot.card?.type === 'number') {
          // 创建带内容的括号对
          const newParenthesesCard = {
            ...parenthesesCard,
            content: [leftSlot.card!, expressionSlots[targetPosition].card!, rightSlot.card!]
          };

          // 用括号对替换这三个位置
          setExpressionSlots(prev => {
            const newSlots = [...prev];
            newSlots[leftPos].card = null;
            newSlots[targetPosition].card = null;
            newSlots[rightPos].card = newParenthesesCard;
            return newSlots;
          });

          // 从可用区域移除括号
          if (sourceType === 'operators') {
            setAvailableOperators(prev => prev.filter(c => c.id !== parenthesesCard.id));
          }

          return;
        }
      }
    }

    // 如果不适合包装，就放到空的位置
    if (expressionSlots[targetPosition].card === null) {
      handleCardDrop(parenthesesCard, targetPosition, sourceType);
    }
  };

  const resetExpression = () => {
    // 将所有表达式卡片移回可用区域
    const numbersToReturn: GameCardType[] = [];
    const operatorsToReturn: GameCardType[] = [];

    expressionSlots.forEach(slot => {
      if (slot.card) {
        if (slot.card.type === 'number') {
          numbersToReturn.push(slot.card);
        } else if (slot.card.type === 'operator') {
          operatorsToReturn.push(slot.card);
        } else if (slot.card.type === 'parenthesis-pair' && slot.card.content) {
          // 递归处理括号对内的内容
          slot.card.content.forEach(contentCard => {
            if (contentCard.type === 'number') {
              numbersToReturn.push(contentCard);
            } else if (contentCard.type === 'operator') {
              operatorsToReturn.push(contentCard);
            }
          });
          operatorsToReturn.push(slot.card); // 括号本身
        }
      }
    });

    setAvailableNumbers(prev => [...prev, ...numbersToReturn]);
    setAvailableOperators(prev => [...prev, ...operatorsToReturn]);

    // 清空所有槽位
    setExpressionSlots(prev => prev.map(slot => ({ ...slot, card: null })));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('space-y-6', className)}>
        {/* 题目区域 */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">🎲 题目</h3>
          <div className="flex justify-center gap-3 flex-wrap" id="available-numbers">
            {availableNumbers.map((card) => (
              <DraggableCard key={card.id} card={card} />
            ))}
          </div>
        </div>

        {/* 运算符工具箱 */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">🔧 运算符 & 括号</h3>
          <div className="flex justify-center gap-2 flex-wrap" id="available-operators">
            {availableOperators.map((card) => (
              card.type === 'parenthesis-pair' ? (
                <ParenthesesPair key={card.id} card={card} />
              ) : (
                <DraggableCard key={card.id} card={card} />
              )
            ))}
          </div>
        </div>

        {/* 表达式构建区 - 固定槽位布局 */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">
            📝 表达式构建区
            <span className="text-sm text-gray-600 ml-2">
              (拖拽到对应位置)
            </span>
          </h3>

          <div className="flex justify-center items-center gap-2 flex-wrap p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            {expressionSlots.map((slot) => (
              <Slot
                key={slot.id}
                slot={slot}
                isDragOver={dragOverSlot === slot.id}
                onDragOver={() => setDragOverSlot(slot.id)}
                onDragLeave={() => setDragOverSlot(null)}
              />
            ))}
          </div>

          {/* 重置按钮 */}
          {expressionSlots.some(slot => slot.card !== null) && (
            <div className="mt-4">
              <button
                onClick={resetExpression}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
              >
                🔁 重置表达式
              </button>
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="opacity-80">
            {activeCard.type === 'parenthesis-pair' ? (
              <ParenthesesPair card={activeCard} />
            ) : (
              <DraggableCard card={activeCard} />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// 单个槽位组件
interface SlotProps {
  slot: ExpressionSlot;
  isDragOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
}

function Slot({ slot, isDragOver, onDragOver, onDragLeave }: SlotProps) {
  const { setNodeRef } = useDroppable({
    id: slot.id,
    disabled: false,
  });

  const isNumberSlot = slot.type === 'number';
  const isOperatorSlot = slot.type === 'operator';

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={onDragOver}
      onMouseLeave={onDragLeave}
      className={cn(
        'relative w-16 h-20 md:w-20 md:h-24 border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-200',
        isNumberSlot && 'border-green-400 bg-green-50',
        isOperatorSlot && 'border-orange-400 bg-orange-50',
        isDragOver && 'border-blue-500 bg-blue-100 scale-105',
        !slot.card && 'opacity-60'
      )}
    >
      {slot.card ? (
        slot.card.type === 'parenthesis-pair' ? (
          <ParenthesesPair card={slot.card} />
        ) : (
          <DraggableCard card={slot.card} />
        )
      ) : (
        <div className="text-center text-gray-400">
          <div className="text-xs font-medium">
            {isNumberSlot ? '数字' : '运算符'}
          </div>
          <div className="text-lg">
            {isNumberSlot ? '🔢' : '➕'}
          </div>
        </div>
      )}
    </div>
  );
}