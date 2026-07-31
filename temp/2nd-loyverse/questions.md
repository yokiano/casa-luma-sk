# Questions and Original Answers

Status: answered. The implementation decisions distilled from these answers are in [`decisions.md`](./decisions.md), and the updated modular plan starts at [`full-plan.md`](./full-plan.md).

One terminology clarification was applied conservatively: variants and modifiers are supported, while a true Loyverse composite/BOM item is treated as unsupported in v1 unless inventory inspection proves it is needed.

The original questions, recommendations, and answers remain below as the decision record.

## 🔴 1. Module spelling

You wrote `2ns-loyverse`, while the existing temp path and earlier wording use `2nd-loyverse`.

**Choose:**

- `2nd-loyverse` (recommended)
- `2ns-loyverse` exactly

This determines source paths, scripts, table prefixes, incident codes, and documentation names.



ANSWER: 2nd-loyverse of course. that was a typo.

## 🔴 2. Initial receipt lifecycle scope

Loyverse creates refunds through a separate endpoint tied to the target sale and does not document an API for cancelling an existing sale.

**Recommended:**

- Phase 1 mirrors selected non-cancelled sales.
- Sale and refunds share the sale’s deterministic cohort decision.
- Add refunds only after sale mirroring is proven.
- Mark cancelled or post-success modified sales for review rather than claiming they transferred successfully.

**Decision needed:** Should “100% success” initially mean all selected supported sales, or must refunds and cancelled receipts be included before webhook activation?



ANSWER:  i would just disragard refunds all together for this setup. even if it means that we need to include a rule that if it includes refund or is a refund - just don't include it or don't process it.

## 🟠 3. Same-name conflict and update policy

Name matching is workable only when one compatible target candidate exists. The sandbox may also contain intentional experimental changes.

**Recommended:**

- Match by durable mapping first, then unique normalized name.
- Persist IDs after the first match.
- Update entities created by this module when safe.
- Never silently overwrite manually pre-existing same-name entities.
- Fail and notify on duplicate names, incompatible definitions, or destructive option changes.

**Decision needed:** Should the mirror overwrite compatible manually created target entities to follow production, or preserve them for experiments?



ANSWER: I am affraid that matching IDs will introduce too much complexity now, it means we need to maintain this mapping which also populate lazily? in any case, we need a simple solution. names doesn't change that much. so I feel ok with using names only (if that is feasible with fetching items according to name and doesn't require too many server round trips if I have receipt with 10 items sold). if matching by name is not making sense from perfromance reasons, we can use some kind of ID mapping. but again - infra should be kept manageable on the account of data accuracy. 

## 🟠 4. Customer matching

Customer names are not guaranteed unique. Name-only matching could attach a receipt to the wrong target customer.

**Recommended:** unique normalized name, with email/phone used only to disambiguate. If still ambiguous, fail rather than guess.

**Decision needed:** Is this acceptable, or do you require strict name-only matching even when duplicate customer names exist?



ANSWER: good point. I think we can just drop the customers from this system. they don't add value to our desired tests. as long as we can map from new receipt to old receipt, meaning from original receipt to created receipt, I think we should be fine not using customer at all, it can be just dropped and ignored. this should be strictly stated in the code that we made this decision.

## 🟠 5. Payment-type mapping

Payment types must be created manually and cannot be created through the API.

**Recommended:** match unique normalized source and target payment-type names, with an optional explicit name override map for different names.

**Decision needed:** Will target payment-type names exactly match production, or should we support explicit mappings from the start?



ANSWER: i created the payment types manually. they match now between the 2 systems.

## 🟠 6. Webhook execution budget

Lazy entity creation may require several API calls. Fully synchronous mirroring can increase production webhook latency.

**Recommended:** persist selection/transfer first, attempt inline within a strict budget, never fail the production webhook because the sandbox failed, and leave unfinished work for the durable backfill/retry command.

**Decision needed:** Is eventual mirroring acceptable, or must every selected receipt finish before the production webhook responds?

