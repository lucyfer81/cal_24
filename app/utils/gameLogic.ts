/**
 * 24点游戏核心逻辑
 * 包括计算引擎、题目生成、解法验证等
 */

export interface GameCard {
  id: string;
  value: number | string;
  type: 'number' | 'operator' | 'parenthesis-pair';
  originalIndex?: number;
  content?: GameCard[]; // 括号对内的内容
}

export interface GameResult {
  result: number;
  expression: string;
  isCorrect: boolean;
  steps?: string[];
}

/**
 * AST节点结构
 */
export interface TreeNode {
  type: 'number' | 'operation';
  value?: number;
  operator?: string;
  left?: TreeNode;
  right?: TreeNode;
}

export interface QuestionData {
  numbers: number[];
  difficulty: number;
  solutionCount: number;
  hash: string;
}

/**
 * 运算符定义
 */
export const OPERATORS = {
  '+': { symbol: '+', precedence: 1, calculate: (a: number, b: number) => a + b },
  '-': { symbol: '-', precedence: 1, calculate: (a: number, b: number) => a - b },
  '×': { symbol: '×', precedence: 2, calculate: (a: number, b: number) => a * b },
  '÷': { symbol: '÷', precedence: 2, calculate: (a: number, b: number) => b !== 0 ? a / b : NaN }
};

/**
 * 获取所有运算符
 */
export const getOperators = (): string[] => {
  return Object.keys(OPERATORS);
};


/**
 * 将卡片序列转换为token数组（移除括号，按优先级排序）
 */
export const tokenizeExpression = (cards: GameCard[]): GameCard[] => {
  const tokens: GameCard[] = [];
  const stack: GameCard[] = [];

  for (const card of cards) {
    if (card.type === 'number') {
      tokens.push(card);
    } else if (card.type === 'operator') {
      // 处理运算符优先级
      while (stack.length > 0 &&
             stack[stack.length - 1].type === 'operator' &&
             OPERATORS[stack[stack.length - 1].value as string].precedence >=
             OPERATORS[card.value as string].precedence) {
        tokens.push(stack.pop()!);
      }
      stack.push(card);
    } else if (card.type === 'parenthesis' && card.parenthesisType === '(') {
      stack.push(card);
    } else if (card.type === 'parenthesis' && card.parenthesisType === ')') {
      // 弹出栈内元素直到遇到左括号
      while (stack.length > 0 &&
             !(stack[stack.length - 1].type === 'parenthesis' && stack[stack.length - 1].parenthesisType === '(')) {
        tokens.push(stack.pop()!);
      }
      if (stack.length > 0) {
        stack.pop(); // 弹出左括号
      }
    }
  }

  // 将剩余运算符弹出栈
  while (stack.length > 0) {
    tokens.push(stack.pop()!);
  }

  return tokens;
};

/**
 * 构建AST
 */
export const buildAST = (tokens: GameCard[]): TreeNode | null => {
  const stack: TreeNode[] = [];

  for (const token of tokens) {
    if (token.type === 'number') {
      stack.push({
        type: 'number',
        value: token.value as number
      });
    } else if (token.type === 'operator') {
      const right = stack.pop();
      const left = stack.pop();

      if (!left || !right) {
        return null; // 表达式无效
      }

      stack.push({
        type: 'operation',
        operator: token.value as string,
        left,
        right
      });
    }
  }

  return stack.length === 1 ? stack[0] : null;
};

/**
 * 解析表达式为AST
 */
export const parseExpression = (cards: GameCard[]): TreeNode | null => {
  // 验证括号平衡
  let balance = 0;
  for (const card of cards) {
    if (card.value === '(') {
      balance++;
    } else if (card.value === ')') {
      balance--;
      if (balance < 0) return null;
    }
  }
  if (balance !== 0) return null;

  // 转换为逆波兰表达式（后缀表达式）
  const tokens = tokenizeExpression(cards);

  // 构建AST
  return buildAST(tokens);
};

