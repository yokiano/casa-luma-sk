export { renderEmailAutomationNotification, renderTestEmailAutomationNotification, renderSimulatedEmailAutomationNotification, selectTemplateKind, selectTemplateKindForSimulation } from './render';
export { sendEmailAutomationNotification, sendEmailAutomationTestNotification, type NotificationSendResult } from './send';
export { BUILTIN_CLASSIFIERS, findBuiltinClassifier, type BuiltinClassifier } from './builtin-dummies';
export { notificationTemplateByKind, expenseRecordedTemplate, actionReadyTemplate, reviewNeededTemplate, ignoredTemplate, type NotificationKind, type NotificationTemplate } from './templates';
export { escapeHtml, formatMoney, humanSubtype, detailBlock } from './helpers';
