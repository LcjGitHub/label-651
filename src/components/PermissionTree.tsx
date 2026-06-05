import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import { Permission } from '@/types';

interface PermissionTreeProps {
  permissions: Permission[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  disabled?: boolean;
}

interface TreeNodeProps {
  permission: Permission;
  level: number;
  selectedIds: number[];
  onToggle: (id: number, checked: boolean) => void;
  expandedIds: number[];
  onExpand: (id: number) => void;
  disabled?: boolean;
}

const getAllChildIds = (perm: Permission): number[] => {
  let ids: number[] = [perm.id];
  if (perm.children && perm.children.length > 0) {
    perm.children.forEach((child) => {
      ids = ids.concat(getAllChildIds(child));
    });
  }
  return ids;
};

const TreeNode = ({
  permission,
  level,
  selectedIds,
  onToggle,
  expandedIds,
  onExpand,
  disabled,
}: TreeNodeProps) => {
  const hasChildren = permission.children && permission.children.length > 0;
  const isExpanded = expandedIds.includes(permission.id);
  const isChecked = selectedIds.includes(permission.id);

  const childIds = hasChildren ? getAllChildIds(permission) : [permission.id];
  const allChildrenChecked = childIds.every((id) => selectedIds.includes(id));
  const someChildrenChecked = childIds.some((id) => selectedIds.includes(id));
  const isIndeterminate = !allChildrenChecked && someChildrenChecked;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onToggle(permission.id, e.target.checked);
  };

  const handleExpand = () => {
    if (hasChildren) {
      onExpand(permission.id);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center py-1.5 px-2 rounded hover:bg-gray-50 transition-colors ${
          isChecked ? 'bg-blue-50/50' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        <button
          type="button"
          onClick={handleExpand}
          className={`p-0.5 rounded hover:bg-gray-200 transition-colors ${
            hasChildren ? 'visible' : 'invisible'
          }`}
          disabled={disabled}
        >
          {isExpanded ? (
            <ChevronDown size={14} className="text-gray-500" />
          ) : (
            <ChevronRight size={14} className="text-gray-500" />
          )}
        </button>

        <div className="flex items-center justify-center w-5 h-5 mr-2">
          {permission.type === 'menu' ? (
            <Folder size={14} className="text-amber-500" />
          ) : (
            <FileText size={14} className="text-blue-500" />
          )}
        </div>

        <label className="flex items-center flex-1 cursor-pointer min-w-0">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleCheckboxChange}
            disabled={disabled}
            ref={(el) => {
              if (el) {
                el.indeterminate = isIndeterminate;
              }
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span
            className={`ml-2 text-sm ${
              permission.type === 'menu' ? 'font-medium text-gray-800' : 'text-gray-600'
            } truncate`}
          >
            {permission.name}
          </span>
          <span className="ml-2 text-xs text-gray-400 font-mono truncate">
            ({permission.code})
          </span>
        </label>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {permission.children!.map((child) => (
            <TreeNode
              key={child.id}
              permission={child}
              level={level + 1}
              selectedIds={selectedIds}
              onToggle={onToggle}
              expandedIds={expandedIds}
              onExpand={onExpand}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function PermissionTree({
  permissions,
  selectedIds,
  onChange,
  disabled = false,
}: PermissionTreeProps) {
  const [expandedIds, setExpandedIds] = useState<number[]>(() => {
    const ids: number[] = [];
    const collectParentIds = (perms: Permission[]) => {
      perms.forEach((p) => {
        if (p.children && p.children.length > 0) {
          ids.push(p.id);
          collectParentIds(p.children);
        }
      });
    };
    collectParentIds(permissions);
    return ids;
  });

  const handleExpand = useCallback((id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const handleToggle = useCallback(
    (id: number, checked: boolean) => {
      const findPermission = (
        perms: Permission[],
        targetId: number
      ): Permission | null => {
        for (const perm of perms) {
          if (perm.id === targetId) return perm;
          if (perm.children) {
            const found = findPermission(perm.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };

      const perm = findPermission(permissions, id);
      if (!perm) return;

      const affectedIds = getAllChildIds(perm);

      let newSelectedIds: number[];
      if (checked) {
        newSelectedIds = [...new Set([...selectedIds, ...affectedIds])];
      } else {
        newSelectedIds = selectedIds.filter((sid) => !affectedIds.includes(sid));
      }

      onChange(newSelectedIds);
    },
    [permissions, selectedIds, onChange]
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="max-h-96 overflow-y-auto p-2">
        {permissions.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">暂无权限数据</div>
        ) : (
          permissions.map((perm) => (
            <TreeNode
              key={perm.id}
              permission={perm}
              level={0}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              expandedIds={expandedIds}
              onExpand={handleExpand}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  );
}
