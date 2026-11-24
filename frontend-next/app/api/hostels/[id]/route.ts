import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { hostelUpdateSchema } from '@/lib/validation';
import { Building, Hostel, RoomAllocation, Room, Floor, Bed, Warden, Student } from '@/lib/models';
import { assertHostelAccess } from '@/lib/services/scope';
import { bedStatsByHostel, emptyBedStats, syncHostelWardens } from '@/lib/services/hostels';
import { defined, findInOrg } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const h = await findInOrg(Hostel, auth, params.id, 'Hostel');
  if (auth.role === 'WARDEN') await assertHostelAccess(auth, h._id);
  if (auth.role === 'STUDENT') {
    const s: any = await Student.findOne({ organization: auth.organizationId, user: auth.userId }).select('hostel').lean();
    if (!h.isActive && String(s?.hostel) !== String(h._id)) throw new ApiError(404, 'Hostel not found');
    return ok({ _id: h._id, name: h.name, code: h.code, type: h.type, city: h.city, address: h.address, rules: h.rules, contactPhone: h.contactPhone });
  }
  const [stats, buildings, rooms, wardens] = await Promise.all([
    bedStatsByHostel(auth.organizationId, [h._id]),
    Building.countDocuments({ hostel: h._id }),
    Room.countDocuments({ hostel: h._id }),
    Warden.find({ organization: auth.organizationId, hostels: h._id }).select('name email phone user').lean(),
  ]);
  return ok({ ...h.toObject(), beds: stats[String(h._id)] ?? emptyBedStats, buildingCount: buildings, roomCount: rooms, wardens });
});

export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const { wardenIds, ...body } = await parseBody(req, hostelUpdateSchema);
  const h = await findInOrg(Hostel, auth, params.id, 'Hostel');
  if (body.isActive === false && (await RoomAllocation.exists({ hostel: h._id, status: 'ACTIVE' })))
    throw new ApiError(409, 'Cannot deactivate a hostel that still has active allocations');
  h.set(defined(body));
  await h.save();
  if (wardenIds) await syncHostelWardens(auth.organizationId, String(h._id), wardenIds);
  await audit(auth, 'UPDATE', 'Hostel', h._id, { fields: Object.keys(body) }, req);
  return ok(h);
});

export const DELETE = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const h = await findInOrg(Hostel, auth, params.id, 'Hostel');
  if (await RoomAllocation.exists({ hostel: h._id })) throw new ApiError(409, 'This hostel has allocation history. Deactivate it instead of deleting.');
  if (await Building.exists({ hostel: h._id })) throw new ApiError(409, 'Remove the hostel buildings, floors and rooms first');
  await Promise.all([Floor.deleteMany({ hostel: h._id }), Bed.deleteMany({ hostel: h._id })]);
  await Warden.updateMany({ organization: auth.organizationId, hostels: h._id }, { $pull: { hostels: h._id } });
  await Hostel.deleteOne({ _id: h._id });
  await audit(auth, 'DELETE', 'Hostel', h._id, { name: h.name }, req);
  return ok({ _id: h._id, deleted: true });
});
