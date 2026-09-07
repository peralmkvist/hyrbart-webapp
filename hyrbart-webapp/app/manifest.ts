import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hyrbart',
    short_name: 'Hyrbart',
    description: 'Det du behöver. När du behöver det.',
    start_url: '/sv',
    display: 'standalone',
    background_color: '#f4f4f1',
    theme_color: '#f4f4f1',
  };
}
