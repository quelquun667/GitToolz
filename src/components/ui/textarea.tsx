import * as React from 'react';

import {cn} from '@/lib/utils';
import { useIsomorphicLayoutEffect } from '@/hooks/use-isomorphic-layout-effect';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current!);

    const [isMounted, setIsMounted] = React.useState(false);

    useIsomorphicLayoutEffect(() => {
      setIsMounted(true);
    }, []);

    useIsomorphicLayoutEffect(() => {
      const textarea = internalRef.current;
      if (textarea && isMounted) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [isMounted, props.value]);

    return (
      <textarea
        ref={internalRef}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
