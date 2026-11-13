import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface SensitiveAccessMaskProps {
  text: string;
  className?: string;
  prefixLabel?: string;
}

// Regex patterns to detect access codes, lockboxes, PINs, alarms, and key safes
const SENSITIVE_KEYWORDS = /(lockbox|key\s*box|alarm|gate\s*code|pin|entry\s*code|safe\s*code|key\s*safe|code[:\s]+[0-9a-zA-Z#*]+)/i;

export const SensitiveAccessMask: React.FC<SensitiveAccessMaskProps> = ({
  text,
  className = '',
  prefixLabel = 'Note',
}) => {
  const [revealed, setRevealed] = useState(false);

  if (!text || !text.trim()) return null;

  const hasSensitiveContent = SENSITIVE_KEYWORDS.test(text);

  if (!hasSensitiveContent) {
    return (
      <div className={`text-[10.5px] text-neutral-600 dark:text-neutral-400 ${className}`}>
        <span className="font-semibold text-neutral-700 dark:text-neutral-300">{prefixLabel}:</span> {text}
      </div>
    );
  }

  // Mask sensitive characters if not revealed
  const renderMaskedContent = () => {
    if (revealed) {
      return (
        <span className="font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700">
          {text}
        </span>
      );
    }

    // Mask numbers or alphanumeric codes
    const masked = text.replace(/([0-9A-Za-z#*]{3,})/g, '•••••');
    return (
      <span className="font-mono text-neutral-500 dark:text-neutral-400 italic">
        {masked}
      </span>
    );
  };

  return (
    <div className={`inline-flex items-center gap-1.5 text-[10.5px] py-0.5 px-2 rounded-md bg-amber-50/70 dark:bg-neutral-800/90 border border-amber-200/70 dark:border-neutral-700 ${className}`}>
      <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
      <span className="font-semibold text-neutral-700 dark:text-neutral-300 shrink-0">{prefixLabel}:</span>
      
      <span className="truncate max-w-[260px] sm:max-w-md">{renderMaskedContent()}</span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setRevealed(!revealed);
        }}
        className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600 hover:bg-amber-50 dark:hover:bg-neutral-600 hover:text-amber-700 transition-colors shrink-0 shadow-2xs"
        title={revealed ? 'Hide access security code' : 'Reveal customer access code / lockbox PIN'}
      >
        {revealed ? (
          <>
            <EyeOff className="w-2.5 h-2.5 text-neutral-500" />
            <span>Hide</span>
          </>
        ) : (
          <>
            <Eye className="w-2.5 h-2.5 text-amber-600" />
            <span>Reveal Code</span>
          </>
        )}
      </button>
    </div>
  );
};
