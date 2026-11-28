import {
  Activity, Apple, Award, Bell, Bike, Footprints, PawPrint, Timer, Waves, CalendarCheck, CalendarDays, ChevronLeft, ClipboardCheck, ClipboardList, ClipboardPen,
  Dumbbell, FileUp, Flag, HeartPulse, History, Inbox, ListChecks, MessageCircle, PanelsTopLeft, Plug,
  Settings, ShieldCheck, Sparkles, Target, TrendingUp, Trophy, UserRound, UserRoundCog, Users, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = { Activity, Apple, Award, Bell, Bike, Footprints, PawPrint, Timer, Waves, CalendarCheck, CalendarDays, ChevronLeft, ClipboardCheck, ClipboardList, ClipboardPen, Dumbbell, FileUp, Flag, HeartPulse, History, Inbox, ListChecks, MessageCircle, PanelsTopLeft, Plug, Settings, ShieldCheck, Sparkles, Target, TrendingUp, Trophy, UserRound, UserRoundCog, Users };
export const navigationIcon = (name: string, className = "size-5") => {
  const Icon = ICONS[name] ?? Dumbbell;
  return <Icon className={className} />;
};
