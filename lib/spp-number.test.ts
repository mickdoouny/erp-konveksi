import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  deriveCsSppPrefix,
  formatSppNumber,
  parseSppSequence,
} from "./spp-number"

describe("spp-number", () => {
  it("derives prefix from login username", () => {
    assert.equal(deriveCsSppPrefix("Anti"), "ANTI")
    assert.equal(deriveCsSppPrefix("cs1"), "CS1")
    assert.equal(deriveCsSppPrefix("  agus  "), "AGUS")
  })

  it("formats and parses sequential SPP numbers", () => {
    assert.equal(formatSppNumber("ANTI", 1), "ANTI-000001")
    assert.equal(formatSppNumber("AGUS", 2), "AGUS-000002")
    assert.equal(parseSppSequence("ANTI-000001", "ANTI"), 1)
    assert.equal(parseSppSequence("anti-000042", "ANTI"), 42)
    assert.equal(parseSppSequence("AGUS-000002", "ANTI"), null)
  })
})
