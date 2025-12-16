/**
 * 24点游戏核心逻辑
 * 包括计算引擎、题目生成、解法验证等
 */

export interface GameCard {
  id: string;
  value: number | string;
  type: 'number' | 'operator';
  originalIndex?: number;
}

export interface GameResult {
  result: number;
  expression: string;
  isCorrect: boolean;
  steps?: string[];
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
 * 简化计算引擎 - 按从左到右顺序计算
 */
export const calculateExpression = (cards: GameCard[]): GameResult => {
  if (cards.length === 0) {
    return { result: 0, expression: '', isCorrect: false };
  }

  const expression: string[] = [];
  const steps: string[] = [];

  // 验证卡片序列的有效性
  if (!isValidCardSequence(cards)) {
    return { result: NaN, expression: '', isCorrect: false };
  }

  // 提取数字和运算符
  const numbers: number[] = [];
  const operators: string[] = [];

  cards.forEach(card => {
    if (card.type === 'number') {
      numbers.push(card.value as number);
      expression.push(card.value.toString());
    } else if (card.type === 'operator') {
      operators.push(card.value as string);
      expression.push(card.value as string);
    }
  });

  // 按从左到右顺序计算
  let result = numbers[0] || 0;
  steps.push(`${result}`);

  for (let i = 0; i < operators.length && i + 1 < numbers.length; i++) {
    const operator = operators[i];
    const nextNumber = numbers[i + 1];

    if (isNaN(nextNumber)) {
      return { result: NaN, expression: expression.join(' '), isCorrect: false };
    }

    const operation = OPERATORS[operator as keyof typeof OPERATORS];
    if (!operation) {
      return { result: NaN, expression: expression.join(' '), isCorrect: false };
    }

    const prevResult = result;
    result = operation.calculate(prevResult, nextNumber);

    steps.push(`${prevResult} ${operator} ${nextNumber} = ${result}`);
  }

  const isCorrect = Math.abs(result - 24) < 0.001;

  return {
    result: Math.round(result * 100) / 100, // 保留两位小数
    expression: expression.join(' '),
    isCorrect,
    steps
  };
};

/**
 * 验证卡片序列是否有效
 */
export const isValidCardSequence = (cards: GameCard[]): boolean => {
  if (cards.length === 0) return false;

  // 必须以数字开头
  if (cards[0].type !== 'number') return false;

  // 检查序列：数字 -> 运算符 -> 数字 -> 运算符 ...
  let expectingNumber = true;

  for (const card of cards) {
    if (expectingNumber && card.type !== 'number') {
      return false;
    }
    if (!expectingNumber && card.type !== 'operator') {
      return false;
    }
    expectingNumber = !expectingNumber;
  }

  // 必须以数字结尾
  return cards[cards.length - 1].type === 'number';
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