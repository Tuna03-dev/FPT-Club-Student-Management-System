import axios from "axios";

export function isCanceled(err: any) {
  if (axios.isCancel && axios.isCancel(err)) return true;
  return err?.code === "ERR_CANCELED" || err?.message === "canceled";
}
