import {
  Activity, Apple, Bell, Bike, CalendarCheck, CalendarDays, ChevronLeft, ClipboardCheck, ClipboardList,
  Dumbbell, FileUp, Flag, HeartPulse, History, Inbox, ListChecks, MessageCircle, PanelsTopLeft, Plug,
  Settings, ShieldCheck, Target, TrendingUp, Trophy, UserRound, UserRoundCog, Users, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = { Activity, Apple, Bell, Bike, CalendarCheck, CalendarDays, ChevronLeft, ClipboardCheck, ClipboardList, Dumbbell, FileUp, Flag, HeartPulse, History, Inbox, ListChecks, MessageCircle, PanelsTopLeft, Plug, Settings, ShieldCheck, Target, TrendingUp, Trophy, UserRound, UserRoundCog, Users };
export const navigationIcon = (name: string, className = "size-5") => {
  const Icon = ICONS[name] ?? Dumbbell;
  return <Icon className={className} />;
};
