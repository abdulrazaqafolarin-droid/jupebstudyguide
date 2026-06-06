import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapPoints?: (string | number)[];
  title?: string;
  description?: string;
  showClose?: boolean;
  children: React.ReactNode;
  className?: string;
};

const BottomSheetHandle = ({ className }: { className?: string }) => (
  <div className={cn("mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/20", className)} />
);

export function BottomSheet({
  open,
  onOpenChange,
  snapPoints,
  title,
  description,
  showClose = true,
  children,
  className,
}: BottomSheetProps) {
  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
      shouldScaleBackground
      setBackgroundColorOnScale
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border border-border bg-background shadow-xl outline-none",
            "max-h-[85dvh]",
            className,
          )}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
            <BottomSheetHandle />
            {showClose && (
              <button
                onClick={() => onOpenChange(false)}
                className="absolute right-4 top-3 rounded-sm p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            )}
          </div>
          {title && (
            <div className="px-4 pb-2 shrink-0">
              <h2 className="text-base font-semibold">{title}</h2>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {children}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
