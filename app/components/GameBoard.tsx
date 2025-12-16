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
  // 括号包装状态
  leftParenthesis?: boolean;
  rightParenthesis?: boolean;
  parenthesesGroup?: number; // 属于哪个括号组
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

  // 将槽位转换为包含括号信息的表达式卡片数组
  const convertSlotsToExpressionCards = (slots: ExpressionSlot[]): GameCardType[] => {
    const cards: GameCardType[] = [];
    const processedGroups = new Set<number>();

    slots.forEach((slot, index) => {
      if (slot.card) {
        // 如果这个槽位是括号组的开始（有左括号）且还没处理过
        if (slot.leftParenthesis && slot.parenthesesGroup && !processedGroups.has(slot.parenthesesGroup)) {
          const groupId = slot.parenthesesGroup;
          processedGroups.add(groupId);

          // 找到对应的右括号位置
          let rightParenthesisIndex = -1;
          for (let i = index; i < slots.length; i++) {
            if (slots[i].rightParenthesis && slots[i].parenthesesGroup === groupId) {
              rightParenthesisIndex = i;
              break;
            }
          }

          if (rightParenthesisIndex !== -1) {
            // 创建一个parenthesis-pair类型的卡片，这样会被flattenCards正确处理
            const innerCards: GameCardType[] = [];

            // 添加括号内的内容：左数字 + 运算符 + 右数字
            // 即从当前(index)到rightParenthesisIndex，只包含有card的槽位
            for (let i = index; i <= rightParenthesisIndex; i++) {
              if (slots[i].card) {
                innerCards.push(slots[i].card);
              }
            }

            cards.push({
              id: `parenthesis-pair-${groupId}`,
              value: '()',
              type: 'parenthesis-pair',
              content: innerCards
            });
          }
        } else if (!slot.leftParenthesis && !slot.rightParenthesis) {
          // 不在括号组中的普通卡片
          cards.push(slot.card);
        }
        // 如果是右括号但已经在组内处理过了，就跳过，避免重复添加
      }
    });

    return cards;
  };

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
    // 将槽位转换为包含括号信息的表达式卡片数组
    const expressionCards = convertSlotsToExpressionCards(expressionSlots);

    if (expressionCards.length >= 3) { // 至少需要2个数字和1个运算符
      const result = calculateExpression(expressionCards);

      // 只有当表达式有效时才调用 onResult，避免发送空字符串到API
      if (result.expression && result.expression.trim() !== '') {
        onResult(result);
      }
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
    // 括号逻辑：在 [数字-运算符-数字] 组合两侧添加括号装饰
    console.log('处理括号拖拽，目标位置:', targetPosition);

    // 如果目标是运算符槽位，检查两侧是否有数字
    if (expressionSlots[targetPosition].type === 'operator') {
      const leftPos = targetPosition - 1;
      const rightPos = targetPosition + 1;

      if (leftPos >= 0 && rightPos < expressionSlots.length) {
        const leftSlot = expressionSlots[leftPos];
        const rightSlot = expressionSlots[rightPos];

        // 检查是否形成有效的 [数字-运算符-数字] 组合
        if (leftSlot.card?.type === 'number' && rightSlot.card?.type === 'number' &&
            expressionSlots[targetPosition].card?.type === 'operator') {

          // 生成唯一的括号组ID
          const groupId = Date.now();

          setExpressionSlots(prev => {
            const newSlots = [...prev];

            // 在左侧数字槽位添加左括号
            newSlots[leftPos] = {
              ...newSlots[leftPos],
              leftParenthesis: true,
              parenthesesGroup: groupId
            };

            // 在右侧数字槽位添加右括号
            newSlots[rightPos] = {
              ...newSlots[rightPos],
              rightParenthesis: true,
              parenthesesGroup: groupId
            };

            return newSlots;
          });

          // 从可用区域移除括号
          if (sourceType === 'operators') {
            setAvailableOperators(prev => prev.filter(c => c.id !== parenthesesCard.id));
          }

          console.log('✅ 成功添加括号包装');
          return;
        } else {
          console.log('⚠️ 无法添加括号：缺少数字或运算符');
        }
      }
    } else {
      console.log('⚠️ 括号只能拖到运算符位置');
    }
  };

  const resetExpression = () => {
    // 将所有表达式卡片移回可用区域
    const numbersToReturn: GameCardType[] = [];
    const operatorsToReturn: GameCardType[] = [];
    const usedGroups = new Set<number>();

    expressionSlots.forEach(slot => {
      if (slot.card) {
        if (slot.card.type === 'number') {
          numbersToReturn.push(slot.card);
        } else if (slot.card.type === 'operator') {
          operatorsToReturn.push(slot.card);
        }
      }

      // 如果有括号组，添加括号到可用区域（每个组只添加一次）
      if (slot.parenthesesGroup && !usedGroups.has(slot.parenthesesGroup)) {
        usedGroups.add(slot.parenthesesGroup);
        operatorsToReturn.push({
          id: `parenthesis-pair-${slot.parenthesesGroup}`,
          value: '()',
          type: 'parenthesis-pair',
          content: []
        });
      }
    });

    setAvailableNumbers(prev => [...prev, ...numbersToReturn]);
    setAvailableOperators(prev => [...prev, ...operatorsToReturn]);

    // 清空所有槽位和括号状态
    setExpressionSlots(prev => prev.map(slot => ({
      ...slot,
      card: null,
      leftParenthesis: false,
      rightParenthesis: false,
      parenthesesGroup: undefined
    })));
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
  const hasLeftParenthesis = slot.leftParenthesis;
  const hasRightParenthesis = slot.rightParenthesis;

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
      {/* 左括号 */}
      {hasLeftParenthesis && (
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-purple-600 z-10">
          (
        </div>
      )}

      {/* 卡片内容 */}
      {slot.card ? (
        <div className={cn(
          'relative z-0',
          hasLeftParenthesis && hasRightParenthesis && 'bg-purple-100 rounded'
        )}>
          <DraggableCard card={slot.card} />
        </div>
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

      {/* 右括号 */}
      {hasRightParenthesis && (
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-purple-600 z-10">
          )
        </div>
      )}

      {/* 括号背景效果 */}
      {hasLeftParenthesis && hasRightParenthesis && (
        <div className="absolute inset-0 border-2 border-purple-400 border-dashed rounded-lg -z-10" />
      )}
    </div>
  );
}