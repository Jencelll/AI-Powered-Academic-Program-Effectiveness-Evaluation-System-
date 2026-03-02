import React from 'react';

const variants = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
};

export const Badge = ({ variant = 'default', className = '', children, ...props }) => (
  <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${variants[variant] || variants.default} ${className}`} {...props}>
    {children}
  </span>
);