import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { GameCard as GameCardComponent, DraggableCard } from './GameCard';
import { ParenthesesPair } from './ParenthesesPair';
import type { GameCard as GameCardType } from '~/utils/gameLogic';
import { calculateExpression, getOperators } from '~/utils/gameLogic';
import { cn } from '~/utils/cn';

interface GameBoardProps {
  numbers: number[];
  onResult: (result: { expression: string; result: number; isCorrect: boolean }) => void;
  className?: string;
}

export function GameBoard({ numbers, onResult, className }: GameBoardProps) {
  const [expressionCards, setExpressionCards] = useState<GameCardType[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<GameCardType[]>([]);
  const [availableOperators, setAvailableOperators] = useState<GameCardType[]>([]);
  const [activeCard, setActiveCard] = useState<GameCardType | null>(null);
  const [dragOverContainer, setDragOverContainer] = useState<string | null>(null);

  // 为表达式构建区设置droppable
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: 'expression-zone',
    disabled: false,
  });

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

    const operatorCards: GameCardType[] = getOperators().map((op, index) => ({
      id: `operator-${op}-${index}`,
      value: op,
      type: 'operator' as const,
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

    // 添加括号对卡片
    const parenthesesPairCards: GameCardType[] = [];
    // 添加多个括号对
    for (let i = 0; i < 3; i++) {
      parenthesesPairCards.push({
        id: `parenthesis-pair-${i}`,
        value: '()',
        type: 'parenthesis-pair' as const,
        content: [], // 初始为空括号对
      });
    }

    setAvailableNumbers(numberCards);
    setAvailableOperators([...multipleOperatorCards, ...parenthesesPairCards]);
  }, [numbers]);

  // 计算表达式结果
  useEffect(() => {
    if (expressionCards.length > 0) {
      const result = calculateExpression(expressionCards);
      onResult(result);
    }
  }, [expressionCards, onResult]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeCard = [...expressionCards, ...availableNumbers, ...availableOperators]
      .find(card => card.id === active.id);

    setActiveCard(activeCard || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      setDragOverContainer(over.id.toString());
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setDragOverContainer(null);

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    console.log('拖拽结束:', { activeId, overId }); // 调试日志

    // 获取拖拽的卡片
    let draggedCard: GameCardType | undefined;
    let sourceArea = '';

    // 从表达式中找到卡片
    const exprCardIndex = expressionCards.findIndex(card => card.id === activeId);
    if (exprCardIndex !== -1) {
      draggedCard = expressionCards[exprCardIndex];
      sourceArea = 'expression';
    }

    // 从可用数字中找到卡片
    const numCardIndex = availableNumbers.findIndex(card => card.id === activeId);
    if (numCardIndex !== -1) {
      draggedCard = availableNumbers[numCardIndex];
      sourceArea = 'numbers';
    }

    // 从可用运算符中找到卡片
    const opCardIndex = availableOperators.findIndex(card => card.id === activeId);
    if (opCardIndex !== -1) {
      draggedCard = availableOperators[opCardIndex];
      sourceArea = 'operators';
    }

    if (!draggedCard) {
      console.log('未找到拖拽的卡片');
      return;
    }

    console.log('拖拽的卡片:', draggedCard, '来源:', sourceArea);

    // 判断目标区域
    let targetArea = '';

    console.log('判断目标区域 - overId:', overId);

    if (overId === 'expression-zone') {
      targetArea = 'expression';
    } else if (overId.startsWith('expression-')) {
      targetArea = 'expression';
    } else if (overId === 'available-numbers') {
      targetArea = 'numbers';
    } else if (overId === 'available-operators') {
      targetArea = 'operators';
    } else if (overId.startsWith('number-')) {
      // 检查被拖拽到的元素是否在表达式区域内
      const overElement = document.getElementById(overId);
      const isInExpressionZone = overElement?.closest('#expression-zone');

      if (isInExpressionZone) {
        targetArea = 'expression';
        console.log('检测到目标数字卡片在表达式区域内');
      } else if (sourceArea !== 'numbers') {
        // 如果来源不是数字区域，且不在表达式内，推测目标是表达式
        targetArea = 'expression';
        console.log('检测到拖拽到数字卡片，但来源不是数字区域，推测目标是表达式');
      } else {
        targetArea = 'numbers';
      }
    } else if (overId.startsWith('operator-') || overId.startsWith('parenthesis-pair-')) {
      // 检查被拖拽到的元素是否在表达式区域内
      const overElement = document.getElementById(overId);
      const isInExpressionZone = overElement?.closest('#expression-zone');

      if (isInExpressionZone) {
        targetArea = 'expression';
        console.log('检测到目标运算符/括号卡片在表达式区域内');
      } else if (sourceArea !== 'operators') {
        targetArea = 'expression';
        console.log('检测到拖拽到运算符/括号卡片，但来源不是运算符区域，推测目标是表达式');
      } else {
        console.log('运算符区域内部拖拽，不处理');
        return;
      }
    } else if (overId.endsWith('-inner')) {
      // 拖拽到括号对内部
      targetArea = 'parentheses-inner';
      console.log('检测到拖拽到括号对内部');
    } else if (overId.startsWith('parenthesis-pair-')) {
      // 拖拽到括号对本身，添加到括号对内容中
      targetArea = 'parentheses-content';
      console.log('检测到拖拽到括号对，将添加到内容中');
    } else {
      // 未知的overId，尝试通过上下文判断
      console.log('未知overId:', overId, '尝试通过上下文判断');

      // 如果从可用区域拖拽，但没有明确的目标，假设目标是表达式
      if (sourceArea === 'numbers' || sourceArea === 'operators') {
        targetArea = 'expression';
        console.log('通过上下文推断目标为表达式');
      }
    }

    console.log('最终目标区域:', targetArea);

    // 如果来源和目标相同，不做处理（除了表达式内的重新排序）
    if (sourceArea === targetArea && sourceArea !== 'expression') {
      console.log('相同区域，不处理');
      return;
    }

    // 处理拖拽到表达式区域
    if (targetArea === 'expression') {
      if (sourceArea === 'expression') {
        // 表达式内部重新排序
        if (overId !== 'expression-zone') {
          const overIndex = expressionCards.findIndex(card => card.id === overId);
          if (overIndex !== -1 && overIndex !== exprCardIndex) {
            setExpressionCards(cards =>
              arrayMove(cards, exprCardIndex, overIndex)
            );
            console.log('表达式内重新排序');
          }
        }
      } else {
        // 从可用区域添加到表达式
        let newExpressionCards = [...expressionCards];

        // 从源区域移除卡片
        if (sourceArea === 'numbers') {
          setAvailableNumbers(cards => cards.filter((_, index) => index !== numCardIndex));
          newExpressionCards.push(draggedCard);
        } else if (sourceArea === 'operators') {
          setAvailableOperators(cards => cards.filter((_, index) => index !== opCardIndex));
          newExpressionCards.push(draggedCard);
        }

        setExpressionCards(newExpressionCards);
        console.log('卡片已添加到表达式:', newExpressionCards);
      }
    }

    // 处理拖拽到括号对内容区域
    else if (targetArea === 'parentheses-inner' || targetArea === 'parentheses-content') {
      if (sourceArea === 'numbers' || sourceArea === 'operators') {
        // 从可用区域添加到括号对内部
        const parentId = targetArea === 'parentheses-inner'
          ? overId.replace('-inner', '')
          : overId; // 直接使用parenthesis-pair-x的ID

        const parentIndex = expressionCards.findIndex(card => card.id === parentId);

        if (parentIndex !== -1 && expressionCards[parentIndex].type === 'parenthesis-pair') {
          const newExpressionCards = [...expressionCards];
          const parentCard = { ...newExpressionCards[parentIndex] };

          // 添加内容到括号对
          if (!parentCard.content) {
            parentCard.content = [];
          }
          parentCard.content.push(draggedCard);

          newExpressionCards[parentIndex] = parentCard;

          // 从源区域移除卡片
          if (sourceArea === 'numbers') {
            setAvailableNumbers(cards => cards.filter((_, index) => index !== numCardIndex));
          } else if (sourceArea === 'operators') {
            setAvailableOperators(cards => cards.filter((_, index) => index !== opCardIndex));
          }

          setExpressionCards(newExpressionCards);
          console.log('卡片已添加到括号对内容:', parentCard);
        }
      } else if (sourceArea === 'expression') {
        // 从表达式移动到括号对内部
        const parentId = targetArea === 'parentheses-inner'
          ? overId.replace('-inner', '')
          : overId; // 直接使用parenthesis-pair-x的ID

        const parentIndex = expressionCards.findIndex(card => card.id === parentId);

        if (parentIndex !== -1 && expressionCards[parentIndex].type === 'parenthesis-pair') {
          const movedCard = expressionCards[exprCardIndex];
          const newExpressionCards = expressionCards.filter((_, index) => index !== exprCardIndex);
          const parentCard = { ...newExpressionCards[parentIndex] };

          // 添加内容到括号对
          if (!parentCard.content) {
            parentCard.content = [];
          }
          parentCard.content.push(movedCard);

          newExpressionCards[parentIndex] = parentCard;
          setExpressionCards(newExpressionCards);
          console.log('卡片已从表达式移动到括号对内容:', parentCard);
        }
      }
    }

    // 处理拖拽回可用区域
    else if (targetArea === 'numbers' || targetArea === 'operators') {
      if (sourceArea === 'expression') {
        const card = expressionCards[exprCardIndex];

        if (targetArea === 'numbers' && card.type === 'number') {
          setAvailableNumbers(cards => [...cards, card]);
        } else if (targetArea === 'operators' && card.type === 'operator') {
          setAvailableOperators(cards => [...cards, card]);
        } else {
          // 类型不匹配，根据卡片类型放到正确区域
          if (card.type === 'number') {
            setAvailableNumbers(cards => [...cards, card]);
          } else {
            setAvailableOperators(cards => [...cards, card]);
          }
        }

        setExpressionCards(cards => cards.filter((_, index) => index !== exprCardIndex));
        console.log('卡片已移回可用区域');
      }
    }

    else {
      console.log('未知拖拽目标:', overId);
    }
  };

  const resetExpression = () => {
    // 将所有表达式卡片移回可用区域
    const numbersToReturn: GameCardType[] = [];
    const operatorsToReturn: GameCardType[] = [];

    const processCard = (card: GameCardType) => {
      if (card.type === 'number') {
        numbersToReturn.push(card);
      } else if (card.type === 'operator') {
        operatorsToReturn.push(card);
      } else if (card.type === 'parenthesis-pair' && card.content) {
        // 递归处理括号对内的内容
        card.content.forEach(processCard);
      }
    };

    expressionCards.forEach(processCard);

    setAvailableNumbers(prev => [...prev, ...numbersToReturn]);
    setAvailableOperators(prev => [...prev, ...operatorsToReturn]);
    setExpressionCards([]);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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

        {/* 表达式构建区 */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">
            📝 表达式构建区
            <span className="text-sm text-gray-600 ml-2">
              (支持括号和运算符优先级)
            </span>
          </h3>

          <div
            ref={setDroppableRef}
            id="expression-zone"
            className={cn(
              'min-h-32 p-6 border-2 border-dashed border-gray-300 rounded-lg',
              'bg-gray-50 transition-colors duration-200',
              dragOverContainer === 'expression-zone' && 'border-blue-400 bg-blue-50',
              expressionCards.length === 0 && 'flex items-center justify-center'
            )}
          >
            {expressionCards.length === 0 ? (
              <div className="text-gray-400 text-center min-h-32 flex items-center justify-center">
                <div className="text-2xl mb-2">⬇️</div>
                <div>拖拽数字和运算符到此处</div>
              </div>
            ) : (
              <SortableContext
                items={expressionCards.map(card => card.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {expressionCards.map((card) => (
                    <div key={card.id} id={`expression-${card.id}`}>
                      {card.type === 'parenthesis-pair' ? (
                        <ParenthesesPair card={card} disabled={true} />
                      ) : (
                        <GameCardComponent card={card} />
                      )}
                    </div>
                  ))}
                </div>
              </SortableContext>
            )}
        </div>

          {/* 重置按钮 */}
          {expressionCards.length > 0 && (
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
            <GameCardComponent card={activeCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}