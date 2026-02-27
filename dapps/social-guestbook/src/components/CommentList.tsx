import { useState } from "react";
import { useAccounts } from "@midl/react";
import { useComments } from "../hooks/useGuestbookReads";
import { useCommentOnPost } from "../hooks/useCommentOnPost";
import { TxStatus } from "./TxStatus";
import type { Comment } from "../types/guestbook";

interface CommentListProps {
  postId: bigint;
}

export function CommentList({ postId }: CommentListProps) {
  const [text, setText] = useState("");
  const { isConnected } = useAccounts();
  const { data: comments, refetch } = useComments(postId);
  const { commentOnPost, finalize, phase, error, btcTxId, reset } = useCommentOnPost(() => {
    refetch();
    setText("");
  });

  const isActive = phase !== "idle" && phase !== "error" && phase !== "confirmed";

  return (
    <div className="comment-list">
      {comments && (comments as Comment[]).length > 0 ? (
        <ul className="comment-list__items">
          {(comments as Comment[]).map((c, i) => (
            <li key={i} className="comment-list__item">
              <span className="comment-list__author" title={c.author}>
                {c.author.slice(0, 8)}…
              </span>
              <span className="comment-list__text">{c.text}</span>
              <span className="comment-list__time">
                {new Date(Number(c.timestamp) * 1000).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="comment-list__empty">No comments yet.</p>
      )}

      {isConnected && (
        <div className="comment-list__form">
          <input
            type="text"
            placeholder="Add a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isActive}
            maxLength={280}
          />
          <button
            onClick={() => commentOnPost(postId, text)}
            disabled={isActive || !text.trim()}
          >
            Comment
          </button>
          <TxStatus phase={phase} error={error} btcTxId={btcTxId} onReset={reset} onFinalize={finalize} />
        </div>
      )}
    </div>
  );
}
