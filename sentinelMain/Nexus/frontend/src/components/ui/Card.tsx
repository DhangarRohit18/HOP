import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  signalBorder?: 'signal' | 'amber' | 'emerald' | 'rose' | 'sky' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'solid',
  padding = 'md',
  signalBorder = 'none',
  ...props
}) => {
  const baseStyle = 'rounded-sm transition-all duration-200 relative overflow-hidden shadow-xs';
  
  const variantStyles = {
    glass: 'bg-[#FFFFFF] border border-blue-950/20 text-blue-950',
    solid: 'bg-[#FFFFFF] border border-blue-950/20 text-blue-950',
    bordered: 'border border-[#C9BDD9] bg-white text-blue-950',
  };

  const signalStyles = {
    none: '',
    signal: 'border-l-4 border-l-[#834DFB]',
    amber: 'border-l-4 border-l-[#F0E100]',
    emerald: 'border-l-4 border-l-[#3A9B68]',
    rose: 'border-l-4 border-l-[#D94B5B]',
    sky: 'border-l-4 border-l-[#834DFB]',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={`${baseStyle} ${variantStyles[variant]} ${signalStyles[signalBorder]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
