import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  normalizeIndonesianPhone,
  phonesMatch,
  stripPhoneFormatting,
} from "./phone-normalize"

describe("normalizeIndonesianPhone", () => {
  const cases: Array<[string, string]> = [
    ["+62 821-1234-1234", "6282112341234"],
    ["082112341234", "6282112341234"],
    ["82112341234", "6282112341234"],
    ["62 821 1234 1234", "6282112341234"],
    ["(0821) 1234-1234", "6282112341234"],
    ["+6282112341234", "6282112341234"],
  ]

  for (const [input, expected] of cases) {
    it(`normalizes ${input}`, () => {
      assert.equal(normalizeIndonesianPhone(input), expected)
    })
  }

  it("treats equivalent formats as the same number", () => {
    const variants = ["+62 821-1234-1234", "082112341234", "82112341234"]
    const normalized = variants.map((v) => normalizeIndonesianPhone(v))
    assert.deepEqual(new Set(normalized), new Set(["6282112341234"]))
    for (let i = 0; i < variants.length; i++) {
      for (let j = i + 1; j < variants.length; j++) {
        assert.equal(phonesMatch(variants[i], variants[j]), true)
      }
    }
  })

  it("rejects empty and invalid numbers", () => {
    assert.equal(normalizeIndonesianPhone(""), null)
    assert.equal(normalizeIndonesianPhone("   "), null)
    assert.equal(normalizeIndonesianPhone("12345"), null)
    assert.equal(normalizeIndonesianPhone("0211234567"), null)
  })
})

describe("stripPhoneFormatting", () => {
  it("removes separators", () => {
    assert.equal(stripPhoneFormatting("+62 821-1234-1234"), "6282112341234")
  })
})
