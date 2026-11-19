"use client";

import { Briefcase, Coffee, Home, MapPin, Store, type LucideIcon } from "lucide-react";
import type { AddressKind } from "@/lib/account-data";

const icons: Record<AddressKind, LucideIcon> = {
  home: Home,
  work: Briefcase,
  family: Store,
  cafe: Coffee,
  other: MapPin,
};

export function AddressKindIcon({
  kind,
  className = "size-5",
  strokeWidth = 1.8,
}: {
  kind: AddressKind;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = icons[kind] ?? MapPin;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
