import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并Tailwind CSS类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化时间显示
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 生成题目哈希
 */
export function generateQuestionHash(numbers: number[]): string {
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  return sortedNumbers.join(',');
}

/**
 * 获取国家表情符号
 */
export function getCountryFlag(countryCode: string): string {
  const flags: { [key: string]: string } = {
    'CN': '🇨🇳',
    'US': '🇺🇸',
    'JP': '🇯🇵',
    'KR': '🇰🇷',
    'GB': '🇬🇧',
    'DE': '🇩🇪',
    'FR': '🇫🇷',
    'CA': '🇨🇦',
    'AU': '🇦🇺',
    'IN': '🇮🇳',
    'BR': '🇧🇷',
    'RU': '🇷🇺',
    'MX': '🇲🇽',
    'ES': '🇪🇸',
    'IT': '🇮🇹',
    'NL': '🇳🇱',
    'SE': '🇸🇪',
    'NO': '🇳🇴',
    'DK': '🇩🇰',
    'FI': '🇫🇮',
    'CH': '🇨🇭',
    'AT': '🇦🇹',
    'BE': '🇧🇪',
    'PL': '🇵🇱',
    'CZ': '🇨🇿',
    'HU': '🇭🇺',
    'GR': '🇬🇷',
    'PT': '🇵🇹',
    'IE': '🇮🇪',
    'NZ': '🇳🇿',
    'SG': '🇸🇬',
    'TH': '🇹🇭',
    'MY': '🇲🇾',
    'ID': '🇮🇩',
    'PH': '🇵🇭',
    'VN': '🇻🇳',
    'HK': '🇭🇰',
    'TW': '🇹🇼',
    'AR': '🇦🇷',
    'CL': '🇨🇱',
    'CO': '🇨🇴',
    'PE': '🇵🇪',
    'ZA': '🇿🇦',
    'EG': '🇪🇬',
    'TR': '🇹🇷',
    'IL': '🇮🇱',
    'SA': '🇸🇦',
    'AE': '🇦🇪',
    'NG': '🇳🇬',
    'KE': '🇰🇪',
    'PK': '🇵🇰',
    'BD': '🇧🇩',
    'LK': '🇱🇰',
    'NP': '🇳🇵',
    'KH': '🇰🇭',
    'LA': '🇱🇦',
    'MM': '🇲🇲'
  };

  return flags[countryCode] || '🌍';
}

/**
 * 获取国家名称
 */
export function getCountryName(countryCode: string): string {
  const countries: { [key: string]: string } = {
    'CN': '中国',
    'US': '美国',
    'JP': '日本',
    'KR': '韩国',
    'GB': '英国',
    'DE': '德国',
    'FR': '法国',
    'CA': '加拿大',
    'AU': '澳大利亚',
    'IN': '印度',
    'BR': '巴西',
    'RU': '俄罗斯',
    'MX': '墨西哥',
    'ES': '西班牙',
    'IT': '意大利',
    'NL': '荷兰',
    'SE': '瑞典',
    'NO': '挪威',
    'DK': '丹麦',
    'FI': '芬兰',
    'CH': '瑞士',
    'AT': '奥地利',
    'BE': '比利时',
    'PL': '波兰',
    'CZ': '捷克',
    'HU': '匈牙利',
    'GR': '希腊',
    'PT': '葡萄牙',
    'IE': '爱尔兰',
    'NZ': '新西兰',
    'SG': '新加坡',
    'TH': '泰国',
    'MY': '马来西亚',
    'ID': '印度尼西亚',
    'PH': '菲律宾',
    'VN': '越南',
    'HK': '香港',
    'TW': '台湾',
    'AR': '阿根廷',
    'CL': '智利',
    'CO': '哥伦比亚',
    'PE': '秘鲁',
    'ZA': '南非',
    'EG': '埃及',
    'TR': '土耳其',
    'IL': '以色列',
    'SA': '沙特阿拉伯',
    'AE': '阿联酋',
    'NG': '尼日利亚',
    'KE': '肯尼亚',
    'PK': '巴基斯坦',
    'BD': '孟加拉国',
    'LK': '斯里兰卡',
    'NP': '尼泊尔',
    'MM': '缅甸',
    'KH': '柬埔寨',
    'LA': '老挝'
  };

  return countries[countryCode] || '未知';
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 随机打乱数组
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 深拷贝对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }

  if (typeof obj === 'object') {
    const cloned = {} as T;
    Object.keys(obj).forEach(key => {
      cloned[key as keyof T] = deepClone(obj[key as keyof T]);
    });
    return cloned;
  }

  return obj;
}

/**
 * 本地存储工具
 */
export const storage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue || null;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error getting item from localStorage:`, error);
      return defaultValue || null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item to localStorage:`, error);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item from localStorage:`, error);
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error(`Error clearing localStorage:`, error);
    }
  }
};