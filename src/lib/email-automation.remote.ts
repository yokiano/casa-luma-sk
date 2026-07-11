import { command } from '$app/server';
import * as v from 'valibot';
import {
  getDashboardData,
  moveRule,
  sendTestForBuiltin,
  sendTestForRule,
  toggleRule,
  updateSettings,
  type TestSendResult
} from './server/email-automation/dashboard';

const RuleIdSchema = v.object({ ruleId: v.pipe(v.number(), v.integer(), v.minValue(1)) });

const MoveRuleSchema = v.object({
  ruleId: v.pipe(v.number(), v.integer(), v.minValue(1)),
  direction: v.picklist(['up', 'down'])
});

const SettingsSchema = v.object({
  automationEnabled: v.boolean(),
  ledgerEnabled: v.boolean(),
  notificationsEnabled: v.boolean()
});

const SendTestRuleSchema = v.object({ ruleId: v.pipe(v.number(), v.integer(), v.minValue(1)) });
const SendTestBuiltinSchema = v.object({ key: v.pipe(v.string(), v.trim(), v.minLength(1)) });

/** Reloads all dashboard data (used after mutations to refresh without a page navigation). */
export const refreshEmailAutomationDashboard = command(async () => {
  return getDashboardData();
});

export const saveEmailAutomationSettings = command(SettingsSchema, async (values) => {
  await updateSettings(values);
  return { ok: true as const };
});

export const toggleEmailClassificationRule = command(RuleIdSchema, async ({ ruleId }) => {
  const result = await toggleRule(ruleId);
  if (!result) return { ok: false as const, error: 'Rule not found.' };
  return { ok: true as const, enabled: result.enabled };
});

export const moveEmailClassificationRule = command(MoveRuleSchema, async ({ ruleId, direction }) => {
  const ok = await moveRule(ruleId, direction);
  return { ok: ok as boolean };
});

export const sendEmailAutomationTestForRule = command(SendTestRuleSchema, async ({ ruleId }): Promise<TestSendResult> => {
  return sendTestForRule(ruleId);
});

export const sendEmailAutomationTestForBuiltin = command(SendTestBuiltinSchema, async ({ key }): Promise<TestSendResult> => {
  return sendTestForBuiltin(key);
});
