import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  formatDateIdShort,
  getDeadlineWarning,
  resolveOrderEntryDate,
} from "./deadline-warning"

describe("formatDateIdShort", () => {
  it("formats as dd/MM/yyyy", () => {
    assert.equal(formatDateIdShort("2026-06-07T10:00:00.000Z"), "07/06/2026")
  })

  it("returns em dash for empty values", () => {
    assert.equal(formatDateIdShort(null), "—")
  })
})

describe("resolveOrderEntryDate", () => {
  it("prefers submittedAt over createdAt", () => {
    const submitted = new Date("2026-06-01")
    const created = new Date("2026-05-28")
    assert.equal(
      resolveOrderEntryDate(submitted, created)?.toISOString(),
      submitted.toISOString()
    )
  })
})

describe("getDeadlineWarning", () => {
  const today = new Date("2026-06-07T15:00:00")

  it("warns amber when deadline is tomorrow", () => {
    const warning = getDeadlineWarning("2026-06-08", today)
    assert.equal(warning?.level, "tomorrow")
    assert.equal(warning?.label, "Deadline besok")
  })

  it("warns red when deadline is today", () => {
    const warning = getDeadlineWarning("2026-06-07", today)
    assert.equal(warning?.level, "today")
    assert.equal(warning?.label, "Deadline hari ini")
  })

  it("warns red when deadline has passed", () => {
    const warning = getDeadlineWarning("2026-06-06", today)
    assert.equal(warning?.level, "overdue")
    assert.equal(warning?.label, "Melewati deadline")
  })

  it("returns null when deadline is more than one day away", () => {
    assert.equal(getDeadlineWarning("2026-06-10", today), null)
  })

  it("returns null when deadline is missing", () => {
    assert.equal(getDeadlineWarning(null, today), null)
  })
})
