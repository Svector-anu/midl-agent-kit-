import { useState } from "react";
import { useAccount } from "wagmi";
import { useAccounts } from "@midl/react";
import { usePostingFee, useProfile } from "../hooks/useGuestbookReads";
import { useCreatePost } from "../hooks/useCreatePost";
import { TxStatus } from "./TxStatus";

export function CreatePost() {
  const [content, setContent] = useState("");
  const { isConnected } = useAccounts();
  const { address: evmAddress } = useAccount();
  const { data: rawPostingFee } = usePostingFee();
  const postingFeeWei = rawPostingFee as bigint | undefined;
  const { data: rawProfile } = useProfile(evmAddress);
  const profile = rawProfile as [string, boolean] | undefined;
  const isRegistered = profile?.[1] === true;
  const { createPost, finalize, phase, error, btcTxId, reset } = useCreatePost(() => {
    setContent("");
  });

  if (!isConnected) return null;

  const isActive = phase !== "idle" && phase !== "error" && phase !== "confirmed";

  return (
    <div className="create-post">
      <h3>Write a post</h3>
      {postingFeeWei !== undefined && postingFeeWei > 0n && (
        <p className="create-post__fee">
          Posting fee: {(Number(postingFeeWei) / 1e10).toFixed(0)} sats
        </p>
      )}
      <textarea
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={isActive}
        rows={4}
        maxLength={500}
      />
      {!isRegistered && (
        <p className="create-post__notice">Register a username above before posting.</p>
      )}
      <button
        onClick={() => createPost(content, postingFeeWei ?? 0n)}
        disabled={isActive || !content.trim() || postingFeeWei === undefined || !isRegistered}
      >
        {isActive ? "Posting…" : "Post"}
      </button>
      <TxStatus phase={phase} error={error} btcTxId={btcTxId} onReset={reset} onFinalize={finalize} />
    </div>
  );
}
