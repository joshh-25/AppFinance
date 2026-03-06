// Finance App File: frontend/src/shared/components/ReelsSkeletonLoader.jsx
// Purpose: Full-page reels-style skeleton loader used while data is loading.

import { SkeletonCircle, SkeletonLine } from './Skeleton.jsx';

const ACTION_BUTTON_COUNT = 4;

export default function ReelsSkeletonLoader() {
  return (
    <main className="reels-skeleton-screen" role="status" aria-live="polite" aria-label="Loading dashboard data">
      <div className="reels-skeleton-layout" aria-hidden="true">
        <section className="reels-skeleton-card">
          <div className="reels-skeleton-meta">
            <SkeletonCircle className="reels-skeleton-avatar" size={46} />
            <div className="reels-skeleton-lines">
              <SkeletonLine className="reels-skeleton-line reels-skeleton-line-primary" width="220px" height={14} />
              <SkeletonLine className="reels-skeleton-line" width="205px" height={14} />
              <SkeletonLine className="reels-skeleton-line" width="92px" height={14} />
            </div>
          </div>
        </section>

        <aside className="reels-skeleton-actions">
          {Array.from({ length: ACTION_BUTTON_COUNT }).map((_, index) => (
            <SkeletonCircle key={index} className="reels-skeleton-action-btn" size={56} />
          ))}
        </aside>
      </div>
    </main>
  );
}
