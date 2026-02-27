import { useState } from "react";
import { usePostCount } from "../hooks/useGuestbookReads";
import { PostCard } from "./PostCard";

export function GuestbookFeed() {
  const { data: postCount, isLoading, isError } = usePostCount();
  const [expandedPostId, setExpandedPostId] = useState<bigint | null>(null);

  if (isLoading) return <div className="feed-status">Loading posts…</div>;
  if (isError) return <div className="feed-status feed-status--error">Failed to load posts.</div>;
  if (!postCount || (postCount as bigint) === 0n) {
    return <div className="feed-status">No posts yet. Be the first to write one!</div>;
  }

  // Post IDs are 1-indexed. Render newest first (descending order).
  const count = postCount as bigint;
  const postIds = Array.from({ length: Number(count) }, (_, i) => BigInt(count) - BigInt(i));

  return (
    <div className="guestbook-feed">
      <h2>Posts</h2>
      {postIds.map((id) => (
        <PostCard
          key={id.toString()}
          postId={id}
          isExpanded={expandedPostId === id}
          onToggleExpand={() =>
            setExpandedPostId(expandedPostId === id ? null : id)
          }
        />
      ))}
    </div>
  );
}
