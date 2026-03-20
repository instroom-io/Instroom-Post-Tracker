import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function PostsPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  redirect(`/${workspaceSlug}/campaigns`)
}
