import { useState, useEffect } from 'react';
import { Clock, Settings, CheckCircle, Power, RefreshCw, Calendar, AlertCircle } from 'lucide-react';
import { getAutoSyncConfig, updateAutoSyncConfig } from '../lib/api';

interface AutoSyncConfig {
  enabled: boolean;
  cronExpr: string;
  timezone: string;
}

interface SchedulerStatus {
  isRunning: boolean;
  isSyncing: boolean;
}

export function AutoSyncConfig() {
  const [config, setConfig] = useState<AutoSyncConfig>({
    enabled: false,
    cronExpr: '0 2 * * *',
    timezone: 'Asia/Shanghai'
  });
  const [status, setStatus] = useState<SchedulerStatus>({
    isRunning: false,
    isSyncing: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ cronExpr: '', timezone: '' });

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const response = await getAutoSyncConfig();
      setConfig(response.data.config);
      setStatus(response.data.status);
      setEditForm({
        cronExpr: response.data.config.cronExpr,
        timezone: response.data.config.timezone
      });
    } catch (err) {
      console.error('加载配置失败:', err);
      setError('加载配置失败');
    }
  }

  async function handleToggle(newEnabled: boolean) {
    setLoading(true);
    setError(null);

    try {
      const response = await updateAutoSyncConfig({ enabled: newEnabled });
      setConfig(response.data.config);
      setStatus(response.data.status);
    } catch (err) {
      console.error('更新配置失败:', err);
      setError('更新配置失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig() {
    setLoading(true);
    setError(null);

    try {
      const response = await updateAutoSyncConfig(editForm);
      setConfig(response.data.config);
      setStatus(response.data.status);
      setIsEditing(false);
    } catch (err) {
      console.error('更新配置失败:', err);
      setError('更新配置失败');
    } finally {
      setLoading(false);
    }
  }

  function getCronDescription(cronExpr: string): string {
    const descriptions: Record<string, string> = {
      '0 2 * * *': '每天凌晨 2 点',
      '0 */1 * * *': '每小时整点',
      '0 */2 * * *': '每 2 小时',
      '0 */6 * * *': '每 6 小时',
      '0 0 * * *': '每天凌晨 0 点',
      '0 1 * * *': '每天凌晨 1 点',
      '0 3 * * *': '每天凌晨 3 点'
    };
    return descriptions[cronExpr] || cronExpr;
  }

  return (
    <div className="card-modern">
      <div className="card-compact">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
              config.enabled
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30'
                : 'bg-gradient-to-br from-gray-400 to-gray-500'
            }`}>
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">自动同步</h2>
              <p className="text-xs text-gray-500">定时保持数据最新</p>
            </div>
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              disabled={loading}
            >
              <Settings size={14} />
              <span>配置</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {isEditing ? (
          // 编辑模式
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cron 表达式
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  value={editForm.cronExpr}
                  onChange={(e) => setEditForm({ ...editForm, cronExpr: e.target.value })}
                >
                  <option value="0 0 * * *">每天凌晨 0 点</option>
                  <option value="0 1 * * *">每天凌晨 1 点</option>
                  <option value="0 2 * * *">每天凌晨 2 点</option>
                  <option value="0 3 * * *">每天凌晨 3 点</option>
                  <option value="0 */1 * * *">每小时整点</option>
                  <option value="0 */2 * * *">每 2 小时</option>
                  <option value="0 */6 * * *">每 6 小时</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  当前: {getCronDescription(editForm.cronExpr)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  时区
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  value={editForm.timezone}
                  onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                >
                  <option value="Asia/Shanghai">Asia/Shanghai (北京时间)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (东京时间)</option>
                  <option value="America/New_York">America/New_York (纽约时间)</option>
                  <option value="Europe/London">Europe/London (伦敦时间)</option>
                  <option value="UTC">UTC (协调世界时)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveConfig}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '保存中...' : '保存配置'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({ cronExpr: config.cronExpr, timezone: config.timezone });
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          // 显示模式
          <div className="space-y-4">
            <div className={`p-4 rounded-lg transition-all duration-300 ${
              config.enabled
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200'
                : 'bg-gray-50 border-2 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {status.isRunning ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : (
                    <Power size={20} className="text-gray-400" />
                  )}
                  <span className={`text-sm font-medium ${status.isRunning ? 'text-green-700' : 'text-gray-600'}`}>
                    {status.isRunning ? '定时器运行中' : '定时器已停止'}
                  </span>
                </div>

                {status.isSyncing && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <RefreshCw size={14} className="animate-spin" />
                    <span className="text-xs">同步中</span>
                  </div>
                )}
              </div>

              {config.enabled && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock size={14} />
                    <span>规则: {getCronDescription(config.cronExpr)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar size={14} />
                    <span>时区: {config.timezone}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {config.enabled ? (
                <button
                  onClick={() => handleToggle(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Power size={16} />
                  {loading ? '停止中...' : '停止自动同步'}
                </button>
              ) : (
                <button
                  onClick={() => handleToggle(true)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 btn-gradient-primary hover:shadow-lg rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Power size={16} />
                  {loading ? '启动中...' : '启动自动同步'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
