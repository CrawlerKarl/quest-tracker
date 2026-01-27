import { redirect } from 'next/navigation';

export default function MentorEntry({ params }: { params: { token: string } }) {
  redirect(`/api/auth/enter/mentor/${params.token}`);
}