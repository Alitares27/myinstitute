import React from 'react';
import './Skeleton.css';

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
};

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = '1rem', style }) => {
  const inlineStyle: React.CSSProperties = {
    width,
    height,
    ...(style || {}),
  };
  return <div className="skeleton" style={inlineStyle} />;
};
