import type { Metadata } from 'next';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = { title: 'Create account', description: 'Register as a student with your hostel organization code.' };

export default function RegisterPage() {
  return <RegisterForm />;
}
