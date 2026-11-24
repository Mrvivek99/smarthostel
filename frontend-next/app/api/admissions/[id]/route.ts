import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { admissionReviewSchema } from '@/lib/validation';
import { AdmissionApplication, Student } from '@/lib/models';
import { notify } from '@/lib/services/notify';
import { assertRecordAccess, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'STUDENT']);
  const app = await findInOrg(AdmissionApplication, auth, params.id, 'Application');
  await assertRecordAccess(auth, app, { hostelField: null });
  await app.populate([{ path: 'student', select: 'name email status gender' }, { path: 'preferredHostel', select: 'name code type' }]);
  return ok(app);
});

/** Admin review: UNDER_REVIEW / APPROVED / REJECTED. Approval activates the student so a bed can be allocated. */
export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, admissionReviewSchema);
  const app = await findInOrg(AdmissionApplication, auth, params.id, 'Application');
  if (app.status === 'APPROVED' || app.status === 'REJECTED') throw new ApiError(409, `Application is already ${app.status.toLowerCase()}`);
  if (body.status === app.status && body.status !== 'UNDER_REVIEW') throw new ApiError(409, 'No change');

  const student = await Student.findOne({ _id: app.student, organization: auth.organizationId });
  if (!student) throw new ApiError(404, 'Student not found');

  if (body.status === 'APPROVED') {
    if (student.status === 'INACTIVE') throw new ApiError(409, 'Student account is deactivated. Reactivate it before approving.');
    // Copy the application profile onto the student (gender drives hostel eligibility).
    student.set({
      status: 'ACTIVE',
      name: app.fullName,
      gender: app.gender,
      dob: app.dob,
      phone: app.phone,
      address: app.address,
      course: app.course,
      year: app.year,
      guardianName: app.guardianName,
      guardianPhone: app.guardianPhone,
      guardianRelation: app.guardianRelation,
      emergencyContactName: app.emergencyName,
      emergencyContactPhone: app.emergencyPhone,
      ...(app.enrollmentNo ? { enrollmentNo: app.enrollmentNo } : {}),
    });
    await student.save();
  }

  app.status = body.status;
  if (body.remarks !== undefined) app.remarks = body.remarks;
  app.reviewedBy = auth.userId;
  app.reviewedAt = new Date();
  await app.save();

  const text: Record<string, string> = {
    UNDER_REVIEW: 'Your hostel application is now under review.',
    APPROVED: 'Your hostel admission has been approved. A bed will be allocated to you shortly.',
    REJECTED: `Your hostel application was not approved.${body.remarks ? ` Reason: ${body.remarks}` : ''}`,
  };
  await notify(auth.organizationId, [student.user], { type: 'ADMISSION', title: `Application ${body.status.replace('_', ' ').toLowerCase()}`, message: text[body.status], link: '/student/admission' });
  await audit(auth, body.status === 'APPROVED' ? 'APPROVE' : body.status === 'REJECTED' ? 'REJECT' : 'REVIEW', 'AdmissionApplication', app._id, { student: String(student._id), remarks: body.remarks }, req);
  return ok(app);
});
