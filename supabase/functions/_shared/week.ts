// Week boundary utilities — all functions use Pacific time to match the
// Sunday 6pm Pacific cron schedule.

export function toISODate(d: Date): string {
  return d.toISOString().split("T")[0]
}

// Returns this week's Sunday (the day the cron fires) as a midnight Date.
// Pacific-aware so the week_ending_date is always the correct calendar Sunday.
export function getWeekEnding(): Date {
  const pacific = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  )
  const day = pacific.getDay() // 0 = Sunday
  pacific.setDate(pacific.getDate() - day)
  pacific.setHours(0, 0, 0, 0)
  return pacific
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
