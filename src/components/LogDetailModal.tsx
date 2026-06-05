import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { OperationLog, OperationLogDetail, OperationType } from '@/types';

interface LogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: OperationLog | null;
}

interface JsonNodeProps {
  data: unknown;
  keyName?: string;
  level?: number;
  isChanged?: boolean;
  changeType?: 'added' | 'removed' | 'modified';
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, keyName, level = 0, isChanged, changeType }) => {
  const [expanded, setExpanded] = useState(true);
  const indent = level * 16;

  const getChangeBg = () => {
    if (!isChanged) return '';
    if (changeType === 'added') return 'bg-green-50';
    if (changeType === 'removed') return 'bg-red-50';
    if (changeType === 'modified') return 'bg-yellow-50';
    return '';
  };

  const renderValue = (value: unknown) => {
    if (value === null) return <span className="text-gray-400">空</span>;
    if (value === undefined) return <span className="text-gray-400">未定义</span>;
    if (typeof value === 'string') return <span className="text-green-600">"{value}"</span>;
    if (typeof value === 'number') return <span className="text-blue-600">{value}</span>;
    if (typeof value === 'boolean') return <span className="text-purple-600">{String(value)}</span>;
    return null;
  };

  const isExpandable = (value: unknown): boolean => {
    return typeof value === 'object' && value !== null;
  };

  const renderKey = () => {
    if (keyName === undefined) return null;
    return (
      <>
        <span className="text-gray-700 font-medium">{keyName}</span>
        <span className="text-gray-400 mx-1">:</span>
      </>
    );
  };

  if (!isExpandable(data)) {
    return (
      <div className={`flex items-start py-1 px-2 rounded ${getChangeBg()}`} style={{ paddingLeft: indent + 8 }}>
        {renderKey()}
        {renderValue(data)}
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const entries: [string, unknown][] = isArray
    ? (data as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(data as Record<string, unknown>);

  return (
    <div className={`rounded ${getChangeBg()}`}>
      <div
        className="flex items-start py-1 px-2 cursor-pointer hover:bg-gray-50 rounded"
        style={{ paddingLeft: indent + 8 }}
        onClick={() => setExpanded(!expanded)}
      >
        {entries.length > 0 && (
          <span className="text-gray-400 mr-1 mt-0.5">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        {renderKey()}
        <span className="text-gray-500">{isArray ? '[' : '{'}</span>
        {entries.length > 0 && !expanded && (
          <span className="text-gray-400 mx-1">
            {isArray ? `${entries.length} 项` : `${entries.length} 个键`}
          </span>
        )}
        {entries.length === 0 && (
          <span className="text-gray-500">{isArray ? ']' : '}'}</span>
        )}
      </div>
      {expanded && entries.length > 0 && (
        <>
          {entries.map(([k, v]) => (
            <JsonNode key={k} data={v} keyName={k} level={level + 1} />
          ))}
          <div className="flex items-start py-1 px-2" style={{ paddingLeft: indent + 8 }}>
            <span className="text-gray-500">{isArray ? ']' : '}'}</span>
          </div>
        </>
      )}
    </div>
  );
};

const ComparisonView: React.FC<{
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changes?: Record<string, { old: unknown; new: unknown }>;
}> = ({ before, after, changes }) => {
  const allKeys = new Set<string>();
  if (before) Object.keys(before).forEach(k => allKeys.add(k));
  if (after) Object.keys(after).forEach(k => allKeys.add(k));

  const changeMap = changes || {};

  const getChangeType = (key: string): 'added' | 'removed' | 'modified' | undefined => {
    if (changeMap[key]) return 'modified';
    if (before && after) {
      if (before[key] !== undefined && after[key] === undefined) return 'removed';
      if (before[key] === undefined && after[key] !== undefined) return 'added';
    }
    return undefined;
  };

  return (
    <div className="space-y-4">
      {changes && Object.keys(changes).length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">变更摘要</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {Object.entries(changes).map(([key, { old: oldVal, new: newVal }]) => (
              <div key={key} className="flex items-start gap-4 py-2 border-b border-gray-100 last:border-0">
                <span className="font-medium text-gray-700 min-w-[120px]">{key}:</span>
                <div className="flex-1 flex items-start gap-3">
                  <div className="flex-1 bg-red-50 px-3 py-2 rounded">
                    <span className="text-xs text-red-600 font-medium">变更前</span>
                    <div className="text-sm text-gray-700">
                      {JSON.stringify(oldVal, null, 2)}
                    </div>
                  </div>
                  <div className="text-gray-400 self-center">→</div>
                  <div className="flex-1 bg-green-50 px-3 py-2 rounded">
                    <span className="text-xs text-green-600 font-medium">变更后</span>
                    <div className="text-sm text-gray-700">
                      {JSON.stringify(newVal, null, 2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {before && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-100 rounded-full border border-red-300"></span>
              变更前
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm max-h-96 overflow-auto">
              {Array.from(allKeys).map(key => {
                const changeType = getChangeType(key);
                return (
                  <div key={key}>
                    {before[key] !== undefined && (
                      <JsonNode
                        data={before[key]}
                        keyName={key}
                        isChanged={changeType === 'removed' || changeType === 'modified'}
                        changeType={changeType === 'removed' ? 'removed' : changeType === 'modified' ? 'modified' : undefined}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {after && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-100 rounded-full border border-green-300"></span>
              变更后
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm max-h-96 overflow-auto">
              {Array.from(allKeys).map(key => {
                const changeType = getChangeType(key);
                return (
                  <div key={key}>
                    {after[key] !== undefined && (
                      <JsonNode
                        data={after[key]}
                        keyName={key}
                        isChanged={changeType === 'added' || changeType === 'modified'}
                        changeType={changeType === 'added' ? 'added' : changeType === 'modified' ? 'modified' : undefined}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const getOperationTypeLabel = (type: OperationType): { label: string; className: string } => {
  switch (type) {
    case 'CREATE':
      return { label: '新增', className: 'bg-green-100 text-green-700' };
    case 'UPDATE':
      return { label: '编辑', className: 'bg-blue-100 text-blue-700' };
    case 'DELETE':
      return { label: '删除', className: 'bg-red-100 text-red-700' };
    default:
      return { label: type, className: 'bg-gray-100 text-gray-700' };
  }
};

const LogDetailModal: React.FC<LogDetailModalProps> = ({ isOpen, onClose, log }) => {
  if (!isOpen || !log) return null;

  let logDetail: OperationLogDetail | null = null;
  try {
    logDetail = JSON.parse(log.detail) as OperationLogDetail;
  } catch (e) {
    console.error('解析日志详情失败:', e);
  }

  const operationTypeInfo = getOperationTypeLabel(log.operation_type);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4
                    animate-in fade-in slide-in-from-top-4 duration-200
                    max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">操作日志详情</h2>
            <p className="text-sm text-gray-500 mt-1">
              查看操作的详细变更信息
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">操作类型</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${operationTypeInfo.className}`}>
                {operationTypeInfo.label}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">操作模块</p>
              <p className="text-sm font-medium text-gray-900">{log.module}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">操作人</p>
              <p className="text-sm font-medium text-gray-900">{log.operator_name}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">操作时间</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(log.created_at)}</p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">操作人 ID</p>
              <p className="text-sm font-medium text-gray-900">{log.operator_id}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">IP 地址</p>
              <p className="text-sm font-medium text-gray-900 font-mono">{log.ip_address}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">数据变更详情</h3>
            {logDetail ? (
              <ComparisonView
                before={logDetail.before}
                after={logDetail.after}
                changes={logDetail.changes}
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500">无法解析日志详情</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300
                       rounded-lg hover:bg-gray-50 transition-colors duration-150"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogDetailModal;
