interface UserAvatarProps {
  name: string;
  avatar?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-2xl',
};

export default function UserAvatar({
  name,
  avatar,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const initial = name?.charAt(0) || '?';

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-blue-500 to-blue-600
                  flex items-center justify-center text-white font-medium shadow
                  ${sizeClasses[size]} ${className}`}
    >
      {initial}
    </div>
  );
}
