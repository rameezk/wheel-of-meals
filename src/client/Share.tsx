import { useEffect, useState } from "react";
import { shareConfirmMillis } from "./motion";
import { shareOrCopy, type Shareable, type Sharing } from "./sharing";
import { quietButtonStyle } from "./styles";

type ShareButtonProps = {
  label: string;
  shareable: Shareable;
};

const confirmations: Record<Sharing, string | null> = {
  shared: "Shared.",
  copied: "Copied to the clipboard.",
  cancelled: null,
  failed: "Nothing was copied. Try that again.",
};

type Confirmation = { said: string; failed: boolean };

export const ShareButton = ({ label, shareable }: ShareButtonProps) => {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!confirmation) return;

    const forget = setTimeout(() => setConfirmation(null), shareConfirmMillis);
    return () => clearTimeout(forget);
  }, [confirmation]);

  const share = async () => {
    setSharing(true);
    const outcome = await shareOrCopy(shareable);
    const said = confirmations[outcome];

    setConfirmation(said ? { said, failed: outcome === "failed" } : null);
    setSharing(false);
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => void share()}
        disabled={sharing}
        className={`${quietButtonStyle} disabled:opacity-50`}
      >
        {label}
      </button>

      <p
        aria-live="polite"
        aria-atomic="true"
        className={`mt-2 text-sm empty:mt-0 ${
          confirmation?.failed ? "text-rose-300" : "text-emerald-300"
        }`}
      >
        {confirmation?.said}
      </p>
    </div>
  );
};
