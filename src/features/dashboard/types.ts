/** PLT-01: the platform in numbers (API design 10.4f). */
export interface PlatformDashboard {
  /** Active Societies. */
  societies: number;
  /** Active Institutions inside active Societies. */
  institutions: number;
  /** `null` until the People module holds students (Phase 4). */
  activeStudents: number | null;
  duesOutstandingAmount: string;
  duesCollectedThisMonthAmount: string;
  duesCollectedLastMonthAmount: string;
  /** `null` until AI reports exist. */
  openAiReports: number | null;
}
