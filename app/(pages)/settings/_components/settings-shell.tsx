"use client";

import { IconSettings } from "@tabler/icons-react";
import { motion } from "motion/react";
import { Children, type ReactNode } from "react";

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 200, damping: 24 },
  },
};

export function SettingsShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <motion.div
      className="mx-auto max-w-2xl space-y-8"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.15 } },
      }}
    >
      <motion.div variants={sectionVariants}>
        <div className="flex items-center gap-2">
          <IconSettings size={20} className="text-primary" />
          <h1 className="font-display text-3xl tracking-tight">Settings</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </motion.div>

      {Children.map(children, (child) => (
        <motion.div variants={sectionVariants}>{child}</motion.div>
      ))}

      {footer && <motion.div variants={sectionVariants}>{footer}</motion.div>}
    </motion.div>
  );
}
