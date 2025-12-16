import React, { useState, useEffect, useCallback } from 'react';
import { GameBoard } from './GameBoard';
import { GameResult } from './GameResult';
import { getUserInfo, updateNickname, type UserInfo } from '../utils/deviceFingerprint';
import { generateQuestionHash, type QuestionData } from '../utils/gameLogic';
import { getCountryFlag, getCountryName, formatTime } from '../utils/cn';
import { Dices, Trophy, Clock, User, RefreshCw, Lightbulb, Edit2 } from 'lucide-react';

interface GameProps {
  env?: {
    DATABASE?: any;
    ENVIRONMENT?: string;
  };
}

export function Game({ env }: GameProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameResult, setGameResult] = useState<{
    expression: string;
    result: number;
    isCorrect: boolean;
  } | null>(null);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [hint, setHint] = useState<string>('');
  const [showHint, setShowHint] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [countryCode, setCountryCode] = useState<string>('Unknown');

  // 初始化用户信息
  useEffect(() => {
    const initUser = async () => {
      try {
        const info = await getUserInfo();
        setUserInfo(info);
        setNicknameInput(info.nickname);

        if (info.isNewUser) {
          setShowNicknameModal(true);
        }

        // 获取用户统计
        await fetchUserStats(info.deviceId);
      } catch (error) {
        console.error('初始化用户失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initUser();
  }, []);

  // 获取用户统计
  const fetchUserStats = async (deviceId: string) => {
    try {
      const response = await fetch('/api/user/stats', {
        headers: {
          'X-Device-ID': deviceId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('获取用户统计失败:', error);
    }
  };

  // 获取下一题
  const fetchNextQuestion = useCallback(async () => {
    if (!userInfo) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/question/next', {
        headers: {
          'X-Device-ID': userInfo.deviceId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuestion({
          numbers: data.numbers,
          difficulty: data.difficulty,
          solutionCount: 0,
          hash: generateQuestionHash(data.numbers)
        });
        setHint(data.hint || '');
        setCountryCode(data.countryCode || 'Unknown');
        setGameStartTime(Date.now());
        setGameResult(null);
        setShowHint(false);
      } else {
        console.error('获取题目失败');
      }
    } catch (error) {
      console.error('获取题目失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userInfo]);

  // 处理游戏结果
  const handleGameResult = useCallback(async (result: {
    expression: string;
    result: number;
    isCorrect: boolean;
  }) => {
    setGameResult(result);

    if (!userInfo || !question) return;

    const timeSpent = Math.floor((Date.now() - gameStartTime) / 1000);

    try {
      const response = await fetch('/api/game/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': userInfo.deviceId,
        },
        body: JSON.stringify({
          questionHash: question.hash,
          numbers: question.numbers,
          expression: result.expression,
          result: result.result,
          isCorrect: result.isCorrect,
          timeSpent,
          nickname: userInfo.nickname,
        }),
      });

      if (response.ok && result.isCorrect) {
        await fetchUserStats(userInfo.deviceId);
      }
    } catch (error) {
      console.error('提交结果失败:', error);
    }
  }, [userInfo, question, gameStartTime]);

  // 更新昵称
  const handleNicknameUpdate = async () => {
    if (!nicknameInput.trim()) return;

    try {
      updateNickname(nicknameInput.trim());
      setUserInfo(prev => prev ? { ...prev, nickname: nicknameInput.trim() } : null);
      setShowNicknameModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : '更新昵称失败');
    }
  };

  // 获取提示
  const handleShowHint = () => {
    setShowHint(true);
  };

  // 重置游戏
  const handleReset = () => {
    setGameResult(null);
  };

  // 新游戏
  const handleNewGame = () => {
    fetchNextQuestion();
  };

  // 加载第一道题
  useEffect(() => {
    if (userInfo && !question) {
      fetchNextQuestion();
    }
  }, [userInfo, question, fetchNextQuestion]);

  if (isLoading || !userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* 头部信息栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-6">
              {/* 用户信息 */}
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium">{userInfo.nickname}</span>
                <button
                  onClick={() => setShowNicknameModal(true)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {/* 地理位置信息 */}
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getCountryFlag(countryCode)}</span>
                <span className="text-sm text-gray-600">
                  {getCountryName(countryCode)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* 游戏统计 */}
              {userStats?.stats && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span>{userStats.stats.games_won || 0}胜</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>
                      最佳: {userStats.stats.best_time ? formatTime(userStats.stats.best_time) : '--'}
                    </span>
                  </div>
                </div>
              )}

              {/* 游戏标题 */}
              <h1 className="text-xl font-bold text-gray-800">
                🎯 24点挑战
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* 主要游戏区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 左侧：游戏板 */}
          <div className="lg:col-span-2">
            {question ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">游戏板</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleShowHint}
                      className="flex items-center space-x-1 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <Lightbulb className="w-4 h-4" />
                      <span className="hidden sm:inline">提示</span>
                    </button>
                    <button
                      onClick={handleNewGame}
                      className="flex items-center space-x-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <Dices className="w-4 h-4" />
                      <span className="hidden sm:inline">新题目</span>
                    </button>
                  </div>
                </div>

                {/* 提示显示 */}
                {showHint && hint && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      💡 {hint}
                    </p>
                  </div>
                )}

                {/* 游戏板 */}
                <GameBoard
                  numbers={question.numbers}
                  onResult={handleGameResult}
                />

                {/* 游戏结果 */}
                {gameResult && (
                  <div className="mt-6">
                    <GameResult
                      expression={gameResult.expression}
                      result={gameResult.result}
                      isCorrect={gameResult.isCorrect}
                      onReset={gameResult.isCorrect ? handleNewGame : handleReset}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <Dices className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">准备开始新游戏...</p>
                <button
                  onClick={handleNewGame}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  开始游戏
                </button>
              </div>
            )}
          </div>

          {/* 右侧：排行榜 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span>排行榜</span>
              </h2>

              <Leaderboard countryCode={countryCode} />
            </div>
          </div>
        </div>
      </main>

      {/* 昵称编辑模态框 */}
      {showNicknameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">设置昵称</h3>
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="请输入你的昵称"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={20}
            />
            <div className="mt-2 text-sm text-gray-500">
              {nicknameInput.length}/20 字符
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleNicknameUpdate}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                确定
              </button>
              <button
                onClick={() => setShowNicknameModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 排行榜组件
function Leaderboard({ countryCode }: { countryCode: string }) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [countryCode]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/leaderboard?country=${countryCode}`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('获取排行榜失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leaderboard.length === 0 ? (
        <p className="text-center text-gray-500 py-8">暂无排行榜数据</p>
      ) : (
        leaderboard.map((player, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-bold">
                {index + 1}
              </div>
              <div>
                <div className="font-medium">{player.nickname}</div>
                <div className="text-xs text-gray-500">
                  {getCountryFlag(player.country)} {getCountryName(player.country)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">{player.games_won}胜</div>
              <div className="text-xs text-gray-500">
                胜率 {player.win_rate}%
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}