ANSWER: good point. this mechanism should definetely prevent other webhook processes from failing. so either by pushing this mirror operation to the end, or by externalizing it to another process/worker. I am not sure what is the best solution or common solution, but as you said - we anyway persist the event/transfer - then we start the mirror creation (and entities). normally i hope it won't fail, and if it fails i should get telegram notification, which in turn can help me understand that if it happens a lot we should implement a retry mechanism or offload this process to another worker.

## 🟠 7. Telegram failure volume

Notifying every retry attempt can create a large alert burst during historical backfill.

**Recommended:** notify the first failure per receipt/error fingerprint, every terminal or ambiguous failure, and recovery; summarize repeated identical backfill failures.

**Decision needed:** Do you want this deduplicated policy, or literally one Telegram message for every failed attempt?



ANSWER: the telegram failures should be only for the live webhook processing, not the backfill process. the backfill process eventually should aggregate what is going wrong so the agent can see later what needs to be fixed. like i said in the past - in the plans for this feature -> it should be have a clear way for the agent to remain in loop until we manage to mirror receipts without any failures.

## 🟠 8. Attempt payload retention

Full request payloads may duplicate customer PII already stored in webhook/receipt tables.

**Recommended:** store source references, request fingerprints, bounded safe errors, state, and target identifiers, but not duplicate full payloads in attempt history.

**Decision needed:** Is audit metadata sufficient, or do you require complete target request/response JSON retention?

ANSWER: it is fine to save on space to avoid duplication. if payload is already saved in another table, saving references is a good way to keep our tables lean. but it all should be very clear.

## 🔴 9. Automatic retry executor

Inline webhook attempts plus a manually run backfill do not create automatic retries.

**Recommended:** add an authenticated scheduled drain endpoint that processes a small due batch, recovers expired leases, and reconciles ambiguous outcomes. A deployment scheduler invokes it at a fixed cadence.

**Decision needed:** Should this use the deployment platform scheduler, or will a separate long-running/scheduled worker own retries? Please specify the expected hosting platform and acceptable cadence.



ANSWER: i hope we dno't need retry mechanism for now. we will start using one if things start to fail constantly due to timeouts or longevity of the mirror process.

## 🔴 10. Target currency and tax compatibility

Loyverse recalculates totals using target currency precision, tax definitions, and rounding. A different target currency or incompatible tax mode prevents faithful analytical comparison.

**Recommended:** require the same currency/decimal precision and compatible included/additional tax setup before live or backfill writes.

**Decision needed:** Is the second account configured with the same currency, decimal precision, and tax behavior as production?

ANSWER: I applied the same tax item as in the original acconut. same goes for currency. 

## 🟠 11. Loyalty, points discounts, tips, and surcharges

The create API calculates customer/points behavior and does not expose all source receipt outputs as writable fields. Tips and surcharges are response fields rather than general sale-create inputs.

**Recommended:** initially classify receipts containing points discounts, non-zero tips, or non-zero surcharges as unsupported/manual review. Add them only after controlled sandbox tests define expected semantics.

**Decision needed:** May the first supported cohort exclude these receipts?

ANSWER: loyalty points or any other surcharge can be ignored. discounts you can add, by just creating the discount, then using it. tell me if this is not feasible.

## 🟠 12. Source changes after target success

The documented API cannot update or cancel an already-created target sale.

**Recommended:** freeze the successful target sale, record the new source fingerprint as `source_changed`, notify, and require reconciliation rather than create a duplicate.

**Decision needed:** Is review-only handling acceptable for source updates and cancellations after transfer?

ANSWER: we don't change receipts never in the source, it is actually not possible as far as i know. so same goes for target receipts.

## 🟠 13. Composite items

A production item may reference supplier IDs or component variant IDs that are account-specific. Copying them directly is unsafe.

**Recommended:** initially reject composite/supplier-dependent items. Add recursive component mapping only if the selected receipt cohort actually needs it.

**Decision needed:** May composite items be excluded from the first supported cohort?



ANSWER: actually we have many items that include modifiers and variants. i think variants are more easy, modifiers can be tricky. but as we said earlier - if we need to create a mapping between IDs so maybe it's worth it. they do change with time but not so often.