/**
 * 递归计算AST
 */
export const evaluateAST = (node: TreeNode | null): number => {
  if (!node) {
    return NaN;
  }

  if (node.type === 'number') {
    return node.value ?? 0;
  }

  if (node.type === 'operation' && node.operator && node.left && node.right) {
    const leftValue = evaluateAST(node.left);
    const rightValue = evaluateAST(node.right);

    const operation = OPERATORS[node.operator as keyof typeof OPERATORS];
    if (!operation) {
      return NaN;
    }

    return operation.calculate(leftValue, rightValue);
  }

  return NaN;
};

/**
 * 从AST生成表达式字符串
 */
export const generateExpressionString = (node: TreeNode | null): string => {
  if (!node) {
    return '';
  }

  if (node.type === 'number') {
    return (node.value ?? 0).toString();
  }

  if (node.type === 'operation' && node.operator && node.left && node.right) {
    const leftExpr = generateExpressionString(node.left);
    const rightExpr = generateExpressionString(node.right);

    // 根据运算符优先级决定是否需要加括号
    const needsLeftParens = node.left.type === 'operation' &&
      OPERATORS[node.left.operator!].precedence < OPERATORS[node.operator].precedence;
    const needsRightParens = node.right.type === 'operation' &&
      (OPERATORS[node.right.operator!].precedence < OPERATORS[node.operator].precedence ||
        (OPERATORS[node.right.operator!].precedence === OPERATORS[node.operator].precedence &&
         node.operator === '-'));

    const leftStr = needsLeftParens ? `(${leftExpr})` : leftExpr;
    const rightStr = needsRightParens ? `(${rightExpr})` : rightExpr;

    return `${leftStr} ${node.operator} ${rightStr}`;
  }

  return '';
};
export const calculateExpression = (cards: GameCard[]): GameResult => {
  if (cards.length === 0) {
    return { result: 0, expression: '', isCorrect: false };
  }

  const steps: string[] = [];

  // 验证卡片序列的有效性
  if (!isValidCardSequence(cards)) {
    return { result: NaN, expression: '', isCorrect: false };
  }

  // 将嵌套结构扁平化用于解析
  const flatCards = flattenCards(cards);

  // 解析表达式为AST
  const ast = parseExpression(flatCards);
  if (!ast) {
    return { result: NaN, expression: '', isCorrect: false };
  }

  // 计算表达式结果
  const result = evaluateAST(ast);

  // 生成表达式字符串
  const expression = flatCards
    .map(card => {
      if (card.type === 'number') {
        return card.value.toString();
      } else if (card.type === 'operator') {
        return card.value as string;
      } else if (card.type === 'parenthesis') {
        return card.parenthesisType;
      }
      return '';
    })
    .join(' ');

  // 生成计算步骤（简化版本）
  steps.push(`计算表达式: ${generateExpressionString(ast)}`);

  const isCorrect = Math.abs(result - 24) < 0.001;

  return {
    result: Math.round(result * 100) / 100, // 保留两位小数
    expression,
    isCorrect,
    steps
  };
};

/**
 * 验证卡片序列是否有效
 */
/**
 * 将嵌套的括号对结构转换为扁平化的表达式数组
 */
export const flattenCards = (cards: GameCard[]): GameCard[] => {
  const result: GameCard[] = [];

  const flatten = (cardList: GameCard[]) => {
    for (const card of cardList) {
      if (card.type === 'parenthesis-pair') {
        // 添加左括号
        result.push({
          id: `${card.id}-left`,
          value: '(',
          type: 'parenthesis',
          parenthesisType: '('
        });

        // 递归处理括号内容
        if (card.content && card.content.length > 0) {
          flatten(card.content);
        }

        // 添加右括号
        result.push({
          id: `${card.id}-right`,
          value: ')',
          type: 'parenthesis',
          parenthesisType: ')'
        });
      } else {
        result.push(card);
      }
    }
  };

  flatten(cards);
  return result;
};

