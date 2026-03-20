import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-checked:bg-primary data-unchecked:bg-input dark:data-unchecked:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-2 aria-invalid:ring-2 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-[size=default]:h-[18px] data-[size=default]:w-[30px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="bg-background dark:data-checked:bg-primary-foreground dark:data-unchecked:bg-foreground pointer-events-none block rounded-full ring-0 transition-transform group-data-[size=default]/switch:size-3.5 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-1px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-1px)] group-data-[size=default]/switch:data-unchecked:translate-x-px group-data-[size=sm]/switch:data-unchecked:translate-x-px rtl:group-data-[size=default]/switch:data-checked:-translate-x-[calc(100%-1px)] rtl:group-data-[size=sm]/switch:data-checked:-translate-x-[calc(100%-1px)] rtl:group-data-[size=default]/switch:data-unchecked:-translate-x-px rtl:group-data-[size=sm]/switch:data-unchecked:-translate-x-px"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
