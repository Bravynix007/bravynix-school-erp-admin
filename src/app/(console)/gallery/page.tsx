import type { Metadata } from 'next';
import { ComponentGallery } from '@/features/gallery/component-gallery';

export const metadata: Metadata = { title: 'Component gallery' };

export default function GalleryPage() {
  return <ComponentGallery />;
}
