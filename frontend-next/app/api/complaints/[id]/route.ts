import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { complaintUpdateSchema } from '@/lib/validation';
import { Complaint, Student, User } from '@/lib/models';
import { canTransitionComplaint } from '@/lib/services/workflow';
import { notify } from '@/lib/services/notify';
import { assertRecordAccess, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

const POP = [{ path: 'student', select: 'name email' }, { path: 'hostel', select: 'name code' }, { path: 'assignedTo', select: 'name email' }, { path: 'history.by', select: 'name' }];

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const c = await findInOrg(Complaint, auth, params.id, 'Complaint');
  await assertRecordAccess(auth, c);
  await c.populate(POP);
  return ok(c);
});

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const body = await parseBody(req, complaintUpdateSchema);
  const c = await findInOrg(Complaint, auth, params.id, 'Complaint');
  await assertRecordAccess(auth, c);

  if (auth.role === 'STUDENT') {
    const extra = Object.keys(body).filter((k) => k !== 'feedback');
    if (extra.length || !body.feedback) throw new ApiError(403, 'Students can only leave feedback on their resolved complaints');
    if (c.status !== 'RESOLVED') throw new ApiError(409, 'Feedback can be given once the complaint is resolved');
    if (c.feedback?.rating) throw new ApiError(409, 'Feedback already submitted');
    c.feedback = { ...body.feedback, at: new Date() };
    await c.save();
    await audit(auth, 'FEEDBACK', 'Complaint', c._id, { rating: body.feedback.rating }, req);
    return ok(c);
  }
  if (body.feedback) throw new ApiError(403, 'Only the student can leave feedback');

  const wasStatus = c.status;
  let next = body.status;
  if (body.assignedTo) {
    const u: any = await User.findOne({ _id: body.assignedTo, organization: auth.organizationId, role: { $in: ['ADMIN', 'WARDEN'] }, isActive: true }).select('name').lean();
    if (!u) throw new ApiError(400, 'Assignee not found in your organization');
    c.assignedTo = u._id;
    c.assignedToName = body.assignedToName ?? u.name;
    if (!next && c.status === 'SUBMITTED') next = 'ASSIGNED';
  } else if (body.assignedToName !== undefined) {
    c.assignedToName = body.assignedToName;
    if (!next && c.status === 'SUBMITTED' && body.assignedToName) next = 'ASSIGNED';
  }
  if (next && next !== c.status) {
    if (!canTransitionComplaint(c.status, next)) throw new ApiError(409, `Cannot move a complaint from ${c.status} to ${next}`);
    c.status = next;
    if (next === 'RESOLVED') c.resolvedAt = new Date();
  } else if (c.status === 'RESOLVED' || c.status === 'REJECTED') {
    if (body.priority || body.assignedTo) throw new ApiError(409, `Complaint is already ${c.status.toLowerCase()}`);
  }
  if (body.priority) c.priority = body.priority;
  if (body.resolutionNotes !== undefined) c.resolutionNotes = body.resolutionNotes;
  if (body.resolutionImages) c.resolutionImages = body.resolutionImages;
  if ((c.status === 'RESOLVED' || c.status === 'REJECTED') && !c.resolutionNotes) throw new ApiError(400, 'Add resolution notes before closing a complaint');
  if (c.status !== wasStatus || body.note || body.assignedTo)
    c.history.push({ status: c.status, note: body.note ?? (body.assignedTo ? `Assigned to ${c.assignedToName}` : undefined), by: auth.userId, at: new Date() });
  await c.save();

  if (c.status !== wasStatus) {
    const s: any = await Student.findById(c.student).select('user').lean();
    await notify(auth.organizationId, [s?.user], { type: 'COMPLAINT', title: `Complaint ${c.status.replace('_', ' ').toLowerCase()}`, message: c.title, link: '/student/complaints' });
  }
  await audit(auth, 'UPDATE', 'Complaint', c._id, { from: wasStatus, to: c.status }, req);
  return ok(c);
});
