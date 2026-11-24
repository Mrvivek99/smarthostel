/**
 * Demo data seed. Run: npm run seed   (idempotent; re-running resets nothing but fills what is missing)
 * Requires MONGODB_URI (read from .env.local / .env).
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env.local' });
dotenv.config();

import { hashPassword } from '../lib/auth/password';
import { changePlan } from '../lib/services/subscription';
import { Bed, Building, FeeStructure, Floor, Hostel, Organization, Room, Student, User, Warden } from '../lib/models';

const PASSWORD = process.env.SEED_PASSWORD || 'Demo@12345';
const ORG_SLUG = 'demo-hostels';

async function upsertUser(org: any, role: 'ADMIN' | 'WARDEN' | 'STUDENT', name: string, email: string, phone?: string) {
  let u: any = await User.findOne({ email });
  if (!u) u = await User.create({ organization: org._id, name, email, role, phone, passwordHash: await hashPassword(PASSWORD), emailVerified: true });
  return u;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);

  const org: any = (await Organization.findOne({ slug: ORG_SLUG })) ?? (await Organization.create({ name: 'Demo Hostels', slug: ORG_SLUG, email: 'hello@demo-hostels.test', plan: 'STANDARD' }));
  const orgId = String(org._id);

  if (!process.env.SKIP_SUPER_ADMIN) {
    const su = await User.findOne({ email: 'superadmin@smarthostel.test' });
    if (!su) await User.create({ name: 'Platform Owner', email: 'superadmin@smarthostel.test', role: 'SUPER_ADMIN', passwordHash: await hashPassword(PASSWORD), emailVerified: true });
  }
  const admin = await upsertUser(org, 'ADMIN', 'Asha Admin', 'admin@demo-hostels.test', '9000000001');
  const wardenUser = await upsertUser(org, 'WARDEN', 'Wilson Warden', 'warden@demo-hostels.test', '9000000002');
  const studentUser = await upsertUser(org, 'STUDENT', 'Sam Student', 'student@demo-hostels.test', '9000000003');

  const hostel: any = (await Hostel.findOne({ organization: orgId, code: 'BH1' })) ?? (await Hostel.create({ organization: orgId, name: 'Sunrise Boys Hostel', code: 'BH1', type: 'BOYS', city: 'Pune', address: '12 College Road', capacity: 20, rules: ['Gate closes at 10 PM', 'No loud music after 9 PM'] }));
  const building: any = (await Building.findOne({ hostel: hostel._id, name: 'Block A' })) ?? (await Building.create({ organization: orgId, hostel: hostel._id, name: 'Block A', code: 'A' }));

  if (!(await Warden.findOne({ user: wardenUser._id }))) {
    await Warden.create({ organization: orgId, user: wardenUser._id, name: wardenUser.name, email: wardenUser.email, phone: wardenUser.phone, employeeId: 'W-001', hostels: [hostel._id] });
  } else {
    await Warden.updateOne({ user: wardenUser._id }, { $addToSet: { hostels: hostel._id } });
  }

  const layout: Array<{ floor: number; rooms: Array<{ no: string; type: 'SINGLE' | 'DOUBLE' | 'SHARED'; capacity: number; rent: number }> }> = [
    { floor: 0, rooms: [{ no: '001', type: 'SINGLE', capacity: 1, rent: 6000 }, { no: '002', type: 'DOUBLE', capacity: 2, rent: 4500 }, { no: '003', type: 'SHARED', capacity: 4, rent: 3500 }] },
    { floor: 1, rooms: [{ no: '101', type: 'SINGLE', capacity: 1, rent: 6000 }, { no: '102', type: 'DOUBLE', capacity: 2, rent: 4500 }, { no: '103', type: 'SHARED', capacity: 4, rent: 3500 }] },
  ];
  let beds = 0;
  for (const l of layout) {
    const floor: any = (await Floor.findOne({ building: building._id, number: l.floor })) ?? (await Floor.create({ organization: orgId, hostel: hostel._id, building: building._id, number: l.floor, label: l.floor === 0 ? 'Ground' : `Floor ${l.floor}` }));
    for (const r of l.rooms) {
      const room: any = (await Room.findOne({ building: building._id, roomNumber: r.no })) ?? (await Room.create({ organization: orgId, hostel: hostel._id, building: building._id, floor: floor._id, roomNumber: r.no, type: r.type, capacity: r.capacity, monthlyRent: r.rent, amenities: ['Fan', 'Locker', 'Wi-Fi'] }));
      for (let i = 1; i <= room.capacity; i++) {
        const exists = await Bed.exists({ room: room._id, bedNumber: `B${i}` });
        if (!exists) {
          await Bed.create({ organization: orgId, hostel: hostel._id, room: room._id, bedNumber: `B${i}`, status: 'AVAILABLE' });
          beds++;
        }
      }
    }
  }

  if (!(await Student.findOne({ user: studentUser._id }))) {
    await Student.create({
      organization: orgId, user: studentUser._id, name: studentUser.name, email: studentUser.email, phone: studentUser.phone, gender: 'MALE', status: 'ACTIVE',
      enrollmentNo: 'DEMO-2026-001', course: 'B.Tech Computer Science', year: 2, guardianName: 'Sunil Student', guardianPhone: '9000000010', guardianRelation: 'Father',
      emergencyContactName: 'Sunil Student', emergencyContactPhone: '9000000010',
    });
  }

  if (!(await FeeStructure.findOne({ organization: orgId, name: 'Standard Monthly' }))) {
    await FeeStructure.create({
      organization: orgId, name: 'Standard Monthly', frequency: 'MONTHLY', dueDay: 10, lateFeePerDay: 20, allowPartial: false,
      items: [{ category: 'MONTHLY_HOSTEL', label: 'Hostel rent', amount: 4500 }, { category: 'MESS', label: 'Mess', amount: 2500 }],
    });
  }

  const { Subscription } = await import('../lib/models');
  if (!(await Subscription.exists({ organization: orgId, status: 'ACTIVE' }))) await changePlan(orgId, String(admin._id), 'STANDARD', 12);

  console.log(`Seed complete (organization code "${ORG_SLUG}", ${beds} new beds).`);
  console.log(`Logins (password "${PASSWORD}"):`);
  console.log('  admin@demo-hostels.test    (ADMIN)');
  console.log('  warden@demo-hostels.test   (WARDEN)');
  console.log('  student@demo-hostels.test  (STUDENT)');
  console.log('  superadmin@smarthostel.test (SUPER_ADMIN)');
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
