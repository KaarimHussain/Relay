"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value?: string; // YYYY-MM-DDTHH:mm
  onChange?: (value: string) => void;
  min?: string;
  className?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const POPULAR_TIMES = [
  "08:00 AM", "09:00 AM", "10:30 AM", "12:00 PM",
  "02:00 PM", "04:30 PM", "06:00 PM", "08:00 PM"
];

export function DateTimePicker({
  value,
  onChange,
  min,
  className,
  disabled = false,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Initial state derived from props
  const initDate = React.useMemo(() => {
    if (value && !isNaN(new Date(value).getTime())) {
      return new Date(value);
    }
    return new Date();
  }, [value]);

  const [viewDate, setViewDate] = React.useState<Date>(() => new Date(initDate));
  const [selectedDateStr, setSelectedDateStr] = React.useState<string>(() => {
    const y = initDate.getFullYear();
    const m = String(initDate.getMonth() + 1).padStart(2, "0");
    const d = String(initDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const [selectedTimeStr, setSelectedTimeStr] = React.useState<string>(() => {
    if (value && value.includes("T")) {
      return value.split("T")[1].slice(0, 5) || "09:00";
    }
    return "09:00";
  });

  // Sync internal state when value prop changes externally
  React.useEffect(() => {
    if (value && value.includes("T")) {
      const [dPart, tPart] = value.split("T");
      if (dPart) setSelectedDateStr(dPart);
      if (tPart) setSelectedTimeStr(tPart.slice(0, 5));
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setViewDate(parsed);
      }
    }
  }, [value]);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Calendar matrix calculation
  const calendarDays = React.useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isPast: boolean }[] = [];

    const todayStr = new Date().toISOString().slice(0, 10);
    const minDateStr = min ? min.slice(0, 10) : todayStr;

    // Previous month filler days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: dNum, isCurrentMonth: false, isPast: dateStr < minDateStr });
    }

    // Current month days
    for (let dNum = 1; dNum <= daysInMonth; dNum++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: dNum, isCurrentMonth: true, isPast: dateStr < minDateStr });
    }

    // Next month filler days (to fill 35 or 42 grid cells)
    const totalCells = days.length > 35 ? 42 : 35;
    const nextDaysNeeded = totalCells - days.length;
    for (let dNum = 1; dNum <= nextDaysNeeded; dNum++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: dNum, isCurrentMonth: false, isPast: dateStr < minDateStr });
    }

    return days;
  }, [viewDate, min]);

  const updateDateTime = (dateStr: string, timeStr: string) => {
    setSelectedDateStr(dateStr);
    setSelectedTimeStr(timeStr);
    onChange?.(`${dateStr}T${timeStr}`);
  };

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Convert "HH:mm" (24h) to "12:00 PM" display
  const formatTimeDisplay = (time24: string) => {
    if (!time24) return "09:00 AM";
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr || "9", 10);
    const m = mStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
  };

  // Convert "09:00 AM" display back to "09:00" (24h)
  const parseDisplayTimeTo24 = (displayTime: string) => {
    const [time, ampm] = displayTime.split(" ");
    let [hStr, mStr] = time.split(":");
    let h = parseInt(hStr, 10);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${mStr}`;
  };

  // Display trigger string
  const formattedTriggerLabel = React.useMemo(() => {
    if (!value) return "Select schedule date & time";
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      const datePart = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timePart = formatTimeDisplay(selectedTimeStr);
      return `${datePart} at ${timePart}`;
    } catch {
      return value;
    }
  }, [value, selectedTimeStr]);

  // Presets
  const applyPreset = (getPresetDate: () => Date) => {
    const d = getPresetDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");

    const newDateStr = `${y}-${m}-${day}`;
    const newTimeStr = `${h}:${min}`;
    setViewDate(d);
    updateDateTime(newDateStr, newTimeStr);
  };

  const presets = [
    {
      label: "Today 5 PM",
      fn: () => {
        const d = new Date();
        d.setHours(17, 0, 0, 0);
        return d;
      },
    },
    {
      label: "Tomorrow 9 AM",
      fn: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    {
      label: "Tomorrow 5 PM",
      fn: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(17, 0, 0, 0);
        return d;
      },
    },
    {
      label: "In 2 Days",
      fn: () => {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
  ];

  // Time custom select controls (Hours & Minutes & AM/PM)
  const current24Hour = parseInt(selectedTimeStr.split(":")[0] || "9", 10);
  const currentMinute = selectedTimeStr.split(":")[1] || "00";
  const isPM = current24Hour >= 12;
  const current12Hour = current24Hour % 12 === 0 ? 12 : current24Hour % 12;

  const handleHourSelect = (h12: number) => {
    let new24 = isPM ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
    const newTime = `${String(new24).padStart(2, "0")}:${currentMinute}`;
    updateDateTime(selectedDateStr, newTime);
  };

  const handleMinuteSelect = (mStr: string) => {
    const newTime = `${String(current24Hour).padStart(2, "0")}:${mStr}`;
    updateDateTime(selectedDateStr, newTime);
  };

  const handleAmPmToggle = (newIsPm: boolean) => {
    let new24 = current12Hour;
    if (newIsPm && current12Hour < 12) new24 += 12;
    if (!newIsPm && current12Hour === 12) new24 = 0;
    if (!newIsPm && current12Hour < 12) new24 = current12Hour;
    const newTime = `${String(new24).padStart(2, "0")}:${currentMinute}`;
    updateDateTime(selectedDateStr, newTime);
  };

  return (
    <div className="relative inline-block w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-2xs transition-all hover:bg-gray-50/80 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800/80",
          open && "border-orange-500 ring-2 ring-orange-500/20",
          className
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="size-4 shrink-0 text-orange-500" />
          <span className={cn("truncate", !value && "text-gray-400 dark:text-gray-500")}>
            {formattedTriggerLabel}
          </span>
        </div>
        <ChevronDown className={cn("size-3.5 text-gray-400 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {/* Popover Custom Date & Time Picker */}
      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-full min-w-[320px] max-w-[350px] rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xl animate-in fade-in-0 zoom-in-95 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-3">
            {/* Presets Row */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-bold text-gray-700 uppercase tracking-wider dark:text-gray-300">
                  <Sparkles className="size-3 text-orange-500" /> Quick Presets
                </span>
                <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full dark:bg-orange-950/50 dark:text-orange-400">
                  Auto-schedule
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset.fn)}
                    className="flex items-center justify-center rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:border-orange-300 hover:bg-orange-50/70 hover:text-orange-700 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-orange-900 dark:hover:bg-orange-950/40 dark:hover:text-orange-400"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* Custom Interactive Month Calendar Grid */}
            <div className="flex flex-col gap-2">
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="flex size-6 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="flex size-6 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 text-center">
                {WEEKDAYS.map((wd) => (
                  <span key={wd} className="text-[10px] font-semibold text-gray-400 uppercase py-0.5">
                    {wd}
                  </span>
                ))}
              </div>

              {/* Days Grid Matrix */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((item, idx) => {
                  const isSelected = item.dateStr === selectedDateStr;
                  const isToday = item.dateStr === new Date().toISOString().slice(0, 10);

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={item.isPast}
                      onClick={() => updateDateTime(item.dateStr, selectedTimeStr)}
                      className={cn(
                        "flex h-7 w-full items-center justify-center rounded-md text-xs font-medium transition-all",
                        !item.isCurrentMonth && "text-gray-300 dark:text-gray-600",
                        item.isCurrentMonth && !isSelected && !item.isPast && "text-gray-700 hover:bg-orange-50 hover:text-orange-600 dark:text-gray-200 dark:hover:bg-gray-800",
                        item.isPast && "cursor-not-allowed text-gray-300 opacity-40 dark:text-gray-700",
                        isToday && !isSelected && "border border-orange-300 text-orange-600 font-bold",
                        isSelected && "bg-orange-500 text-white font-bold shadow-xs hover:bg-orange-600"
                      )}
                    >
                      {item.dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* Custom Time Selector Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-bold text-gray-700 uppercase tracking-wider dark:text-gray-300">
                  <Clock className="size-3 text-orange-500" /> Time Slot
                </span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                  {formatTimeDisplay(selectedTimeStr)}
                </span>
              </div>

              {/* Quick Popular Time Chips */}
              <div className="grid grid-cols-4 gap-1">
                {POPULAR_TIMES.map((timeLabel) => {
                  const time24 = parseDisplayTimeTo24(timeLabel);
                  const isSelected = selectedTimeStr === time24;
                  return (
                    <button
                      key={timeLabel}
                      type="button"
                      onClick={() => updateDateTime(selectedDateStr, time24)}
                      className={cn(
                        "rounded-md border border-gray-100 bg-gray-50 py-1 text-[10px] font-medium text-gray-600 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
                        isSelected && "border-orange-500 bg-orange-50 font-bold text-orange-600 dark:bg-orange-950/50 dark:text-orange-400"
                      )}
                    >
                      {timeLabel}
                    </button>
                  );
                })}
              </div>

              {/* Fine-grain Time Picker (Hour, Minute, AM/PM) */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {/* Hour Select */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-gray-400">Hour</span>
                  <select
                    value={current12Hour}
                    onChange={(e) => handleHourSelect(parseInt(e.target.value, 10))}
                    className="h-7 rounded-md border border-gray-200 bg-white px-1 text-xs font-medium text-gray-800 outline-none focus:border-orange-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Minute Select */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-gray-400">Min</span>
                  <select
                    value={currentMinute}
                    onChange={(e) => handleMinuteSelect(e.target.value)}
                    className="h-7 rounded-md border border-gray-200 bg-white px-1 text-xs font-medium text-gray-800 outline-none focus:border-orange-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {["00", "15", "30", "45"].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* AM / PM Segmented Control */}
                <div className="flex items-center rounded-md border border-gray-200 p-0.5 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => handleAmPmToggle(false)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded transition-colors",
                      !isPM ? "bg-orange-500 text-white shadow-2xs" : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                    )}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAmPmToggle(true)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded transition-colors",
                      isPM ? "bg-orange-500 text-white shadow-2xs" : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                    )}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Confirm Done Button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600 shadow-2xs"
            >
              <Check className="size-3.5" /> Confirm Schedule Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
