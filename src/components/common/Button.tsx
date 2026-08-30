import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#111111] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  
  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5',
    md: 'text-sm px-4 py-2 rounded-md gap-2',
    lg: 'text-sm sm:text-base px-6 py-3 rounded-md gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[#111111] text-white hover:bg-[#222222] active:bg-[#000000] border border-[#111111]',
    secondary: 'bg-white text-[#111111] hover:bg-[#F3F3F3] active:bg-[#EAEAEA] border border-[#D4D4D4] hover:border-[#111111]',
    ghost: 'bg-transparent text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 border border-red-200 focus:ring-red-500',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
