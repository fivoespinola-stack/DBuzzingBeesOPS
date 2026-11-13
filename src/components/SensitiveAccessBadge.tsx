import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Copy, Check, ShieldAlert } from 'lucide-react';

interface SensitiveAccessBadgeProps {
  remarks?: string;
  specialInstructions?: string;
  className?: string;
}

// Regex to detect common security & property access keywords (lockbox, alarm, gate, pin, keys)
const ACCESS_KEYWORD_REGEX = /\b(lockbox|lock\s*box|alarm|pin\b|gate\s*code|key\s*code|keypad|safe\s*code|passcode|garage\s*code|keys?)\b/i;

export const isSensitiveAccessNote = (text?: string): boolean => {
  if (!text) return false;
  return ACCESS_KEYWORD_REGEX.test(text);
};

// Mask sensitive numbers or codes in text while leaving non-sensitive instructions visible
export const maskAccessCodes = (text: string): string => {
  // Replace 3-8 digit codes following keywords or stand-alone digits
  return text.replace(/(\b(?:code|pin|lockbox|alarm|box|passcode|#)\s*[:#-]?\s*)([a-zA-Z0-9-]{3,10})/gi, '$1••••••');
};

export const SensitiveAccessBadge: React.FC<SensitiveAccessBadgeProps> = ({
  remarks,
  specialInstructions,
  className = '',
}) => {
  const fullText = [remarks, specialInstructions].filter(Boolean).join(' · ');
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!fullText.trim()) return null;

  const isSensitive = isSensitiveAccessNote(fullText);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isSensitive) {
    return (
      <div 
        className={`text-[11px] text-neutral-600 dark:text-neutral-400 bg-neutral-100/90 dark:bg-neutral-800/80 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700/60 ${className}`}
        title={fullText}
      >
        <span className="font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">Note:</span>
        <span className="truncate max-w-xs">{fullText}</span>
      </div>
    );
  }

  const displayText = isRevealed ? fullText : maskAccessCodes(fullText);

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
        isRevealed
          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 shadow-2xs'
          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
      } ${className}`}
      title={isRevealed ? fullText : 'Sensitive lockbox or alarm code is masked for safety. Click reveal to view.'}
    >
      <div className="flex items-center gap-1 shrink-0 font-bold text-amber-600 dark:text-amber-400">
        <KeyRound className="w-3 h-3" />
        <span className="text-[10px] uppercase tracking-wider font-mono">Access Info:</span>
      </div>

      <span className="font-mono truncate max-w-[220px]">
        {displayText}
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsRevealed(!isRevealed);
        }}
        className="ml-0.5 p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
        title={isRevealed ? 'Hide sensitive code' : 'Reveal sensitive lockbox / alarm code'}
      >
        {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>

      {isRevealed && (
        <button
          type="button"
          onClick={handleCopy}
          className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
          title="Copy access note to clipboard"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
};
