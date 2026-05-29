/** Aktifkan alur FinalOrder + Accounting + ProductionPipeline setelah input order CS. */
export function isFinalOrderWorkflowEnabled(): boolean {
  return process.env.USE_FINAL_ORDER_WORKFLOW === "true"
}
