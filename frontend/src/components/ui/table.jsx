import React from 'react';

export const Table = ({ className = '', children, ...props }) => (
  <table className={`w-full text-sm ${className}`} {...props}>{children}</table>
);

export const TableHeader = ({ className = '', children, ...props }) => (
  <thead className={className} {...props}>{children}</thead>
);

export const TableBody = ({ className = '', children, ...props }) => (
  <tbody className={className} {...props}>{children}</tbody>
);

export const TableCaption = ({ className = '', children, ...props }) => (
  <caption className={`text-muted-foreground ${className}`} {...props}>{children}</caption>
);

export const TableRow = ({ className = '', children, ...props }) => (
  <tr className={className} {...props}>{children}</tr>
);

export const TableHead = ({ className = '', children, ...props }) => (
  <th className={`text-left align-middle p-2 font-medium ${className}`} {...props}>{children}</th>
);

export const TableCell = ({ className = '', children, ...props }) => (
  <td className={`text-left align-middle p-2 ${className}`} {...props}>{children}</td>
);