/**
 * 验证卡片序列是否有效（更新以支持括号对）
 */
export const isValidCardSequence = (cards: GameCard[]): boolean => {
  if (cards.length === 0) return false;

  // 将嵌套结构扁平化
  const flatCards = flattenCards(cards);

  // 验证扁平化后的表达式
  if (flatCards.length === 0) return false;

  // 必须以数字开头（允许左括号开头）
  const firstCard = flatCards[0];
  if (firstCard.type !== 'number' && firstCard.value !== '(') {
    return false;
  }

  // 必须以数字结尾（允许右括号结尾）
  const lastCard = flatCards[flatCards.length - 1];
  if (lastCard.type !== 'number' && lastCard.value !== ')') {
    return false;
  }

  // 验证序列逻辑
  let expectingNumber = true;

  for (const card of flatCards) {
    if (card.value === '(') {
      // 左括号后期望数字
      expectingNumber = true;
      continue;
    } else if (card.value === ')') {
      // 右括号后期望运算符
      expectingNumber = false;
      continue;
    }

    if (expectingNumber) {
      if (card.type !== 'number') {
        return false;
      }
    } else {
      if (card.type !== 'operator') {
        return false;
      }
    }
    expectingNumber = !expectingNumber;
  }

  // 验证括号匹配
  let balance = 0;
  for (const card of flatCards) {
    if (card.value === '(') {
      balance++;
    } else if (card.value === ')') {
      balance--;
      if (balance < 0) return false;
    }
  }

  return balance === 0;
};

/**
 * 生成随机题目
 */
export const generateQuestion = (): QuestionData => {
  const numbers = [];
  for (let i = 0; i < 4; i++) {
    numbers.push(Math.floor(Math.random() * 13) + 1); // 1-13
  }

  return {
    numbers,
    difficulty: calculateDifficulty(numbers),
    solutionCount: countSolutions(numbers),
    hash: generateQuestionHash(numbers)
  };
};

/**
 * 计算题目难度
 */
export const calculateDifficulty = (numbers: number[]): number => {
  let difficulty = 1;

  // 包含大数字的题目更难
  const largeNumbers = numbers.filter(n => n > 10).length;
  difficulty += largeNumbers * 0.5;

  // 包含重复数字的题目可能更难
  const uniqueNumbers = new Set(numbers).size;
  if (uniqueNumbers < 4) {
    difficulty += (4 - uniqueNumbers) * 0.3;
  }

  // 基于解法数量调整难度
  const solutions = countSolutions(numbers);
  if (solutions === 0) {
    difficulty = 5; // 无解，最难
  } else if (solutions === 1) {
    difficulty += 1;
  } else if (solutions > 5) {
    difficulty -= 0.5;
  }

  return Math.max(1, Math.min(5, difficulty));
};

/**
 * 计算解法数量
 */
export const countSolutions = (numbers: number[]): number => {
  const solutions = new Set<string>();
  const operators = getOperators();

  // 生成所有数字排列
  const numberPermutations = getPermutations(numbers);

  // 生成所有运算符组合
  const operatorCombinations = generateOperatorCombinations(3);

  for (const numPerm of numberPermutations) {
    for (const opComb of operatorCombinations) {
      const result = calculateFromArray(numPerm, opComb);
      if (Math.abs(result - 24) < 0.001) {
        // 创建解法描述
        const solution = `${numPerm[0]} ${opComb[0]} ${numPerm[1]} ${opComb[1]} ${numPerm[2]} ${opComb[2]} ${numPerm[3]}`;
        solutions.add(solution);
      }
    }
  }

  return solutions.size;
};

/**
 * 检查题目是否有解
 */
export const hasSolution = (numbers: number[]): boolean => {
  return countSolutions(numbers) > 0;
};

/**
 * 生成数字的所有排列
 */
