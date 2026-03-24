/**
 * Generate a watch URL for a provider using its URL template.
 * Templates use {title} as a placeholder for the URL-encoded title name.
 */
export function generateProviderUrl(urlTemplate: string | null, titleName: string): string | null {
  if (!urlTemplate) return null;
  return urlTemplate.replace("{title}", encodeURIComponent(titleName));
}
