import type { Metadata } from 'next';
import { ArtifactsView } from '@/components/artifacts/artifacts-view';

export const metadata: Metadata = {
  title: 'Artifacts',
};

export default function ArtifactsPage() {
  return <ArtifactsView />;
}
