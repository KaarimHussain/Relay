'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordInputProps {
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
}

export function PasswordInput({
  id,
  name,
  placeholder = '••••••••••••',
  className,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        className={cn(
          'w-full h-[38px] px-3 pr-10 bg-gray-50 border border-gray-200 rounded-lg',
          'text-[13px] text-gray-700 placeholder:text-gray-400 outline-none',
          'focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors',
          className
        )}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}
