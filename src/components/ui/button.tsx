import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-smooth focus-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-700/25 active:scale-[0.98]",
        secondary:
          "bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 active:scale-[0.98]",
        ghost:
          "text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:scale-[0.98]",
        outline:
          "border border-gray-200 bg-white text-gray-900 shadow-sm hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98]",
        success:
          "bg-green-600 text-white shadow-lg shadow-green-600/25 hover:bg-green-700 hover:shadow-green-700/25 active:scale-[0.98]",
        destructive:
          "bg-red-600 text-white shadow-lg shadow-red-600/25 hover:bg-red-700 hover:shadow-red-700/25 active:scale-[0.98]",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
