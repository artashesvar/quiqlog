import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LegacyEditorRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/dashboard/guides/${id}/editor`)
}
