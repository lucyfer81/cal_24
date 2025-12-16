/**
 * 设备指纹生成和管理
 * 用于匿名用户识别和去重
 */

export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  colorDepth: number;
  timezone: string;
  language: string;
  platform: string;
  canvasSignature: string;
  webglSignature: string;
  fonts: string[];
}

export interface UserInfo {
  deviceId: string;
  nickname: string;
  fingerprint: DeviceFingerprint;
  isNewUser: boolean;
}

const STORAGE_KEYS = {
  DEVICE_ID: 'game24_device_id',
  NICKNAME: 'game24_nickname',
  FINGERPRINT: 'game24_fingerprint'
};

/**
 * 生成设备指纹
 */
export const generateDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
  const fingerprint: DeviceFingerprint = {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    canvasSignature: getCanvasFingerprint(),
    webglSignature: getWebGLFingerprint(),
    fonts: getFontFingerprint()
  };

  return fingerprint;
};

/**
 * 获取Canvas指纹
 */
export const getCanvasFingerprint = (): string => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    // 绘制特定图案生成指纹
    canvas.width = 200;
    canvas.height = 50;

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.fillText('Game24 🎯', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Device Fingerprint', 4, 30);

    return canvas.toDataURL().slice(-50); // 只取后50个字符
  } catch (error) {
    return 'canvas-error';
  }
};

/**
 * 获取WebGL指纹
 */
export const getWebGLFingerprint = (): string => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return 'no-webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'webgl-no-debug-info';

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    return `${vendor}|${renderer}`.slice(0, 100);
  } catch (error) {
    return 'webgl-error';
  }
};

/**
 * 获取字体指纹
 */
export const getFontFingerprint = (): string[] => {
  try {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return ['no-canvas'];

    const widths: { [key: string]: number } = {};

    // 测量基准字体宽度
    baseFonts.forEach(font => {
      ctx.font = `${testSize} ${font}`;
      widths[font] = ctx.measureText(testString).width;
    });

    // 检测常见字体
    const detectFonts = [
      'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Georgia',
      'Helvetica', 'Impact', 'Times New Roman', 'Trebuchet MS', 'Verdana'
    ];

    const detectedFonts: string[] = [];

    detectFonts.forEach(font => {
      let detected = false;

      baseFonts.forEach(baseFont => {
        ctx.font = `${testSize} '${font}', ${baseFont}`;
        const width = ctx.measureText(testString).width;

        if (width !== widths[baseFont]) {
          detected = true;
        }
      });

      if (detected) {
        detectedFonts.push(font);
      }
    });

    return detectedFonts;
  } catch (error) {
    return ['font-error'];
  }
};

/**
 * 生成设备ID哈希
 */
export const generateDeviceHash = async (fingerprint: DeviceFingerprint): Promise<string> => {
  const data = JSON.stringify(fingerprint, Object.keys(fingerprint).sort());

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
};

/**
 * 获取或创建用户信息
 */
export const getUserInfo = async (): Promise<UserInfo> => {
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  let nickname = localStorage.getItem(STORAGE_KEYS.NICKNAME);
  let fingerprint: DeviceFingerprint | null = null;

  // 检查存储的指纹是否仍然有效
  const storedFingerprint = localStorage.getItem(STORAGE_KEYS.FINGERPRINT);
  if (storedFingerprint) {
    try {
      fingerprint = JSON.parse(storedFingerprint);
    } catch {
      fingerprint = null;
    }
  }

  // 如果没有指纹或指纹无效，重新生成
  if (!fingerprint) {
    fingerprint = await generateDeviceFingerprint();
    const newDeviceId = await generateDeviceHash(fingerprint);

    // 生成新昵称
    if (!nickname) {
      nickname = `玩家${newDeviceId.slice(-6).toUpperCase()}`;
    }

    // 存储新信息
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, newDeviceId);
    localStorage.setItem(STORAGE_KEYS.NICKNAME, nickname);
    localStorage.setItem(STORAGE_KEYS.FINGERPRINT, JSON.stringify(fingerprint));

    return {
      deviceId: newDeviceId,
      nickname: nickname || `玩家${newDeviceId.slice(-6).toUpperCase()}`,
      fingerprint,
      isNewUser: true
    };
  }

  // 验证当前设备指纹是否匹配存储的指纹
  const currentFingerprint = await generateDeviceFingerprint();
  const currentDeviceId = await generateDeviceHash(currentFingerprint);

  if (deviceId !== currentDeviceId) {
    // 设备指纹不匹配，可能是不同设备或浏览器配置改变
    console.warn('Device fingerprint changed, updating...');

    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, currentDeviceId);
    localStorage.setItem(STORAGE_KEYS.FINGERPRINT, JSON.stringify(currentFingerprint));

    return {
      deviceId: currentDeviceId,
      nickname: nickname || `玩家${currentDeviceId.slice(-6).toUpperCase()}`,
      fingerprint: currentFingerprint,
      isNewUser: false
    };
  }

  return {
    deviceId: deviceId!,
    nickname: nickname || `玩家${deviceId!.slice(-6).toUpperCase()}`,
    fingerprint,
    isNewUser: false
  };
};

/**
 * 更新用户昵称
 */
export const updateNickname = (newNickname: string): void => {
  if (!newNickname || newNickname.trim().length === 0) {
    throw new Error('昵称不能为空');
  }

  if (newNickname.length > 20) {
    throw new Error('昵称不能超过20个字符');
  }

  const trimmedNickname = newNickname.trim();
  localStorage.setItem(STORAGE_KEYS.NICKNAME, trimmedNickname);
};

/**
 * 清除用户数据
 */
export const clearUserData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

/**
 * 获取设备概要信息（用于调试）
 */
export const getDeviceSummary = async (): Promise<string> => {
  const fingerprint = await generateDeviceFingerprint();
  return `${fingerprint.platform} | ${fingerprint.screenResolution} | ${fingerprint.language}`;
};