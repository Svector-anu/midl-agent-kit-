import { useState } from "react";
import { useAccount } from "wagmi";
import { useAccounts } from "@midl/react";
import { useProfile } from "../hooks/useGuestbookReads";
import { useRegisterUser } from "../hooks/useRegisterUser";
import { TxStatus } from "./TxStatus";

export function RegisterUser() {
  const [username, setUsername] = useState("");
  const { isConnected } = useAccounts();
  const { address: evmAddress } = useAccount();
  const { data: rawProfile, refetch } = useProfile(evmAddress);
  const profile = rawProfile as [string, boolean] | undefined;
  const { registerUser, finalize, phase, error, btcTxId, reset } = useRegisterUser(() => {
    refetch();
    setUsername("");
  });

  if (!isConnected) return null;

  if (profile && profile[1]) {
    return (
      <div className="register-user register-user--registered">
        Signed in as <strong>{profile[0]}</strong>
      </div>
    );
  }

  const isActive = phase !== "idle" && phase !== "error" && phase !== "confirmed";

  return (
    <div className="register-user">
      <h3>Register a username</h3>
      <div className="register-user__form">
        <input
          type="text"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isActive}
          maxLength={32}
        />
        <button
          onClick={() => registerUser(username)}
          disabled={isActive || !username.trim()}
        >
          Register
        </button>
      </div>
      <TxStatus phase={phase} error={error} btcTxId={btcTxId} onReset={reset} onFinalize={finalize} />
    </div>
  );
}
