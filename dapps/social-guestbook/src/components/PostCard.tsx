import { useAccount } from "wagmi";
import { usePost, useProfile, useHasLiked } from "../hooks/useGuestbookReads";
import { useLikePost } from "../hooks/useLikePost";
import { useTipAuthor } from "../hooks/useTipAuthor";
import { CommentList } from "./CommentList";
import { TxStatus } from "./TxStatus";
import type { Post } from "../types/guestbook";

interface PostCardProps {
  postId: bigint;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function PostCard({ postId, isExpanded, onToggleExpand }: PostCardProps) {
  const { address: evmAddress } = useAccount();
  const { data: postTuple, refetch: refetchPost } = usePost(postId);
  const { data: hasLiked, refetch: refetchLiked } = useHasLiked(
    postId,
    evmAddress
  );

  const {
    likePost,
    finalize: finalizeLike,
    phase: likePhase,
    error: likeError,
    btcTxId: likeTxId,
    reset: resetLike,
  } = useLikePost(() => {
    refetchPost();
    refetchLiked();
  });

  const {
    tipAuthor,
    finalize: finalizeTip,
    phase: tipPhase,
    error: tipError,
    btcTxId: tipTxId,
    reset: resetTip,
  } = useTipAuthor(() => refetchPost());

  if (!postTuple) return <div className="post-card post-card--loading">Loading…</div>;

  // getPost returns a tuple: [id, author, content, timestamp, likeCount, exists]
  const [id, author, content, timestamp, likeCount, exists] = postTuple as unknown as [
    bigint,
    `0x${string}`,
    string,
    bigint,
    bigint,
    boolean,
  ];

  if (!exists) return null;

  const post: Post = { id, author, content, timestamp, likeCount, exists };

  const likeActive =
    likePhase !== "idle" && likePhase !== "error" && likePhase !== "confirmed";
  const tipActive =
    tipPhase !== "idle" && tipPhase !== "error" && tipPhase !== "confirmed";

  return (
    <div className="post-card">
      <PostCardHeader author={author} timestamp={post.timestamp} />
      <p className="post-card__content">{post.content}</p>

      <div className="post-card__actions">
        <button
          className={`post-card__like-btn${hasLiked ? " post-card__like-btn--liked" : ""}`}
          onClick={() => likePost(postId)}
          disabled={likeActive || !!hasLiked}
          title={hasLiked ? "Already liked" : "Like"}
        >
          ♥ {post.likeCount.toString()}
        </button>

        <button className="post-card__tip-btn" onClick={() => tipAuthor(postId, 1000)} disabled={tipActive}>
          Tip 1000 sats
        </button>

        <button className="post-card__comments-btn" onClick={onToggleExpand}>
          {isExpanded ? "Hide comments" : "Comments"}
        </button>
      </div>

      <TxStatus
        phase={likePhase}
        error={likeError}
        btcTxId={likeTxId}
        onReset={resetLike}
        onFinalize={finalizeLike}
      />
      <TxStatus
        phase={tipPhase}
        error={tipError}
        btcTxId={tipTxId}
        onReset={resetTip}
        onFinalize={finalizeTip}
      />

      {isExpanded && <CommentList postId={postId} />}
    </div>
  );
}

function PostCardHeader({
  author,
  timestamp,
}: {
  author: `0x${string}`;
  timestamp: bigint;
}) {
  const { data: rawProfile } = useProfile(author);
  const profile = rawProfile as [string, boolean] | undefined;
  const displayName =
    profile && profile[1] ? profile[0] : `${author.slice(0, 8)}…`;

  return (
    <div className="post-card__header">
      <span className="post-card__author">{displayName}</span>
      <span className="post-card__timestamp">
        {new Date(Number(timestamp) * 1000).toLocaleString()}
      </span>
    </div>
  );
}
