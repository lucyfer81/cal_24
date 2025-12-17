import type { GameSolution, Question } from '../types/game';

let solutionsData: GameSolution | null = null;
let questionCache: Question[] = [];
let hashToQuestionMap = new Map<string, Question>();

/**
 * 加载解决方案数据
 */
// 导入解决方案数据
import solutionsDataRaw from '../../public/game24_solutions.json';

export async function loadSolutions(): Promise<void> {
  if (solutionsData) return;

  try {
    // 直接导入JSON数据
    solutionsData = solutionsDataRaw as GameSolution;
    buildCache();
    console.log(`已加载 ${solutionsData.total_solved_combinations} 个题目组合`);
  } catch (error) {
    console.error('Error loading solutions:', error);
    // 如果加载失败，使用空数据
    solutionsData = {
      target: 24,
      total_solved_combinations: 0,
      solutions: {}
    };
    console.warn('使用空数据集，请确保JSON文件已正确导入');
  }
}

/**
 * 构建缓存数据结构
 */
function buildCache(): void {
  if (!solutionsData) return;

  questionCache = [];
  hashToQuestionMap.clear();

  for (const [numbersStr, solutions] of Object.entries(solutionsData.solutions)) {
    const numbers = numbersStr.split(',').map(n => parseInt(n, 10));
    const difficulty = calculateDifficulty(numbers, solutions.length);

    const question: Question = {
      numbers,
      hash: numbersStr,
      difficulty,
      solutions
    };

    questionCache.push(question);
    hashToQuestionMap.set(numbersStr, question);
  }

  // 按难度排序，便于后续筛选
  questionCache.sort((a, b) => a.difficulty - b.difficulty);
}

/**
 * 计算题目难度
 */
function calculateDifficulty(numbers: number[], solutionCount: number): number {
  // 基础难度
  let difficulty = 1;

  // 根据解的数量调整难度
  if (solutionCount <= 2) {
    difficulty = 3;
  } else if (solutionCount <= 5) {
    difficulty = 2;
  }

  // 根据大数字数量调整难度
  const largeNumbers = numbers.filter(n => n > 10).length;
  if (largeNumbers >= 2) {
    difficulty += 1;
  }

  // 根据重复数字调整难度
  const uniqueNumbers = new Set(numbers).size;
  if (uniqueNumbers <= 2) {
    difficulty += 1;
  }

  return Math.min(difficulty, 5);
}

/**
 * 获取所有题目
 */
export function getAllQuestions(): Question[] {
  return [...questionCache];
}

/**
 * 根据哈希获取题目
 */
export function getQuestionByHash(hash: string): Question | undefined {
  return hashToQuestionMap.get(hash);
}

/**
 * 根据难度获取题目
 */
export function getQuestionsByDifficulty(minDifficulty: number = 1, maxDifficulty: number = 3): Question[] {
  return questionCache.filter(q =>
    q.difficulty >= minDifficulty && q.difficulty <= maxDifficulty
  );
}

/**
 * 验证表达式是否正确
 */
