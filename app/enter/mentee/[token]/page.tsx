import { redirect } from 'next/navigation';

export default function MenteeEntry({ params }: { params: { token: string } }) {
  redirect(`/api/auth/enter/mentee/${params.token}`);
}