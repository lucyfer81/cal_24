import React from 'react';
import { CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '~/utils/cn';

interface GameResultProps {
  expression: string;
  result: number;
  isCorrect: boolean;
  steps?: string[];
  onReset?: () => void;
  className?: string;
}

export function GameResult({
  expression,
  result,
  isCorrect,
  steps = [],
  onReset,
  className
}: GameResultProps) {
  const getStatusIcon = () => {
    if (isCorrect) {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    } else if (isNaN(result) || !isFinite(result)) {
      return <AlertCircle className="w-6 h-6 text-red-500" />;
    } else {
      return <XCircle className="w-6 h-6 text-red-500" />;
    }
  };

  const getStatusMessage = () => {
    if (isCorrect) {
      return '🎉 恭喜！答对了！';
    } else if (isNaN(result) || !isFinite(result)) {
      return '❌ 表达式无效，请检查你的输入';
    } else {
      return '🤔 继续努力！调整一下运算顺序';
    }
  };

  const getStatusColor = () => {
    if (isCorrect) {
      return 'text-green-600 bg-green-50 border-green-200';
    } else if (isNaN(result) || !isFinite(result)) {
      return 'text-red-600 bg-red-50 border-red-200';
    } else {
      return 'text-orange-600 bg-orange-50 border-orange-200';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 当前表达式 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-3">当前表达式</h3>
        <div className="text-xl md:text-2xl font-mono font-bold text-center py-3 px-4 bg-gray-50 rounded-lg">
          {expression || '请构建表达式...'}
        </div>
      </div>

      {/* 计算结果 */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">计算结果:</span>
            <span className="text-2xl font-bold font-mono">
              {isNaN(result) ? '无效' : result}
            </span>
            <span className="text-lg text-gray-500">=</span>
            <span className="text-2xl font-bold text-blue-600">24</span>
          </div>
          {getStatusIcon()}
        </div>

        {/* 状态信息 */}
        <div className={cn(
          'text-center p-3 rounded-lg border',
          getStatusColor()
        )}>
          <p className="font-medium">{getStatusMessage()}</p>
        </div>
      </div>

      {/* 计算步骤 */}
      {steps.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-3">计算步骤</h3>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className="text-sm md:text-base font-mono bg-gray-50 p-2 rounded"
              >
                步骤 {index + 1}: {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 重置按钮 */}
      {onReset && !isCorrect && (
        <div className="text-center">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <RotateCcw className="w-4 h-4" />
            重新开始
          </button>
        </div>
      )}

      {/* 成功庆祝 */}
      {isCorrect && (
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">🎯</div>
          <div className="text-lg font-medium text-green-600">
            太棒了！你成功解决了这道题目！
          </div>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors duration-200"
          >
            🎲 挑战新题目
          </button>
        </div>
      )}
    </div>
  );
}