export function validateExpression(numbers: number[], expression: string): { valid: boolean; error?: string; details?: any } {
  try {
    console.log(`[DEBUG] 验证表达式: "${expression}"`, `目标数字: [${numbers}]`);

    // 移除空格
    const cleanExpression = expression.replace(/\s/g, '');
    console.log(`[DEBUG] 清理后表达式: "${cleanExpression}"`);

    // 简单验证：确保表达式包含所有数字
    const expressionNumbers = cleanExpression.match(/\d+/g)?.map(n => parseInt(n, 10)) || [];
    console.log(`[DEBUG] 表达式中提取的数字: [${expressionNumbers}]`);

    // 检查数字是否匹配（允许重复）
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    const sortedExprNumbers = [...expressionNumbers].sort((a, b) => a - b);

    console.log(`[DEBUG] 排序后目标数字: [${sortedNumbers}]`);
    console.log(`[DEBUG] 排序后表达式数字: [${sortedExprNumbers}]`);

    if (sortedNumbers.length !== sortedExprNumbers.length) {
      const error = `数字数量不匹配: 需要${sortedNumbers.length}个，找到${sortedExprNumbers.length}个`;
      console.log(`[DEBUG] ${error}`);
      return { valid: false, error, details: { expected: sortedNumbers, actual: sortedExprNumbers } };
    }

    for (let i = 0; i < sortedNumbers.length; i++) {
      if (sortedNumbers[i] !== sortedExprNumbers[i]) {
        const error = `数字不匹配: 位置${i}，期望${sortedNumbers[i]}，实际${sortedExprNumbers[i]}`;
        console.log(`[DEBUG] ${error}`);
        return { valid: false, error, details: { expected: sortedNumbers, actual: sortedExprNumbers } };
      }
    }

    // 计算表达式结果
    console.log(`[DEBUG] 开始计算表达式结果...`);
    const result = evaluateExpression(cleanExpression);
    console.log(`[DEBUG] 表达式计算结果: ${result}`);

    if (Math.abs(result - 24) < 0.001) {
      console.log(`[DEBUG] ✅ 验证通过！结果等于24`);
      return { valid: true };
    } else {
      const error = `计算结果不等于24: 结果为${result}`;
      console.log(`[DEBUG] ❌ ${error}`);
      return { valid: false, error, details: { result } };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.log(`[DEBUG] ❌ 表达式验证异常: ${errorMessage}`);
    return { valid: false, error: `表达式计算异常: ${errorMessage}` };
  }
}

/**
 * 计算表达式结果
 */
function evaluateExpression(expression: string): number {
  console.log(`[DEBUG] 计算表达式: "${expression}"`);

  // 使用安全的表达式计算器（不支持Function构造器）
  try {
    // 只允许数字、基本运算符和括号
    if (!/^[0-9+\-*/()]+$/.test(expression)) {
      const error = `表达式包含非法字符: "${expression}"`;
      console.log(`[DEBUG] ${error}`);
      throw new Error(error);
    }

    console.log(`[DEBUG] 表达式格式验证通过，开始计算...`);

    // 使用递归下降解析器计算表达式
    const result = evaluateWithParser(expression);
    console.log(`[DEBUG] 解析器计算完成，结果: ${result}`);

    if (typeof result !== 'number' || !isFinite(result)) {
      const error = `计算结果无效: ${result}`;
      console.log(`[DEBUG] ${error}`);
      throw new Error(error);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '计算表达式失败';
    console.log(`[DEBUG] 计算异常: ${errorMessage}`);
    throw new Error(errorMessage);
  }
}

/**
 * 简单的表达式解析器
 */
function evaluateWithParser(expression: string): number {
  console.log(`[DEBUG] 使用解析器计算: "${expression}"`);

  // 移除所有空格
  expression = expression.replace(/\s/g, '');

  const tokens = tokenize(expression);
  console.log(`[DEBUG] Token化结果:`, tokens);

  let index = 0;

  function parseExpression(): number {
    let result = parseTerm();

    while (index < tokens.length && (tokens[index] === '+' || tokens[index] === '-')) {
      const operator = tokens[index++];
      const right = parseTerm();

      if (operator === '+') {
        result += right;
      } else {
        result -= right;
      }
    }

    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();

    while (index < tokens.length && (tokens[index] === '*' || tokens[index] === '/')) {
      const operator = tokens[index++];
      const right = parseFactor();

      if (operator === '*') {
        result *= right;
      } else {
        if (right === 0) {
          throw new Error('除零错误');
        }
        result /= right;
      }
    }

    return result;
  }

  function parseFactor(): number {
    const token = tokens[index];

    if (token === '(') {
      index++; // 跳过 '('
      const result = parseExpression();
      if (tokens[index] !== ')') {
        throw new Error('缺少右括号');
      }
      index++; // 跳过 ')'
      return result;
    } else if (typeof token === 'number') {
      index++;
      return token;
    } else if (token === '-') {
      index++; // 跳过负号
      return -parseFactor();
    } else {
      throw new Error(`意外的token: ${token}`);
    }
  }

  const result = parseExpression();

  // 确保所有tokens都被处理
  if (index !== tokens.length) {
    throw new Error(`表达式解析不完整，剩余tokens: ${tokens.slice(index)}`);
  }

  return result;
}

/**
 * 将表达式转换为tokens
 */
function tokenize(expression: string): (string | number)[] {
  const tokens: (string | number)[] = [];
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    if (/\d/.test(char)) {
      // 解析数字
      let numStr = '';
      while (i < expression.length && /\d/.test(expression[i])) {
        numStr += expression[i++];
      }
      tokens.push(parseInt(numStr, 10));
    } else if ('+-*/()'.includes(char)) {
      tokens.push(char);
      i++;
    } else {
      throw new Error(`无效字符: ${char}`);
    }
  }

  return tokens;
}

/**
 * 获取题目提示
 */
export function generateHint(numbers: number[]): string {
  const hash = numbers.sort((a, b) => a - b).join(',');
  const question = getQuestionByHash(hash);

  if (!question || question.solutions.length === 0) {
    return "仔细观察这些数字，试着找出它们之间的关系。";
  }

  const solution = question.solutions[0];

  // 简单的提示策略
  if (solution.includes('*') && solution.includes('+')) {
    return "试试先用加法，再用乘法。";
  } else if (solution.includes('*') && solution.includes('-')) {
    return "试试先用减法，再用乘法。";
  } else if (solution.includes('/')) {
    return "可能需要用到除法。";
  } else {
    return "试试不同的运算顺序。";
  }
}

/**
 * 检查是否有解决方案
 */
export function hasSolution(numbers: number[]): boolean {
  const hash = numbers.sort((a, b) => a - b).join(',');
  const question = getQuestionByHash(hash);
  return question !== undefined && question.solutions.length > 0;
}

/**
 * 获取解决方案数量
 */
export function getSolutionCount(numbers: number[]): number {
  const hash = numbers.sort((a, b) => a - b).join(',');
  const question = getQuestionByHash(hash);
  return question ? question.solutions.length : 0;
}