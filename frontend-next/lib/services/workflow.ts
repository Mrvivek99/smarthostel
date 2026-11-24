export type ComplaintStatus = 'SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

const ORDER: ComplaintStatus[] = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

/** SUBMITTED -> ASSIGNED -> IN_PROGRESS -> RESOLVED (forward only, steps may be skipped); REJECTED from any open state. */
export function canTransitionComplaint(from: ComplaintStatus, to: ComplaintStatus): boolean {
  if (from === to) return true;
  if (from === 'RESOLVED' || from === 'REJECTED') return false;
  if (to === 'REJECTED') return true;
  return ORDER.indexOf(to) > ORDER.indexOf(from);
}
