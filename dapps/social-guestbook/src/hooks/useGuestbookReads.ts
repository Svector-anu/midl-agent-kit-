import { useReadContract } from "wagmi";
import { SOCIAL_GUESTBOOK_ADDRESS, SOCIAL_GUESTBOOK_ABI } from "../lib/contract";

// Post IDs in SocialGuestbook are 1-indexed (postCount increments before assignment).
// Callers should iterate from 1..postCount inclusive.

export function usePostCount() {
  return useReadContract({
    address: SOCIAL_GUESTBOOK_ADDRESS,
    abi: SOCIAL_GUESTBOOK_ABI,
    functionName: "postCount",
  });
}

export function usePostingFee() {
  return useReadContract({
    address: SOCIAL_GUESTBOOK_ADDRESS,
    abi: SOCIAL_GUESTBOOK_ABI,
    functionName: "postingFee",
  });
}

export function usePost(postId: bigint, enabled = true) {
  return useReadContract({
    address: SOCIAL_GUESTBOOK_ADDRESS,
    abi: SOCIAL_GUESTBOOK_ABI,
    functionName: "getPost",
    args: [postId],
    query: { enabled: enabled && postId > 0n },
  });
}

export function useComments(postId: bigint, enabled = true) {
  return useReadContract({
    address: SOCIAL_GUESTBOOK_ADDRESS,
    abi: SOCIAL_GUESTBOOK_ABI,
    functionName: "getComments",
    args: [postId],
    query: { enabled: enabled && postId > 0n },
  });
}

export function useProfile(address: `0x${string}` | undefined) {
  return useReadContract({
    address: SOCIAL_GUESTBOOK_ADDRESS,
    abi: SOCIAL_GUESTBOOK_ABI,
    functionName: "getProfile",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useHasLiked(
  postId: bigint,
  voterAddress: `0x${string}` | undefined
) {
  return useReadContract({
    address: SOCIAL_GUESTBOOK_ADDRESS,
    abi: SOCIAL_GUESTBOOK_ABI,
    functionName: "hasLiked",
    args: voterAddress ? [postId, voterAddress] : undefined,
    query: { enabled: !!voterAddress && postId > 0n },
  });
}
