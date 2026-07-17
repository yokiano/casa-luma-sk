import { describe, expect, it } from 'vitest';
import { classifyEmail, classificationFromRule, matchesClassificationRule } from './classifier';
import { SEED_CLASSIFICATION_RULES } from './seed-rules';
import { BUILTIN_CLASSIFIERS } from './notifications/builtin-dummies';

describe('seed classification rules', () => {
  it('seeds exactly one rule per mirrored built-in subtype', () => {
    const subtypes = SEED_CLASSIFICATION_RULES.map((rule) => rule.subtype);
    expect(new Set(subtypes).size).toBe(subtypes.length);
  });

  it('every seed rule matches its own dummy_input and produces a classification', () => {
    for (const rule of SEED_CLASSIFICATION_RULES) {
      expect(matchesClassificationRule(rule.dummyInput, rule)).toBe(true);
      const classification = classificationFromRule(rule.dummyInput, rule);
      expect(classification, `${rule.name} should produce a classification`).toBeTruthy();
    }
  });

  it('seed DB rules use the same final MIME safety policy as built-in classification', () => {
    for (const rule of SEED_CLASSIFICATION_RULES) {
      const fromRule = classifyEmail(rule.dummyInput, [rule]);
      const fromBuiltin = classifyEmail(rule.dummyInput, []);
      expect(fromRule.classification).toBe(fromBuiltin.classification);
      expect(fromRule.subtype).toBe(fromBuiltin.subtype);
      expect(fromRule.processingState).toBe(fromBuiltin.processingState);
      expect(fromRule.notify).toBe(fromBuiltin.notify);
    }
  });

  it('seed priorities are unique and ordered to mirror the built-in match order', () => {
    const priorities = SEED_CLASSIFICATION_RULES.map((rule) => rule.priority);
    expect(new Set(priorities).size).toBe(priorities.length);
    const sorted = [...priorities].sort((a, b) => a - b);
    expect(priorities).toEqual(sorted);
  });
});

describe('built-in dummy inputs', () => {
  it('every built-in dummy input classifies to its declared subtype and classification', () => {
    for (const entry of BUILTIN_CLASSIFIERS) {
      const result = classifyEmail(entry.dummyInput, []);
      expect(result.subtype, `${entry.key} subtype`).toBe(entry.subtype);
      expect(result.classification, `${entry.key} classification`).toBe(entry.classification);
    }
  });

  it('mirrored built-in classifiers are marked deprecated; catch-all fallbacks are not', () => {
    for (const entry of BUILTIN_CLASSIFIERS) {
      const mirrored = SEED_CLASSIFICATION_RULES.some((rule) => rule.subtype === entry.subtype);
      expect(entry.deprecated, `${entry.key} deprecation flag`).toBe(mirrored);
    }
  });
});
