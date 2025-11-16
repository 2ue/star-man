import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, Calendar, Power, AlertCircle, CheckCircle } from 'lucide-react';
import { getAutoSyncConfig, updateAutoSyncConfig } from '../lib/api';

interface SchedulerStatus {
  isRunning: boolean;
  isSyncing: boolean;
}

interface CronSchedule {
  id: string;
  expression: string;
  description: string;
}

interface AutoSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CRON_PRESETS = [
  { value: '0 0 * * *', label: '每天凌晨 0 点' },
  { value: '0 1 * * *', label: '每天凌晨 1 点' },
  { value: '0 2 * * *', label: '每天凌晨 2 点' },
  { value: '0 3 * * *', label: '每天凌晨 3 点' },
  { value: '0 6 * * *', label: '每天早上 6 点' },
  { value: '0 9 * * *', label: '每天早上 9 点' },
  { value: '0 12 * * *', label: '每天中午 12 点' },
  { value: '0 14 * * *', label: '每天下午 14 点' },
  { value: '0 18 * * *', label: '每天下午 18 点' },
  { value: '0 22 * * *', label: '每天晚上 22 点' },
  { value: '0 */2 * * *', label: '每 2 小时' },
  { value: '0 */4 * * *', label: '每 4 小时' },
  { value: '0 */6 * * *', label: '每 6 小时' },
  { value: 'custom', label: '自定义表达式' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (北京时间)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (东京时间)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (香港时间)' },
  { value: 'America/New_York', label: 'America/New_York (纽约时间)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (洛杉矶时间)' },
  { value: 'Europe/London', label: 'Europe/London (伦敦时间)' },
  { value: 'UTC', label: 'UTC (协调世界时)' },
];

function getCronDescription(expr: string): string {
  const preset = CRON_PRESETS.find(p => p.value === expr);
  return preset ? preset.label : expr;
}

export function AutoSyncModal({ isOpen, onClose, onSuccess }: AutoSyncModalProps) {
  const [status, setStatus] = useState<SchedulerStatus>({
    isRunning: false,
    isSyncing: false
  });
  const [schedules, setSchedules] = useState<CronSchedule[]>([]);
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 重置所有状态（包括表单数据）
      setError(null);
      setSuccess(false);
      setLoading(false);
      // 立即清空表单数据，确保丢弃未保存的更改
      setSchedules([]);
      setTimezone('Asia/Shanghai');
      setEnabled(false);
      // 加载配置
      loadConfig();
    }
  }, [isOpen]);

  async function loadConfig() {
    try {
      setError(null);
      const response = await getAutoSyncConfig();
      const { config: cfg, status: sts } = response.data;

      setStatus(sts);
      setEnabled(cfg.enabled);
      setTimezone(cfg.timezone);

      // 解析多个 cron 表达式
      const cronExprs = cfg.cronExpr
        .split(',')
        .map((expr: string) => expr.trim())
        .filter((expr: string) => expr.length > 0);

      const parsedSchedules: CronSchedule[] = cronExprs.map((expr: string, index: number) => ({
        id: `schedule-${index}-${Date.now()}`,
        expression: expr,
        description: getCronDescription(expr)
      }));

      setSchedules(parsedSchedules.length > 0 ? parsedSchedules : [
        {
          id: `schedule-0-${Date.now()}`,
          expression: '0 2 * * *',
          description: getCronDescription('0 2 * * *')
        }
      ]);
    } catch (err) {
      console.error('加载配置失败:', err);
      setError('加载配置失败');
    }
  }

  function handleAddSchedule() {
    const newSchedule: CronSchedule = {
      id: `schedule-${schedules.length}-${Date.now()}`,
      expression: '0 2 * * *',
      description: getCronDescription('0 2 * * *')
    };
    setSchedules([...schedules, newSchedule]);
  }

  function handleRemoveSchedule(id: string) {
    if (schedules.length <= 1) {
      setError('至少需要保留一个定时任务');
      return;
    }
    setSchedules(schedules.filter(s => s.id !== id));
    setError(null);
  }

  function handleScheduleChange(id: string, expression: string) {
    setSchedules(schedules.map(s =>
      s.id === id
        ? { ...s, expression, description: getCronDescription(expression) }
        : s
    ));
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 合并所有 cron 表达式为逗号分隔的字符串
      const cronExpr = schedules.map(s => s.expression).join(',');

      const response = await updateAutoSyncConfig({
        enabled,
        cronExpr,
        timezone
      });

      setStatus(response.data.status);
      setSuccess(true);

      // 延迟关闭弹窗
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('更新配置失败:', err);
      setError('更新配置失败');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/30">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">自动同步设置</h2>
              <p className="text-xs text-gray-500">配置定时同步任务</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          {status.isRunning && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                定时器运行中 {status.isSyncing && '· 同步中...'}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={16} className="text-red-600" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm text-green-700">配置保存成功</span>
            </div>
          )}

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Power size={20} className={enabled ? 'text-green-600' : 'text-gray-400'} />
              <div>
                <div className="font-medium text-gray-800">启用自动同步</div>
                <div className="text-xs text-gray-500">定时保持数据最新</div>
              </div>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                  enabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Timezone */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar size={16} />
              时区
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONE_OPTIONS.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Schedules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Clock size={16} />
                定时任务 ({schedules.length})
              </label>
              <button
                onClick={handleAddSchedule}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus size={14} />
                添加任务
              </button>
            </div>

            <div className="space-y-3">
              {schedules.map((schedule, index) => {
                const isCustom = schedule.expression === 'custom' || !CRON_PRESETS.find(p => p.value === schedule.expression);
                return (
                  <div
                    key={schedule.id}
                    className="border border-gray-200 rounded-lg hover:border-blue-300 transition-colors p-3"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-lg text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                          value={isCustom ? 'custom' : schedule.expression}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              handleScheduleChange(schedule.id, 'custom');
                            } else {
                              handleScheduleChange(schedule.id, e.target.value);
                            }
                          }}
                        >
                          {CRON_PRESETS.map(preset => (
                            <option key={preset.value} value={preset.value}>
                              {preset.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {schedules.length > 1 && (
                        <button
                          onClick={() => handleRemoveSchedule(schedule.id)}
                          className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除任务"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* 自定义表达式输入 */}
                    {isCustom && (
                      <div className="ml-11">
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm font-mono"
                          placeholder="0 2 * * * (分 时 日 月 周)"
                          value={schedule.expression === 'custom' ? '' : schedule.expression}
                          onChange={(e) => handleScheduleChange(schedule.id, e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          格式: 分 时 日 月 周 (如: 0 2 * * * 表示每天凌晨2点)
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {schedules.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                暂无定时任务，点击"添加任务"创建
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={handleSave}
            disabled={loading || schedules.length === 0}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '保存中...' : '保存配置'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
