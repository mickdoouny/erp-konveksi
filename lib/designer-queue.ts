/** Lead yang relevan untuk antrian kerja desainer (bukan prospek mentah / menunggu approval CS). */
export type QueueLead = {
  statusLead?: string | null;
  statusDesain?: string | null;
};

export function isInDesignerQueue(lead: QueueLead): boolean {
  const sd = (lead.statusDesain || "").trim().toUpperCase();
  const sl = (lead.statusLead || "").trim().toUpperCase();

  if (sd.includes("APPROVED")) {
    return false;
  }

  if (sl === "PROSPEK" && sd.includes("BELUM MASUK")) {
    return false;
  }

  if (sl.includes("MENUNGGU CS")) {
    return sd.includes("REVISI");
  }

  if (sd.includes("KIRIM KE CS")) {
    return false;
  }

  if (sl.includes("ANTRIAN DESAIN")) {
    return true;
  }

  if (sd.includes("REVISI")) {
    return true;
  }

  if (
    sd.includes("PROSES DESAIN") ||
    sd.includes("REVISI DIPROSES") ||
    sd.includes("HASIL DESAIN")
  ) {
    return true;
  }

  return false;
}