export const getPermutations = (numbers: number[]): number[][] => {
  if (numbers.length <= 1) return [numbers];

  const result: number[][] = [];

  for (let i = 0; i < numbers.length; i++) {
    const current = numbers[i];
    const remaining = numbers.slice(0, i).concat(numbers.slice(i + 1));
    const remainingPermutations = getPermutations(remaining);

    for (const perm of remainingPermutations) {
      result.push([current, ...perm]);
    }
  }

  return result;
};

/**
 * 生成运算符组合
 */
export const generateOperatorCombinations = (length: number): string[][] => {
  const operators = getOperators();
  const result: string[][] = [];

  function generate(current: string[]): void {
    if (current.length === length) {
      result.push([...current]);
      return;
    }

    for (const op of operators) {
      current.push(op);
      generate(current);
      current.pop();
    }
  }

  generate([]);

  return result;
};

/**
 * 从数组计算表达式
 */
export const calculateFromArray = (numbers: number[], operators: string[]): number => {
  if (numbers.length !== operators.length + 1) return NaN;

  let result = numbers[0];

  for (let i = 0; i < operators.length; i++) {
    const op = operators[i];
    const nextNum = numbers[i + 1];

    const operation = OPERATORS[op as keyof typeof OPERATORS];
    if (!operation) return NaN;

    result = operation.calculate(result, nextNum);

    if (isNaN(result) || !isFinite(result)) {
      return NaN;
    }
  }

  return result;
};

/**
 * 生成题目哈希
 */
export const generateQuestionHash = (numbers: number[]): string => {
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  return sortedNumbers.join(',');
};

/**
 * 验证题目数据
 */
export const validateQuestion = (question: QuestionData): boolean => {
  return (
    Array.isArray(question.numbers) &&
    question.numbers.length === 4 &&
    question.numbers.every(n => typeof n === 'number' && n >= 1 && n <= 13) &&
    typeof question.difficulty === 'number' &&
    question.difficulty >= 1 && question.difficulty <= 5 &&
    typeof question.solutionCount === 'number' &&
    question.solutionCount >= 0 &&
    typeof question.hash === 'string' &&
    question.hash === generateQuestionHash(question.numbers)
  );
};

/**
 * 生成提示
 */
export const generateHint = (numbers: number[]): string => {
  const solutions: string[] = [];
  const operators = getOperators();

  // 寻找一个简单的解法作为提示
  const numberPermutations = getPermutations(numbers);
  const operatorCombinations = generateOperatorCombinations(3);

  for (const numPerm of numberPermutations) {
    for (const opComb of operatorCombinations) {
      const result = calculateFromArray(numPerm, opComb);
      if (Math.abs(result - 24) < 0.001) {
        solutions.push(`${numPerm[0]} ${opComb[0]} ${numPerm[1]} ${opComb[1]} ${numPerm[2]} ${opComb[2]} ${numPerm[3]}`);
      }
    }

    if (solutions.length > 0) break; // 找到一个解法就够了
  }

  if (solutions.length === 0) {
    return '这组数字可能无解，试试换个题目吧！';
  }

  const solution = solutions[0];

  // 给出部分提示而不是完整答案
  const parts = solution.split(' ');
  const hint = parts.slice(0, 3).join(' ') + ' ... = 24';

  return `试试看：${hint}`;
};

/**
 * 预生成所有可能的题目（1-13的数字组合）
 */
export const pregenerateAllQuestions = async (): Promise<QuestionData[]> => {
  const questions: QuestionData[] = [];

  // 生成1-13的所有4数组合（允许重复，考虑顺序的等价性）
  for (let a = 1; a <= 13; a++) {
    for (let b = a; b <= 13; b++) {
      for (let c = b; c <= 13; c++) {
        for (let d = c; d <= 13; d++) {
          const numbers = [a, b, c, d];

          // 只包含有解的题目
          if (hasSolution(numbers)) {
            const question = {
              numbers,
              difficulty: calculateDifficulty(numbers),
              solutionCount: countSolutions(numbers),
              hash: generateQuestionHash(numbers)
            };

            questions.push(question);
          }
        }
      }
    }
  }

  return questions;
};