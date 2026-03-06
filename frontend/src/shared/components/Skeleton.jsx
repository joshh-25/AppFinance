// Finance App File: frontend/src/shared/components/Skeleton.jsx
// Purpose: Reusable skeleton primitives with shimmer animation.

function sizeToCss(value) {
  return typeof value === 'number' ? `${value}px` : value;
}

export function SkeletonBlock({ className = '', width = '100%', height = 12, radius = 999, style = {} }) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton-block ${className}`.trim()}
      style={{
        width: sizeToCss(width),
        height: sizeToCss(height),
        borderRadius: sizeToCss(radius),
        ...style
      }}
    />
  );
}

export function SkeletonCircle({ className = '', size = 44 }) {
  return <SkeletonBlock className={className} width={size} height={size} radius={999} />;
}

export function SkeletonLine({ className = '', width = '100%', height = 12, radius = 999 }) {
  return <SkeletonBlock className={className} width={width} height={height} radius={radius} />;
}
